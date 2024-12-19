import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Initialize Supabase Admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getUserByCustomerId(customerId) {
  try {
    // First try to find the user by stripe_customer_id
    const { data: profileByStripeId, error: stripeIdError } = await supabase
      .from('profiles')
      .select('*')
      .eq('stripe_customer_id', customerId)
      .single();

    if (profileByStripeId) {
      return profileByStripeId;
    }

    // If not found, get the customer from Stripe to find their email
    const customer = await stripe.customers.retrieve(customerId);
    
    // Then find the user by email
    const { data: profileByEmail, error: emailError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', customer.email)
      .single();

    if (emailError) {
      throw new Error(`No user found for customer ${customerId}`);
    }

    return profileByEmail;
  } catch (error) {
    console.error('Error finding user:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = await buffer(req);
    const sig = req.headers['stripe-signature'];

    if (!sig || !endpointSecret) {
      console.error('Missing stripe-signature or webhook secret');
      return res.status(400).json({ error: 'Missing stripe signature or webhook secret' });
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
      console.log('Received webhook event:', event.type);
    } catch (err) {
      console.error(`⚠️ Webhook signature verification failed:`, err.message);
      return res.status(400).json({
        error: `Webhook Error: ${err.message}`
      });
    }

    // Handle the event
    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          const subscription = event.data.object;
          await handleSubscriptionChange(subscription);
          break;
        
        case 'customer.subscription.deleted':
          const canceledSubscription = event.data.object;
          await handleSubscriptionCancellation(canceledSubscription);
          break;

        case 'invoice.payment_failed':
          const failedInvoice = event.data.object;
          await handleFailedPayment(failedInvoice);
          break;

        case 'checkout.session.completed':
          const session = event.data.object;
          if (session.mode === 'subscription') {
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            await handleSubscriptionChange(subscription);
          }
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      return res.json({ received: true, type: event.type });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return res.status(500).json({ 
        error: 'Error processing webhook',
        details: error.message 
      });
    }
  } catch (err) {
    console.error('Error handling webhook:', err);
    return res.status(400).json({
      error: `Webhook Error: ${err.message}`
    });
  }
}

async function handleSubscriptionChange(subscription) {
  console.log('Processing subscription change:', subscription.id);
  
  try {
    const customerId = subscription.customer;
    const status = subscription.status;
    const priceId = subscription.items.data[0].price.id;
    
    // Get the user profile
    const userProfile = await getUserByCustomerId(customerId);
    
    if (!userProfile) {
      throw new Error(`No user found for customer ${customerId}`);
    }

    // Update user's subscription status in Supabase
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: status,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userProfile.id);

    if (error) {
      console.error('Error updating subscription in Supabase:', error);
      throw error;
    }

    console.log('Successfully updated subscription for user:', userProfile.id);
  } catch (error) {
    console.error('Error in handleSubscriptionChange:', error);
    throw error;
  }
}

async function handleSubscriptionCancellation(subscription) {
  console.log('Processing subscription cancellation:', subscription.id);
  
  try {
    const customerId = subscription.customer;
    const userProfile = await getUserByCustomerId(customerId);

    if (!userProfile) {
      throw new Error(`No user found for customer ${customerId}`);
    }

    // Update user's subscription status in Supabase
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'canceled',
        subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userProfile.id);

    if (error) {
      console.error('Error updating subscription cancellation in Supabase:', error);
      throw error;
    }

    console.log('Successfully updated subscription cancellation for user:', userProfile.id);
  } catch (error) {
    console.error('Error in handleSubscriptionCancellation:', error);
    throw error;
  }
}

async function handleFailedPayment(invoice) {
  console.log('Processing failed payment:', invoice.id);
  
  try {
    const customerId = invoice.customer;
    const userProfile = await getUserByCustomerId(customerId);

    if (!userProfile) {
      throw new Error(`No user found for customer ${customerId}`);
    }

    // Update user's subscription status in Supabase
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'past_due',
        last_payment_error: invoice.last_payment_error?.message || 'Payment failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', userProfile.id);

    if (error) {
      console.error('Error updating payment failure in Supabase:', error);
      throw error;
    }

    console.log('Successfully updated payment failure for user:', userProfile.id);
  } catch (error) {
    console.error('Error in handleFailedPayment:', error);
    throw error;
  }
} 