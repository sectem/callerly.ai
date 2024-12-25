-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create profiles table
CREATE TABLE public.profiles (
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
CREATE TABLE public.vapi_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    vapi_agent_id TEXT UNIQUE,
    name TEXT NOT NULL,
    voice_id TEXT,
    voice_provider TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create scripts table
CREATE TABLE public.scripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES public.vapi_agents(id) ON DELETE CASCADE NOT NULL,
    script_content TEXT NOT NULL,
    first_message TEXT NOT NULL,
    end_call_message TEXT NOT NULL,
    voicemail_message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create phone_numbers table
CREATE TABLE public.phone_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    phone_number TEXT NOT NULL UNIQUE,
    twilio_sid TEXT NOT NULL,
    encrypted_twilio_auth_token bytea,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create payment_methods table
CREATE TABLE public.payment_methods (
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

-- Add indexes for better query performance
CREATE INDEX idx_vapi_agents_user_id ON public.vapi_agents (user_id);
CREATE INDEX idx_scripts_agent_id ON public.scripts (agent_id);
CREATE INDEX idx_phone_numbers_user_id ON public.phone_numbers (user_id);
CREATE INDEX idx_payment_methods_user_id ON public.payment_methods (user_id);

-- Add unique constraint for payment methods per user
ALTER TABLE public.payment_methods
ADD CONSTRAINT unique_payment_method_per_user UNIQUE (user_id, payment_method_id);

-- Add comment for encrypted column usage
COMMENT ON COLUMN public.phone_numbers.encrypted_twilio_auth_token IS 'Encrypted Twilio auth token. Use pgp_sym_decrypt(encrypted_twilio_auth_token::bytea, current_setting(''app.settings.jwt_secret'')) to decrypt';

-- Create validation trigger function
CREATE FUNCTION validate_agent_phone_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the phone number belongs to the agent's user
  IF NOT EXISTS (
    SELECT 1 
    FROM phone_numbers p
    WHERE p.phone_number = NEW.name 
    AND p.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Agent name must match a phone number owned by the user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create validation trigger
CREATE TRIGGER validate_agent_phone_number_trigger
  BEFORE INSERT OR UPDATE ON public.vapi_agents
  FOR EACH ROW
  EXECUTE FUNCTION validate_agent_phone_number();

-- Create function to handle new user creation
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert the profile with all metadata
    INSERT INTO public.profiles (
        id,
        first_name,
        last_name,
        company,
        phone,
        role
    )
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
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER update_vapi_agents_updated_at
    BEFORE UPDATE ON public.vapi_agents
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER update_scripts_updated_at
    BEFORE UPDATE ON public.scripts
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER update_phone_numbers_updated_at
    BEFORE UPDATE ON public.phone_numbers
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON public.payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime(updated_at);

-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vapi_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all operations for users based on user_id" ON public.profiles
    USING (auth.uid() = id OR auth.uid() IS NULL)
    WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

CREATE POLICY "Users can view their own agents" ON public.vapi_agents
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view scripts for their agents" ON public.scripts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.vapi_agents
            WHERE vapi_agents.id = scripts.agent_id
            AND vapi_agents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own phone numbers" ON public.phone_numbers
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own payment methods" ON public.payment_methods
    FOR ALL USING (auth.uid() = user_id);

-- Create function to encrypt auth token
CREATE OR REPLACE FUNCTION encrypt_auth_token(auth_token text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN pgp_sym_encrypt(
        auth_token,
        current_setting('app.settings.jwt_secret')
    );
END;
$$;

-- Create function to decrypt auth token
CREATE OR REPLACE FUNCTION decrypt_auth_token(encrypted_token bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN pgp_sym_decrypt(
        encrypted_token,
        current_setting('app.settings.jwt_secret')
    );
END;
$$; 