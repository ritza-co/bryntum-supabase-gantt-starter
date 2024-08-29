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

  // Call the REST API with auth headers
  const response = await fetch('https://wnyfjxqbotytkwvcdbce.supabase.co/functions/v1/tasks-rest', {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const ganttData = await response.json();

  // Extract the tasks and dependencies from the response
  const tasks = ganttData.responseData.tasks;
  const dependencies = ganttData.responseData.dependencies;

  return {
    columns: [{ type: 'name', field: 'name', width: 250 }],
    viewPreset: 'weekAndDayLetter',
    barMargin: 10,
    project: {
        taskStore: {
            transformFlatData: true,
            },
        tasks: tasks,
        dependencies: dependencies,
        autoLoad: true,
        autoSetConstraints: true,
        validateResponse: true,
    },
  };
}

export { getGanttProps };