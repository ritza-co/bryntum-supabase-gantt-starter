
import { supabase } from './utils/supabaseClient'

// const store = 
const { data, error } = await supabase.functions.invoke("gantt-data", {"name":"Functions"})
if (error) alert(error)
  console.log(data.responseData)

const tasks = data.responseData.tasks;
const dependencies = data.responseData.dependencies;
const gantt = {
  //columns    : [{ type : 'name', field : 'name', width : 250 }],
  viewPreset : 'weekAndDayLetter',
  barMargin  : 10,
  project : {
      tasks: tasks,
      dependencies: dependencies,
      autoLoad: true,
      // Automatically introduces a `startnoearlier` constraint for tasks that (a) have no predecessors, (b) do not use
      // constraints and (c) aren't `manuallyScheduled`
      autoSetConstraints : true
  }
  
};

export { gantt};