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

## Create new database tables

Navigate to the SQL Editor tab.

Click **+ New query** from the sidebar and paste the following SQL commands into the editor:

```sql
-- Create the tasks table
CREATE TABLE tasks (
    "id" SERIAL PRIMARY KEY,
    "parentId" INTEGER REFERENCES tasks("id") ON DELETE CASCADE,
    "name" VARCHAR(255),
    "startDate" DATE,
    "endDate" DATE,
    "effort" FLOAT,
    "effortUnit" VARCHAR(50) DEFAULT 'hour',
    "duration" FLOAT,
    "durationUnit" VARCHAR(50) DEFAULT 'day',
    "percentDone" FLOAT DEFAULT 0,
    "schedulingMode" VARCHAR(50) DEFAULT 'Normal',
    "note" TEXT,
    "constraintType" VARCHAR(50),
    "constraintDate" DATE,
    "manuallyScheduled" BOOLEAN DEFAULT FALSE,
    "ignoreResourceCalendar" BOOLEAN DEFAULT FALSE,
    "effortDriven" BOOLEAN DEFAULT FALSE,
    "inactive" BOOLEAN DEFAULT FALSE,
    "cls" VARCHAR(255),
    "iconCls" VARCHAR(255),
    "color" VARCHAR(50),
    "parentIndex" INTEGER DEFAULT 0,
    "expanded" BOOLEAN DEFAULT FALSE,
    "rollup" BOOLEAN DEFAULT FALSE,
    "calendar" INTEGER,
    "deadline" DATE
);
-- Create the dependencies table
CREATE TABLE dependencies (
    "id" SERIAL PRIMARY KEY,
    "fromEvent" INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    "toEvent" INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    "type" INTEGER DEFAULT 2,
    "cls" VARCHAR(255),
    "lag" FLOAT DEFAULT 0,
    "lagUnit" VARCHAR(50) DEFAULT 'day',
    "active" BOOLEAN DEFAULT TRUE,
    "fromSide" VARCHAR(255),
    "toSide" VARCHAR(255)
);

INSERT INTO tasks ("name", "percentDone", "startDate", "endDate", "parentId", "rollup", "expanded")
VALUES 
('Website Design', 30, '2024-05-20', '2024-06-14', NULL, TRUE, TRUE),
('Contact designers', 100, '2024-05-24', '2024-05-26', 1, NULL, NULL),
('Create shortlist of three designers', 60, '2024-05-27', '2024-05-29', 1, NULL, NULL),
('Select & review final design', 0, '2024-05-30', '2024-06-03', 1, NULL, NULL),
('Apply design to web site', 0, '2024-06-04', '2024-06-07', 1, NULL, NULL),
('User feedback assessment', 0, '2024-06-10', '2024-06-14', 1, NULL, NULL),
('Setup Test Strategy', 0, '2024-06-17', '2024-06-28', NULL, NULL, TRUE),
('Hire QA staff', 0, '2024-06-17', '2024-06-19', 7, NULL, NULL),
('Write test specs', 0, '2024-06-19', '2024-06-21', 7, NULL, NULL),
('Unit tests', 0, '2024-06-22', '2024-06-24', 7, NULL, NULL),
('UI unit tests / individual screens', 0, '2024-06-25', '2024-06-28', 7, NULL, NULL),
('Application tests', 0, '2024-05-21', '2024-06-02', 7, NULL, NULL);

INSERT INTO dependencies ("id", "fromEvent", "toEvent")
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
**Note:** the `"` around the column names, Postgres by default names database tables and columns without any capitalization which will cause the Gantt chart to not behave as expected. Wrap all the column names that have capitals with quotes to prevent these issues from occurring.

Click **Run** to run the queries, two tables will be created and populated with data.

## Enable RLS on the new tables

Let's enable RLS on the new tables. In the **Authentication** tab, select **Policies** from the sidebar. Click **Enable RLS** for the new tables.

![Create table policy](img/supabase_enable_policy.png)

Now click **Create policy**. In the dialog that opens, give the new policy a name and select authenticated on target roles. Click **Save policy** to save the policy for each table.

![Create table policy form](img/supabase_create_policy.png)

This policy allows only authenticated users to read the data in the table. Users can be assigned policies that dictate their access to specific rows in tables.

You'll need to follow the same process for every table you add that you would like authenticated users to access. Tables with RLS enabled and no policies assigned will not allow any user, except the superuser, to access the table data.

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
npx supabase functions new gantt-data
```

You can now navigate into your newly created `functions` directory:

```sh
cd functions
```

Then create a new directory `_shared`:

```sh
mkdir _shared
```

And inside that directory, create a new file named `cors.ts` and add the following:

```ts
export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
```
You use this to configure CORS headers to allow cross-site traffic, authorization headers, api key, content type, and the `POST`, `GET`, `OPTIONS`, `PUT`, and `DELETE` methods. This allows you to use your Edge Function as a RESTful API that can be called from a front-end using the appropriate URL of the edge function. You will see this once you have deployed the function to your Supabase project and connected to it via your React application.

Back in your `functions` directory, open the `functions/gantt-data/index.ts` file that you created, clear everything, and add the following:

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "gantt-data" up and running!`)
```

Now add the following function:

```ts
async function applyTableChanges(client: SupabaseClient, table: string, changes) {
  let rows;
  if (changes.added) {
    console.log(`Inserting new data into the "${table}" table...`)
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
    console.log(`Updating data in the "${table}" table...`)
    for (const row of changes.updated) {
      const { error } = await client.from(table).update(row).eq('id', row.id).select()
      if (error) throw error
    }
  }
  if (changes.removed) {
    console.log(`Deleting data from the "${table}" table...`)
    for (const row of changes.removed) {
      const { error } = await client.from(table).delete().eq('id', row.id)
      if (error) throw error
    }
  }
  // if got some new data to update client
  return rows;
}
```

This function you created is called when a request is received to create, update or delete values in the database.
You use the Supabase client to perform the operations depending on the changes passed to the function.
For simplicity, there are some keys that you are removing from the request, that is done with the following:

```ts
delete row['$PhantomId']
delete row['baselines']
delete row['delayFromParent']
delete row['segments']
delete row['direction']
delete row['projectConstraintResolution']
delete row['unscheduled']
```
For actual production use cases, the only key that needs to be removed is `$PhantomId`, this value is not meant to persist in your database, it is purely used to identify records on the client-side.

Next, add the code to start the [Deno](https://supabase.com/blog/edge-runtime-self-hosted-deno-functions) runtime:

```ts
Deno.serve(async (req) => {
  // Server logic here...
})
```

The rest of this code needs to be placed within the curly braces of the Deno function above.

Extract the method from the received request:

```ts
const { method } = req
```

And set up the response for an `OPTIONS` request:

```ts
if (method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders })
}
```

This returns the CORS headers from the `cors.ts` file you added earlier.

Next, add a `try..catch` block that will house the rest of our server function:

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

The Deno runtime has access to the environment variables of your Supabase instance. Using the `SUPABASE_URL` and `SUPABASE_ANON_KEY`, along with authorization headers which will be received from the request, this client will be used to interact with your database.

Now add a handle for `GET` requests:

```ts
if (req.method === 'GET') {     
  console.log(`Received a GET request...`) 
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
```

This will query your `tasks` & `dependencies` tables, combine the results and return it.

And now add a handle for `POST` requests:

```ts
if (req.method === 'POST') {
  console.log(`Received a POST request...`)
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
```

When a `POST` request is received, you first extract the body of the request and create a response structure.
You then check if the body contains any changes for the the `tasks` or `dependencies` tables. If there are changes the `applyTableChanges` function that you added earlier is called, which then performs the relevant operation and returns any result there may be.
The response is then packed up and returned.

Your entire server function should look something like this:

```ts
Deno.serve(async (req: Request) => {
  const { method } = req
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

    if (req.method === 'GET') {     
      console.log(`Received a GET request...`) 
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
      console.log(`Received a POST request...`)
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
```

### Deploy Edge Function

Generate the CLI access token by logging in:

```sh
npx supabase login
```

Now you can deploy the Edge Function to your Supabase project:

```sh
npx supabase functions deploy gantt-data --project-ref <Project_Ref_Id>
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

Create a new utilities directory within the `src` directory of your code:

```sh
mkdir utils
```

In the `utils` directory add a new JavaScript file named `supabaseClient.js` inside the directory and paste the following into it, replacing `<Project_Ref_Id>` and `<Supabase_Anonymous_Key>` with your Supabase values:

```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient('https://<Project_Ref_Id>.supabase.co', 
  '<Supabase_Anonymous_Key>'
)
```

Here you configured the client connection to the Supabase project, which will be used for all interactions with the Supabase instance. You'll use this client to call your edge function.


Find your `src/main.jsx` file and replace its contents with the following:

```jsx
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
import { useState, useEffect } from 'react';
import { supabase } from './utils/supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { BryntumGantt } from '@bryntum/gantt-react';
import { getGanttProps } from './GanttConfig';

function App() {
  const [session, setSession] = useState(null);
  const [ganttProps, setGanttProps] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session !== null) {
      getGanttProps().then((props) => {
        setGanttProps(props);
      });
    }
  }, [session]);

  if (!session) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} />
      </div>
    );
  } else if (!ganttProps) {
    return <div>Loading...</div>;
  } else {
    return (
      <div style={{ height: '100%', justifyContent: 'space-around', alignContent: 'center' }}>
        <BryntumGantt {...ganttProps} />
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    );
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
import { supabase } from './utils/supabaseClient';

async function getGanttProps() {
  // Get the JWT token
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  if (!session) {
    // Return default or empty ganttProps if session is not available
    return {
      columns: [{ type: 'name', field: 'name', width: 250 }],
      viewPreset: 'weekAndDayLetter',
      barMargin: 10,
      project: {
        tasks: [],
        dependencies: [],
        autoLoad: true,
        autoSetConstraints: true,
      },
    };
  }

  const token = session.access_token;
  const url = 'https://wnyfjxqbotytkwvcdbce.supabase.co/functions/v1/gantt-data';
  const header = {
    'Content-Type': 'application/json', 
    'Authorization': `Bearer ${token}`,
  }

  return {
    columns: [{ type: 'name', field: 'name', width: 250 }],
    viewPreset: 'weekAndDayLetter',
    barMargin: 10,
    project: {
        taskStore: {
          transformFlatData: true,
        },
        autoLoad: true,
        autoSync: true,
        autoSetConstraints: true,
        validateResponse: true,
        transport: {
          load: {
            url: url,
            method: 'GET',
            headers: header,
            credentials: "omit",
          },
          sync: {
            url: url,
            method: 'POST',
            headers: header,
            credentials: "omit",
          },
        },
    },
  };
}

export { getGanttProps };
```

Here you created a function that gets the user session and invokes the edge function you previously created by sending a `GET` or `POST` request to your edge functions' URL `https://<Edge_Functuin_Id>.supabase.co/functions/v1/gantt-data`. If no session is available, and empty Gantt properties object will be returned.
If a valid session can be found, proper configuration that the Gantt chart can use to query the data are passed back.

The most important part to note is this piece of the config:
```ts
transport: {
  load: {
    url: url,
    method: 'GET',
    headers: header,
    credentials: "omit",
  },
  sync: {
    url: url,
    method: 'POST',
    headers: header,
    credentials: "omit",
  },
},
```
Notice that the method for `load` is set to `GET`, and for `sync` is is set to `POST`, this is what your edge function is using to decide how to respond. The `Authorization` headers are also passed, so that we can make use of the token inside the edge function to enforce RLS.

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

![View login component](img/app_login.png)

Log in to the application with the credentials for the user you created when you set up the Supabase project. You should see the new Bryntum Gantt chart created by querying the data from your edge function:

![View Gantt Chart](img/app_gantt_chart.png)

You can sign out of the application by clicking the **Sign Out** button below the chart.
