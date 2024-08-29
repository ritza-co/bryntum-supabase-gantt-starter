import './App.scss';
import { useState, useEffect } from 'react';
import { supabase } from './utils/supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { BryntumGantt } from '@bryntum/gantt-react';
import { getGanttProps } from './GanttConfig';

function App() {
  const [session, setSession] = useState(null);
  const [ganttProps, setGanttProps] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session !== null) {
      getGanttProps().then((props) => {
        setGanttProps(props);
      });
    }
  }, [session]);

  if (!session) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} />
      </div>
    );
  } else if (!ganttProps) {
    return <div>Loading...</div>;
  } else {
    return (
      <div style={{ height: '100%', justifyContent: 'space-around', alignContent: 'center' }}>
        <BryntumGantt {...ganttProps} />
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    );
  }
}

export default App;
