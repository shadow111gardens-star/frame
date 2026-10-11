import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {AuthStore,type AuthUser} from '../src/auth/store';
test('actual App blocks private routes until restoration and authenticates its existing CTA',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/#workspace',pretendToBeVisual:true});
 for(const key of ['window','document','HTMLElement','Element','HTMLInputElement','HTMLTextAreaElement','SVGElement','localStorage','sessionStorage','getComputedStyle'])Object.defineProperty(globalThis,key,{value:(dom.window as any)[key],configurable:true});
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:dom.window.requestAnimationFrame.bind(dom.window),cancelAnimationFrame:dom.window.cancelAnimationFrame.bind(dom.window)});
 Object.assign(globalThis,{IntersectionObserver:class {observe(){}unobserve(){}disconnect(){}},ResizeObserver:class {observe(){}unobserve(){}disconnect(){}}});
 dom.window.scrollTo=()=>{};dom.window.HTMLElement.prototype.scrollTo=()=>{};
 const React=await import('react'),{createRoot}=await import('react-dom/client');const {AuthProvider}=await import('../src/auth/AuthProvider');const {default:App}=await import('../src/App');
 let restored!:(user:AuthUser|null)=>void,popups=0;
 const user={uid:'google-uid',displayName:'Google User',email:'user@example.test',photoURL:null};
 const store=new AuthStore(async()=>({observe(next){restored=next;return ()=>{};},async popup(){popups++;return user;},async redirect(){throw new Error('not expected');},async redirectResult(){return null;},async logout(){restored(null);}}),()=>sessionStorage,hash=>{window.location.hash=hash;});
 const root=createRoot(document.getElementById('root')!);
 try{
  await React.act(async()=>root.render(<React.StrictMode><AuthProvider store={store}><App /></AuthProvider></React.StrictMode>));
  assert.ok(document.body.textContent?.includes('Restoring your session'));assert.ok(!document.body.textContent?.includes('AI Designer'));
  await React.act(async()=>{restored(null);await store.start();await new Promise(resolve=>setTimeout(resolve,30));});
  assert.equal(window.location.hash,'');assert.equal(sessionStorage.getItem('frame.auth.destination'),'#workspace');
  const link=Array.from(document.querySelectorAll('a')).find(a=>a.textContent?.trim()==='Start Designing');assert.ok(link);
  await React.act(async()=>{link!.click();await new Promise(resolve=>setTimeout(resolve,30));});
  assert.equal(popups,1);assert.equal(store.state.user?.uid,'google-uid');assert.equal(window.location.hash,'#workspace');assert.ok(document.body.textContent?.includes('AI Designer'));
 }catch(error){if(error instanceof AggregateError)throw new Error([...new Set(error.errors.map(e=>e?.message??String(e)))].join('\n'));throw error;}finally{await React.act(async()=>root.unmount());dom.window.close();}
});
