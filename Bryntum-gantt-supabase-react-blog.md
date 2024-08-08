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
![Create project](https://github.com/user-attachments/assets/79e8fe6a-7e92-419a-bbca-3419f8768d11)

Or create a new one if you don't:
![Create project form](https://github.com/user-attachments/assets/ff8bd9bc-5451-4b58-84aa-afb9c1e2c4cf)

Once you have created your project, open the project settings and take note of your Reference ID, you will need this later:
![Create project ref](https://github.com/user-attachments/assets/1de89210-f2c5-4b15-8678-415824b1a712)

Then select API in project settings and take note of your Project API key, we need the one labeled `anon` `public` :
![Create project anon key](https://github.com/user-attachments/assets/c7751490-97d7-4d63-bf6f-f05f62268e34)

You now need to add a new user, also taking note of the email and password to use later, this is found in the Authentication tab:
![Create user](https://github.com/user-attachments/assets/17e29527-ee0e-49f8-9687-80453c2ee20d)

Now select the SQL Editor tab:
![Create query](https://github.com/user-attachments/assets/fda95373-3113-4a5f-90f4-9dad43c62a36)

Create a new SQL query and copy the following SQL commands: 
```sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    parentId INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    name VARCHAR,
    startDate DATE,
    endDate DATE,
    effort FLOAT,
    effortUnit VARCHAR DEFAULT 'hour',
    duration FLOAT,
    durationUnit VARCHAR DEFAULT 'day',
    percentDone FLOAT DEFAULT 0,
    schedulingMode VARCHAR DEFAULT 'Normal',
    note TEXT,
    constraintType VARCHAR,
    constraintDate DATE,
    manuallyScheduled BOOLEAN DEFAULT FALSE,
    ignoreResourceCalendar BOOLEAN DEFAULT FALSE,
    effortDriven BOOLEAN DEFAULT FALSE,
    inactive BOOLEAN DEFAULT FALSE,
    cls VARCHAR,
    iconCls VARCHAR,
    color VARCHAR,
    parentIndex INTEGER DEFAULT 0,
    expanded BOOLEAN DEFAULT FALSE,
    calendar INTEGER,
    deadline DATE
);

CREATE INDEX idx_parentId ON tasks(parentId);
CREATE INDEX idx_calendar ON tasks(calendar);

CREATE TABLE dependencies (
    id SERIAL PRIMARY KEY,
    fromEvent INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    toEvent INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    type INTEGER DEFAULT 2,
    cls VARCHAR,
    lag FLOAT DEFAULT 0,
    lagUnit VARCHAR DEFAULT 'day',
    active BOOLEAN DEFAULT TRUE,
    fromSide VARCHAR,
    toSide VARCHAR
);

CREATE INDEX idx_fromEvent ON dependencies(fromEvent);
CREATE INDEX idx_toEvent ON dependencies(toEvent);

INSERT INTO tasks (id, name, percentDone, startDate, endDate, parentId, expanded)
VALUES
    (1, 'Website Design', 30, '2024-05-20', '2024-06-14', NULL, TRUE),
    (2, 'Contact designers', 100, '2024-05-24', '2024-05-26', 1, NULL),
    (3, 'Create shortlist of three designers', 60, '2024-05-27', '2024-05-29', 1, NULL),
    (4, 'Select & review final design', 0, '2024-05-30', '2024-06-03', 1, NULL),
    (5, 'Apply design to web site', 0, '2024-06-04', '2024-06-07', 1, NULL),
    (6, 'User feedback assessment', 0, '2024-06-10', '2024-06-14', 1, NULL),
    (7, 'Setup Test Strategy', 0, '2024-06-17', '2024-06-28', NULL, TRUE),
    (8, 'Hire QA staff', 0, '2024-06-17', '2024-06-19', 7, NULL),
    (9, 'Write test specs', 0, '2024-06-19', '2024-06-21', 7, NULL),
    (10, 'Unit tests', 0, '2024-06-22', '2024-06-24', 7, NULL),
    (11, 'UI unit tests / individual screens', 0, '2024-06-25', '2024-06-28', 7, NULL),
    (12, 'Application tests', 0, '2024-05-21', '2024-06-02', 7, NULL);

INSERT INTO dependencies (id, fromEvent, toEvent)
VALUES
    (1, 2, 3),
    (2, 3, 4),
    (3, 4, 5),
    (4, 5, 6),
    (5, 1, 7),
    (6, 8, 9),
    (7, 9, 10),
    (8, 10, 11),
    (9, 11, 12);
```
You can then run the queries to create a `tasks` table and populate it with some data.

After those SQL commands have been executed, you can use your edge function to retrieve this data from within your React application.

Now that you have the `tasks` table, you need to enable RLS on it:
![Create table policy](https://github.com/user-attachments/assets/487fe445-d86b-4253-97a6-8a09449e3354)
![Create table policy form](https://github.com/user-attachments/assets/78d11caf-27e4-4d85-9708-227cba783832)
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
![View deployed function](https://github.com/user-attachments/assets/7f8b39e1-a67d-403b-821d-5b35716ce493)

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
![View login component](https://github.com/user-attachments/assets/b968fb03-7568-4ee0-bc7f-db90b4fc79dc)
Once you have logged in with the user you created while setting up your Supabase project, you will see your new Bryntum Gantt Chart created by querying the data from your edge function:
![View deployed function](https://github.com/user-attachments/assets/b8503aaa-bd51-4faf-9099-c2cc4bfa4553)
You can sign out again by clicking on the `Sign Out` button below the chart.

Awesome! by now you should have successfully integrated a Bryntum Gantt chart into your React application that uses a Supabase backend, hosting an edge function that performs CRUD operations on a Postgres database table.
This tutorial only began to explore the power of these two tools working together. I highly encourage you to dive deeper into each projects documentation to learn more.
