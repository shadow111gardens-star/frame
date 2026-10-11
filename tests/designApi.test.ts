import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestDesign,DesignRequestError} from '../src/design/api';
import {fixture} from './fixture';
const blocked=(async(_url,init)=>new Promise<Response>((_resolve,reject)=>{const s=init!.signal!;if(s.aborted)reject(s.reason);else s.addEventListener('abort',()=>reject(s.reason),{once:true});})) as typeof fetch;
test('frontend preserves one 503 error, normalizes cancellation/timeout, never retries POST',async()=>{
 let calls=0;
 await assert.rejects(requestDesign('original',undefined,undefined,undefined,undefined,undefined,{fetch:(async()=>{calls++;return new Response(JSON.stringify({error:'Gemini service request failed (503). Your prompt and existing design are preserved.',code:'UPSTREAM',retryable:true}),{status:502});}) as typeof fetch}),(e:unknown)=>e instanceof DesignRequestError&&e.code==='UPSTREAM'&&e.message.includes('503')&&!e.message.includes('aborted'));assert.equal(calls,1);
 const caller=new AbortController();const task=requestDesign('original',undefined,undefined,undefined,undefined,caller.signal,{fetch:blocked});caller.abort();await assert.rejects(task,(e:unknown)=>e instanceof DesignRequestError&&e.code==='CANCELLED'&&!e.retryable&&!e.message.includes('without reason'));
 await assert.rejects(requestDesign('original',undefined,undefined,undefined,undefined,undefined,{fetch:blocked,timeoutMs:5}),(e:unknown)=>e instanceof DesignRequestError&&e.code==='TIMEOUT'&&e.retryable);
 await assert.rejects(requestDesign('original',undefined,undefined,undefined,undefined,undefined,{fetch:(async()=>({ok:false,status:503,json:async()=>{throw new DOMException('aborted','AbortError');}} as Response)) as typeof fetch}),(e:unknown)=>e instanceof DesignRequestError&&e.code==='SERVICE_HTTP'&&e.message.includes('503'));
 await assert.rejects(requestDesign('original',undefined,undefined,undefined,undefined,undefined,{timeoutMs:5,fetch:(async(_url,init)=>({ok:true,status:200,json:()=>new Promise((_resolve,reject)=>init!.signal!.addEventListener('abort',()=>reject(init!.signal!.reason),{once:true}))} as Response)) as typeof fetch}),(e:unknown)=>e instanceof DesignRequestError&&e.code==='TIMEOUT');
 await assert.rejects(requestDesign('original',undefined,undefined,undefined,undefined,undefined,{fetch:(async()=>{throw new DOMException('signal is aborted without reason','AbortError');}) as typeof fetch}),(e:unknown)=>e instanceof DesignRequestError&&e.code==='NETWORK'&&e.retryable&&!e.message.includes('cancelled'));
 const app=await requestDesign('original',undefined,undefined,undefined,undefined,undefined,{fetch:(async()=>new Response(JSON.stringify({message:'ok',app:fixture()}))) as typeof fetch});assert.equal(app.message,'ok');
});
