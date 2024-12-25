import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json',
}

// Validate required environment variables
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  throw new Error('Missing required Twilio environment variables')
}

const TWILIO_BASE_URL = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}`

console.log('Initializing Twilio integration with:', {
  accountSid: TWILIO_ACCOUNT_SID?.slice(0, 5) + '...',
  hasAuthToken: !!TWILIO_AUTH_TOKEN
})

// Helper function for Twilio API calls
const twilioFetch = async (endpoint: string, options: RequestInit = {}) => {
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
  const response = await fetch(`${TWILIO_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
  
  const responseText = await response.text()
  if (!response.ok) {
    console.error('Twilio API error:', responseText)
    throw new Error(`Twilio API error: ${response.status} ${response.statusText}`)
  }
  
  try {
    return JSON.parse(responseText)
  } catch (e) {
    console.error('Error parsing Twilio response:', e)
    throw new Error('Invalid response from Twilio API')
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { status: 405, headers: corsHeaders }
      )
    }

    // Parse request body
    let requestData: any
    try {
      requestData = await req.json()
    } catch (e) {
      console.error('Error parsing request body:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('Processing request:', requestData)

    const { 
      action, 
      country = 'US', 
      pattern = '', 
      matchType = 'contains', 
      user_id, 
      phone_number 
    } = requestData

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Action is required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    switch (action) {
      case 'getNumber': {
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { status: 400, headers: corsHeaders }
          )
        }

        try {
          // Get active phone number for user
          const { data: phoneData, error: phoneError } = await supabaseClient
            .from('phone_numbers')
            .select('phone_number, twilio_sid')
            .eq('user_id', user_id)
            .eq('is_active', true)
            .single();

          if (phoneError) {
            console.error('Database error:', phoneError);
            return new Response(
              JSON.stringify({ 
                error: 'Failed to get phone number',
                details: phoneError.message 
              }),
              { status: 500, headers: corsHeaders }
            );
          }

          return new Response(
            JSON.stringify({ data: phoneData }),
            { headers: corsHeaders }
          );
        } catch (error) {
          console.error('Error getting number:', error);
          return new Response(
            JSON.stringify({ 
              error: 'Failed to get phone number',
              details: error instanceof Error ? error.message : 'Unknown error'
            }),
            { status: 500, headers: corsHeaders }
          );
        }
      }

      case 'search_numbers': {
        // Build query parameters
        const params = new URLSearchParams({
          SmsEnabled: 'true',
          VoiceEnabled: 'true',
          Limit: '20'
        });

        // Normalize the pattern to remove any non-digit characters
        const normalizedPattern = pattern.replace(/[^0-9]/g, '');

        if (normalizedPattern) {
          switch (matchType) {
            case 'contains':
              params.set('Contains', normalizedPattern);
              break;
            case 'starts_with':
              params.set('AreaCode', normalizedPattern);
              break;
            case 'ends_with':
              params.set('Contains', normalizedPattern);
              break;
          }
        }

        console.log('Searching for numbers with params:', {
          country,
          pattern: normalizedPattern,
          matchType,
          params: params.toString()
        });

        try {
          const result = await twilioFetch(
            `/AvailablePhoneNumbers/${country}/Local.json?${params.toString()}`
          );

          const formattedNumbers = result.available_phone_numbers.map((number: any) => ({
            phoneNumber: number.phone_number,
            friendlyName: number.friendly_name,
            locality: number.locality,
            region: number.region,
            price: number.monthly_fee || '10',
            capabilities: {
              voice: number.capabilities.voice,
              SMS: number.capabilities.sms,
            }
          }));

          console.log('Found numbers:', formattedNumbers.length);
          return new Response(
            JSON.stringify({ numbers: formattedNumbers }),
            { headers: corsHeaders }
          );
        } catch (error) {
          console.error('Error searching numbers:', error);
          return new Response(
            JSON.stringify({ 
              error: 'Failed to search for numbers',
              details: error instanceof Error ? error.message : 'Unknown error'
            }),
            { status: 500, headers: corsHeaders }
          );
        }
      }

      case 'purchase_number': {
        if (!phone_number || !user_id) {
          return new Response(
            JSON.stringify({ error: 'Phone number and user ID are required' }),
            { status: 400, headers: corsHeaders }
          )
        }

        try {
          console.log('Starting purchase process for:', {
            phone_number,
            user_id
          });

          // First check if user already has a number
          const { data: existingNumber } = await supabaseClient
            .from('phone_numbers')
            .select('*')
            .eq('user_id', user_id)
            .maybeSingle();

          if (existingNumber) {
            return new Response(
              JSON.stringify({ 
                error: 'User already has a phone number',
                details: 'Please release the existing number before purchasing a new one'
              }),
              { status: 400, headers: corsHeaders }
            );
          }

          // Purchase the number through Twilio
          const params = new URLSearchParams({
            PhoneNumber: phone_number,
          });

          console.log('Calling Twilio API to purchase number...');
          let purchasedNumber;
          try {
            purchasedNumber = await twilioFetch(
              '/IncomingPhoneNumbers.json',
              {
                method: 'POST',
                body: params,
              }
            );
          } catch (twilioError) {
            console.error('Twilio API error:', twilioError);
            return new Response(
              JSON.stringify({ 
                error: 'Failed to purchase number from Twilio',
                details: twilioError instanceof Error ? twilioError.message : 'Unknown error'
              }),
              { status: 500, headers: corsHeaders }
            );
          }
          
          console.log('Successfully purchased number from Twilio:', {
            phone_number: purchasedNumber.phone_number,
            sid: purchasedNumber.sid
          });

          // Store the number in database
          console.log('Storing number in database...');
          const { data, error: dbError } = await supabaseClient
            .from('phone_numbers')
            .insert({
              user_id,
              phone_number: purchasedNumber.phone_number,
              twilio_sid: purchasedNumber.sid,
              encrypted_twilio_auth_token: await supabaseClient.rpc('encrypt_auth_token', {
                auth_token: TWILIO_AUTH_TOKEN
              }),
              is_active: true
            })
            .select()
            .single();

          if (dbError) {
            console.error('Database error:', dbError);
            // If database insert fails, try to release the number from Twilio
            try {
              await twilioFetch(
                `/IncomingPhoneNumbers/${purchasedNumber.sid}.json`,
                { method: 'DELETE' }
              );
              console.log('Released number from Twilio after database error');
            } catch (releaseError) {
              console.error('Failed to release number from Twilio:', releaseError);
            }
            return new Response(
              JSON.stringify({ 
                error: 'Failed to store phone number in database',
                details: dbError.message
              }),
              { status: 500, headers: corsHeaders }
            );
          }

          console.log('Successfully stored number in database:', data);
          return new Response(
            JSON.stringify(data),
            { headers: corsHeaders }
          );
        } catch (error) {
          console.error('Error in purchase process:', error);
          return new Response(
            JSON.stringify({ 
              error: 'Failed to complete purchase process',
              details: error instanceof Error ? error.message : 'Unknown error'
            }),
            { status: 500, headers: corsHeaders }
          );
        }
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: corsHeaders }
        )
    }
  } catch (error) {
    console.error('Error processing request:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: corsHeaders }
    )
  }
}) 