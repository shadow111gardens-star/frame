import {designMdFixture} from './designMdFixture';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {analyzeDesignPrompt} from '../server/designKnowledge/analysis';
import {resolveRequirements,enforceScreenRequirements} from '../server/designRequirements';
import {planDesign,validatePlannedDesign} from '../server/designPlanning';
import {fixture} from './fixture';
import {planFixture} from './planFixture';
import {requestedScreenDetails} from '../server/screenRequirements';
import {targetedRepair} from '../server/designRepair';
import {DesignValidationError,validationDiagnostic} from '../server/designDiagnostics';
import {validateApp} from '../shared/design';
import {createServer} from 'node:http';
import {designRoute} from '../server/gemini';

test('the exact Flowspace request recovers four explicit screen requirements even when analysis drops them',async()=>{
  const prompt=(await readFile('tests/flowspacePrompt.txt','utf8')).trim();
  const analyzed=await analyzeDesignPrompt(prompt,async()=>JSON.stringify({productType:'website',screens:[]}),'website');
  assert.deepEqual(analyzed.screens.map(s=>s.toLowerCase()),['dashboard','projects listing','project details','team members']);
});
test('analysis cannot invent singular or truncated screen titles from substrings in the Flowspace prompt',async()=>{
  const prompt=(await readFile('tests/flowspacePrompt.txt','utf8')).trim();
  const analyzed=await analyzeDesignPrompt(prompt,async()=>JSON.stringify({productType:'website',screens:['Project Detail','Projects','Pro','Members']}),'website');
  assert.deepEqual(analyzed.screens.map(s=>s.toLowerCase()),['dashboard','projects listing','project details','team members']);
});
test('case and whitespace variants are the same requirement, while unrelated names are not',()=>{
  const requirements=resolveRequirements('Include screens named Home and Team Members.',[]);
  enforceScreenRequirements([{name:'  home '},{name:'TEAM\t Members'}],['Home','Team  Members'],requirements);
  assert.throws(()=>enforceScreenRequirements([{name:'Home'},{name:'Team'}],['Home','Team Members'],requirements),(e:any)=>e.code==='REQUIREMENT_SCREEN'&&e.details.missingScreens[0].expectedName==='Team Members');
});
test('analysis normalizes whitespace without losing an explicit original title',async()=>{
  const analyzed=await analyzeDesignPrompt('Include screens named Home and Team   Members.',async()=>JSON.stringify({productType:'website',screens:[' HOME ','Team Members']}),'website');
  assert.deepEqual(analyzed.screens,['Home','Team Members']);
});
test('a genuine missing plan screen gets one planning repair with an ID/name/content diagnostic',async()=>{
  const app=fixture(),raw=planFixture(app),analysis={productType:'mobile_app' as const,category:'general' as const,audience:'People',styleHints:[],theme:'unspecified' as const,preferences:{style:[],colors:[],typography:[],branding:[]},goals:[],screens:['Home','Profile'],sections:[],uxNeeds:[]};
  const incomplete=structuredClone(raw);incomplete.screens.pop();incomplete.journey={mode:'static',entryScreens:['Home'],edges:[],rationale:'Static requested screens'};
  let calls=0;
  const plan=await planDesign('Include screens named Home and Profile.','mobile_app',async(body,stage)=>{
    calls++;if(calls===1)return JSON.stringify(incomplete);
    const payload=JSON.parse((body as any).contents[0].parts[0].text);
    assert.equal(stage,'planning-repair');assert.equal(payload.missingScreens[0].expectedName,'Profile');assert.ok(payload.missingScreens[0].id);assert.ok(payload.missingScreens[0].requiredContent);
    const repaired=structuredClone(raw);repaired.screens[0].purpose='Unrelated rewrite';return JSON.stringify(repaired);
  },{promptAnalysis:analysis,selectedGuidance:{} as any});
  assert.equal(calls,2);assert.equal(plan.screens[0].purpose,incomplete.screens[0].purpose);
  assert.deepEqual(plan.screens.map(s=>s.name),['Home','Profile']);
});
test('normalization preserves named plan screens and their navigation destinations',async()=>{
  const app=fixture(),plan=planFixture(app);plan.screens[0].name=' HOME ';plan.screens[1].name=' profile  ';
  plan.journey={mode:'interactive',entryScreens:['home'],edges:[{from:'HOME',to:' Profile ',action:'Open profile'}],rationale:'Requested journey'};
  const approved=await planDesign('Include screens named Home and Profile.','mobile_app',async()=>JSON.stringify(plan));
  app.screens[0].components[2].targetScreenId='profile';app.screens[0].name=' home ';app.screens[1].name='PROFILE';
  validatePlannedDesign(app,approved);
  assert.deepEqual(approved.screens.map(s=>s.name),['Home','Profile']);
  assert.equal(approved.journey!.edges[0].toScreenId,'profile');
});
test('fresh named screens keep the same reserved IDs from requirement extraction through approved planning',async()=>{
  const prompt='Include screens named Home and Profile.',raw=planFixture(fixture());raw.screens.forEach(s=>delete s.id);
  const expected=requestedScreenDetails(prompt,[]),approved=await planDesign(prompt,'mobile_app',async()=>JSON.stringify(raw));
  assert.deepEqual(approved.requiredScreens?.map(s=>s.id),expected.map(s=>s.id));
  assert.deepEqual(approved.screens.map(s=>s.id),expected.map(s=>s.id));
  assert.deepEqual(requestedScreenDetails('Include screens named  HOME and PROFILE.',[]).map(s=>s.id),expected.map(s=>s.id));
});
test('exclusions, examples, website sections and independently named prefixes are not collapsed',()=>{
  assert.deepEqual(requestedScreenDetails('Do not include a Login page.',[]),[]);
  assert.deepEqual(requestedScreenDetails('Create a single-page website with Hero, Features and Pricing sections.',[]),[]);
  assert.deepEqual(requestedScreenDetails('For example, create a Profile screen.',[]),[]);
  assert.deepEqual(requestedScreenDetails('Include screens named Projects and Projects Listing.',[]).map(s=>s.expectedName),['Projects','Projects Listing']);
  assert.deepEqual(requestedScreenDetails('Include screens named "Research and Development", "Team Members Page".',[]).map(s=>s.expectedName),['Research and Development','Team Members Page']);
  assert.deepEqual(requestedScreenDetails('Include a team members page.',['Team Members Page']).map(s=>s.expectedName),['Team Members']);
});
test('targeted screen repair restores a missing destination without changing valid screens or existing links',async()=>{
  const app=fixture(),raw=planFixture(structuredClone(app));
  raw.journey={mode:'interactive',entryScreens:['Home'],edges:[{from:'Home',to:'Profile',action:'Open profile'}],rationale:'Required screens'};
  const plan=await planDesign('Include screens named Home and Profile.','mobile_app',async()=>JSON.stringify(raw));
  app.screens[0].components[2].targetScreenId='profile';
  const complete={message:'Design',app},incomplete=structuredClone(complete);incomplete.app.screens.pop();
  let error:DesignValidationError|undefined;try{validatePlannedDesign(incomplete.app,plan);}catch(e){error=e as DesignValidationError;}
  assert.equal(error!.code,'REQUIREMENT_SCREEN');assert.equal(error!.details.missingScreens![0].id,'profile');
  assert.equal(validationDiagnostic(error).missingScreens,undefined);
  const repair=targetedRepair(incomplete,error,plan)!;assert.deepEqual(repair.scope.screenIds,['profile']);
  const fixed=structuredClone(complete);fixed.app.screens[0].components[1].text='Unrelated rewrite';delete fixed.app.screens[0].components[2].targetScreenId;
  const merged=repair.restore(fixed) as typeof complete;
  assert.deepEqual(merged.app.screens[0],incomplete.app.screens[0]);validateApp(merged.app);validatePlannedDesign(merged.app,plan);
  fixed.app.screens[1].name='Account';assert.throws(()=>validatePlannedDesign((repair.restore(fixed) as typeof complete).app,plan),/requested named screen/);
});
test('unsuccessful planning repair stops after one attempt with the exact missing screen diagnostic',async()=>{
  const raw=planFixture(fixture());raw.screens.pop();raw.journey={mode:'static',entryScreens:['Home'],edges:[],rationale:'Requested names'};
  let calls=0;
  await assert.rejects(()=>planDesign('Include screens named Home and Profile.','mobile_app',async()=>{calls++;return JSON.stringify(raw);}), (e:any)=>e.code==='REQUIREMENT_SCREEN'&&e.details.missingScreens[0].expectedName==='Profile');
  assert.equal(calls,2);
});
test('HTTP pipeline preserves normalized requirements, stages and the design on planning/draft screen failures',async()=>{
  const nativeFetch=globalThis.fetch,info=console.info,logs:unknown[][]=[];console.info=(...args)=>{logs.push(args);};
  let scenario='planning-missing',plans=0,repairs=0,drafts=0;
  const expectedApp=fixture();expectedApp.screens[0].components[2].targetScreenId='profile';
  const expectedPlan=planFixture(structuredClone(expectedApp));expectedPlan.journey={mode:'interactive',entryScreens:['Home'],edges:[{from:'Home',to:'Profile',action:'Open profile'}],rationale:'Requested flow'};
  const seen:any[]=[];
  globalThis.fetch=(async(url,init)=>{
    if(!String(url).startsWith('https://generativelanguage.googleapis.com'))return nativeFetch(url,init);
    const body=JSON.parse(String(init?.body)),payload=JSON.parse(body.contents[0].parts[0].text),props=body.generationConfig.responseJsonSchema.properties;seen.push(payload);
    let output:any;
    if(props.visualTokens){
      plans++;output=structuredClone(expectedPlan);
      if((scenario==='planning-missing'&&plans===1)||scenario==='planning-irreparable')output.screens.pop();
      if(payload.mode==='planning-repair'){
        assert.equal(payload.missingScreens[0].expectedName,'Profile');assert.ok(payload.missingScreens[0].requiredContent);output.screens[0].composition='Unrelated recomposition';
      }
    }else if(props.designMd)output=designMdFixture(payload.designPlan,payload.originalPrompt);
    else if(!props.app)output={productType:'mobile_app',screens:[' HOME ','Profile']};
    else{
      const app=payload.mode==='review'?structuredClone(payload.candidateDesign):payload.mode==='validation-repair'?structuredClone(payload.invalidResponse.app):structuredClone(expectedApp);
      app.screens.forEach((screen:any)=>{screen.id=payload.designPlan.screens.find((s:any)=>s.name===screen.name).id;});
      app.screens[0].components[2].targetScreenId=payload.designPlan.screens.find((s:any)=>s.name==='Profile').id;
      if(payload.mode==='generate'){
        drafts++;assert.deepEqual(payload.designPlan.requiredScreens.map((r:any)=>r.expectedName),['Home','Profile']);
        if(scenario==='draft-missing'||scenario==='draft-irreparable')app.screens.pop();
      }
      if(payload.mode==='validation-repair'){
        repairs++;const missing=payload.validation.missingScreens[0];assert.equal(missing.expectedName,'Profile');assert.equal(missing.id,'profile');
        if(scenario!=='draft-irreparable')app.screens.push(structuredClone(expectedApp.screens[1]));
        app.screens[0].components[1].text='Unrelated rewrite';delete app.screens[0].components[2].targetScreenId;
      }
      if(payload.mode==='review'){assert.equal(payload.designPlan.screens[0].composition,expectedPlan.screens[0].composition);app.screens[0].name=' home ';app.screens[1].name=' PROFILE ';}
      output={message:'Complete design',app};
    }
    return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(output)}]}}]}));
  }) as typeof fetch;
  const route=designRoute({GEMINI_API_KEY:'server-only-test-key',GEMINI_MODEL:'gemini-3.1-flash-lite'},async()=> 'test-uid'),server=createServer((req,res)=>void route(req,res,()=>res.end()));
  try{
    await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    const before=JSON.stringify(expectedApp),url=`http://127.0.0.1:${(server.address() as any).port}/api/design`;
    for(scenario of ['planning-missing','planning-irreparable','draft-missing','draft-irreparable']){
      plans=0;repairs=0;drafts=0;seen.length=0;
      const response=await nativeFetch(url,{method:'POST',body:JSON.stringify({mode:'generate',prompt:'Include screens named Home and Profile.',app:expectedApp})}),result=await response.json();
      if(scenario.endsWith('irreparable')){
        assert.equal(response.status,502);assert.equal(result.code,'REQUIREMENT_SCREEN');assert.equal(result.missingScreens[0].expectedName,'Profile');assert.equal(result.app,undefined);
        assert.equal(result.stage,scenario.startsWith('planning')?'planning-repair':'draft-repair');if(scenario.startsWith('planning'))assert.equal(drafts,0);
      }else{
        assert.equal(response.status,200);assert.equal(result.app.screens[0].name,'Home');assert.equal(result.app.screens[1].name,'Profile');
        const expectedComponents=structuredClone(expectedApp.screens[0].components);expectedComponents[2].targetScreenId=result.app.screens[1].id;
        assert.deepEqual(result.app.screens[0].components,expectedComponents);
      }
      assert.equal(JSON.stringify(expectedApp),before);assert.ok(plans<=2);assert.ok(repairs<=1);
    }
    assert.ok(!JSON.stringify(logs).includes('server-only-test-key'));
  }finally{globalThis.fetch=nativeFetch;console.info=info;await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
