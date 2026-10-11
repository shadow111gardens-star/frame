import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {fixture} from './fixture';
test('StrictMode starts one committed generation; duplicate submissions and 503 preserve the design and prompt',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/#workspace',pretendToBeVisual:true});
 for(const key of ['window','document','HTMLElement','Element','HTMLInputElement','HTMLTextAreaElement','SVGElement','localStorage','sessionStorage','getComputedStyle'])Object.defineProperty(globalThis,key,{value:(dom.window as any)[key],configurable:true});
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:dom.window.requestAnimationFrame.bind(dom.window),cancelAnimationFrame:dom.window.cancelAnimationFrame.bind(dom.window)});
 const React=await import('react');const {act,StrictMode}=React;const {createRoot}=await import('react-dom/client');
 const {WorkspaceProvider,useWorkspace,workspaceToApp}=await import('../src/workspace/store');const {beginGeneration}=await import('../src/design/api');
 let ws!:ReturnType<typeof useWorkspace>;function Observe(){ws=useWorkspace();return null;}
 const previous=fetch;let calls=0,release!:()=>void;const signals:AbortSignal[]=[];const bodies:any[]=[];
 globalThis.fetch=(async(_url,init)=>{calls++;signals.push(init!.signal as AbortSignal);bodies.push(JSON.parse(String(init!.body)));await new Promise<void>((resolve,reject)=>{release=resolve;init!.signal!.addEventListener('abort',()=>reject(init!.signal!.reason),{once:true});});return new Response(JSON.stringify({error:'Gemini service request failed (503) after 3 attempts. Your prompt and existing design are preserved.',code:'UPSTREAM',retryable:true}),{status:502});}) as typeof fetch;
 const root=createRoot(document.getElementById('root')!);
 try{
 beginGeneration('  original user prompt  ','mobile_app');await act(async()=>root.render(<StrictMode><WorkspaceProvider><Observe/></WorkspaceProvider></StrictMode>));
 await act(async()=>{await new Promise(r=>setTimeout(r,20));});assert.equal(calls,1);assert.equal(signals[0].aborted,false);assert.equal(bodies[0].prompt,'  original user prompt  ');
 await act(async()=>{release();await new Promise(r=>setTimeout(r,10));});assert.equal(ws.state.generating,false);assert.equal(ws.state.messages.filter(m=>m.retryPrompt).length,1);assert.ok(ws.state.messages.find(m=>m.retryPrompt)!.content.includes('503'));assert.ok(!ws.state.messages.some(m=>m.content.includes('aborted')));
 await act(async()=>ws.dispatch({type:'APPLY_DESIGN',app:fixture()}));const saved=JSON.stringify(workspaceToApp(ws.state));let first!:Promise<void>,duplicate!:Promise<void>;
 await act(async()=>{first=ws.generateDesign('edit prompt',true);duplicate=ws.generateDesign('edit prompt',true);});assert.equal(calls,2);
 await act(async()=>{release();await Promise.all([first,duplicate]);});assert.equal(JSON.stringify(workspaceToApp(ws.state)),saved);assert.equal(ws.state.messages.filter(m=>m.retryPrompt==='edit prompt').length,1);
 }finally{await act(async()=>root.unmount());globalThis.fetch=previous;dom.window.close();}
});
