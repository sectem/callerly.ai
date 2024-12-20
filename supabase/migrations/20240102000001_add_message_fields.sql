-- Add message fields to vapi_agents table
ALTER TABLE vapi_agents
ADD COLUMN first_message TEXT,
ADD COLUMN end_call_message TEXT,
ADD COLUMN voicemail_message TEXT; 