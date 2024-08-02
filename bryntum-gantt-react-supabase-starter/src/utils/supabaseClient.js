import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL ?? 'https://wnyfjxqbotytkwvcdbce.supabase.co',
  process.env.REACT_APP_SUPABASE_ANON_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndueWZqeHFib3R5dGt3dmNkYmNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTUwMTQ5NzIsImV4cCI6MjAzMDU5MDk3Mn0.W4XWCCNjpT52cYEOv-Z4Q5z4gq7_a334lVSy0kfENEc'
)