import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  try {
    // Verify the session token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return res.status(401).json({ 
        error: 'Unauthorized access. Please sign in again.' 
      });
    }

    // Get the user's profile using user_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return res.status(400).json({ 
        error: 'Error fetching user profile. Please try again.' 
      });
    }

    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ 
        error: 'No subscription found. Please subscribe to a plan first.' 
      });
    }

    try {
      // Verify the customer exists in Stripe
      const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
      
      if (!customer || customer.deleted) {
        return res.status(400).json({ 
          error: 'Invalid subscription. Please contact support.' 
        });
      }

      // Create Stripe portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
      });

      // Return the portal session URL
      return res.status(200).json({ url: session.url });
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      return res.status(400).json({ 
        error: 'Failed to create portal session. Please try again.' 
      });
    }
  } catch (error) {
    console.error('Portal session creation error:', error);
    return res.status(500).json({ 
      error: 'An unexpected error occurred. Please try again.' 
    });
  }
} 