import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createPagesServerClient({ req, res });

  // Get user session
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user;

  try {
    const { minutes, agentId, description } = req.body;

    if (!minutes || typeof minutes !== 'number' || minutes <= 0) {
      return res.status(400).json({ error: 'Invalid minutes amount' });
    }

    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }

    const { data, error } = await supabase.rpc('deduct_call_credits', {
      p_user_id: user.id,
      p_minutes: minutes,
      p_agent_id: agentId,
      p_description: description || 'Call minutes used'
    });

    if (error) {
      if (error.message.includes('Insufficient credits')) {
        return res.status(402).json({ error: 'Insufficient credits' });
      }
      throw error;
    }

    return res.status(200).json({ success: true, transaction_id: data });
  } catch (error) {
    console.error('Error deducting credits:', error);
    return res.status(500).json({ error: 'Failed to deduct credits' });
  }
}
