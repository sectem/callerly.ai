import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getOrCreateCustomer(userId, email) {
  try {
    // First, check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profile?.stripe_customer_id) {
      // Return existing customer
      return profile.stripe_customer_id;
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      metadata: {
        supabaseUserId: userId
      }
    });

    // Update profile with new customer ID
    const updateData = {
      stripe_customer_id: customer.id
    };

    // Only add updated_at if it exists in the table
    try {
      await supabase.from('profiles').update({ updated_at: new Date().toISOString() }).eq('id', userId);
      updateData.updated_at = new Date().toISOString();
    } catch (error) {
      console.log('updated_at column might not exist:', error.message);
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) throw error;

    return customer.id;
  } catch (error) {
    console.error('Error in getOrCreateCustomer:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priceId, userId, userEmail } = req.body;

    if (!priceId || !userId || !userEmail) {
      return res.status(400).json({ error: 'Price ID, user ID, and email are required' });
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(userId, userEmail);

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/plans`,
      subscription_data: {
        metadata: {
          supabaseUserId: userId
        }
      },
      allow_promotion_codes: true,
      client_reference_id: userId,
      metadata: {
        supabaseUserId: userId
      }
    });

    // Try to update profile with session information
    try {
      const updateData = {};

      // Try to update each field separately to handle missing columns
      try {
        await supabase
          .from('profiles')
          .update({ last_checkout_session: session.id })
          .eq('id', userId);
        updateData.last_checkout_session = session.id;
      } catch (error) {
        console.log('last_checkout_session column might not exist:', error.message);
      }

      try {
        await supabase
          .from('profiles')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', userId);
        updateData.updated_at = new Date().toISOString();
      } catch (error) {
        console.log('updated_at column might not exist:', error.message);
      }

      // If we have any data to update, do a final update
      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId);
      }
    } catch (error) {
      console.log('Error updating profile, but continuing:', error.message);
    }

    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ 
      error: 'Error creating checkout session',
      details: error.message 
    });
  }
} 