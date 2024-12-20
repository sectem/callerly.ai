-- Add foreign key constraint for script_id
ALTER TABLE vapi_agents
ADD CONSTRAINT fk_vapi_agents_script
FOREIGN KEY (script_id)
REFERENCES scripts(id)
ON DELETE SET NULL;

-- Add index for script_id
CREATE INDEX idx_vapi_agents_script_id ON vapi_agents(script_id); 