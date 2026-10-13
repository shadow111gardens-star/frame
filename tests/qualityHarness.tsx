import {useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {WorkspaceProvider,useWorkspace} from '../src/workspace/store';
import {GeneratedSurface} from '../src/workspace/components/GeneratedSurface';
import {DesignPropertiesPanel} from '../src/workspace/components/DesignPropertiesPanel';
import {ExportModal} from '../src/workspace/components/ExportModal';
import {inspectRenderedScreen} from '../src/design/renderQuality';
import {fixture} from './fixture';
import type {DesignApp} from '../shared/design';
import '../src/index.css';
export function layoutFixture():DesignApp {
  const app=fixture();app.name='Reusable layout regression';app.designSystem.typography={font:'Arial',display:'Georgia',mono:'monospace'};
  app.screens=[{id:'flow',name:'Discovery',width:390,height:844,background:'#ffffff',components:[
    {id:'row',type:'Container',name:'Equal controls',position:{x:24,y:30,width:342,height:60},styles:{layout:'flex',gap:12},children:['left','right']},
    ...['left','right'].map((id,i)=>({id,type:'Button' as const,name:'Action '+i,text:i?'Saved':'Discover',targetScreenId:i?'other':'flow',position:{x:999,y:999,width:200,height:60},styles:{width:'fill' as const,background:'#102e29',color:'#ffffff',font:'Arial',fontWeight:600 as const,radius:12}})),
    {id:'grid',type:'Container',name:'Two tracks',position:{x:24,y:110,width:342,height:180},styles:{layout:'grid',columns:2,gap:12},children:['long','image']},
    {id:'long',type:'Text',name:'Wrapping text',text:'A deliberately long destination description that should wrap within its grid track.',position:{x:0,y:0,width:500,height:180},styles:{width:'fill',fontSize:16,color:'#111111'}},
    {id:'image',type:'Image',name:'Contained visual',source:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==',position:{x:0,y:0,width:500,height:140},styles:{width:'fill',imageFit:'contain',background:'#eee',radius:12}},
    {id:'search',type:'Search',name:'Search',text:'Find a destination',position:{x:24,y:310,width:342,height:48},styles:{background:'#f0f2ef',color:'#27352f',paddingX:16,radius:12}},
    {id:'copy',type:'Text',name:'Supporting copy',text:'Explore somewhere new. Choose a destination to see useful planning details.',position:{x:24,y:382,width:342,height:80},styles:{fontSize:18,lineHeight:1.5,color:'#27352f'}},
    {id:'nav',type:'Navigation',name:'Bottom navigation',position:{x:0,y:0,width:390,height:80},styles:{dock:'bottom',margin:4,background:'#f0f2ef',layout:'flex',paddingX:24,paddingY:12,gap:12},children:['tab1','tab2']},
    ...['tab1','tab2'].map((id,i)=>({id,type:'Button' as const,name:'Tab '+i,text:i?'Account':'Discover',targetScreenId:i?'other':'flow',position:{x:0,y:0,width:100,height:48},styles:{width:'fill' as const,color:i?'#506159':'#102e29',background:i?'transparent':'#dde6df',radius:10,fontSize:14,fontWeight:600 as const}})),
  ]},{id:'other',name:'Account',width:390,height:844,background:'#ffffff',components:[{id:'empty',type:'Text',name:'Empty state',text:'Sign in to save your destinations.',position:{x:24,y:200,width:342,height:100},styles:{color:'#111111',fontSize:20}}]}];return app;
}
function Harness(){const ws=useWorkspace();useEffect(()=>ws.dispatch({type:'APPLY_DESIGN',app:layoutFixture()}),[]);
  (window as any).qualityTest={...ws,fixture:layoutFixture,inspect:()=>{const app={...layoutFixture(),productType:ws.state.productType!,designSystem:ws.state.designSystem!,screens:ws.state.screens.map(s=>({...s,components:s.components.map(id=>ws.state.components[id])}))};return [...document.querySelectorAll<HTMLElement>('[data-generated-screen]')].flatMap(root=>inspectRenderedScreen(root,app.screens.find(s=>s.id===root.dataset.generatedScreen)!,app as DesignApp,ws.state.generationArtifact?.approvedPlan));}};
  return <main style={{padding:24,display:'flex',gap:24,background:'#d9dedb'}}>{ws.state.screens.map(screen=><GeneratedSurface key={screen.id} screen={screen} interactive={ws.state.centerTab==='prototype'}/>)}{ws.state.selectedComponentId&&<aside style={{width:360,flexShrink:0,background:'#09090b'}}><DesignPropertiesPanel/></aside>}{ws.state.modal.type==='export'&&<ExportModal/>}</main>;
}
createRoot(document.getElementById('root')!).render(<WorkspaceProvider><Harness/></WorkspaceProvider>);
