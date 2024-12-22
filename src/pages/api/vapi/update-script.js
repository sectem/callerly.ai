import { createClient } from '@supabase/supabase-js';
import { updateAgentScript } from '@/utils/vapi';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the user from the session
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { 
      agentId, 
      scriptContent, 
      name,
      firstMessage,
      endCallMessage,
      voicemailMessage 
    } = req.body;

    if (!agentId || !scriptContent || !name || !firstMessage || !endCallMessage || !voicemailMessage) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Get the VAPI agent ID from our database
    const { data: dbAgent, error: dbAgentError } = await supabase
      .from('vapi_agents')
      .select('agent_id, script_id')
      .eq('id', agentId)
      .single();

    if (dbAgentError || !dbAgent) {
      throw new Error('Agent not found in database');
    }

    // Update the agent in VAPI using the VAPI agent ID
    await updateAgentScript(dbAgent.agent_id, scriptContent, name, firstMessage, endCallMessage, voicemailMessage);

    // Update the script content
    const { data: script, error: scriptError } = await supabase
      .from('scripts')
      .update({ content: scriptContent })
      .eq('id', dbAgent.script_id)
      .select()
      .single();

    if (scriptError) {
      throw scriptError;
    }

    // Update the agent name and messages
    const { data: agent, error: agentError } = await supabase
      .from('vapi_agents')
      .update({
        agent_name: name,
        first_message: firstMessage,
        end_call_message: endCallMessage,
        voicemail_message: voicemailMessage
      })
      .eq('id', agentId)
      .select()
      .single();

    if (agentError) {
      throw agentError;
    }

    return res.status(200).json({
      success: true,
      agent: {
        ...agent,
        script
      },
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    return res.status(500).json({
      error: 'Failed to update agent',
      details: error.message,
    });
  }
} 