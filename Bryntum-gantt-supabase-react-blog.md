# How to use Supabase Edge Functions to build a Bryntum Gantt chart in React

The [Bryntum Gantt](https://bryntum.com/products/gantt/) is a feature-rich and performant method of visualizing and scheduling tasks over a set period. 
We will be working to integrate the quick and easy to use Brytum Gantt Chart with a Supabase Postgres database, while using Supabase Edge Functions and Auth with RLS(Row level security) enabled.

To follow this guide you will need a Supabase account, a running React app, Supabase project, and access to a Bryntum trial or license.

[Here](https://github.com/facebook/create-react-app) you can find some help setting up a React application
You can sign in or create your Supabase account [here](https://supabase.com/dashboard/sign-in?returnTo=%2Fprojects)
And sign up for a trial version of [Bryntum Gantt](https://bryntum.com/download/)

## Supabase Configuration
For us to set up the Supabase Edge Functions, we first need to get a few things ready!

Ensure you have created a project inside your organization:
![[supabase_project_creation.png]]

Or create a new one if you haven't:
![[supabase_project_creation_form.png]]

Once you have created your project, open the project settings and take note of your Reference ID, you will need this later:
![[supabase_project_ref_id.png]]

Then select API in project settings and take note of your Project API key, we need the one labeled `anon` `public` :
![[supabase_project_anon_key.png]]

You now need to add a new user, also taking note of the email and password to use later, this is found in the Authentication tab:
![[supabase_user_management.png]]

Now select the SQL Editor tab:
![[supabase_sql_insert 1.png]]

Create a new SQL query and copy the following SQL commands: 
```sql
CREATE TABLE tasks (
    id INT PRIMARY KEY,
    name VARCHAR(255),
    percentDone INT,
    startDate DATE,
    endDate DATE,
    duration INT,
    cost DECIMAL(10, 2),
    rollup BOOLEAN,
    expanded BOOLEAN,
    showInTimeline BOOLEAN,
    parentId INT,
    FOREIGN KEY (parentId) REFERENCES tasks(id)
);

-- Insert data into the tasks table
INSERT INTO tasks (id, name, percentDone, startDate, endDate, duration, cost, rollup, expanded, showInTimeline, parentId) VALUES
(1000, 'Launch SaaS Product', 50, '2022-03-14', NULL, NULL, NULL, NULL, TRUE, NULL, NULL),
(1, 'Setup web server', 50, '2022-03-14', '2022-03-23', 10, NULL, TRUE, TRUE, NULL, 1000),
(11, 'Install Apache', 50, '2022-03-14', '2022-03-17', 3, 200, TRUE, NULL, NULL, 1),
(12, 'Propsure firewall', 50, '2022-03-14', '2022-03-17', 3, 1000, TRUE, NULL, TRUE, 1),
(13, 'Setup load balancer', 50, '2022-03-14', '2022-03-17', 3, 1200, TRUE, NULL, NULL, 1),
(14, 'Propsure ports', 50, '2022-03-14', '2022-03-16', 2, 750, TRUE, NULL, NULL, 1),
(15, 'Run tests', 0, '2022-03-21', '2022-03-23', 2, 5000, TRUE, NULL, NULL, 1),
(2, 'Website Design', 60, '2022-03-23', '2022-04-13', NULL, NULL, TRUE, TRUE, NULL, 1000),
(21, 'Contact designers', 70, '2022-03-23', '2022-03-30', 5, 500, TRUE, NULL, NULL, 2),
(22, 'Create shortlist of three designers', 60, '2022-03-30', '2022-03-31', 1, 1000, TRUE, NULL, NULL, 2),
(23, 'Select & review final design', 50, '2022-03-31', '2022-04-02', 2, 1000, TRUE, NULL, TRUE, 2),
(24, 'Inform management about decision', 100, '2022-04-04', '2022-04-04', 0, 500, TRUE, NULL, NULL, 2),
(25, 'Apply design to web site', 0, '2022-04-04', '2022-04-13', 7, 11000, TRUE, NULL, NULL, 2),
(3, 'Setup Test Strategy', 20, '2022-03-14', NULL, NULL, NULL, NULL, TRUE, NULL, 1000),
(31, 'Hire QA staff', 40, '2022-03-14', '2022-03-19', 5, 6000, NULL, NULL, NULL, 3),
(33, 'Write test specs', 9, '2022-03-21', NULL, 5, NULL, NULL, TRUE, NULL, 3),
(331, 'Unit tests', 20, '2022-03-21', '2022-04-02', 10, 7000, NULL, NULL, TRUE, 33),
(332, 'UI unit tests / individual screens', 10, '2022-03-21', '2022-03-26', 5, 5000, NULL, NULL, TRUE, 33);
```
You can then run the queries to create a `tasks` table and populate it with some data.

After those SQL commands have been executed, you can use your edge function to retrieve this data from within your React application.

Now that you have the `tasks` table, you need to enable RLS on it:
![[supabase_tabel_policy_creation.png]]
![[supabase_tabel_policy_creation_form.png]]
The same process needs to be followed for every table you add and would like to access. This allows the user we created to read the data in the table, but will prevent any user that is not authenticated from doing so. This allows us to see RLS in action, users can be assigned policies that dictate their access to specific rows in our tables.
Tables with RLS enabled and no policies assigned will not allow any user (other than superuser) access to the table data.

And we are done with the project configuration for Supabase!

## Supabase CLI
The Supabase CLI is a fantastic tool to help you manage your Supabase instances by allowing you to develop, deploy, handle migrations and generate native data types for your Supabase project. 
You can access it within your shell environment using package managers for MacOS, Windows, Linux, and npm/Bun. For this walkthrough, we will assume you are using npm as your package manager, for any others, reference the [Supabase CLI Documentation](https://supabase.com/docs/guides/cli/getting-started?queryGroups=platform&platform=macos#installing-the-supabase-cli), but the basics will remain the same.
For now we are going to focus purely on creating a new edge function.

To create a new Supabase project, run the following from your shell inside the directory you want your project to live:
```shell
npx supabase init
```

Then we can create our new edge function:
```shell
npx supabase functions new tasks-rest
```

Open up the `index.ts` file that was just created, clear everything and add the following:
```ts
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface Task {
  name: string
  status: number
}

async function getTask(supabaseClient: SupabaseClient, id: string) {
  const { data: task, error } = await supabaseClient.from('tasks').select('*').eq('id', id)
  if (error) throw error

  return new Response(JSON.stringify({ task }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

async function getAllTasks(supabaseClient: SupabaseClient) {
  // Query the tasks table
  const { data: tasks, error: taskError } = await supabaseClient.from('tasks').select('*')

  if (taskError) throw taskError

  return new Response(JSON.stringify({ tasks }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

async function deleteTask(supabaseClient: SupabaseClient, id: string) {
  const { error } = await supabaseClient.from('tasks').delete().eq('id', id)
  
  if (error) throw error

  return new Response(JSON.stringify({}), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

async function updateTask(supabaseClient: SupabaseClient, id: string, task: Task) {
  const { error } = await supabaseClient.from('tasks').update(task).eq('id', id)

  if (error) throw error

  return new Response(JSON.stringify({ task }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

async function createTask(supabaseClient: SupabaseClient, task: Task) {
  const { error } = await supabaseClient.from('tasks').insert(task)

  if (error) throw error

  return new Response(JSON.stringify({ task }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

Deno.serve(async (req) => {
  const { url, method } = req
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    ) 

    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    const taskPattern = new URLPattern({ pathname: '/tasks-rest/:id' })
    const matchingPath = taskPattern.exec(url)
    const id = matchingPath ? matchingPath.pathname.groups.id : null
    const {
      data: { user },
    } = await supabaseClient.auth.getUser(token)
  
    let task = null
    
    if (method === 'POST' || method === 'PUT') {
      const body = await req.json()
      task = body.task
    }

    switch (true) {
      case id && method === 'GET':
        return getTask(supabaseClient, id as string)
      case id && method === 'PUT':
        return updateTask(supabaseClient, id as string, task)
      case id && method === 'DELETE':
        return deleteTask(supabaseClient, id as string)
      case method === 'POST':
        return createTask(supabaseClient, task)
      case method === 'GET':
        return getAllTasks(supabaseClient)
      default:
        return new Response(JSON.stringify({ user }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
```
To explain what is happening in this edge function, let's break down some of the blocks of code and explain their features and purpose.

Here we are configuring our CORS headers to allow cross-site traffic, authorization headers, and the `POST`, `GET`, `OPTIONS`, `PUT`, and `DELETE` methods.
```ts
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}
```
Doing so allows us to use this edge function as a RESTful API which can be called using a URL that we will see once we have deployed the function to our Supabase project.

Here you defined an async function that accepts an `id` parameter and uses the Supabase client to run the appropriate `select` query and then returns the response or throws an error.
```ts
async function getTask(supabaseClient: SupabaseClient, id: string) {
  const { data: task, error } = await supabaseClient.from('tasks').select('*').eq('id', id)
  if (error) throw error 
  
  return new Response(JSON.stringify({ task }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}
```
There are methods for all the verbs in a request:
```ts
async function getAllTasks(supabaseClient: SupabaseClient) {
  const { data: tasks, error: taskError } = await supabaseClient.from('tasks').select('*')
  if (taskError) throw taskError
  
  return new Response(JSON.stringify({ tasks }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}
```

You start the [Deno](https://supabase.com/blog/edge-runtime-self-hosted-deno-functions) runtime that serves the function with:
```ts
Deno.serve(async (req) => {

}
```

Then you set up Supabase Client using the current user authorization headers:
```ts
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
```
This uses environment variables and the `Authorization` header from the request to get the values to create the context for the client.

Here you got the bearer token for authorization, set up a URL pattern to parse the incoming request, and then used the Supabase Auth library to authorize the current user based on the bearer token:
```ts
const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
const taskPattern = new URLPattern({ pathname: '/tasks-rest/:id' })
const matchingPath = taskPattern.exec(url)
const id = matchingPath ? matchingPath.pathname.groups.id : null
const {
  data: { user },
} = await supabaseClient.auth.getUser(token)
```

Then you added the main logic that calls the relevant function based on the given verb in a request:
```ts
if (method === 'POST' || method === 'PUT') {
  const body = await req.json()
  task = body.task
}

switch (true) {
  case id && method === 'GET':
	return getTask(supabaseClient, id as string)
  case id && method === 'PUT':
	return updateTask(supabaseClient, id as string, task)
  case id && method === 'DELETE':
	return deleteTask(supabaseClient, id as string)
  case method === 'POST':
	return createTask(supabaseClient, task)
  case method === 'GET':
	return getAllTasks(supabaseClient)
  default:
	return new Response(JSON.stringify({ user }), {
	  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	  status: 200,
	})
}
} catch (error) {
return new Response(JSON.stringify({ error: error.message }), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  status: 400,
})
```

Now that you have successfully created your edge function, you can deploy it to your Supabase project:
```shell
supabase functions deploy task-rest --project-ref <Project_Ref_Id>
```
These are the values that can be found in your Supabase project API settings.


If you now navigate to your Supabase instance, you should see your new edge function deployed:
![[supabase_edge_function_deployed.png]]

Here you can see the URL that can be used to access your edge function. Based on the verb in your request, a method will be called that performs the operation and returns a result. These functions can be set up in many possible configurations and can easily be manipulated into performing a variety of tasks or processing using any table or combination thereof.

Creating edge functions is fairly simple and has huge potential for streamlining the way you retrieve and process data from your database. 

You now have successfully created a new table, edge function, and set up authorized access to the data in that table to which by applying the appropriate policy. 
Edge functions run server-side in your Suipabase instance, and enforce the security policies you stipulated, this has given you secure, low-latency access to the data you have stored in your Postgres database.


## React Application
Now that you have your database and edge function created, you can begin adding the Brytum Gantt Chart to your React application. If you do not have an existing React application ready, [these](https://bryntum.com/products/gantt/docs/guide/Gantt/quick-start/react) instructions should get you started quickly. You will also need to make sure you have a paid or trial license for Bryntum to be able to access the registry.

Inside the directory of your new or existing application, e.g. `C:\Users\<user>\source\repos\bryntum-supabase\bryntum-gantt-react-supabase-starter`, you will first need to configure **npm** to be able to download the Bryntum packages in the `@brytum` scope from the Bryntum registry:
```shell
npm config set "@bryntum:registry=https://npm.bryntum.com"
```

Check that npm has been configured correctly with:
```shell
npm config list
```
You should see the following in the response:
```shell
@bryntum:registry = "https://npm.bryntum.com"
```
Now login to Bryntum:
```shell
npm login --registry=https://npm.bryntum.com
```
You can then enter your credentials, in this example we are using the trial versions, the username is what you used to set up your trial account. 
```shell
Username: user..yourdomain.com
Password: trial
Email: (this IS public) user@yourdomain.com
```
The process remains the same for a fully licensed version. You just need to ensure that you use the correct credentials to access the full version.

Now that you have configured npm and signed into your Brytum account, we need to install the `sass` package if you do not already have it:
```shell
npm install sass
```
Bryntum Gantt uses [Sass](https://sass-lang.com/) to apply css rules to the generated graph.

You can then install the Bryntum React package:
```shell 
npm install @bryntum/gantt@npm:@bryntum/gantt-trial @bryntum/gantt-react
```
And the Supabase React Auth UI:
```shell
npm install @supabase/supabase-js @supabase/auth-ui-react @supabase/auth-ui-shared
```

That is all the setup that our React application requires to be able to use the Supabase login component and Bryntum Gantt Chart. Next you are going to set up the connection to your Supabase edge function.

Create a new directory for some utilities:
```shell
mkdir utils
```
Navigate into your new directory:
```shell
cd utils
```
Add a new JavaScript file named `supabaseClient.js` inside the directory and paste in the following:
```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL ?? 'https://<Project_Ref_Id>.supabase.co',
  process.env.REACT_APP_SUPABASE_ANON_KEY ??
    '<Supabase_Anonymous_Key>'
)
```
Replace `<Project_Ref_Id>` and `<Supabase_Anonymous_Key>`  with the values we took note of earlier. This is used to configure the connection client to your Supabase project and will be used for all connections to the Supabase instance. This client will be used be used to call our edge functions.

Navigate back to the root of your React project:
```shell
cd ../..
```
Inside your `src` directory:
```shell
cd src
```
Find your `index.js` file and replace its contents with:
```js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Auth } from '@supabase/auth-ui-react'
import { supabase } from './utils/supabaseClient'

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Auth.UserContextProvider supabaseClient={supabase}>
      <App />
    </Auth.UserContextProvider>
  </React.StrictMode>
);
```
This imports the `supabaseClient` we just created, and adds the Supabase React Auth UI as our user context provider and launches the app.

Still inside your `src` directory, replace everything inside your `App.js` file with:
```js
import './App.scss';
import './index.css'
import { useState, useEffect } from 'react'
import { supabase } from './utils/supabaseClient'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { BryntumGantt } from '@bryntum/gantt-react';
import { gantt } from './ganttChart';

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
  
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!session) {
    return (<div style={{display: 'flex',  justifyContent:'center', alignItems:'center', height: '100vh'}}>
            <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} />
          </div>)
  }
  else {
    return (
    <div style={{ height: '100%', justifyContent: 'space-around', alignContent: 'center'}}>
      <BryntumGantt {...gantt} />
      <button
        onClick={() => supabase.auth.signOut()}
      >
        Sign out
      </button>
    </div>)
  }
}

export default App;
```
This handles displaying the Supabase React Auth UI login screen, and once a user has successfully logged in, we will show our Gantt chart component which we will be configuring next. It will also display a button to sign out the current user to showcase the integration of the Auth UI into your application.

Still in our `src` directory, add a `ganttChart.js` file and add:
```js
import { supabase } from './utils/supabaseClient'  

// Call our edge function
const { data, error } = await supabase.functions.invoke("task-rest", {"name":"Functions"})
if (error) alert(error)
  console.log(data.responseData)

const tasks = data.responseData.tasks;

const gantt = {
  viewPreset : 'weekAndDayLetter',
  barMargin  : 10,
  project : {
      tasks: tasks,
      autoLoad: true,
      autoSetConstraints : true
  }
};

export { gantt};
```
Here you invoke the edge function we created earlier using the Supabase Client, and then unpack the response into our Gantt components' properties and return these properties to the calling component to be used to display the Gantt chart.

Now that we have configured our Gantt chart, we can run our application with:
```shell
npm start
```

```shell
Compiled successfully!

You can now view bryntum-gantt-react-supabase-starter in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.1.131:3000

Note that the development build is not optimized.
To create a production build, use npm run build.

webpack compiled successfully
```

Visit the URL of your application in your browser, you will be greeted with your new login screen that you created using the Supabase React Auth UI:
![[Bryntum_login.png]]
Once you have logged in with the user you created while setting up your Supabase project, you will see your new Bryntum Gantt Chart created by querying the data from your edge function:
![[Bryntum_view.png]]
You can sign out again by clicking on the `Sign Out` button below the chart.

Awesome! by now you should have successfully integrated a Bryntum Gantt chart into your React application that uses a Supabase backend, hosting an edge function that performs CRUD operations on a Postgres database table.
This tutorial only began to explore the power of these two tools working together. I highly encourage you to dive deeper into each projects documentation to learn more.
