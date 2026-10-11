// Isolated browser acceptance data, never imported by the application.
import {useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {WorkspaceProvider,useWorkspace} from '../src/workspace/store';
import {WorkspaceLayout} from '../src/workspace/WorkspaceLayout';
import {fixture} from './fixture';
import '../src/index.css';
function Harness(){
  const {state,dispatch}=useWorkspace();
  const website=()=>{const app=fixture();app.productType='website';app.name='Export verification';app.screens=[
    {id:'long',name:'Portfolio / Home',width:1440,height:3800,background:'#ffffff',components:[
      {id:'headline',type:'Text',name:'Heading',text:'Full screen text',position:{x:40,y:40,width:1000,height:100},styles:{font:'ExportFixtureFont',fontSize:40,fontWeight:700,color:'#111111'}},
      {id:'gradient',type:'Card',name:'Gradient',position:{x:40,y:180,width:300,height:150},styles:{background:'linear-gradient(90deg, #ff0000, #0000ff)',radius:20,border:true,borderColor:'#123456',shadow:'medium'},children:['nested']},
      {id:'nested',type:'Text',name:'Nested',text:'Nested content',position:{x:20,y:20,width:240,height:40},styles:{font:'Arial',color:'#ffffff',fontSize:24}},
      {id:'asset',type:'Image',name:'Embedded image',text:'Green pixel asset',source:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==',position:{x:400,y:180,width:120,height:120},styles:{radius:12}},
      {id:'chart',type:'Chart',name:'Chart',values:[20,50,100],position:{x:600,y:180,width:180,height:120},styles:{color:'#00aa00',gap:8,radius:4}},
      {id:'bookmark-icon',type:'Icon',name:'Bookmark icon',icon:'bookmark',position:{x:850,y:180,width:40,height:40},styles:{color:'#111111',fontSize:24}},
      {id:'footer',type:'Card',name:'Footer',text:'Footer at full page height',position:{x:0,y:3650,width:1440,height:150},styles:{background:'#123456',color:'#ffffff',font:'Arial',fontSize:32,paddingX:40,paddingY:40}},
    ]},
    {id:'duplicate',name:'Portfolio / Home',width:768,height:600,background:'transparent',components:[{id:'other',type:'Text',name:'Other',text:'Second screen',position:{x:20,y:20,width:500,height:80},styles:{font:'Arial',fontSize:30,color:'#111111'}}]},
    {id:'special',name:'../About:Team?*',width:800,height:500,background:'#eeeeee',components:[]},
  ];dispatch({type:'APPLY_DESIGN',app});};
  useEffect(website,[]);
  (window as any).exportTest={state,dispatch,website,mobile:()=>dispatch({type:'APPLY_DESIGN',app:fixture()})};
  return <WorkspaceLayout/>;
}
createRoot(document.getElementById('root')!).render(<WorkspaceProvider><Harness/></WorkspaceProvider>);
