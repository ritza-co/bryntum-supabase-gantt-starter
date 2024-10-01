import { createClient } from '@supabase/supabase-js'

export const supabase = createClient('https://<Project_Ref_Id>.supabase.co', 
  '<Supabase_Anonymous_Key>'
)