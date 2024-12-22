-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- Drop existing auth trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    company TEXT,
    phone TEXT,
    role TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create vapi_agents table
CREATE TABLE IF NOT EXISTS public.vapi_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    voice_id TEXT,
    voice_provider TEXT,
    script TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create phone_numbers table
CREATE TABLE IF NOT EXISTS public.phone_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    phone_number TEXT NOT NULL UNIQUE,
    is_verified BOOLEAN DEFAULT false,
    verification_code TEXT,
    verification_attempts INTEGER DEFAULT 0,
    last_verification_attempt TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'credit', 'debit', 'initial')),
    description TEXT,
    stripe_payment_intent_id TEXT,
    stripe_refund_id TEXT,
    call_duration INTEGER,
    agent_id UUID REFERENCES public.vapi_agents(id),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    agent_id UUID REFERENCES public.vapi_agents(id) NOT NULL,
    content TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT NOT NULL,
    stripe_price_id TEXT NOT NULL,
    status TEXT NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, stripe_subscription_id)
);

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    payment_method_id TEXT NOT NULL,
    card_brand TEXT,
    card_last4 TEXT,
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    billing_name TEXT,
    billing_email TEXT,
    billing_address_line1 TEXT,
    billing_address_line2 TEXT,
    billing_city TEXT,
    billing_state TEXT,
    billing_postal_code TEXT,
    billing_country TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_default BOOLEAN DEFAULT false
);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name, company, phone, role)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        NEW.raw_user_meta_data->>'company',
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'role'
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vapi_agents_updated_at
    BEFORE UPDATE ON public.vapi_agents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_phone_numbers_updated_at
    BEFORE UPDATE ON public.phone_numbers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to add credits to wallet
CREATE OR REPLACE FUNCTION public.add_wallet_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type TEXT,
    p_description TEXT,
    p_stripe_payment_intent_id TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.wallet_transactions (
        user_id,
        amount,
        transaction_type,
        description,
        stripe_payment_intent_id
    ) VALUES (
        p_user_id,
        p_amount,
        p_transaction_type,
        p_description,
        p_stripe_payment_intent_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct credits
CREATE OR REPLACE FUNCTION public.deduct_wallet_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT,
    p_agent_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_current_balance INTEGER;
BEGIN
    -- Calculate current balance
    SELECT COALESCE(SUM(
        CASE 
            WHEN transaction_type IN ('credit', 'initial', 'refund', 'purchase') THEN amount 
            WHEN transaction_type IN ('debit', 'usage') THEN -amount
        END
    ), 0)
    INTO v_current_balance
    FROM public.wallet_transactions
    WHERE user_id = p_user_id;

    -- Check if user has enough credits
    IF v_current_balance < p_amount THEN
        RETURN -1; -- Insufficient credits
    END IF;

    -- Add debit transaction
    INSERT INTO public.wallet_transactions (
        user_id,
        amount,
        transaction_type,
        description,
        agent_id
    ) VALUES (
        p_user_id,
        p_amount,
        'debit',
        p_description,
        p_agent_id
    );

    RETURN v_current_balance - p_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get wallet balance
CREATE OR REPLACE FUNCTION public.get_wallet_balance(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN COALESCE(SUM(
        CASE 
            WHEN transaction_type IN ('credit', 'initial', 'refund', 'purchase') THEN amount 
            WHEN transaction_type IN ('debit', 'usage') THEN -amount
        END
    ), 0)
    FROM public.wallet_transactions
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can manage their own wallet transactions" ON public.wallet_transactions;

-- Enable RLS for tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Create profile policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles
    FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can create their own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Create wallet transaction policies
CREATE POLICY "Users can view their own wallet transactions"
    ON public.wallet_transactions
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own wallet transactions"
    ON public.wallet_transactions
    FOR ALL
    USING (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.wallet_transactions TO authenticated;

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own payment methods"
    ON public.payment_methods
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment methods"
    ON public.payment_methods
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods"
    ON public.payment_methods
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods"
    ON public.payment_methods
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime(updated_at);