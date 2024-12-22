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

  console.log('Create customer API called')
  const { email, payment_method, user_id, billing_details } = req.body;

  if (!email || !payment_method || !user_id || !billing_details) {
    console.error('Missing required fields:', { email, payment_method, user_id, billing_details })
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check for existing payment methods to get customer ID
    console.log('Checking for existing payment methods...')
    const { data: existingPaymentMethod, error: paymentMethodError } = await supabase
      .from('payment_methods')
      .select('stripe_customer_id')
      .eq('user_id', user_id)
      .single();

    if (paymentMethodError && paymentMethodError.code !== 'PGRST116') {
      console.error('Error fetching payment methods:', paymentMethodError)
      throw new Error('Failed to check existing payment methods');
    }

    let customerId = existingPaymentMethod?.stripe_customer_id;
    let customer;

    if (customerId) {
      console.log('Updating existing customer:', customerId)
      // Update existing customer
      customer = await stripe.customers.update(customerId, {
        email,
        name: billing_details.name,
        address: billing_details.address,
      });
    } else {
      console.log('Creating new customer...')
      // Create new customer
      customer = await stripe.customers.create({
        email,
        payment_method,
        name: billing_details.name,
        address: billing_details.address,
        invoice_settings: {
          default_payment_method: payment_method,
        },
      });
      customerId = customer.id;
    }

    // Attach payment method to customer
    console.log('Attaching payment method to customer...')
    await stripe.paymentMethods.attach(payment_method, {
      customer: customerId,
    });

    // Set as default payment method
    console.log('Setting as default payment method...')
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: payment_method,
      },
    });

    console.log('Customer setup completed successfully')
    return res.status(200).json({ 
      success: true,
      customer_id: customerId,
      message: 'Payment method added successfully' 
    });

  } catch (error) {
    console.error('Error in create-customer:', error)
    return res.status(500).json({
      error: error.message || 'Failed to setup payment method'
    });
  }
}
