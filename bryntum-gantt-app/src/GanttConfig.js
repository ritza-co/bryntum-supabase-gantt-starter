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
  const url = 'https://<Edge_Function_Id>.supabase.co/functions/v1/gantt-data';
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