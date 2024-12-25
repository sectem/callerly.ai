import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the request body
    const body = await req.json()
    const { action, phoneNumber, scriptContent, firstMessage, endCallMessage, userId } = body;

    // Get API key from request header
    const apiKey = req.headers.get('Authorization')?.split(' ')[1];
    if (apiKey !== Deno.env.get('SUPABASE_ANON_KEY')) {
      throw new Error('Invalid API key');
    }

    switch (action) {
      case 'create_agent': {
        // Check if VAPI API key exists
        const vapiApiKey = Deno.env.get('VAPI_API_KEY');
        if (!vapiApiKey) {
          throw new Error('VAPI API key not configured');
        }

        // Call VAPI API to create agent
        const vapiResponse = await fetch('https://api.vapi.ai/assistant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${vapiApiKey}`
          },
          body: JSON.stringify({
            name: phoneNumber,
            "transcriber": {
                "provider": "deepgram",
                "language": "en-US",
                "model": "nova-2-phonecall"
            },
            "model": {
                "provider": "openai",
                "model": "gpt-4o",
                "maxTokens": 1000,
                "temperature": 0.7,
                "emotionRecognitionEnabled": true,
                "messages": [
                    {
                        "role": "system",
                        "content": scriptContent
                    }
                ]
            },
            "voice": {
                "provider": "deepgram",
                "voiceId": "luna", 
                "fillerInjectionEnabled": true
            },
            "firstMessage": firstMessage,
            "firstMessageMode": "assistant-speaks-first",
            "backgroundSound": "office",
            "backgroundDenoisingEnabled": true,
            "serverMessages": [
                "end-of-call-report"
            ],
            "server": {
                "url": "https://sdvzu753p5mbhu3a3lsj23ufje0zldtj.lambda-url.us-east-1.on.aws"
            },
            "endCallMessage": endCallMessage,
            "startSpeakingPlan": {
                "waitSeconds": 1.5,
                "smartEndpointingEnabled": true,
                "transcriptionEndpointingPlan": {
                    "onPunctuationSeconds": 0.5,
                    "onNoPunctuationSeconds": 1.5,
                    "onNumberSeconds": 0.5
                }
            },
            "silenceTimeoutSeconds": 20,
            "endCallPhrases": [
                "bye for now",
                "talk soon"
            ],
            "endCallFunctionEnabled": true
        })
        });

        const vapiData = await vapiResponse.json();

        if (!vapiResponse.ok) {
          throw new Error(vapiData.error || 'Failed to create VAPI agent')
        }

        // Create agent in database
        const { data: newAgent, error: createError } = await supabaseClient
          .from('vapi_agents')
          .insert({
            user_id: userId,
            name: phoneNumber,
            vapi_agent_id: vapiData.id,
            voice_id: vapiData.voice?.voiceId || 'luna',
            voice_provider: vapiData.voice?.provider || 'deepgram',
            is_active: true
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        // Create script
        const { error: scriptError } = await supabaseClient
          .from('scripts')
          .insert({
            agent_id: newAgent.id,
            script_content: scriptContent,
            first_message: firstMessage,
            end_call_message: endCallMessage
          });

        if (scriptError) {
          throw scriptError;
        }

        const response = {
          id: vapiData.id,
          voice_id: vapiData.voice?.voiceId || 'luna',
          voice_provider: vapiData.voice?.provider || 'deepgram',
          status: 'success',
          agent_id: newAgent.id
        };

        const phoneResponse = await fetch(`https://api.vapi.ai/phone-number`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${vapiApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                number: phoneNumber,
                provider: 'twilio',
                assistantId: vapiData.id,
                twilioAccountSid: Deno.env.get('TWILIO_ACCOUNT_SID'),
                twilioAuthToken: Deno.env.get('TWILIO_AUTH_TOKEN')
            }),
        });

        if (!phoneResponse.ok) {
            const errorData = await phoneResponse.json();
            throw new Error(`Failed to associate phone number: ${errorData.message || phoneResponse.statusText}`);
        }

        return new Response(
          JSON.stringify(response),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }

      case 'update_agent': {
        const { agentId, vapiAgentId } = body;
        const vapiApiKey = Deno.env.get('VAPI_API_KEY');
        if (!vapiApiKey) {
          throw new Error('VAPI API key not configured');
        }

        // Update VAPI assistant
        const vapiResponse = await fetch(`https://api.vapi.ai/assistant/${vapiAgentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${vapiApiKey}`
          },
          body: JSON.stringify({
            name: phoneNumber,
            "model": {
                "provider": "openai",
                "model": "gpt-4o",
                "maxTokens": 1000,
                "temperature": 0.7,
                "emotionRecognitionEnabled": true,
                "messages": [
                    {
                        "role": "system",
                        "content": scriptContent
                    }
                ]
            },
            "firstMessage": firstMessage,
            "endCallMessage": endCallMessage
          })
        });

        const vapiData = await vapiResponse.json();
        if (!vapiResponse.ok) {
          throw new Error(vapiData.error || 'Failed to update VAPI agent');
        }

        // Update script in database
        const { error: scriptError } = await supabaseClient
          .from('scripts')
          .update({
            script_content: scriptContent,
            first_message: firstMessage,
            end_call_message: endCallMessage
          })
          .eq('agent_id', agentId);

        if (scriptError) {
          throw scriptError;
        }

        return new Response(
          JSON.stringify({
            status: 'success',
            message: 'Agent updated successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }

      default:
        throw new Error(`Unsupported action: ${action}`)
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
}) 