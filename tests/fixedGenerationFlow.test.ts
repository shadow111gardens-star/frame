import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {generateKeyPairSync,sign} from 'node:crypto';
import {generateDesignMd,validateDesignMd,bindDesignMd,hashArtifact} from '../server/designDocument';
import {designRoute} from '../server/gemini';
import {verifyFirebaseIdentity} from '../server/firebaseIdentity';
import {requestedScreenDetails} from '../server/screenRequirements';
import {contentRequirements,missingContent,restoreContentRepair} from '../server/contentRequirements';
import {fixture} from './fixture';
import {planFixture} from './planFixture';
import {designMdFixture,specificationFixture} from './designMdFixture';
import {verifyArtifact} from '../src/projects/artifacts';
import type {GenerationArtifact} from '../shared/generationArtifact';

test('project-specific Markdown validates sections, exact tokens and stable screens with one bounded repair',async()=>{
  const plan=planFixture(fixture()),calls:string[]=[];
  const generated=await generateDesignMd('SaaS dashboard',plan,async(body:any,stage)=>{calls.push(stage);return JSON.stringify(stage==='design-md'?{designMd:'# Incomplete'}:designMdFixture(plan,'SaaS dashboard'));});
  assert.deepEqual(calls,['design-md','design-md-repair']);assert.equal(generated.attempts,2);
  assert.equal(hashArtifact(generated.designMd),generated.designMdHash);
  assert.doesNotThrow(()=>validateDesignMd(bindDesignMd(generated.designMd.replace(/^## /gm,'# '),plan),plan));
  assert.notEqual(designMdFixture(plan,'SaaS dashboard').designMd,designMdFixture(plan,'Editorial landing page').designMd);
  const conflicting=generated.designMd.replace(plan.designSystem.colors.accent,'#123456');
  assert.throws(()=>validateDesignMd(conflicting,plan),/contradicts/);
  let count=0;await assert.rejects(generateDesignMd('Broken',plan,async()=>{count++;return '{"designMd":"bad"}';}),/complete section/);assert.equal(count,2);
});

test('fitness exactly two screens separates calories content and Start Workout action from screen names',()=>{
  assert.deepEqual(requestedScreenDetails('Create exactly one screen named Dashboard, with project overview.',['Dashboard']).map(r=>r.expectedName),['Dashboard']);
  const prompt='Create a fitness app with exactly two screens: Dashboard and Workout Details, with calories on the Dashboard and a Start Workout button on Workout Details.';
  const requirements=requestedScreenDetails(prompt,['Dashboard','Workout Details','calories','Start Workout']);
  assert.deepEqual(requirements.map(r=>r.expectedName),['Dashboard','Workout Details']);
  const app=fixture();app.screens.forEach((s,i)=>{s.id=requirements[i].id;s.name=requirements[i].expectedName;});
  const plan=planFixture(app),content=contentRequirements(prompt,plan);
  assert.deepEqual(content.map(r=>[r.kind,r.text,r.screenName]),[['content','calories','Dashboard'],['action','Start Workout','Workout Details']]);
  assert.equal(missingContent(app,content).length,2);
  const repair=structuredClone(app);repair.screens[0].components[0].text='Unrelated rewrite';
  repair.screens.forEach((s,i)=>s.components.push({id:'required-content-'+i,type:i?'Button':'Text',name:content[i].text,text:content[i].text,position:{x:24,y:600,width:300,height:50},styles:{}}));
  const fixed=restoreContentRepair(app,repair,content);
  assert.deepEqual(fixed.screens[0].components.slice(0,app.screens[0].components.length),app.screens[0].components);
  assert.equal(missingContent(fixed,content).length,0);
  fixed.screens[0].components.at(-1)!.text='— kcal';assert.equal(missingContent(fixed,content).length,0);
});

test('authenticated fixed flow validates Markdown before JSON and reuses it in browser correction',async()=>{
  const native=fetch,seen:any[]=[],app=fixture();let invalidMd=false,invalidContentRepair=false;
  globalThis.fetch=(async(url,init)=>{
    if(!String(url).startsWith('https://generativelanguage.googleapis.com'))return native(url,init);
    const body=JSON.parse(String(init?.body)),payload=JSON.parse(body.contents[0].parts[0].text),props=body.generationConfig.responseJsonSchema.properties;seen.push({props,payload});
    const output=invalidContentRepair&&payload.missingRequirements?{}:props.plan?invalidMd?{analysis:{productType:'mobile_app',screens:[]},plan:planFixture(app),designMd:'invalid'}:specificationFixture(planFixture(app),payload.originalPrompt,{productType:'mobile_app',screens:[]}):props.visualTokens?planFixture(app):props.designMd?invalidMd?{designMd:'invalid'}:designMdFixture(payload.designPlan,payload.originalPrompt):props.app?{message:'Editable design',app}:{productType:'mobile_app',screens:[]};
    return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(output)}]}}]});
  }) as typeof fetch;
  const server=createServer((req,res)=>void designRoute({GEMINI_API_KEY:'test-key'},async()=> 'owner')(req,res,()=>res.end()));
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${(server.address() as any).port}/api/design`;
  const post=(input:unknown)=>native(url,{method:'POST',body:JSON.stringify(input)});
  try{
    const response=await post({mode:'generate',prompt:'Create exactly two mobile screens.',generationRunId:'run-1',idempotencyKey:'run-1',projectId:'project-1'}),data=await response.json();
    assert.equal(response.status,200);assert.equal(data.revisionId,null);assert.equal(data.generationRunId,'run-1');
    assert.deepEqual(seen.map(s=>s.props.plan?'specification':s.props.visualTokens?'planning':s.props.designMd?'design-md':s.props.app?s.payload.mode:'analysis'),['specification','generate']);
    assert.equal(seen[1].payload.designMd,data.designMd);assert.equal(seen[1].payload.designMd,data.designMd);
    await verifyArtifact(data.generationArtifact);
    const correction=await post({mode:'modify',prompt:'Original intent',app:data.app,generationArtifact:data.generationArtifact,qualityReview:{issues:[],screenshots:[],screenIds:['home']}});
    assert.equal(correction.status,200);assert.equal(seen.at(-1).payload.designMd,data.designMd);
    const artifact:GenerationArtifact={...data.generationArtifact,designMd:data.designMd+'changed'};await assert.rejects(verifyArtifact(artifact),/checksum/);
    invalidContentRepair=true;const partial=await post({mode:'generate',prompt:'Create exactly two screens: Home and Profile, with invoices on Home.'});const partialData=await partial.json();assert.equal(partial.status,200);assert.equal(partialData.status,'partial');assert.ok(partialData.warnings.some((warning:string)=>warning.includes('invoices')));assert.deepEqual(partialData.app,app);
    seen.length=0;invalidMd=true;const failed=await post({mode:'generate',prompt:'Create a mobile app.'});assert.equal(failed.status,502);assert.equal((await failed.json()).code,'DESIGN_MD');assert.ok(!seen.some(s=>s.props.app),'No JSON generation until specification is validated');
  }finally{globalThis.fetch=native;server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

test('Firebase identity rejects anonymous, wrong project, expired and tampered tokens without admin SDK',async()=>{
  const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048}),now=Math.floor(Date.now()/1000);
  const claims={aud:'frame-44bbd',iss:'https://securetoken.google.com/frame-44bbd',sub:'UID-A',exp:now+300,iat:now-10,auth_time:now-10};
  const token=(body:unknown)=>{const data=Buffer.from(JSON.stringify({alg:'RS256',kid:'test-certificate'})).toString('base64url')+'.'+Buffer.from(JSON.stringify(body)).toString('base64url');return 'Bearer '+data+'.'+sign('RSA-SHA256',Buffer.from(data),privateKey).toString('base64url');};
  const certFetch=(async()=>Response.json({'test-certificate':publicKey.export({type:'spki',format:'pem'})},{headers:{'cache-control':'max-age=0'}})) as typeof fetch;
  assert.equal(await verifyFirebaseIdentity(token(claims),'frame-44bbd',certFetch),'UID-A');
  for(const header of [undefined,token({...claims,aud:'another-project'}),token({...claims,exp:now-1}),token(claims).slice(0,-5)+'wrong'])await assert.rejects(verifyFirebaseIdentity(header,'frame-44bbd',certFetch));
});
