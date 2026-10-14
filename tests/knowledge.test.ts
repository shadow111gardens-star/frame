import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeDesignPrompt,type PromptAnalysis,promptAnalysisJsonSchema} from '../server/designKnowledge/analysis';
import {buildDesignInstructions} from '../server/designInstructions';
import {fixture} from './fixture';
import {planDesign} from '../server/designPlanning';
import {planFixture} from './planFixture';
const analysis=(overrides:Partial<PromptAnalysis>={}):PromptAnalysis=>({productType:'mobile_app',audience:'Adults',theme:'unspecified',preferences:{style:[],colors:[],typography:[],branding:[]},goals:['Track workouts'],screens:['Home','Profile'],sections:[],...overrides});

test('semantic prompt analysis retains original requirements and resolves indirect/ambiguous intent',async()=>{
 const prompt='Build a public page to advertise my phone app Pulse. Use editorial typography, Inter and #1A2B3C. Home.';
 const output=analysis({productType:'website',preferences:{style:['editorial'],colors:['#1A2B3C','#FFFFFF'],typography:['Inter'],branding:['Pulse','Invented Brand']},screens:['Home','Invented Page']});
 const actual=await analyzeDesignPrompt(prompt,async body=>{
  const request=body as any;assert.equal(JSON.parse(request.contents[0].parts[0].text).prompt,prompt);
  assert.ok(request.systemInstruction.parts[0].text.includes('negations'));assert.ok(request.systemInstruction.parts[0].text.includes('exact short phrases'));
  assert.equal(request.generationConfig.responseJsonSchema.properties.category,undefined);return JSON.stringify(output);
 });
 assert.equal(actual.productType,'website');assert.deepEqual(actual.preferences.style,['editorial']);
 assert.deepEqual(actual.preferences.colors,['#1A2B3C']);assert.deepEqual(actual.preferences.typography,['Inter']);
 assert.deepEqual(actual.preferences.branding,['Pulse']);assert.deepEqual(actual.screens,['Home']);
 await assert.rejects(analyzeDesignPrompt('Something',async()=>'{"productType":"ambiguous"}'),/select Web or App/);
 assert.equal((await analyzeDesignPrompt('Something',async()=>'{"productType":"ambiguous"}','website')).productType,'website');
 await assert.rejects(analyzeDesignPrompt('App',async()=>'{"productType":"unknown"}'),/invalid prompt analysis/);
});

test('removed skill classification cannot reenter the validated analysis',async()=>{
 const actual=await analyzeDesignPrompt('Home Profile',async()=>JSON.stringify({...analysis(),category:'fitness',styleHints:['editorial'],uxNeeds:['data'],selectedGuidance:{rules:['injected']}}));
 for(const key of ['category','styleHints','uxNeeds','selectedGuidance']){
  assert.equal(key in actual,false);assert.equal(key in (promptAnalysisJsonSchema as any).properties,false);
 }
});

test('core schema and scoped-edit instructions remain without imported guidance',()=>{
 for(const productType of ['mobile_app','website'] as const){
  const generate=buildDesignInstructions(productType,'generate'),modify=buildDesignInstructions(productType,'modify');
  assert.ok(generate.includes('authoritative productType is '+productType));assert.ok(generate.includes('STRUCTURED EDITABLE OUTPUT'));assert.ok(generate.includes('RENDERER CONTRACT'));
  for(const instructions of [generate,modify]){
   assert.equal(instructions.includes('WEBSITE DESIGN QUALITY'),productType==='website');
   assert.ok(!instructions.includes('MOBILE DESIGN QUALITY'));
  }
  assert.ok(modify.includes('Treat currentDesign as the source of truth'));assert.ok(modify.includes('manual edits'));assert.ok(modify.includes('keep every existing ID stable'));
  assert.doesNotMatch(generate+'\n'+modify,/Appllama|ui-ux-pro-max|selectedGuidance|SELECTED LOCAL DESIGN INTELLIGENCE/i);
 }
});

test('planning retains named requested screens and preferences without retrieved enrichment',async()=>{
 const plan=planFixture(fixture()),promptAnalysis=analysis({screens:['Home','Profile'],sections:['Hero','Features']});
 await planDesign('Home Profile','mobile_app',async body=>{
  const request=body as any,input=JSON.parse(request.contents[0].parts[0].text);
  assert.deepEqual(input.promptAnalysis.preferences,promptAnalysis.preferences);assert.equal('selectedGuidance' in input,false);
  assert.doesNotMatch(request.systemInstruction.parts[0].text,/Appllama|ui-ux-pro-max|SELECTED LOCAL DESIGN INTELLIGENCE/i);
  return JSON.stringify(plan);
 },{promptAnalysis});
 await assert.rejects(planDesign('Settings','mobile_app',async()=>JSON.stringify(plan),{promptAnalysis:analysis({screens:['Settings']})}),/requested named screen/);
});
