import { createClient } from '@supabase/supabase-js';
import { createVapiAgentWithPhone } from '@/utils/vapi';

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

    const { 
      name, 
      scriptContent, 
      phoneNumber,
      firstMessage,
      endCallMessage,
      voicemailMessage 
    } = req.body;

    if (!name || !scriptContent || !phoneNumber || !firstMessage || !endCallMessage || !voicemailMessage) {
      return res.status(400).json({ 
        error: 'Name, script content, phone number, first message, end call message, and voicemail message are required' 
      });
    }

    // Create the agent with phone number association and messages
    const vapiAgent = await createVapiAgentWithPhone(
      name, 
      scriptContent, 
      phoneNumber,
      firstMessage,
      endCallMessage,
      voicemailMessage
    );

    // Create the script
    const { data: script, error: scriptError } = await supabase
      .from('scripts')
      .insert({
        user_id: user.id,
        title: `Script for ${name}`,
        content: scriptContent
      })
      .select()
      .single();

    if (scriptError) {
      console.error('Error creating script:', scriptError);
      throw scriptError;
    }

    // Then store the agent with messages
    const { data: agent, error: dbError } = await supabase
      .from('vapi_agents')
      .insert({
        user_id: user.id,
        agent_name: name,
        agent_id: vapiAgent.id,
        phone_number: phoneNumber,
        script_id: script.id,
        first_message: firstMessage,
        end_call_message: endCallMessage,
        voicemail_message: voicemailMessage
      })
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    return res.status(200).json({
      success: true,
      agent: {
        ...agent,
        vapi_id: vapiAgent.id,
        script_id: script.id,
      },
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    return res.status(500).json({
      error: 'Failed to create agent',
      details: error.message,
    });
  }
} 