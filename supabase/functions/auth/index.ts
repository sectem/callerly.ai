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
    const { type, email, user_id } = await req.json()

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
      case 'resend_verification':
        const { error: resendError } = await supabaseClient.auth.resend({
          type: 'signup',
          email,
          options: {
            emailRedirectTo: `${Deno.env.get('NEXT_PUBLIC_APP_URL')}/auth/callback`
          }
        })

        if (resendError) throw resendError

        return new Response(
          JSON.stringify({ message: 'Verification email sent successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'update_user':
        const { user_metadata } = await req.json()
        const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
          user_id,
          { user_metadata }
        )

        if (updateError) throw updateError

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'delete_account':
        // Delete user's data first
        const { error: deleteDataError } = await supabaseClient
          .from('profiles')
          .delete()
          .eq('id', user_id)

        if (deleteDataError) throw deleteDataError

        // Delete the user account
        const { error: deleteUserError } = await supabaseClient.auth.admin.deleteUser(
          user_id
        )

        if (deleteUserError) throw deleteUserError

        return new Response(
          JSON.stringify({ success: true }),
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