import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, user_id, agent_data } = await req.json()

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
      case 'create_agent':
        const { data: agent, error: createError } = await supabaseClient
          .from('vapi_agents')
          .insert({
            user_id,
            name: agent_data.name,
            voice_id: agent_data.voice_id,
            voice_provider: agent_data.voice_provider,
            is_active: true
          })
          .select()
          .single()

        if (createError) throw createError

        // Create associated script
        if (agent_data.script_content) {
          const { error: scriptError } = await supabaseClient
            .from('scripts')
            .insert({
              agent_id: agent.id,
              name: agent_data.name,
              script_content: agent_data.script_content
            })

          if (scriptError) throw scriptError
        }

        return new Response(
          JSON.stringify(agent),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'update_agent':
        const { agent_id, updates } = agent_data
        const { data: updatedAgent, error: updateError } = await supabaseClient
          .from('vapi_agents')
          .update({
            name: updates.name,
            voice_id: updates.voice_id,
            voice_provider: updates.voice_provider,
            is_active: updates.is_active
          })
          .eq('id', agent_id)
          .eq('user_id', user_id)
          .select()
          .single()

        if (updateError) throw updateError

        // Update associated script
        if (updates.script_content) {
          const { error: scriptError } = await supabaseClient
            .from('scripts')
            .upsert({
              agent_id: agent_id,
              name: updates.name,
              script_content: updates.script_content
            }, {
              onConflict: 'agent_id'
            })

          if (scriptError) throw scriptError
        }

        return new Response(
          JSON.stringify(updatedAgent),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'delete_agent':
        const { agent_id: deleteId } = agent_data
        const { error: deleteError } = await supabaseClient
          .from('vapi_agents')
          .delete()
          .eq('id', deleteId)
          .eq('user_id', user_id)

        if (deleteError) throw deleteError

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'get_agents':
        const { data: agents, error: listError } = await supabaseClient
          .from('vapi_agents')
          .select('*')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false })

        if (listError) throw listError

        return new Response(
          JSON.stringify(agents),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        return new Response(
          'Invalid type',
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 