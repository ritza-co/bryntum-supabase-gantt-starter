import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL ?? 'https://<Project_Ref_Id>.supabase.co',
  process.env.REACT_APP_SUPABASE_ANON_KEY ??
    '<Supabase_Anonymous_Key>'
)