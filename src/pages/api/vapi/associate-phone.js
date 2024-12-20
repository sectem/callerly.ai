import { createClient } from '@supabase/supabase-js';
import { associatePhoneNumber } from '@/utils/vapi';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    const { agentId, phoneNumber } = req.body;

    if (!agentId || !phoneNumber) {
      return res.status(400).json({ error: 'Agent ID and phone number are required' });
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

    // Verify the phone number belongs to the user
    const { data: phoneData, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('user_id', user.id)
      .eq('phone_number', phoneNumber)
      .single();

    if (phoneError || !phoneData) {
      return res.status(404).json({ error: 'Phone number not found or not owned by user' });
    }

    // Associate the phone number with the VAPI agent
    await associatePhoneNumber(agent.agent_id, phoneNumber);

    // Update the agent in our database
    const { error: updateError } = await supabase
      .from('vapi_agents')
      .update({ phone_number: phoneNumber })
      .eq('id', agent.id);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({
      success: true,
      message: 'Phone number associated successfully',
    });
  } catch (error) {
    console.error('Error associating phone number:', error);
    return res.status(500).json({
      error: 'Failed to associate phone number',
      details: error.message,
    });
  }
} 