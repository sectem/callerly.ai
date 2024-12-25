import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Request received:', req.method)
    const { type, payment_method, user_id, billing_details } = await req.json()
    console.log('Request payload:', { type, payment_method, user_id })

    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    switch (type) {
      case 'set_default_payment_method':
        console.log('Setting default payment method:', payment_method)
        try {
          // First get the payment method details
          const { data: methodData, error: methodError } = await supabaseClient
            .from('payment_methods')
            .select('stripe_customer_id, payment_method_id')
            .eq('payment_method_id', payment_method)
            .eq('user_id', user_id)
            .single()

          if (methodError || !methodData?.stripe_customer_id) {
            console.error('Error fetching payment method:', methodError)
            throw new Error('Payment method not found')
          }

          console.log('Found payment method with customer ID:', methodData.stripe_customer_id)

          // First update in Stripe
          await stripe.customers.update(
            methodData.stripe_customer_id,
            { 
              invoice_settings: { 
                default_payment_method: methodData.payment_method_id 
              } 
            }
          )
          console.log('Default payment method updated in Stripe')

          // Then update in our database
          const { error: updateError } = await supabaseClient
            .from('payment_methods')
            .update({ is_default: false })
            .eq('user_id', user_id)

          if (updateError) {
            console.error('Error updating existing payment methods:', updateError)
            throw updateError
          }

          const { error: setDefaultError } = await supabaseClient
            .from('payment_methods')
            .update({ is_default: true })
            .eq('payment_method_id', payment_method)
            .eq('user_id', user_id)

          if (setDefaultError) {
            console.error('Error setting default payment method:', setDefaultError)
            throw setDefaultError
          }

          console.log('Default payment method updated in database')

          return new Response(
            JSON.stringify({ success: true }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        } catch (error) {
          console.error('Error setting default payment method:', error)
          throw error
        }

      case 'get_payment_method':
        console.log('Retrieving payment method:', payment_method)
        try {
          const paymentMethod = await stripe.paymentMethods.retrieve(payment_method)
          console.log('Payment method retrieved:', paymentMethod)
          return new Response(JSON.stringify({ paymentMethod }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        } catch (stripeError) {
          console.error('Stripe error:', stripeError)
          throw stripeError
        }

      case 'delete_payment_method':
        console.log('Deleting payment method:', payment_method)
        try {
          // First check if this is the default payment method and get customer ID
          const { data: methodData, error: methodError } = await supabaseClient
            .from('payment_methods')
            .select('is_default, stripe_customer_id, payment_method_id')
            .eq('payment_method_id', payment_method)
            .eq('user_id', user_id)
            .single()

          if (methodError) {
            console.error('Error fetching payment method:', methodError)
            throw new Error('Payment method not found')
          }

          if (methodData.is_default) {
            throw new Error('Cannot delete the default payment method. Please set another card as default first.')
          }

          console.log('Found payment method:', methodData)

          try {
            // First detach the payment method from the customer in Stripe
            await stripe.paymentMethods.detach(methodData.payment_method_id)
            console.log('Payment method detached from Stripe')
          } catch (stripeError) {
            console.error('Error detaching payment method from Stripe:', stripeError)
            // If the payment method doesn't exist in Stripe, we can still proceed with database deletion
            if (stripeError.code !== 'resource_missing') {
              throw stripeError
            }
          }

          // Then delete from our database
          const { error: deleteError } = await supabaseClient
            .from('payment_methods')
            .delete()
            .eq('payment_method_id', payment_method)
            .eq('user_id', user_id)

          if (deleteError) {
            console.error('Error deleting from database:', deleteError)
            throw new Error('Failed to delete payment method from database')
          }

          console.log('Payment method deleted from database')

          return new Response(
            JSON.stringify({ success: true }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        } catch (error) {
          console.error('Error deleting payment method:', error)
          throw error
        }

      case 'create_customer':
        // First check if user already has a customer ID
        const { data: existingPaymentMethod, error: fetchError } = await supabaseClient
          .from('payment_methods')
          .select('stripe_customer_id')
          .eq('user_id', user_id)
          .limit(1)
          .single()

        let customer_id = existingPaymentMethod?.stripe_customer_id

        if (!customer_id) {
          // Create new customer in Stripe only if one doesn't exist
          const customer = await stripe.customers.create({
            email: billing_details.email,
            name: billing_details.name,
            address: billing_details.address
          })
          customer_id = customer.id
        }

        // Attach the payment method to the customer
        await stripe.paymentMethods.attach(payment_method, {
          customer: customer_id,
        })

        // Set it as the default payment method
        await stripe.customers.update(customer_id, {
          invoice_settings: {
            default_payment_method: payment_method,
          },
        })

        // First, update all existing payment methods to not default
        const { error: updateError } = await supabaseClient
          .from('payment_methods')
          .update({ is_default: false })
          .eq('user_id', user_id)

        if (updateError) throw updateError

        // Then store new payment method in database
        const { error: insertError } = await supabaseClient
          .from('payment_methods')
          .insert({
            user_id: user_id,
            payment_method_id: payment_method,
            stripe_customer_id: customer_id,
            card_brand: billing_details.card.brand,
            card_last4: billing_details.card.last4,
            card_exp_month: billing_details.card.exp_month,
            card_exp_year: billing_details.card.exp_year,
            billing_name: billing_details.name,
            billing_email: billing_details.email,
            billing_address_line1: billing_details.address.line1,
            billing_address_line2: billing_details.address.line2,
            billing_city: billing_details.address.city,
            billing_state: billing_details.address.state,
            billing_postal_code: billing_details.address.postal_code,
            billing_country: billing_details.address.country,
            is_default: true // New card is always default
          })

        if (insertError) throw insertError

        return new Response(
          JSON.stringify({
            customer_id: customer_id,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )

      default:
        console.log('Invalid type:', type)
        return new Response('Invalid type', { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}) 