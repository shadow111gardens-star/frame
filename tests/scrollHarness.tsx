// Browser acceptance fixture only; never imported by the application entry point.
import {useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {WorkspaceProvider,useWorkspace} from '../src/workspace/store';
import {WorkspaceLayout} from '../src/workspace/WorkspaceLayout';
import {validateApp} from '../shared/design';
import {fixture} from './fixture';
import '../src/index.css';

function Harness() {
  const {state,dispatch}=useWorkspace();
  useEffect(()=>{
    const app=fixture();app.productType='website';app.name='Scroll acceptance portfolio';
    app.screens=[{id:'portfolio',name:'Portfolio',width:1440,height:3800,background:'#ffffff',components:[
      {id:'hero',type:'Text',name:'Hero',text:'Portfolio hero',position:{x:60,y:100,width:600,height:100},styles:{fontSize:48,color:'#111111'}},
      {id:'nav-footer',type:'Button',name:'Footer anchor',text:'Contact',targetComponentId:'footer',position:{x:900,y:40,width:200,height:50},styles:{background:'#111111',color:'#ffffff'}},
      {id:'footer',type:'Container',name:'Footer',children:['footer-text'],position:{x:0,y:3500,width:1440,height:300},styles:{background:'#123456'}},
      {id:'footer-text',type:'Text',name:'Footer text',text:'Portfolio footer',position:{x:60,y:80,width:800,height:100},styles:{fontSize:40,color:'#ffffff'}},
    ]}];
    dispatch({type:'APPLY_DESIGN',app:validateApp(app)});
  },[dispatch]);
  (window as any).scrollTest={state,dispatch,mobile:()=>dispatch({type:'APPLY_DESIGN',app:fixture()})};
  return <WorkspaceLayout/>;
}
createRoot(document.getElementById('root')!).render(<WorkspaceProvider><Harness/></WorkspaceProvider>);
