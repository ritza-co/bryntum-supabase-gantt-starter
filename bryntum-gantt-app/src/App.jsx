import { BryntumGantt } from '@bryntum/gantt-react';
import { ganttProps } from './GanttConfig';
import './App.scss';

function App() {
  return <BryntumGantt {...ganttProps} />;
}

export default App;
