import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { payment_method, amount, type, user_id } = req.body;

    // Handle getting payment method details
    if (type === 'get_payment_method') {
      try {
        const paymentMethod = await stripe.paymentMethods.retrieve(payment_method);
        return res.status(200).json({ paymentMethod });
      } catch (error) {
        console.error('Error retrieving payment method:', error);
        return res.status(400).json({ error: 'Invalid payment method' });
      }
    }

    if (!user_id) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    // Get user's payment method to get Stripe customer ID
    const { data: paymentMethod, error: paymentMethodError } = await supabase
      .from('payment_methods')
      .select('stripe_customer_id')
      .eq('user_id', user_id)
      .single();

    if (paymentMethodError) {
      console.error('Error fetching payment method:', paymentMethodError);
      return res.status(400).json({ error: 'Failed to fetch payment method' });
    }

    if (!paymentMethod?.stripe_customer_id) {
      return res.status(400).json({ error: 'No payment method found' });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      customer: paymentMethod.stripe_customer_id,
      payment_method: payment_method,
      off_session: true,
      confirm: true,
    });

    return res.status(200).json({ 
      success: true,
      payment_intent: paymentIntent.id 
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process payment'
    });
  }
}
