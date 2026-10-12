import {designMdFixture} from './designMdFixture';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import {designPolicy,policyInstructions} from '../shared/designPolicy';
import {componentSchema,colorRoles,textRoles,validateApp,validateGeneratedFonts} from '../shared/design';
import {resolveRequirements,enforceScreenRequirements,explicitCounts} from '../server/designRequirements';
import {mergeScreenEdit} from '../shared/editScope';
import {analyzeDesignPrompt} from '../server/designKnowledge/analysis';
import {selectDesignGuidance} from '../server/designKnowledge/selection';
import {planDesign,validateJourney,validatePlannedDesign} from '../server/designPlanning';
import {designRoute} from '../server/gemini';
import {resolveStyles} from '../src/design/designProperties';
import {reflowText,dockedSpace} from '../src/design/textLayout';
import {inspectStructure} from '../shared/designQuality';
import {fixture} from './fixture';
import {planFixture} from './planFixture';

test('policy and actual schema capabilities agree; there are no predefined product journeys',()=>{
  assert.deepEqual(designPolicy.capabilities.components,componentSchema.shape.type.options);
  assert.deepEqual(designPolicy.tokens.semanticColors,[...colorRoles]);
  assert.deepEqual(designPolicy.tokens.textRoles,[...textRoles]);
  assert.deepEqual(designPolicy.capabilities.layouts,componentSchema.shape.styles.shape.layout.unwrap().options);
  assert.deepEqual(designPolicy.capabilities.responsiveOverrides,Object.keys(componentSchema.shape.styles.shape.responsive.unwrap().shape).filter(k=>k!=='maxWidth'));
  assert.ok(policyInstructions().includes(designPolicy.version));assert.equal(designPolicy.understanding.predefinedJourneys,false);
  const app=fixture();app.screens[0].components[0].styles={blur:10} as any;assert.throws(()=>validateApp(app));
});
test('product-agnostic exact counts, explicit names, negatives and conflicts are enforced',()=>{
  for(const prompt of ['Create three screens for a meteorite collection tool.','Create 3 screens for a collaborative sound sculpture.']){
    const requirements=resolveRequirements(prompt,[]);assert.equal(requirements.requestedScreenCount,3);
    enforceScreenRequirements([{name:'A'},{name:'B'},{name:'C'}],[],requirements);
    assert.throws(()=>enforceScreenRequirements([{name:'A'}],[],requirements),/exactly 3/);
  }
  assert.deepEqual(explicitCounts('Do not create five screens. Create three screens.'),[3]);
  assert.equal(resolveRequirements('Create a single-page website.',[]).requestedScreenCount,1);
  assert.throws(()=>resolveRequirements('Create exactly 2 screens and exactly 3 screens.',[]),/clarify/);
  assert.throws(()=>resolveRequirements('Create 1 screen.', ['North','South']),/clarify/);
  const r=resolveRequirements('Create 2 screens: Canvas and Archive. Exclude Login.', ['Canvas','Archive'],{purpose:'Original art tool',requestedScreenCount:2,countEvidence:'2 screens',excludedScreens:[{name:'Login',evidence:'Exclude Login'}],exclusions:['Exclude Login'],conflicts:[]});
  assert.throws(()=>enforceScreenRequirements([{name:'Canvas'},{name:'Login'}],[],r),/excluded screen/);
  assert.throws(()=>enforceScreenRequirements([{name:'Canvas'},{name:'Other'}],['Archive'],r),/named screen/);
  assert.throws(()=>resolveRequirements('Include Login and exclude Login.', ['Login'],{...r,requestedScreenCount:null,countEvidence:'',excludedScreens:[{name:'Login',evidence:'exclude Login'}]}),/both required and excluded/);
  assert.equal(resolveRequirements('Design an app.',[],{...r,countEvidence:'two screens'}).requestedScreenCount,null);
});
test('semantic analysis respects selection, validated exclusions and no category presets',async()=>{
  const raw={productType:'mobile_app',category:'general',audience:'Independent musicians',goals:['Arrange sound'],screens:['Studio','Archive'],requirements:{purpose:'Sound composition tool',requestedScreenCount:2,countEvidence:'2 screens',excludedScreens:[{name:'Login',evidence:'No Login'}],exclusions:['No Login'],conflicts:[]}};
  const prompt='Design a website with 2 screens: Studio and Archive. No Login.';
  const result=await analyzeDesignPrompt(prompt,async()=>JSON.stringify(raw),'website');assert.equal(result.productType,'website');
  const a=selectDesignGuidance(prompt,result,'generate'),b=selectDesignGuidance('Different wording',result,'generate');
  assert.equal(a.direction,'derive-from-request');assert.deepEqual(a,b);assert.equal(a.paletteSuggestion,undefined);
  const conflicting={...raw,requirements:{...raw.requirements,conflicts:[{reason:'Contradictory layout requirements',evidence:['No Login']}]}};
  await assert.rejects(analyzeDesignPrompt(prompt,async()=>JSON.stringify(conflicting),'website'),/clarify/);
});
test('planning enforces exact counts and a request-derived navigation graph',async()=>{
  const app=fixture(),plan=planFixture(app);
  await assert.rejects(planDesign('Create exactly 3 screens.','mobile_app',async()=>JSON.stringify(plan)),/exactly 3/);
  const graph={...plan,journey:{mode:'interactive' as const,entryScreens:['Home'],edges:[],rationale:'User task flow'}};
  assert.throws(()=>validateJourney(graph),/unreachable/);
  graph.journey.edges.push({from:'Home',to:'Profile',action:'Open profile'});validateJourney(graph);
  assert.throws(()=>validatePlannedDesign(app,graph),/navigation edge/);
  app.screens[0].components[2].targetScreenId='profile';validatePlannedDesign(app,graph);
  graph.journey.edges[0].to='Invented';assert.throws(()=>validateJourney(graph),/unknown screen/);
});
test('redesign allows selected-screen recomposition while preserving unrelated data and shared settings',()=>{
  const original=fixture(),candidate=structuredClone(original);
  candidate.name='Unwanted rename';candidate.screens[1].components[0].text='Unwanted unrelated edit';candidate.designSystem.colors.accent='#8844cc';
  candidate.screens[0].components[2].styles={backgroundToken:'accent',fontSize:18};candidate.screens[0].components.splice(0,2);
  const merged=mergeScreenEdit(original,candidate,['home']);
  assert.deepEqual(merged.screens[1],original.screens[1]);assert.deepEqual(merged.designSystem,original.designSystem);assert.equal(merged.name,original.name);
  assert.equal(merged.screens[0].components.length,1);assert.equal(merged.screens[0].components[0].styles.background,'#8844cc');assert.equal(merged.screens[0].components[0].styles.backgroundToken,undefined);
  assert.equal(original.screens[0].components.length,3);
  candidate.screens[0].components[0].id='profile-title';assert.throws(()=>mergeScreenEdit(original,candidate,['home']),/unrelated component ID/);
});
test('named typography, semantic colors and responsive direction resolve to the actual renderer styles',()=>{
  const app=fixture();app.designSystem.colors.primary='#225577';app.designSystem.textStyles={heading:{font:'Inter',fontSize:28,fontWeight:600,lineHeight:1.2}};
  const style=resolveStyles({textStyleToken:'heading',colorToken:'primary',layout:'flex',direction:'row',responsive:{maxWidth:600,direction:'column',gap:12}},app.designSystem,390);
  assert.equal(style.fontSize,28);assert.equal(style.color,'#225577');assert.equal(style.direction,'column');assert.equal(style.gap,12);
  assert.equal(resolveStyles({...style,fontSize:32},app.designSystem).fontSize,32);
  app.screens[0].components[0].styles.textStyleToken='body';assert.throws(()=>validateApp(app),/Missing text style/);
});
test('font and icon capabilities remain validated',()=>{
  const imported=fixture();imported.designSystem.typography.font='ExternallyLoadedFont';validateApp(imported);assert.throws(()=>validateGeneratedFonts(imported),/Unsupported font/);validateGeneratedFonts(imported,imported);
  const bad=fixture();bad.screens[0].components[0].type='Icon';bad.screens[0].components[0].icon='unknown';assert.throws(()=>validateApp(bad),/Unsupported icon/);
});
test('text and flow growth reserves docked navigation instead of covering the final content',()=>{
  const app=fixture();app.screens[0].components.push({id:'nav',type:'Navigation',name:'Dock',position:{x:0,y:0,width:390,height:80},styles:{dock:'bottom'}});
  const content=app.screens[0].components.filter(c=>!c.styles.dock);content[2].position.y=700;
  const layout=reflowText(content,{button:140},844,dockedSpace(app.screens[0].components));
  assert.equal(layout.height,920);assert.equal(layout.positions.button.height,140);
  assert.equal(reflowText(content,{button:140},920,80).height,920,'Repeated measurements do not keep increasing screen height');
});
test('breakpoint-hidden subtrees are excluded from visible clipping checks',()=>{
  const app=fixture();app.productType='website';app.screens[0].width=390;
  app.screens[0].components[0].position.x=900;app.screens[0].components[0].styles.responsive={maxWidth:600,hidden:true};app.screens[0].components[1].position.x=900;
  assert.ok(!inspectStructure(app).some(i=>i.componentIds.includes('card')||i.componentIds.includes('title')));
  app.screens[0].width=1200;assert.ok(inspectStructure(app).some(i=>i.componentIds.includes('title')),'Visible invalid geometry is still detected');
});
test('actual API route applies redesign isolation and rejects requirement conflicts before Google calls',async()=>{
  const nativeFetch=globalThis.fetch;let calls=0;let addScreen=false;
  globalThis.fetch=(async(url,init)=>{
    if(String(url).startsWith('https://generativelanguage.googleapis.com')){calls++;const app=fixture();app.screens[1].components[0].text='Rogue change';app.designSystem.colors.accent='#8822cc';app.screens[0].components[2].styles.backgroundToken='accent';if(addScreen)app.screens.push({id:'new-screen',name:'New screen',width:390,height:844,background:'#fff',components:[]});return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({message:'Updated',app})}]}}]}));}
    return nativeFetch(url,init);
  }) as typeof fetch;
  const route=designRoute({GEMINI_API_KEY:'test-only',GEMINI_MODEL:'unchanged-model'},async()=> 'test-uid'),server=createServer((req,res)=>void route(req,res,()=>res.end()));
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/design`;
  const post=(data:unknown)=>nativeFetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  try{
    const response=await post({mode:'modify',prompt:'Improve the selected layout',app:fixture(),activeScreen:'home'});assert.equal(response.status,200);const result=await response.json();assert.deepEqual(result.app.screens[1],fixture().screens[1]);assert.deepEqual(result.app.designSystem,fixture().designSystem);
    const before=calls;assert.equal((await post({mode:'generate',prompt:'Create 2 screens and 3 screens.'})).status,422);assert.equal(calls,before);
    assert.equal((await post({mode:'modify',prompt:'Improve all screens',app:fixture(),activeScreen:'home'})).status,422);
    const negative=await post({mode:'modify',prompt:'Improve Home. Do not change all screens.',app:fixture(),activeScreen:'home'});assert.equal(negative.status,200);assert.deepEqual((await negative.json()).app.screens[1],fixture().screens[1]);
    addScreen=true;const added=await post({mode:'modify',prompt:'Add a Settings page',app:fixture(),activeScreen:'home'});assert.equal(added.status,422);assert.ok((await added.json()).error.includes('Entire project'));addScreen=false;
    const global=await post({mode:'modify',prompt:'Improve all screens',editScope:'project',app:fixture(),activeScreen:'home'});assert.equal(global.status,200);assert.equal((await global.json()).app.screens[1].components[0].text,'Rogue change');
  }finally{globalThis.fetch=nativeFetch;await new Promise<void>(r=>server.close(()=>r()));}
});
