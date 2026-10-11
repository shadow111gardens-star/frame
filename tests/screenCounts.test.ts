import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveRequirements,screenCountConstraints,enforceScreenRequirements} from '../server/designRequirements';
import {analyzeDesignPrompt} from '../server/designKnowledge/analysis';
import {planDesign} from '../server/designPlanning';
import {selectDesignGuidance} from '../server/designKnowledge/selection';
import {fixture} from './fixture';
import {planFixture} from './planFixture';

const invented={purpose:'Original product',requestedScreenCount:7,countEvidence:'seven screens',excludedScreens:[],exclusions:[],conflicts:[]};
test('unspecified, illustrative, suggested and feature counts cannot impose an exact total',()=>{
 for(const prompt of ['Create an app for collecting ideas.','Design a website with search, account and checkout.','Create an app; for example, 3 screens could show the journey.','Create an app with about 3 screens.','Create an app that shows 3 screens per workspace.','The existing app has 3 screens.','Create an app with suggested 3 screens.']){
  assert.equal(resolveRequirements(prompt,[],invented).requestedScreenCount,null,prompt);
 }
});
test('original exact counts replace incorrect analysis and paraphrased evidence',()=>{
 for(const prompt of ['Create exactly 3 screens.','I need three screens.','Create a single-page website.']){
  const r=resolveRequirements(prompt,[],invented);assert.equal(r.requestedScreenCount,prompt.includes('single')?1:3);
  assert.ok(prompt.includes(r.countEvidence));assert.equal(invented.requestedScreenCount,7);
 }
 assert.throws(()=>resolveRequirements('Create exactly 2 screens and exactly 3 screens.',[]),/clarify/);
});
test('ranges and bounds are distinct from exact counts and retain bounded enforcement',()=>{
 for(const [prompt,kind] of [['Create between 3 and 5 screens.','range'],['Create 3–5 screens.','range'],['Create from three to five pages.','range'],['Create at least 3 screens.','minimum'],['Create up to 5 screens.','maximum'],['Create at most five pages.','maximum']] as const){
  assert.equal(screenCountConstraints(prompt)[0].kind,kind,prompt);
  assert.equal(resolveRequirements(prompt,[],invented).requestedScreenCount,null,prompt);
 }
 const prompt='Create between 3 and 5 screens.',r=resolveRequirements(prompt,[]);
 enforceScreenRequirements(Array.from({length:4},(_,i)=>({name:String(i)})),[],r,prompt);
 assert.throws(()=>enforceScreenRequirements([{name:'Only'}],[],r,prompt),/between 3 and 5/);
 assert.throws(()=>resolveRequirements('Create at least 5 screens and at most 3 screens.',[]),/clarify/);
});
test('analysis and planning discard invented counts without changing the original request',async()=>{
 const prompt='Create an original mobile app for independent artists.';
 const analyzed=await analyzeDesignPrompt(prompt,async()=>JSON.stringify({productType:'mobile_app',requirements:invented}),'mobile_app');
 assert.equal(analyzed.requirements?.requestedScreenCount,null);
 const knowledge={promptAnalysis:{...analyzed,requirements:invented},selectedGuidance:selectDesignGuidance(prompt,analyzed,'generate')};
 let request:any;
 const plan=await planDesign(prompt,'mobile_app',async body=>{request=JSON.parse((body as any).contents[0].parts[0].text);return JSON.stringify(planFixture(fixture()));},knowledge);
 assert.equal(request.prompt,prompt);assert.equal(request.promptAnalysis.requirements.requestedScreenCount,null);
 assert.equal(plan.screens.length,2);assert.equal(knowledge.promptAnalysis.requirements.requestedScreenCount,7);
});
