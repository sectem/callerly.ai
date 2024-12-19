import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, phoneNumber } = req.body;

    if (!userId || !phoneNumber) {
      return res.status(400).json({ error: 'User ID and phone number are required' });
    }

    // Check if user already has a phone number
    const { data: existingNumbers, error: fetchError } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('user_id', userId);

    if (fetchError) {
      throw new Error('Error checking existing numbers: ' + fetchError.message);
    }

    if (existingNumbers && existingNumbers.length > 0) {
      return res.status(400).json({ 
        error: 'User already has a phone number. Please release the existing number first.' 
      });
    }

    // Purchase the number from Twilio
    console.log('Purchasing number:', phoneNumber);

    // For development, we'll purchase the number without setting webhook URLs
    // In production, you should set these to your actual webhook URLs
    const purchaseOptions = {
      phoneNumber,
    };

    // Only add webhook URLs in production environment
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_APP_URL) {
      purchaseOptions.voiceUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice`;
      purchaseOptions.smsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/sms`;
    }

    const purchasedNumber = await client.incomingPhoneNumbers.create(purchaseOptions);

    console.log('Number purchased:', purchasedNumber.sid);

    // Store the number details in Supabase
    const { data, error } = await supabase
      .from('phone_numbers')
      .insert({
        user_id: userId,
        phone_number: purchasedNumber.phoneNumber,
        twilio_sid: purchasedNumber.sid,
        friendly_name: purchasedNumber.friendlyName || purchasedNumber.phoneNumber,
        status: 'active',
        capabilities: {
          voice: purchasedNumber.capabilities.voice || false,
          SMS: purchasedNumber.capabilities.SMS || false,
          MMS: purchasedNumber.capabilities.MMS || false,
        },
        metadata: {
          voice_url: purchasedNumber.voiceUrl,
          sms_url: purchasedNumber.smsUrl,
          region: purchasedNumber.region,
          locality: purchasedNumber.locality,
          rate_center: purchasedNumber.rateCenter,
          latitude: purchasedNumber.latitude,
          longitude: purchasedNumber.longitude,
          lata: purchasedNumber.lata,
          iso_country: purchasedNumber.isoCountry,
          address_requirements: purchasedNumber.addressRequirements,
          beta: purchasedNumber.beta,
          origin: purchasedNumber.origin,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // If there's an error storing in Supabase, release the number from Twilio
      await client.incomingPhoneNumbers(purchasedNumber.sid).remove();
      throw new Error('Error storing number in database: ' + error.message);
    }

    // If in development, update the webhook URLs after purchase
    if (process.env.NODE_ENV !== 'production') {
      try {
        await client.incomingPhoneNumbers(purchasedNumber.sid)
          .update({
            voiceUrl: 'https://demo.twilio.com/welcome/voice/',
            smsUrl: 'https://demo.twilio.com/welcome/sms/'
          });
      } catch (webhookError) {
        console.warn('Warning: Could not update webhook URLs:', webhookError);
      }
    }

    console.log('Number stored in database:', data.id);
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error purchasing number:', error);
    return res.status(500).json({ 
      error: 'Failed to purchase number',
      details: error.message 
    });
  }
} 