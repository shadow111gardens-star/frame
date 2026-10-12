import {designMdFixture} from './designMdFixture';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import {designRoute,geminiConfig} from '../server/gemini';
import {fixture} from './fixture';
import {planFixture} from './planFixture';

test('the default model is Gemini 3.1 Flash-Lite',()=>{
 assert.equal(geminiConfig({}).model,'gemini-3.1-flash-lite');
 assert.equal(geminiConfig({GEMINI_MODEL:'  gemini-3.1-flash-lite  '}).model,'gemini-3.1-flash-lite');
});

test('every stage uses official Gemini despite obsolete provider overrides',async()=>{
 const original=globalThis.fetch,app=fixture(),calls:any[]=[],stages:string[]=[];
 const outputs=[{productType:'mobile_app',screens:[]},planFixture(app),{message:'Draft',app},{message:'Reviewed',app},{message:'Modified',app},{message:'Rendered review',app}];
 const warn=console.warn;
 console.warn=(...args:unknown[])=>{if(args[0]==='[FRAME Gemini request]'&&typeof args[1]==='string'){const event=JSON.parse(args[1]);if(event.event==='http_success')stages.push(event.stage);}else warn(...args);};
 globalThis.fetch=(async(url,init)=>{
  if(String(url).startsWith('http://127.0.0.1:'))return original(url,init);
  assert.equal(String(url),'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent');
  assert.equal((init?.headers as Record<string,string>)['x-goog-api-key'],'synthetic-gemini-key');
  assert.equal((init?.headers as Record<string,string>).Authorization,undefined);
  const request=JSON.parse(String(init?.body));assert.equal(request.generationConfig.responseMimeType,'application/json');assert.ok(request.generationConfig.responseJsonSchema);calls.push(request);
  if(request.generationConfig.responseJsonSchema.properties.designMd){const payload=JSON.parse(request.contents[0].parts[0].text);return Response.json({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify(designMdFixture(payload.designPlan,payload.originalPrompt))}]}}]});}
  assert.ok(outputs.length,'No unexpected upstream calls');
  return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(outputs.shift())}]}}]});
 }) as typeof fetch;
 const route=designRoute({GEMINI_API_KEY:'synthetic-gemini-key',GEMINI_MODEL:'gemini-3.1-flash-lite',FRAME_DESIGN_PROVIDER:'tokenharbor',TOKENHARBOR_MODEL:'deepseek-v4.1-flash:free',OPENAI_API_KEY:'unused-synthetic-key'},async()=> 'test-uid');
 const server=createServer((req,res)=>void route(req,res,()=>res.end()));
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/design`;
 try{
  for(const input of [{mode:'generate',prompt:'Create exactly 2 mobile screens.',productType:'mobile_app'},{mode:'modify',prompt:'Improve this screen.',app,activeScreen:'home'},{mode:'modify',prompt:'Review the rendered design.',app,activeScreen:'home',qualityReview:{issues:[],screenshots:[],screenIds:['home']}}]){
   const response=await original(url,{method:'POST',body:JSON.stringify(input)});
   assert.equal(response.headers.get('X-FRAME-Provider'),'gemini');assert.equal(response.headers.get('X-FRAME-Model'),'gemini-3.1-flash-lite');
   const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));assert.equal(result.app.screens.length,2);
   if(input.mode==='modify')assert.deepEqual(result.app.screens[1],app.screens[1]);
  }
  assert.equal(calls.length,7);assert.equal(outputs.length,0);
  assert.deepEqual(stages,['analysis','planning','design-md','draft','review','modification','rendered-review']);
 }finally{globalThis.fetch=original;console.warn=warn;server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});

test('other credentials cannot replace missing Gemini configuration',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=(async()=>{calls++;throw new Error('Must not call any upstream API');}) as typeof fetch;
 const route=designRoute({FRAME_DESIGN_PROVIDER:'tokenharbor',OPENAI_API_KEY:'synthetic',TOKENHARBOR_MODEL:'deepseek-v4.1-flash:free',GEMINI_MODEL:'gemini-3.1-flash-lite'},async()=> 'test-uid');
 const server=createServer((req,res)=>void route(req,res,()=>res.end()));
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 try{
  const response=await original(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/design`,{method:'POST',body:JSON.stringify({mode:'generate',prompt:'Create an app'})});
  assert.equal(response.status,503);const error=await response.json();assert.equal(error.code,'CONFIGURATION');assert.match(error.error,/GEMINI_API_KEY/);assert.equal(calls,0);
 }finally{globalThis.fetch=original;server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
