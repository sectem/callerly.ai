import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return res.status(401).json({ error: 'Please sign in to save payment method' });
    }

    const { paymentMethodId } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'Missing payment method ID' });
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', session.user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      // Get user's email from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();

      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id
        }
      });

      customerId = customer.id;

      // Save Stripe customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', session.user.id);
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Save default payment method to profile
    await supabase
      .from('profiles')
      .update({ default_payment_method: paymentMethodId })
      .eq('id', session.user.id);

    return res.json({ success: true });
  } catch (error) {
    console.error('Error saving payment method:', error);
    return res.status(500).json({ error: 'Failed to save payment method' });
  }
}
