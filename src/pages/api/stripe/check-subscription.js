import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the user's session from the request
    const { user } = await supabase.auth.getUser(req.headers.authorization?.split(' ')[1]);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the user's profile with subscription info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_status, stripe_subscription_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw profileError;
    }

    // Check if user has an active subscription
    const hasSubscription = profile?.subscription_status === 'active' || 
                          profile?.subscription_status === 'trialing';

    return res.status(200).json({ 
      hasSubscription,
      subscriptionStatus: profile?.subscription_status || 'none',
      subscriptionId: profile?.stripe_subscription_id || null
    });

  } catch (error) {
    console.error('Error checking subscription:', error);
    return res.status(500).json({ 
      error: 'Error checking subscription status',
      details: error.message 
    });
  }
} 