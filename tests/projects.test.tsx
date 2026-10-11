import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {fixture} from './fixture';
test('new projects isolate editable documents, history, generation and session restores',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost',pretendToBeVisual:true});
 for(const key of ['window','document','HTMLElement','Element','HTMLInputElement','HTMLTextAreaElement','SVGElement','localStorage','sessionStorage','getComputedStyle'])Object.defineProperty(globalThis,key,{value:(dom.window as any)[key],configurable:true});
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:dom.window.requestAnimationFrame.bind(dom.window),cancelAnimationFrame:dom.window.cancelAnimationFrame.bind(dom.window)});
 const React=await import('react');const {act}=React;const {createRoot}=await import('react-dom/client');
 const {WorkspaceProvider,useWorkspace,workspaceToApp,getSessionProjects}=await import('../src/workspace/store');
 const {validateApp}=await import('../shared/design');
 let ws!:ReturnType<typeof useWorkspace>;function Observe(){ws=useWorkspace();return null;}
 let releaseNew!:()=>void;
 let root=createRoot(document.getElementById('root')!);let release!:()=>void;const requests:any[]=[];const fetchBefore=globalThis.fetch;
 globalThis.fetch=(async(_url,init)=>{const body=JSON.parse(String(init?.body));requests.push({body,signal:init?.signal});if(body.prompt==='pending')await new Promise<void>(r=>release=r);if(body.prompt==='first design')await new Promise<void>(r=>releaseNew=r);const app=fixture();return new Response(JSON.stringify({message:'Generated',app}));}) as typeof fetch;
 try{
 await act(async()=>root.render(<WorkspaceProvider><Observe/></WorkspaceProvider>));
 await act(async()=>ws.dispatch({type:'CREATE_PROJECT',productType:'website',name:'Original'}));
 const original=ws.state.projectId;assert.equal(ws.state.screens.length,1);assert.equal(ws.state.screens[0].width,1440);assert.deepEqual(ws.state.components,{});validateApp(workspaceToApp(ws.state));
 await act(async()=>ws.dispatch({type:'UPDATE_SCREEN_DATA',id:ws.state.currentScreen,data:{height:3800,background:'#abcdef'}}));
 const saved=JSON.stringify(workspaceToApp(ws.state));let pending!:Promise<void>;
 await act(async()=>{pending=ws.generateDesign('pending');});assert.equal(ws.state.generating,true);
 await act(async()=>ws.dispatch({type:'CREATE_PROJECT',productType:'mobile_app'}));
 const mobile=ws.state.projectId;assert.notEqual(mobile,original);assert.equal(ws.state.screens[0].width,390);assert.equal(ws.state.screens[0].height,844);assert.equal(ws.state.messages.length,0);assert.equal(ws.state.past.length,0);assert.equal(ws.state.generating,false);assert.equal(requests[0].signal.aborted,true);
 let next!:Promise<void>;await act(async()=>{next=ws.generateDesign('first design',true);});
 await act(async()=>{release();await pending;});assert.equal(ws.state.generating,true);assert.equal(ws.state.messages.length,2);assert.equal(ws.state.projectId,mobile);assert.deepEqual(ws.state.components,{});
 await act(async()=>{releaseNew();await next;});assert.equal(requests[1].body.mode,'generate');assert.equal(requests[1].body.productType,'mobile_app');assert.ok(ws.state.components.button);
 await act(async()=>ws.dispatch({type:'SELECT_COMPONENT',id:'button'}));await act(async()=>ws.dispatch({type:'UPDATE_COMPONENT_STYLES',id:'button',styles:{fontSize:22}}));assert.equal(ws.state.components.button.styles.fontSize,22);
 await act(async()=>ws.dispatch({type:'UNDO'}));assert.notEqual(ws.state.components.button.styles.fontSize,22);await act(async()=>ws.dispatch({type:'REDO'}));assert.equal(ws.state.components.button.styles.fontSize,22);
 await act(async()=>ws.dispatch({type:'OPEN_PROJECT',id:original}));assert.equal(JSON.stringify(workspaceToApp(ws.state)),saved);assert.equal(ws.state.past.length,0);assert.equal(ws.state.selectedComponentId,null);
 await act(async()=>ws.dispatch({type:'OPEN_PROJECT',id:mobile}));assert.equal(ws.state.components.button.styles.fontSize,22);assert.equal(ws.state.past.length,0);
 assert.equal(getSessionProjects().length,2);
 await act(async()=>root.unmount());root=createRoot(document.getElementById('root')!);await act(async()=>root.render(<WorkspaceProvider><Observe/></WorkspaceProvider>));assert.equal(ws.state.projectId,mobile);assert.equal(ws.state.components.button.styles.fontSize,22);assert.equal(ws.state.generating,false);

 }finally{globalThis.fetch=fetchBefore;await act(async()=>{root.unmount();});dom.window.close();}
});
