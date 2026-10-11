import {createRoot} from 'react-dom/client';
import {WorkspaceProvider,useWorkspace,getSessionProjects,workspaceToApp} from '../src/workspace/store';
import {WorkspaceLayout} from '../src/workspace/WorkspaceLayout';
import {fixture} from './fixture';
import '../src/index.css';
function Harness(){const ws=useWorkspace();(window as any).projectTest={...ws,getProjects:getSessionProjects,app:()=>workspaceToApp(ws.state),fixture};return <WorkspaceLayout/>;}
createRoot(document.getElementById('root')!).render(<WorkspaceProvider><Harness/></WorkspaceProvider>);
