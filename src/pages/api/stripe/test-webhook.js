import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user ID from request
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Create a test subscription event
    const testEvent = {
      id: `evt_test_${Date.now()}`,
      type: 'customer.subscription.created',
      data: {
        object: {
          id: `sub_test_${Date.now()}`,
          customer: `cus_test_${Date.now()}`,
          status: 'active',
          current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
          items: {
            data: [{
              price: {
                id: 'price_test_basic'
              }
            }]
          }
        }
      }
    };

    // Update the profile with test data
    const { error } = await supabase
      .from('profiles')
      .update({
        stripe_customer_id: testEvent.data.object.customer,
        stripe_subscription_id: testEvent.data.object.id,
        stripe_price_id: testEvent.data.object.items.data[0].price.id,
        subscription_status: testEvent.data.object.status,
        subscription_period_end: new Date(testEvent.data.object.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Test webhook processed successfully',
      event: testEvent 
    });

  } catch (error) {
    console.error('Error processing test webhook:', error);
    return res.status(500).json({ 
      error: 'Error processing test webhook', 
      details: error.message 
    });
  }
} 