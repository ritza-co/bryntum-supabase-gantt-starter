## How to use Supabase Edge Functions to build a Bryntum Gantt chart in React

  To follow this guide you will need a supabase account, a running react app, supabase project and access to Bryntum Gantt

set up edge functions -> create users -> set up supabase cli -> Create and deploy edge functions
add gantt to react app -> install brytum library from npm
call functions
display gantt
auth??

[Bryntum Grid]()

Install CLI as dev dependency

npm install supabase --save-dev

  In `index.js`, create a Supabase client using your [Project URL and public API (anon) key](https://supabase.com/dashboard/project/_/settings/api).

https://bryntum.com/products/gantt/docs/guide/Gantt/quick-start/react

https://github.com/bryntum/bryntum-gantt-express-sqlite-starter/tree/main

https://bryntum.com/products/gantt/docs/guide/Gantt/npm-repository#configure-npm
https://bryntum.com/products/gantt/docs/guide/Gantt/integration/react/data-binding


```javascript
import { Gantt } from "./gantt.module.js";

const gantt = new Gantt({
  appendTo: "app",

  columns: [{ type: "name", field: "name", width: 250 }],
  viewPreset: "weekAndDayLetter",
  barMargin: 10,
  project: {
    taskStore: {
      transformFlatData: true,
    },
    loadUrl: "http://localhost:1337/load",
    autoLoad: true,
    syncUrl: "http://localhost:1337/sync",
    autoSync: true,
    // This config enables response validation and dumping of found errors to the browser console.
    // It's meant to be used as a development stage helper only so please set it to false for production.
    validateResponse: true,
  },
});
```

In the Supabase SQL editor, create the tasks table:
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
```

And the dependencies:
```sql
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
```

Insert mock data into tasks:
```sql
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
```

and dependencies:
```sql
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

```javascript
import { Gantt } from "./gantt.module.js";

const gantt = new Gantt({
  appendTo: "app",

  columns: [{ type: "name", field: "name", width: 250 }],
  viewPreset: "weekAndDayLetter",
  barMargin: 10,
  project: {
    taskStore: {
      transformFlatData: true,
    },
    loadUrl: "http://localhost:1337/load",
    autoLoad: true,
    validateResponse: true,
  },
});
```


Create your Supabase Edge Function:
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
    const { taskData, error: taskError } = await supabaseClient.from('tasks').select('*')

    if (taskError) throw taskError

    // Query the dependencies table
    const { dependencyData, error: dependencyError } = await supabaseClient.from('dependencies').select('*')

    if (dependencyError) throw dependencyError

    // Combine the results
    const responseData = {
      user,
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
```shell
npx supabase login
```

```
npx supabase functions deploy gantt-data --project-ref <Project-Ref-Id>
```
