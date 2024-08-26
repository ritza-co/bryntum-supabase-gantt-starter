import { supabase } from './utils/supabaseClient'

// Get the JWT token
const token = await supabase.auth.getSession().then(({ data }) => data.session.access_token);

// Call the REST API with auth headers
const response = await fetch('https://wnyfjxqbotytkwvcdbce.supabase.co/functions/v1/tasks-rest', {
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