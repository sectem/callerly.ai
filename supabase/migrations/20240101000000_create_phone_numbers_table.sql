-- Create phone_numbers table
CREATE TABLE IF NOT EXISTS phone_numbers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    twilio_sid VARCHAR(50) NOT NULL,
    friendly_name VARCHAR(100),
    capabilities JSONB DEFAULT '{"voice": true, "sms": true}'::jsonb,
    status VARCHAR(20) DEFAULT 'active',
    monthly_cost DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(phone_number),
    UNIQUE(twilio_sid)
);

-- Create an index on user_id for faster lookups
CREATE INDEX idx_phone_numbers_user_id ON phone_numbers(user_id);

-- Create an index on phone_number for faster lookups
CREATE INDEX idx_phone_numbers_phone_number ON phone_numbers(phone_number);

-- Add RLS policies
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own phone numbers
CREATE POLICY "Users can view their own phone numbers"
    ON phone_numbers
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy for users to insert their own phone numbers
CREATE POLICY "Users can insert their own phone numbers"
    ON phone_numbers
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own phone numbers
CREATE POLICY "Users can update their own phone numbers"
    ON phone_numbers
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy for users to delete their own phone numbers
CREATE POLICY "Users can delete their own phone numbers"
    ON phone_numbers
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_phone_numbers_updated_at
    BEFORE UPDATE ON phone_numbers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 