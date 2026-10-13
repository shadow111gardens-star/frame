import {designMdFixture,specificationFixture} from './designMdFixture';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixture';
import {planFixture} from './planFixture';
import {planDesign,validatePlannedDesign,resolvedPlanNavigation,approvePlanNavigation} from '../server/designPlanning';
import {targetedRepair} from '../server/designRepair';
import {DesignValidationError,validationDiagnostic} from '../server/designDiagnostics';
import {validateApp} from '../shared/design';
import {createServer} from 'node:http';
import {designRoute} from '../server/gemini';

function journey() {
  const app=fixture(),plan=planFixture(structuredClone(app));
  plan.journey={mode:'interactive',entryScreens:['Home'],edges:[{from:'Home',to:'Profile',action:'Open profile'}],rationale:'Requested action'};
  return {app,plan};
}
test('approved navigation reserves actual source and destination IDs before draft generation',async()=>{
  const {plan}=journey();
  plan.screens.forEach(s=>delete s.id);
  const approved=await planDesign('Home and Profile','mobile_app',async()=>JSON.stringify(plan));
  assert.ok(approved.screens.every(s=>typeof (s as any).id==='string'));
  const edge=approved.journey!.edges[0] as any;
  assert.equal(edge.fromScreenId,(approved.screens[0] as any).id);
  assert.equal(edge.toScreenId,(approved.screens[1] as any).id);
  assert.deepEqual(approved.screens.map(s=>s.id),['screen-1','screen-2']);
});
test('destination IDs must match the approved identity, never names or IDs invented during review',()=>{
  const {app,plan}=journey(),approved=approvePlanNavigation(plan);
  app.screens[0].components[2].targetScreenId='Profile';
  assert.throws(()=>validateApp(app),/Missing navigation target/);
  assert.throws(()=>validatePlannedDesign(app,approved),/navigation edge/);
  app.screens[0].components[2].targetScreenId='profile';validatePlannedDesign(app,approved);
  app.screens[1].id='new-profile';app.screens[0].components[2].targetScreenId='new-profile';
  validateApp(app);assert.throws(()=>validatePlannedDesign(app,approved),(e:any)=>e.details.reason==='PLANNED_SCREEN_IDS');
});
test('missing edge diagnostic identifies both screens, real IDs and the required action',()=>{
  const {app,plan}=journey();
  assert.throws(()=>validatePlannedDesign(app,plan),(e:any)=>{
    assert.deepEqual(e.details.missingNavigation,[{index:0,from:'Home',to:'Profile',action:'Open profile',fromScreenId:'home',toScreenId:'profile',actionComponentIds:[]}]);return true;
  });
});
test('new missing-edge controls are appended without redirecting valid actions or accepting hidden repairs',()=>{
  const {app,plan}=journey();app.screens[0].components[2].targetScreenId='profile';
  app.screens.push({id:'saved',name:'Saved',width:390,height:844,background:'#050507',components:[]});
  plan.screens.push({...structuredClone(plan.screens[1]),id:'saved',name:'Saved'});
  plan.journey!.edges.push({from:'Home',to:'Saved',action:'Open saved'});
  const candidate={message:'Draft',app},error=new DesignValidationError('Missing edge','DESIGN_CONSISTENCY',{reason:'PLANNED_NAVIGATION',missingEdgeIndexes:[1]});
  const repair=targetedRepair(candidate,error,plan)!;
  const fixed=structuredClone(candidate);fixed.app.screens[0].components[2].targetScreenId='saved';
  const rejected=repair.restore(fixed) as typeof candidate;
  assert.equal(rejected.app.screens[0].components[2].targetScreenId,'profile');assert.throws(()=>validatePlannedDesign(rejected.app,plan),/navigation edge/);
  fixed.app.screens[0].components.push({id:'open-saved',type:'Button',name:'Open saved',text:'Saved',targetScreenId:'saved',position:{x:20,y:370,width:350,height:48},styles:{}});
  const restored=repair.restore(fixed) as typeof candidate;validateApp(restored.app);validatePlannedDesign(restored.app,plan);
  assert.deepEqual(restored.app.screens[0].components.slice(0,3),app.screens[0].components);
  const nested=structuredClone(fixed),action=nested.app.screens[0].components.at(-1)!;
  action.position.x=0;action.position.y=0;
  nested.app.screens[0].components.push({id:'action-group',type:'Group',name:'Saved action',children:['title','open-saved'],position:{x:20,y:370,width:350,height:48},styles:{}});
  const grouped=repair.restore(nested) as typeof candidate;validateApp(grouped.app);validatePlannedDesign(grouped.app,plan);
  assert.deepEqual(grouped.app.screens[0].components.find(c=>c.id==='action-group')!.children,['open-saved'],'New containers cannot reparent valid existing content');
  fixed.app.screens[0].components.at(-1)!.styles.opacity=0;
  assert.throws(()=>validatePlannedDesign((repair.restore(fixed) as typeof candidate).app,plan),/navigation edge/);
});

test('actual HTTP route forwards the same ID contract, repairs once, and reports failed edges without mutating the design',async()=>{
  const originalFetch=globalThis.fetch,originalInfo=console.info,logs:unknown[][]=[];
  console.info=(...args)=>{logs.push(args);};
  let scenario='valid',repairs=0,calls=0;
  const seen:any[]=[];
  globalThis.fetch=(async(url,init)=>{
    if(!String(url).startsWith('https://generativelanguage.googleapis.com'))return originalFetch(url,init);
    calls++;const body=JSON.parse(String(init?.body)),payload=JSON.parse(body.contents[0].parts[0].text),props=body.generationConfig.responseJsonSchema.properties;
    let output:unknown;
    if(props.plan){const {plan}=journey();plan.screens.forEach(s=>delete s.id);output=specificationFixture(plan,payload.originalPrompt);}
    else if(props.visualTokens){const {plan}=journey();plan.screens.forEach(s=>delete s.id);output=plan;}
    else if(props.designMd)output=designMdFixture(payload.designPlan,payload.originalPrompt);
    else if(!props.app&&!payload.repairScope)output={productType:'mobile_app',category:'fitness',audience:'Adults',styleHints:[],theme:'unspecified',preferences:{style:[],colors:[],typography:[],branding:[]},goals:[],screens:[],sections:[],uxNeeds:[]};
    else {
      if(payload.repairScope){payload.mode='validation-repair';payload.invalidResponse={app:{...fixture(),screens:payload.candidate}};payload.designPlan={screens:[{id:'screen-1',name:'Home'},{id:'screen-2',name:'Profile'}]};payload.resolvedNavigation=[{fromScreenId:'screen-1',toScreenId:'screen-2',action:'Open profile'}];}
      seen.push(payload);
      const edge=payload.resolvedNavigation[0];
      assert.equal(edge.fromScreenId,'screen-1');assert.equal(edge.toScreenId,'screen-2');assert.equal(edge.action,'Open profile');
      const app=payload.mode==='review'?structuredClone(payload.candidateDesign):payload.mode==='validation-repair'?structuredClone(payload.invalidResponse.app):fixture();
      app.screens.forEach((s:any)=>{s.id=payload.designPlan.screens.find((p:any)=>p.name===s.name).id;});
      const button=app.screens[0].components[2];
      if(payload.mode==='generate'&&scenario==='valid')button.targetScreenId=edge.toScreenId;
      if(payload.mode==='generate'&&scenario==='mismatch')button.targetScreenId='Profile';
      if(payload.mode==='generate'&&scenario==='review-drops-edge')delete button.targetScreenId;
      if(payload.mode==='review'&&scenario==='review-drops-edge')delete button.targetScreenId;
      if(payload.mode==='validation-repair'){
        repairs++;assert.equal(payload.validation.missingNavigation[0].action,'Open profile');
        assert.equal(payload.validation.missingNavigation[0].fromScreenId,edge.fromScreenId);
        assert.deepEqual(payload.repairScope.screenIds,['screen-1']);
        if(scenario!=='irreparable')button.targetScreenId=edge.toScreenId;
        app.screens[0].components[1].text='Unrelated rewrite';if(app.screens[1])app.screens[1].components[0].text='Unrelated rewrite';
      }
      output={message:'Editable result',app};
    }
    return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(output)}]}}]}));
  }) as typeof fetch;
  const route=designRoute({GEMINI_API_KEY:'private-test-key',GEMINI_MODEL:'gemini-3.1-flash-lite'},async()=> 'test-uid'),server=createServer((req,res)=>void route(req,res,()=>res.end()));
  try{
    await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    const current=fixture(),before=JSON.stringify(current),url=`http://127.0.0.1:${(server.address() as any).port}/api/design`;
    for(scenario of ['valid','missing','mismatch','irreparable','review-drops-edge']){
      calls=0;repairs=0;seen.length=0;
      const response=await originalFetch(url,{method:'POST',body:JSON.stringify({mode:'generate',prompt:'Home and Profile',app:current})}),result=await response.json();
      assert.equal(repairs,['valid','mismatch'].includes(scenario)?0:1);assert.ok(calls<=6,'No repeated repair loop');
      if(scenario==='irreparable'){
        assert.equal(response.status,502);assert.equal(result.code,'DESIGN_CONSISTENCY');assert.equal(result.stage,'draft-repair');assert.equal(result.app,undefined);
        assert.equal(result.missingNavigation[0].toScreenId,'screen-2');assert.match(result.error,/Open profile/);
      }else{
        assert.equal(response.status,200);assert.equal(result.app.screens[0].components[2].targetScreenId,'screen-2');
        assert.deepEqual(result.app.screens[0].components[1],current.screens[0].components[1]);assert.deepEqual(result.app.screens[1].components,current.screens[1].components);
      }
      assert.equal(JSON.stringify(current),before);
      assert.equal(seen[0].resolvedNavigation[0].fromScreenId,'screen-1');
    }
    const safe=validationDiagnostic(new DesignValidationError('Missing','DESIGN_CONSISTENCY',{reason:'PLANNED_NAVIGATION',missingNavigation:[{index:0,from:'Private screen',to:'Private destination',fromScreenId:'one',toScreenId:'two',action:'Private action',actionComponentIds:[]}]}));
    assert.equal(safe.missingNavigation,undefined);assert.ok(!JSON.stringify(logs).includes('private-test-key'));
  }finally{globalThis.fetch=originalFetch;console.info=originalInfo;await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
test('visible Text/Card links are supported; decorative and noninteractive controls cannot satisfy an edge',()=>{
  const {app,plan}=journey();
  for(const type of ['Text','Card','Button','Navigation','Icon'] as const){
    const node=app.screens[0].components[2];node.type=type;node.targetScreenId='profile';if(type==='Icon')node.icon='user';
    validatePlannedDesign(app,plan);
  }
  for(const type of ['Divider','Chart','Progress','Input','Search'] as const){app.screens[0].components[2].type=type;assert.throws(()=>validatePlannedDesign(app,plan),/navigation edge/);}
});
test('one missing-edge repair preserves unrelated screens AND unrelated components on its source screen',()=>{
  const {app,plan}=journey(),candidate={message:'Draft',app};
  const error=new DesignValidationError('Missing edge','DESIGN_CONSISTENCY',{reason:'PLANNED_NAVIGATION',missingEdgeIndexes:[0]});
  const repair=targetedRepair(candidate,error,plan)!;
  const fixed=structuredClone(candidate);fixed.app.screens[0].components[2].targetScreenId='profile';
  fixed.app.screens[0].components[1].text='Unrequested rewrite';fixed.app.screens[1].components[0].text='Another rewrite';
  const result=repair.restore(fixed) as typeof candidate;
  assert.deepEqual(result.app.screens[0].components[1],app.screens[0].components[1]);
  assert.deepEqual(result.app.screens[1],app.screens[1]);validatePlannedDesign(result.app,plan);
});
test('multiple directed edges remain required; no unplanned return edge or peer tab is invented',()=>{
  const {app,plan}=journey();
  app.screens.push({id:'saved',name:'Saved',width:390,height:844,background:'#050507',components:[]});
  plan.screens.push({...structuredClone(plan.screens[1]),id:'saved',name:'Saved'});
  plan.journey!.edges.push({from:'Profile',to:'Saved',action:'View saved'});
  app.screens[0].components[2].targetScreenId='profile';
  assert.throws(()=>validatePlannedDesign(app,plan),(e:any)=>assert.deepEqual(e.details.missingEdgeIndexes,[1])===undefined);
  app.screens[1].components[0].targetScreenId='saved';validatePlannedDesign(app,plan);
  assert.equal(resolvedPlanNavigation(app,plan).length,2);
  plan.journey={mode:'static',entryScreens:app.screens.map(s=>s.name),edges:[],rationale:'Static screens'};
  app.screens.forEach(s=>s.components.forEach(c=>delete c.targetScreenId));validatePlannedDesign(app,plan);
});
