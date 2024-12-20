import Stripe from 'stripe';
import { supabase } from '@/utils/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Get subscription from database
    const { data: subscription, error: dbError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (dbError) throw dbError;

    if (!subscription) {
      return res.status(200).json({ subscription: null });
    }

    // Verify with Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    );

    // Check if subscription is truly active in Stripe
    const isActive = stripeSubscription.status === 'active' && 
                    stripeSubscription.current_period_end * 1000 > Date.now();

    if (!isActive) {
      // Update database if subscription is no longer active
      await supabase
        .from('subscriptions')
        .update({ status: stripeSubscription.status })
        .eq('id', subscription.id);

      return res.status(200).json({ subscription: null });
    }

    return res.status(200).json({ 
      subscription: {
        ...subscription,
        stripe_status: stripeSubscription.status,
        current_period_end: new Date(stripeSubscription.current_period_end * 1000)
      }
    });
  } catch (error) {
    console.error('Error checking subscription:', error);
    return res.status(500).json({ error: 'Error checking subscription status' });
  }
} 