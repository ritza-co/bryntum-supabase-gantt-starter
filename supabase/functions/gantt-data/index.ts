import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

async function applyTableChanges(client: SupabaseClient, table: string, changes) {
  let rows;
  if (changes.added) {
    for (const row of changes.added) {
      delete row['$PhantomId']
      delete row['baselines']
      delete row['delayFromParent']
      delete row['segments']
      delete row['direction']
      delete row['projectConstraintResolution']
      delete row['unscheduled']
      const { data, error } = await client.from(table).insert(row).select()
      if (error) throw error
      rows = data
    }
  }
  if (changes.updated) {
    for (const row of changes.updated) {
      const { error } = await client.from(table).update(row).eq('id', row.id).select()
      if (error) throw error
    }
  }
  if (changes.removed) {
    for (const row of changes.removed) {
      const { error } = await client.from(table).delete().eq('id', row.id)
      if (error) throw error
    }
  }
  // if got some new data to update client
  return rows;
}

Deno.serve(async (req: Request) => {
  const { method } = req
  // This is needed if you're planning to invoke your function from a browser.
  if (method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the logged-in user.
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

    if (req.method === 'GET') {     
      // Query the tasks table
      const { data: taskData, error: taskError } = await supabaseClient.from('tasks').select('*')
      if (taskError) throw taskError

      // Query the dependencies table
      const { data: dependencyData, error: dependencyError } = await supabaseClient.from('dependencies').select('*')
      if (dependencyError) throw dependencyError

      return new Response(JSON.stringify({ 
        tasks: {rows: taskData}, 
        dependencies: {rows: dependencyData}, 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const responseData = { requestId: body.requestId, success : true };

      // if task changes are passed
      if (body.tasks) {
        const rows = await applyTableChanges(supabaseClient, 'tasks', body.tasks)
        // if got some new data to update client
        if (rows) {
          responseData.tasks = { rows };
        }
      }
      // if dependency changes are passed
      if (body.dependencies) {
        const rows = await applyTableChanges(supabaseClient, 'dependencies', body.dependencies)
        // if got some new data to update client
        if (rows) {
          responseData.dependencies = { rows };
        }
      }

      return new Response(JSON.stringify({ 
        tasks: {rows: responseData.tasks}, 
        dependencies: {rows: responseData.dependencies}, 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }    
  } 
  catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
