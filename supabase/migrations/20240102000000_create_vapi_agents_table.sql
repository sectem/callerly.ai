-- Create VAPI agents table
CREATE TABLE IF NOT EXISTS vapi_agents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_name VARCHAR(255) NOT NULL,
    agent_id VARCHAR(255) NOT NULL,  -- VAPI's agent ID
    phone_number VARCHAR(20),        -- Associated phone number
    script_id UUID,                  -- Reference to the script
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create scripts table
CREATE TABLE IF NOT EXISTS scripts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes
CREATE INDEX vapi_agents_user_id_idx ON vapi_agents(user_id);
CREATE INDEX scripts_user_id_idx ON scripts(user_id);

-- Add RLS policies
ALTER TABLE vapi_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own agents"
    ON vapi_agents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agents"
    ON vapi_agents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents"
    ON vapi_agents FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents"
    ON vapi_agents FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own scripts"
    ON scripts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scripts"
    ON scripts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scripts"
    ON scripts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scripts"
    ON scripts FOR DELETE
    USING (auth.uid() = user_id); 