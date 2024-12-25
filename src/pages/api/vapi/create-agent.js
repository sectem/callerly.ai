import { createVapiAgentWithPhone } from '@/utils/vapi';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from session
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { phoneNumber, scriptContent, firstMessage, endCallMessage, voicemailMessage } = req.body;

    // Create VAPI agent with phone number
    const vapiAgent = await createVapiAgentWithPhone(
      phoneNumber, // Use phone number as name
      phoneNumber,
      scriptContent,
      {
        firstMessage,
        endCallMessage,
        voicemailMessage
      }
    );

    // Return the VAPI agent ID and other details
    return res.status(200).json({
      id: vapiAgent.id, // This is the vapi_agent_id we need to save
      voice_id: vapiAgent.voice?.voiceId || 'default',
      voice_provider: vapiAgent.voice?.provider || 'elevenlabs',
      status: 'success'
    });
  } catch (error) {
    console.error('Error in create-agent:', error);
    return res.status(500).json({ error: error.message });
  }
} 