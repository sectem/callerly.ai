import Stripe from 'stripe';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { amount = 100, quantity = 1 } = req.body;

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Credits',
              description: 'Minutes for AI calls',
            },
            unit_amount: amount * 100, // Convert to cents
          },
          quantity: quantity,
        },
      ],
      success_url: `${req.headers.origin}/dashboard/billing?purchase=success`,
      cancel_url: `${req.headers.origin}/plans`,
      metadata: {
        user_id: session.user.id,
      },
      customer_email: session.user.email,
    });

    return res.status(200).json({
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create checkout session',
    });
  }
} 