
import { supabase } from './utils/supabaseClient'

// Call our edge function
const { data, error } = await supabase.functions.invoke("gantt-data", {"name":"Functions"})
if (error) alert(error)
  console.log(data.responseData)

// Extract the tasks and dependencies from the response
const tasks = data.responseData.tasks;
const dependencies = data.responseData.dependencies;
const gantt = {
  viewPreset : 'weekAndDayLetter',
  barMargin  : 10,
  project : {
      tasks: tasks,
      dependencies: dependencies,
      autoLoad: true,
      autoSetConstraints : true
  }
};

export { gantt};