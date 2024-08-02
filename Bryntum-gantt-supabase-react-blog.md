# How to use Supabase Edge Functions to build a Bryntum Gantt chart in React

The [Bryntum Gantt](https://bryntum.com/products/gantt/) is a feature-rich and performant method of visualizing and scheduling tasks over a set period. 
We will be working to integrate the quick and easy to use Brytum Gantt Chart with a Supabase Posgres database, while using Supabase Edge Functions and Auth with RLS(Row level security) enabled.

To follow this guide you will need a Supabase account, a running React app, Supabase project, and access to Bryntum Gantt.

[Here](https://github.com/facebook/create-react-app) you can find some help setting up a React application
You can sign in or create your Supabase account [here](https://supabase.com/dashboard/sign-in?returnTo=%2Fprojects)
And sign up for a trial version of [Bryntum Gantt](https://bryntum.com/download/)

## Supabase Configuration
For us to set up the Supabase Edge Functions, we first need to get a few things ready!

Ensure you have created a project inside your organization:
![Create project](https://github.com/ritza-co/bryntum-supabase-carl/blob/main/Bryntum%20Gantt%20Screenshots/supabase_project_creation.png)

Or create a new one if you don't:
![Create project form](https://github.com/ritza-co/bryntum-supabase-carl/blob/main/Bryntum%20Gantt%20Screenshots/supabase_project_creation_form.png)

Once you have created you project, open the projects settings and take note of your Reference ID, we will need this later:
![Create project ref](https://github.com/ritza-co/bryntum-supabase-carl/blob/main/Bryntum%20Gantt%20Screenshots/supabase_project_ref_id.png)

Then select API in project settings and take note of your Project API key, we need the one labeled `anon` `public` :
![Create project anon key](https://github.com/ritza-co/bryntum-supabase-carl/blob/main/Bryntum%20Gantt%20Screenshots/supabase_project_anon_key.png)

We need to add a new user, also taking note of the email and password to use later, this is found in the Authentication tab:
![Create user](https://github.com/ritza-co/bryntum-supabase-carl/blob/main/Bryntum%20Gantt%20Screenshots/supabase_user_management.png)

Now select the SQL Editor tab:
![Create query](https://github.com/ritza-co/bryntum-supabase-carl/blob/main/Bryntum%20Gantt%20Screenshots/supabase_sql_insert.png)

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
After those SQL commands have been executed, we created two tables: tasks & dependencies. We then populated those tables with some data. We can use our edge function to retrieve this data from within our React application.

Now that we have our tables created we can enable RLS them:
![Create table policy](https://github.com/ritza-co/bryntum-supabase-carl/blob/main/Bryntum%20Gantt%20Screenshots/supabase_tabel_policy_creation.png)
![Create table policy form](https://github.com/ritza-co/bryntum-supabase-carl/blob/main/Bryntum%20Gantt%20Screenshots/supabase_tabel_policy_creation_form.png)

The same process need to be followed for every table we have added and would like to access. This allows the user we created to read the data in these two tables, but will prevent any user that is not authenticated from doing so. 
Tables that do not have any policies assigned will not allow any user (other than superuser) access to the table data.

And we are done with the project configuration for Supabase!

## Supabase CLI
The Supabase CLI is a fantastic tool to help you manage your Supabase instances. For now we are going to focus purely on creating a new edge function.
We will assume you are using npm as your package manager, for any others, reference the 
[Supabase CLI Documentation](https://supabase.com/docs/guides/cli/getting-started?queryGroups=platform&platform=macos#installing-the-supabase-cli)

Install the Supabase CLI as a dev dependency
```shell
npm install supabase --save-dev
```

Then initialize the project:
```shell
npx supabase init
```

Create your new edge function:
```shell
supabase functions new gantt-data
```

Open up the `index.ts` file that was just created and add the following:
```ts
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
```

And then deploy the new edge function to your Supabase project:
```shell
supabase functions deploy hello-world --project-ref <Project_Ref_Id>
```

You should then see your edge function deployed to your Supabase project:
![View deployed function](https://github.com/ritza-co/bryntum-supabase-carl/blob/main/Bryntum%20Gantt%20Screenshots/supabase_edge_function_deployed.png)

As you can see, creating edge functions is fairly straightforward. You now have authorized access to the data in the tables on which we have applied to appropriate policies. Edge functions run server-side, and enforce security policies, this gives us secure and low-latency access to the data we have stored.
## React Application
Now that we have our database and edge functions created, we can begin adding the Brytum Gantt Chart to our React application. If you do not have an existing application ready, [these](https://bryntum.com/products/gantt/docs/guide/Gantt/quick-start/react) instructions should get you started quickly.

First we need to configure npm to be able to install the Bryntum packages, the best way of doing this can be found in the instructions [here](https://bryntum.com/products/gantt/docs/guide/Gantt/npm-repository#configure-npm).

Once npm has been configured, open a terminal in your React projects root directory and install some dependencies:
```shell
npm install && npm install sass
```

And then we can install the Bryntum React package:
```shell 
npm install @bryntum/gantt@npm:@bryntum/gantt-trial @bryntum/gantt-react
```

Create a new directory for some utilities:
```shell
mkdir utils
```

Add a new JavaScript file called `supabaseClient.js` inside the directory you just created and paste in the following:
```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL ?? 'https://<Project_Ref_Id>.supabase.co',
  process.env.REACT_APP_SUPABASE_ANON_KEY ??
    '<Supabase_Anonymous_Key>'
)
```
Remember to replace `<Project_Ref_Id>` and `<Supabase_Anonymous_Key>`  with the values we took note of earlier.

Navigate back to the root of your project, inside `src` find `index.js` and replace its contents with:
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
This adds our Supabase client as our user context provider and launches the app.

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
This handles displaying a login screen, and once a user has successfully logged in, we will show our gantt chart component which we will be configuring next. You can see here the simplicity of adding Supabase Authentication into our application.

Still in our `src` directory, add a `ganttChart.js` file and add:
```js
import { supabase } from './utils/supabaseClient'  

// Call our edge function
const { data, error } = await supabase.functions.invoke("gantt-data", {"name":"Functions"})
if (error) alert(error)
  console.log(data.responseData)

const tasks = data.responseData.tasks;
const dependencies = data.responseData.dependencies;

const gantt = {
  viewPreset : 'weekAndDayLetter',
  barMargin  : 10,
  project : {
      tasks: tasks,
      dependencies: dependencies,
      autoLoad: true,
      autoSetConstraints : true
  }
};

export { gantt};
```
We invoke the edge function we created earlier and then unpack the response into our gantt component. For more advanced data binding, please refer to [this](https://bryntum.com/products/gantt/docs/guide/Gantt/integration/react/data-binding) documentation. That is all it takes to prepare the properties of our gantt chart for display.

Now that we have configured our gantt chart, we can run our application with:
```shell
npm start
```

Visit the URL of you application in your browser, you will be greeted with your new login screen:

![View deployed function](https://github.com/ritza-co/bryntum-supabase-carl/blob/main/Bryntum%20Gantt%20Screenshots/bryntum_login.png)

Once you have logged in, you will see your new Bryntum Gantt Chart with data that was retrieved from the Supabase Edge function we created earlier.
![View deployed function](https://github.com/ritza-co/bryntum-supabase-carl/blob/main/Bryntum%20Gantt%20Screenshots/bryntum_view.png)
You can sign out again by clicking on the `Sign Out` button below the chart.

This tuorial only began to explore the power of these two tools working together. I highly encourage you to dive deeper into each projects documentation to learn more.
