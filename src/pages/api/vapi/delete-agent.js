import { createClient } from '@supabase/supabase-js';
import { deleteAgent } from '@/utils/vapi';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
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

    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }

    // Get the agent from our database
    const { data: agent, error: agentError } = await supabase
      .from('vapi_agents')
      .select('*')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Delete the agent from VAPI
    await deleteAgent(agent.agent_id);

    // Delete the agent from our database
    const { error: deleteError } = await supabase
      .from('vapi_agents')
      .delete()
      .eq('id', agentId);

    if (deleteError) {
      throw deleteError;
    }

    // Delete the associated script if it exists
    if (agent.script_id) {
      const { error: scriptDeleteError } = await supabase
        .from('scripts')
        .delete()
        .eq('id', agent.script_id);

      if (scriptDeleteError) {
        console.error('Error deleting script:', scriptDeleteError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Agent deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return res.status(500).json({
      error: 'Failed to delete agent',
      details: error.message,
    });
  }
} 