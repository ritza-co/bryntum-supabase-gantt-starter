// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "gantt-data" up and running!`)

Deno.serve(async (req: Request) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user.
    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default.
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exported by default.
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function.
      // This way your row-level-security (RLS) policies are applied.
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // First get the token from the Authorization header
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''

    // Now we can get the session or user object
    const {
      data: { user },
    } = await supabaseClient.auth.getUser(token)

    // Query the tasks table
    const { data: taskData, error: taskError } = await supabaseClient.from('tasks').select('*')
    if (taskError) throw taskError

    // Query the dependencies table
    const { data: dependencyData, error: dependencyError } = await supabaseClient.from('dependencies').select('*')
    if (dependencyError) throw dependencyError
    // Combine the results
    const responseData = {
      tasks: taskData,
      dependencies: dependencyData,
    }

    return new Response(JSON.stringify({ user, responseData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
