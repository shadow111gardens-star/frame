import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import {designRoute,geminiConfig} from '../server/gemini';
import {fixture} from './fixture';
test('route propagates client disconnect and honors its configurable overall timeout',async()=>{
 const original=fetch;let started!:()=>void,cancelled!:()=>void,calls=0;
 let start=new Promise<void>(r=>started=r),cancel=new Promise<void>(r=>cancelled=r);
 globalThis.fetch=(async(url,init)=>{
  if(String(url).startsWith('https://generativelanguage.googleapis.com')){calls++;started();return new Promise<Response>((_resolve,reject)=>{init!.signal!.addEventListener('abort',()=>{cancelled();reject(init!.signal!.reason);},{once:true});});}
  return original(url,init);
 }) as typeof fetch;
 const env={GEMINI_API_KEY:'never-log-this-key',GEMINI_MODEL:'configured-model',GEMINI_GENERATION_TIMEOUT_MS:'1000',GEMINI_ATTEMPT_TIMEOUT_MS:'1000'};
 assert.equal(geminiConfig(env).timeoutMs,1000);assert.equal(geminiConfig({...env,GEMINI_GENERATION_TIMEOUT_MS:'invalid'}).timeoutMs,350000);
 const route=designRoute(env,async()=> 'test-uid'),server=createServer((req,res)=>void route(req,res,()=>res.end()));await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/design`,body=JSON.stringify({mode:'modify',prompt:'Edit original',app:fixture()});
 try{
  const controller=new AbortController(),client=original(url,{method:'POST',body,signal:controller.signal});const rejected=assert.rejects(client);await start;controller.abort();await rejected;
  await Promise.race([cancel,new Promise<void>((_r,reject)=>setTimeout(()=>reject(new Error('Disconnect did not abort upstream.')),2000))]);assert.equal(calls,1);
  start=new Promise<void>(r=>started=r);cancel=new Promise<void>(r=>cancelled=r);calls=0;
  const timeoutResponse=await original(url,{method:'POST',body});assert.equal(timeoutResponse.status,504);const data=await timeoutResponse.json();assert.equal(data.code,'TIMEOUT');assert.equal(data.retryable,true);assert.equal(calls,1);assert.ok(!JSON.stringify(data).includes('never-log-this-key'));
 }finally{globalThis.fetch=original;server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
