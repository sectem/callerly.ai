import { buffer } from 'micro';
import Stripe from 'stripe';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

    let event;
    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { user_id, minutes } = session.metadata;

      if (!user_id || !minutes) {
        throw new Error('Missing required metadata');
      }

      // Initialize Supabase client
      const supabase = createPagesServerClient({ req, res });

      // Add credits to user's wallet
      const { error: creditError } = await supabase.rpc('add_wallet_credits', {
        p_user_id: user_id,
        p_amount: parseInt(minutes),
        p_transaction_type: 'purchase',
        p_description: `Purchased ${minutes} minutes`
      });

      if (creditError) {
        throw creditError;
      }

      console.log(`Successfully added ${minutes} credits to user ${user_id}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({
      error: 'Failed to process webhook',
      details: error.message
    });
  }
} 