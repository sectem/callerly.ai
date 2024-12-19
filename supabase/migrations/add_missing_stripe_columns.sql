-- Add missing Stripe-related columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_checkout_session text;

-- Update RLS policies to allow Stripe webhook service to update subscription data
CREATE POLICY "Service role can update subscription data"
    ON profiles FOR UPDATE
    USING (true)
    WITH CHECK (auth.role() = 'service_role');

-- Create a function to handle subscription updates
CREATE OR REPLACE FUNCTION handle_subscription_update()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE TRIGGER on_subscription_update
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    WHEN (
        NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id OR
        NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id OR
        NEW.stripe_price_id IS DISTINCT FROM OLD.stripe_price_id OR
        NEW.subscription_status IS DISTINCT FROM OLD.subscription_status OR
        NEW.subscription_period_end IS DISTINCT FROM OLD.subscription_period_end OR
        NEW.last_checkout_session IS DISTINCT FROM OLD.last_checkout_session OR
        NEW.last_payment_error IS DISTINCT FROM OLD.last_payment_error
    )
    EXECUTE FUNCTION handle_subscription_update(); 