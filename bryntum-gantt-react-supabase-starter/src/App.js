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
    return (<div style={{display: 'flex',  justifyContent:'center', alignItems:'center', height: '100vh'}}>
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
