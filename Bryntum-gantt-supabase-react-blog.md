# How to use Supabase Edge Functions to build a Bryntum Gantt chart in React

The [Bryntum Gantt](https://bryntum.com/products/gantt/) is a feature-rich and performant component for creating interactive Gantt charts in web applications. 

In this post, we'll show you how to integrate Bryntum Gantt with a Supabase Postgres database. We'll use Supabase Edge Functions to interact with the database and Supabase Auth with row-level security (RLS) enabled for authorization.

## Prerequisites

To follow along with this guide, you'll need:

- A Supabase account. Create one [here](https://supabase.com/dashboard/sign-in?returnTo=%2Fprojects).
- A running React app. Use our quickstart guide [here](https://bryntum.com/products/gantt/docs/guide/Gantt/quick-start/react) to set up a Bryntum Gantt React project.
- A Bryntum Gantt license, or [sign up for a free trial version](https://bryntum.com/download/).

## Create a Supabase project

In your Supabase organization dashboard, click **New project** to create a new project.

![Create project](img/supabase_create_project.png)

Give your project a name, set a password for the database, select a region, and click **Create new project**.

![Create project form](img/supabase_create_project_form.png)

You'll need the reference ID and API key for your new project.

Find the reference ID in the project settings under **General**.

![Create project ref](img/supabase_ref_id.png)

To find the API key, select **API** from the sidebar. You will see the `anon` `public` project API key.

![Create project anon key](img/supabase_anon.png)

## Create a new Supabase user

Navigate to the **Authentication** tab and click **Add user** to create a new user.

![Create user](img/supabase_demo_user.png)

Take note of the new user's email and password to use later.

## Create a new database table

Navigate to the SQL Editor tab.

![Create query](img/supabase_sql_editor.png)

Click **+ New query** from the sidebar and paste the following SQL commands into the editor:

```sql
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    calendar VARCHAR(50),
    start_date DATE,
    hours_per_day INT,
    days_per_week INT,
    days_per_month INT
);

CREATE TABLE calendars (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50),
    expanded BOOLEAN
);

CREATE TABLE intervals (
    id SERIAL PRIMARY KEY,
    calendar_id VARCHAR(50) REFERENCES calendars(id),
    recurrent_start_date VARCHAR(50),
    recurrent_end_date VARCHAR(50),
    is_working BOOLEAN
);

CREATE TABLE tasks (
    id INT PRIMARY KEY,
    name VARCHAR(255),
    percent_done INT,
    start_date DATE,
    end_date DATE,
    duration INT,
    rollup BOOLEAN,
    show_in_timeline BOOLEAN,
    cost INT,
    parent_id INT REFERENCES tasks(id),
    project_id INT REFERENCES projects(id)
);

CREATE TABLE baselines (
    id SERIAL PRIMARY KEY,
    task_id INT REFERENCES tasks(id),
    start_date TIMESTAMP,
    end_date TIMESTAMP
);

CREATE TABLE resources (
    id INT PRIMARY KEY,
    event INT,
    resource INT
);

CREATE TABLE dependencies (
    id SERIAL PRIMARY KEY,
    from_task INT REFERENCES tasks(id),
    to_task INT REFERENCES tasks(id),
    type VARCHAR(50)
);

-- Insert data into the tasks table
-- Insert project data
INSERT INTO projects (calendar, start_date, hours_per_day, days_per_week, days_per_month)
VALUES ('general', '2022-03-14', 24, 5, 20);

-- Insert calendar data
INSERT INTO calendars (id, name, expanded)
VALUES ('general', 'General', TRUE),
       ('business', 'Business', NULL),
       ('night', 'Night shift', NULL);

-- Insert intervals data
INSERT INTO intervals (calendar_id, recurrent_start_date, recurrent_end_date, is_working)
VALUES ('general', 'on Sat at 0:00', 'on Mon at 0:00', FALSE),
       ('business', 'every weekday at 12:00', 'every weekday at 13:00', FALSE),
       ('business', 'every weekday at 17:00', 'every weekday at 08:00', FALSE),
       ('night', 'every weekday at 6:00', 'every weekday at 22:00', FALSE);

-- Insert tasks data
INSERT INTO tasks (id, name, percent_done, start_date, end_date, duration, rollup, show_in_timeline, cost, parent_id, project_id)
VALUES (1000, 'Launch SaaS Product', 50, '2022-03-14', NULL, NULL, NULL, NULL, NULL, NULL, 1),
       (1, 'Setup web server', 50, '2022-03-14', '2022-03-23', 10, TRUE, NULL, NULL, 1000, 1),
       (11, 'Install Apache', 50, '2022-03-14', '2022-03-17', 3, TRUE, NULL, 200, 1, 1),
       (12, 'Propsure firewall', 50, '2022-03-14', '2022-03-17', 3, TRUE, TRUE, 1000, 1, 1),
       (13, 'Setup load balancer', 50, '2022-03-14', '2022-03-17', 3, TRUE, NULL, 1200, 1, 1),
       (14, 'Propsure ports', 50, '2022-03-14', '2022-03-16', 2, TRUE, NULL, 750, 1, 1),
       (15, 'Run tests', 0, '2022-03-21', '2022-03-23', 2, TRUE, NULL, 5000, 1, 1),
       (2, 'Website Design', 60, '2022-03-23', '2022-04-13', NULL, TRUE, NULL, NULL, 1000, 1),
       (21, 'Contact designers', 70, '2022-03-23', '2022-03-30', 5, TRUE, NULL, 500, 2, 1),
       (22, 'Create shortlist of three designers', 60, '2022-03-30', '2022-03-31', 1, TRUE, NULL, 1000, 2, 1),
       (23, 'Select & review final design', 50, '2022-03-31', '2022-04-02', 2, TRUE, TRUE, 1000, 2, 1),
       (24, 'Inform management about decision', 100, '2022-04-04', '2022-04-04', 0, TRUE, NULL, 500, 2, 1),
       (25, 'Apply design to web site', 0, '2022-04-04', '2022-04-13', 7, TRUE, NULL, 11000, 2, 1),
       (3, 'Setup Test Strategy', 20, '2022-03-14', NULL, NULL, TRUE, NULL, NULL, 1000, 1),
       (31, 'Hire QA staff', 40, '2022-03-14', '2022-03-19', 5, NULL, NULL, 6000, 3, 1),
       (33, 'Write test specs', 9, '2022-03-21', NULL, 5, NULL, NULL, NULL, 3, 1),
       (331, 'Unit tests', 20, '2022-03-21', '2022-04-02', 10, NULL, TRUE, 7000, 33, 1),
       (332, 'UI unit tests / individual screens', 10, '2022-03-21', '2022-03-26', 5, NULL, TRUE, 5000, 33, 1);

-- Insert baselines data
INSERT INTO baselines (task_id, start_date, end_date)
VALUES (11, '2022-03-13T23:00:00', '2022-03-16T23:00:00'),
       (11, '2022-03-13T23:00:00', '2022-03-16T23:00:00'),
       (11, '2022-03-13T23:00:00', '2022-03-16T23:00:00'),
       (12, '2022-03-13T23:00:00', '2022-03-16T23:00:00'),
       (12, '2022-03-13T23:00:00', '2022-03-16T23:00:00'),
       (12, '2022-03-13T23:00:00', '2022-03-16T23:00:00'),
       (13, '2022-03-13T23:00:00', '2022-03-16T23:00:00'),
       (13, '2022-03-13T23:00:00', '2022-03-16T23:00:00'),
       (13, '2022-03-13T23:00:00', '2022-03-16T23:00:00'),
       (14, '2022-03-13T23:00:00', '2022-03-15T23:00:00'),
       (14, '2022-03-13T23:00:00', '2022-03-15T23:00:00'),
       (14, '2022-03-13T23:00:00', '2022-03-15T23:00:00'),
       (15, '2022-03-20T23:00:00', '2022-03-22T23:00:00'),
       (15, '2022-03-20T23:00:00', '2022-03-22T23:00:00'),
       (15, '2022-03-20T23:00:00', '2022-03-22T23:00:00'),
       (21, '2022-03-22T23:00:00', '2022-03-25T23:00:00'),
       (21, '2022-03-22T23:00:00', '2022-03-28T23:00:00'),
       (21, '2022-03-22T23:00:00', '2022-03-29T23:00:00'),
       (22, '2022-03-27T23:00:00', '2022-03-28T23:00:00'),
       (22, '2022-03-28T23:00:00', '2022-03-29T23:00:00'),
       (22, '2022-03-29T23:00:00', '2022-03-30T23:00:00'),
       (23, '2022-03-28T23:00:00', '2022-03-30T23:00:00'),
       (23, '2022-03-29T23:00:00', '2022-03-31T23:00:00'),
       (23, '2022-03-30T23:00:00', '2022-04-01T23:00:00'),
       (24, '2022-03-30T23:00:00', '2022-03-30T23:00:00'),
       (24, '2022-03-31T23:00:00', '2022-03-31T23:00:00'),
       (24, '2022-04-01T23:00:00', '2022-04-01T23:00:00'),
       (25, '2022-03-30T23:00:00', '2022-04-08T23:00:00'),
       (25, '2022-03-31T23:00:00', '2022-04-11T23:00:00'),
       (25, '2022-04-03T23:00:00', '2022-04-12T23:00:00'),
       (31, '2022-03-13T23:00:00', '2022-03-18T23:00:00'),
       (31, '2022-03-13T23:00:00', '2022-03-18T23:00:00'),
       (31, '2022-03-13T23:00:00', '2022-03-18T23:00:00'),
       (331, '2022-03-20T23:00:00', '2022-04-01T23:00:00'),
       (331, '2022-03-20T23:00:00', '2022-04-01T23:00:00'),
       (331, '2022-03-20T23:00:00', '2022-04-01T23:00:00'),
       (332, '2022-03-20T23:00:00', '2022-03-26T23:00:00'),
       (332, '2022-03-20T23:00:00', '2022-03-26T23:00:00'),
       (332, '2022-03-20T23:00:00', '2022-03-26T23:00:00');

-- Insert resources data
INSERT INTO resources (id, event, resource)
VALUES (3, 12, 9),
       (4, 13, 2),
       (5, 13, 3),
       (6, 13, 6),
       (7, 13, 7),
       (8, 13, 8),
       (9, 21, 5),
       (10, 21, 9),
       (11, 22, 8),
       (12, 25, NULL);

INSERT INTO dependencies (from_task, to_task, type)
VALUES (1, 11, 'FinishToStart'),
       (1, 12, 'FinishToStart'),
       (1, 13, 'FinishToStart'),
       (1, 14, 'FinishToStart'),
       (1, 15, 'FinishToStart'),
       (2, 21, 'FinishToStart'),
       (2, 22, 'FinishToStart'),
       (2, 23, 'FinishToStart'),
       (2, 24, 'FinishToStart'),
       (2, 25, 'FinishToStart'),
       (3, 31, 'FinishToStart'),
       (3, 33, 'FinishToStart'),
       (33, 331, 'FinishToStart'),
       (33, 332, 'FinishToStart');
```

Click **Run** to run the queries, and a series of tables will be created and populated with data.

## Enable RLS on the new table

Let's enable RLS on the new table. In the **Authentication** tab, select **Policies** from the sidebar. Click **Enable RLS** for the new table.

![Create table policy](img/supabase_enable_policy.png)

Now click **Create policy**. In the dialog that opens, give the new policy a name and click **Save policy**

![Create table policy form](img/supabase_create_policy.png)

This policy allows only authenticated users to read the data in the table. Users can be assigned policies that dictate their access to specific rows in tables.

You'll need to follow the same process for every table you add that you would like authenticated users to access. Tables with RLS enabled and no policies assigned will not allow any user except the superuser to access the table data.

## Use Supabase CLI to develop an Edge Function

You can use the Supabase CLI to manage instances, develop and deploy projects, handle migrations, and generate native data types. 

Access the Supabase CLI in your shell environment using package managers for macOS, Windows, Linux, and npm or Bun. This guide assumes you're using npm as your package manager. For other package managers, consult the [Supabase CLI documentation](https://supabase.com/docs/guides/cli/getting-started?queryGroups=platform&platform=macos#installing-the-supabase-cli), but the basics will remain the same.

Let's use the Supabase CLI to create a new Edge Function.

To create a new Supabase project, run the following command from your terminal inside the directory you want your project to live:

```sh
npx supabase init
```

Now create a new Edge Function:

```sh
npx supabase functions new tasks-rest
```

Open the `functions/tasks-rest/index.ts` file that was just created, clear everything, and add the following:

```ts
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface Task {
  name: string
  status: number
}
```

You configured CORS headers to allow cross-site traffic, authorization headers, api key, content type, and the `POST`, `GET`, `OPTIONS`, `PUT`, and `DELETE` methods. This allows you to use this Edge Function as a RESTful API that can be called using the appropriate URL of your edge function along with the appropriate pattern. You will see this once you have deployed the function to your Supabase project.

Now add the following code:

```ts
async function getAllGanttData(supabaseClient: SupabaseClient) {
  // Query the tasks table
  const { data: taskData, error: taskError } = await supabaseClient.from('tasks').select('*')
  if (taskError) throw taskError

  // Query the dependencies table
  const { data: dependencyData, error: dependencyError } = await supabaseClient.from('dependencies').select('*')
  if (dependencyError) throw dependencyError

  // Query the calendars table
  const { data: calendarData, error: calendarError } = await supabaseClient.from('calendars').select('*')
  if (calendarError) throw calendarError

  // Query the resources table
  const { data: resourceData, error: resourceError } = await supabaseClient.from('resources').select('*')
  if (resourceError) throw resourceError

  // Query the projects table
  const { data: projectData, error: projectError } = await supabaseClient.from('projects').select('*')
  if (projectError) throw projectError

  // Query the intervals table
  const { data: intervalData, error: intervalError } = await supabaseClient.from('intervals').select('*')
  if (intervalError) throw intervalError

  // Query the baselines table
  const { data: baselineData, error: baselineError } = await supabaseClient.from('baselines').select('*')
  if (baselineError) throw baselineError

  // Combine the results
  const responseData = {
    tasks: taskData,
    dependencies: dependencyData,
    calendars: calendarData,
    resources: resourceData,
    projects: projectData,
    intervals: intervalData,
    baselines: baselineData,
  }

  return new Response(JSON.stringify({ responseData }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}
```
This function you created is called when you make a `GET` request with no query parameters defined. It will query the tables we created, combine the results and return them.

You can define a function that will accept an `id` argument with:
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
Here you defined an async function that accepts an `id` parameter and uses the Supabase client to run the appropriate `select` query which then returns the response, or throws an error.

Add methods for the rest of the verbs you would like to handle from a request:

```ts
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
```

Next, add the code to start the [Deno](https://supabase.com/blog/edge-runtime-self-hosted-deno-functions) runtime:

```ts
Deno.serve(async (req) => {
  // Server logic here...
})
```
The rest of this code needs to be placed within the curly braces of the Deno function above.

Extract the URL and method from the recieved request:
```ts
const { url, method } = req
```
And set up the response for an `OPTIONS` request:
```ts
if (method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders })
}
```
This returns the list of allowed verbs you added earlier that your edge function will accept.

Next, add a try..catch block that will house the rest of our server function:
```ts
try {
    // unsafe code here
} 
catch (error) {
  console.error(error)

  return new Response(JSON.stringify({ error: error.message }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 400,
  })
}
```
This will catch any errors in the unsafe code, then return a status code and error message.

Inside the braces of your `try{}` block, first create a Supabase client:
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
The Deno runtime has access to the environment variables of your Supabase instance. Using the `SUPABASE_URL` and `SUPABASE_ANON_KEY`, along with authorization headers which were recieved from the request, a Supabase client is created that will be used to interact with your database.

Then add a few constants that you will need:
```ts
const taskPattern = new URLPattern({ pathname: '/tasks-rest/:id' })
const matchingPath = taskPattern.exec(url)
const id = matchingPath ? matchingPath.pathname.groups.id : null
```
You first got the current user based on the requests' authorization header. 
You then set up a URL pattern `/tasks-rest/:id`.
Then you matched the URL from the request to the pattern you created and stored the `id` from the query parameter if it has been given, otherwise `null`.

Now to assign the data to a variable when the request is a `POST` or `PUT`:
```ts
let task = null
if (method === 'POST' || method === 'PUT') {
  const body = await req.json()
  task = body.task
}
```

Finally, lets add a switch case that calls the correct method depending on the request verb or simply all data required for the Gantt chart:
```ts
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
    return getAllGanttData(supabaseClient)
  default:
    return getAllGanttData(supabaseClient)
}
```

Your entire server function should look something like this:
```ts
Deno.serve(async (req) => {
  const { url, method } = req

  // This is needed if you're planning to invoke your function from a browser.
  if (method === 'OPTIONS') {
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

    // For more details on URLPattern, check https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API
    const taskPattern = new URLPattern({ pathname: '/tasks-rest/:id' })
    const matchingPath = taskPattern.exec(url)
    const id = matchingPath ? matchingPath.pathname.groups.id : null

    let task = null
    if (method === 'POST' || method === 'PUT') {
      const body = await req.json()
      task = body.task
    }

    // call relevant method based on method and id
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
        return getAllGanttData(supabaseClient)
      default:
        return getAllGanttData(supabaseClient)
    }
  } 
  catch (error) {
    console.error(error)

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
```

### Deploy Edge Function
Generate the CLI access token by logging in:

```sh
npx supabase login
```

Now you can deploy the Edge Function to your Supabase project:
```sh
npx supabase functions deploy tasks-rest --project-ref <Project_Ref_Id>
```

Replace `<Project_Ref_Id>` with your Supabase project reference ID.

Navigate to your Supabase instance and you should see your new Edge Function deployed:

![View deployed function](img/supabase_deployed.png)

Here you can see the URL you can use to invoke your Edge Function. 

Edge functions run server-side in your Supabase instance and enforce the security policies you stipulate to give you secure, low-latency access to the data stored in your Postgres database. Edge Functions can be configured in various ways and are easily adapted to perform a range of tasks or processes using any table or combination of tables.


## Add Bryntum Gantt to the React application

Now you can add Bryntum Gantt to your React application. If you don't have an existing React application ready, [these](https://bryntum.com/products/gantt/docs/guide/Gantt/quick-start/react) instructions should get you started quickly. 

First, in your application's directory, configure npm to download the Bryntum packages in the `@brytum` scope from the Bryntum registry by following the instructions in our documentation [here](https://bryntum.com/products/gantt/docs/guide/Gantt/npm-repository).


Bryntum Gantt uses [Sass](https://sass-lang.com/) to apply CSS rules. Install the `sass` package now if you don't already have it:

```shell
npm install sass
```

Install the Bryntum React package:

```shell 
npm install @bryntum/gantt @bryntum/gantt-react
```

Finally, install the Supabase React Auth UI:

```sh
npm install @supabase/supabase-js @supabase/auth-ui-react @supabase/auth-ui-shared
```

Your application is now set up to use the Supabase login component and Bryntum Gantt.

## Connect to the Supabase Edge Function

Create a new utilities directory:

```sh
mkdir utils
```

Navigate into the new directory:

```sh
cd utils
```

Add a new JavaScript file named `supabaseClient.js` inside the directory and paste the following into it, replacing `<Project_Ref_Id>` and `<Supabase_Anonymous_Key>` with your Supabase values:

```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL ?? 'https://<Project_Ref_Id>.supabase.co',
  process.env.REACT_APP_SUPABASE_ANON_KEY ??
    '<Supabase_Anonymous_Key>'
)
```

Here you configured the client connection to the Supabase project, which will be used for all interactions with the Supabase instance. You'll use this client to call your edge function/s.

Navigate back to the root of your React project:

```shell
cd ../..
```

Change to the `src` directory:

```shell
cd src
```

Find your `main.jsx` file and replace its contents with the following:

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
This code imports the `supabaseClient` you created, adds the Supabase React Auth UI as the user context provider, and launches the app.

Still in your `src` directory, replace everything in the `App.jsx` file with the following:
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
    return (<div style={{display: 'flex',  justifyContent:'center', alignItems:'center', height: '100vh'}}>
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

Here's what this code does:

- Presents the user with the Supabase React Auth UI login screen for authentication.
- Directs authenticated users to the Gantt chart component. You'll configure this component in the next section.
- Displays a button to sign out the current user.

Still in the `src` directory, add a `GanttConfig.js` file containing the following code:

```js
import { supabase } from './utils/supabaseClient'

// Get the JWT token
const token = await supabase.auth.getSession().then(({ data }) => data.session.access_token);

// Call the REST API with auth headers
const response = await fetch('https://<Project_Ref_Id>.supabase.co/functions/v1/tasks-rest', {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});

if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}

const data = await response.json();

// Extract the tasks and dependencies from the response
const tasks = data.responseData.tasks;
const dependencies = data.responseData.dependencies;
const calendars = data.responseData.calendars;
const resources = data.responseData.resources;
const projects = data.responseData.projects;
const intervals = data.responseData.intervals;
const baselines = data.responseData.baselines;

const ganttProps = {
  viewPreset : 'weekAndDayLetter',
  barMargin  : 10,
  project : {
      tasks: tasks,
      dependencies: dependencies,
      calendars: calendars,
      resources: resources,
      projects: projects,
      intervals: intervals,
      baselines: baselines,
      autoLoad: true,
      autoSetConstraints : true
  }
};

export { ganttProps };
```

Here you invoke the edge function you previously created by sending a `GET` request to your edge functions' URL `https://<Project_Ref_Id>.supabase.co/functions/v1/tasks-rest`. You then unpack the response into the Gantt components' properties, and return these properties to the parent component which uses these properties to display the Gantt chart.

Now you can run the application with:

```shell
npm run dev
```

You should receive a response similar to the following:

```shell
VITE v5.4.2  ready in 215 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

Visit the URL of the application in your browser, and you should see the login screen you created using the Supabase React Auth UI:

![View login component](https://github.com/user-attachments/assets/b968fb03-7568-4ee0-bc7f-db90b4fc79dc)

Log in to the application with the credentials for the user you created when you set up the Supabase project. You should see the new Bryntum Gantt chart created by querying the data from your edge function:

![View deployed function](https://github.com/user-attachments/assets/b8503aaa-bd51-4faf-9099-c2cc4bfa4553)

You can sign out of the application by clicking the **Sign Out** button below the chart.
