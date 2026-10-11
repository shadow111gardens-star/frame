import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeDesignPrompt,type PromptAnalysis} from '../server/designKnowledge/analysis';
import {editAnalysis,selectDesignGuidance,KNOWLEDGE_PRECEDENCE} from '../server/designKnowledge/selection';
import {buildDesignInstructions} from '../server/designInstructions';
import {fixture} from './fixture';
import {planDesign} from '../server/designPlanning';
import {planFixture} from './planFixture';
const analysis=(overrides:Partial<PromptAnalysis>={}):PromptAnalysis=>({productType:'mobile_app',category:'fitness',audience:'Adults',styleHints:[],theme:'unspecified',preferences:{style:[],colors:[],typography:[],branding:[]},goals:['Track workouts'],screens:['Home','Profile'],sections:[],uxNeeds:['data'],...overrides});

test('semantic prompt analysis retains original requirements and resolves indirect/ambiguous intent',async()=>{
  const prompt='Build a public page to advertise my phone app Pulse. Use editorial typography, Inter and #1A2B3C. Home.';
  const output=analysis({productType:'website',category:'creative',styleHints:['editorial'],preferences:{style:['editorial'],colors:['#1A2B3C','#FFFFFF'],typography:['Inter'],branding:['Pulse','Invented Brand']},screens:['Home','Invented Page']});
  const actual=await analyzeDesignPrompt(prompt,async body=>{
    const request=body as any;
    assert.equal(JSON.parse(request.contents[0].parts[0].text).prompt,prompt);
    assert.ok(request.systemInstruction.parts[0].text.includes('negations'));
    assert.ok(request.systemInstruction.parts[0].text.includes('exact short phrases'));
    assert.ok(request.generationConfig.responseJsonSchema.properties.category);
    return JSON.stringify(output);
  });
  assert.equal(actual.productType,'website');assert.equal(actual.preferences.branding[0],'Pulse');
  assert.deepEqual(actual.preferences.colors,['#1A2B3C']);assert.deepEqual(actual.preferences.typography,['Inter']);
  assert.deepEqual(actual.preferences.branding,['Pulse']);assert.deepEqual(actual.screens,['Home']);
  await assert.rejects(analyzeDesignPrompt('Something',async()=>'{"productType":"ambiguous"}'),/select Web or App/);
  assert.equal((await analyzeDesignPrompt('Something',async()=>'{"productType":"ambiguous"}','website')).productType,'website');
  await assert.rejects(analyzeDesignPrompt('App',async()=>'{"productType":"unknown"}'),/invalid prompt analysis/);
});

test('local retrieval is bounded, varied and respects explicit art direction instead of category stereotypes',()=>{
  const editorial=selectDesignGuidance('Editorial fitness',analysis({styleHints:['editorial']}),'generate');
  const playful=selectDesignGuidance('Playful fitness',analysis({styleHints:['energetic']}),'generate');
  assert.equal(editorial.direction,'editorial');assert.equal(playful.direction,'energetic');
  assert.notDeepEqual(editorial.fontSuggestion,playful.fontSuggestion);
  assert.equal(editorial.paletteSuggestion,undefined); // Explicit direction wins over an industry palette.
  assert.ok(editorial.rules.some(r=>r.source.includes('editorial-grid-magazine')));
  assert.ok(editorial.rules.some(r=>r.id==='ux:data'));assert.ok(!editorial.rules.some(r=>r.id==='ux:booking'));
  const branded=selectDesignGuidance('Pulse #1A2B3C Inter',analysis({preferences:{style:[],colors:['#1A2B3C'],typography:['Inter'],branding:['Pulse']}}),'generate');
  assert.equal(branded.paletteSuggestion,undefined);assert.equal(branded.fontSuggestion,undefined);
  const full=selectDesignGuidance('Fitness',analysis({uxNeeds:['data','forms','search','booking','content','onboarding','commerce','authentication','accessibility']}),'generate');
  assert.ok(full.rules.length<=10);assert.ok(JSON.stringify(full).length<7000);
  assert.deepEqual(full,selectDesignGuidance('Fitness',analysis({uxNeeds:['data','forms','search','booking','content','onboarding','commerce','authentication','accessibility']}),'generate'));
  const finance=selectDesignGuidance('Money dashboard',analysis({category:'finance',productType:'website'}),'generate');
  assert.ok(!finance.rules.some(r=>r.id.startsWith('industry:')));assert.equal(finance.direction,'derive-from-request');
  assert.ok(!finance.platformRule.includes('44 logical'));
  const fallback=selectDesignGuidance('Unusual niche',analysis({category:'general'}),'generate');
  assert.equal(fallback.paletteSuggestion,undefined);
});

test('Appllama and Claude guidance resolve conflicts without resetting scoped edits',()=>{
  const app=fixture(),before=structuredClone(app);
  const local=editAnalysis('Make the primary button purple. Do not switch to editorial. Turn it into a website.',app);
  assert.equal(local.productType,'mobile_app');assert.deepEqual(local.styleHints,[]);
  const edit=selectDesignGuidance('Make button purple',local,'modify');
  assert.equal(edit.direction,'preserve-existing');assert.equal(edit.paletteSuggestion,undefined);assert.equal(edit.fontSuggestion,undefined);
  assert.ok(edit.preservation?.includes('manual edits'));
  assert.deepEqual(app,before);
  const redesigned=selectDesignGuidance('Make Home editorial',editAnalysis('Make Home editorial',app),'modify');
  assert.equal(redesigned.direction,'editorial');assert.equal(redesigned.fontSuggestion,undefined);
  const mobile=buildDesignInstructions('mobile_app','generate'),web=buildDesignInstructions('website','generate');
  assert.ok(mobile.includes('MOBILE DESIGN QUALITY'));assert.ok(mobile.includes(KNOWLEDGE_PRECEDENCE));
  assert.ok(web.includes('WEBSITE DESIGN QUALITY'));assert.ok(!web.includes('MOBILE DESIGN QUALITY'));
  assert.ok(KNOWLEDGE_PRECEDENCE.includes('real CSS values resolved from semantic roles'));
  assert.ok(KNOWLEDGE_PRECEDENCE.includes('Original user requirements outrank'));
  assert.ok(KNOWLEDGE_PRECEDENCE.includes('unsupported'));
});
test('planning retains named requested screens without treating website sections as extra pages',async()=>{
  const plan=planFixture(fixture());
  const promptAnalysis=analysis({screens:['Home','Profile'],sections:['Hero','Features']});
  const selectedGuidance=selectDesignGuidance('Prompt',promptAnalysis,'generate');
  await planDesign('Home Profile','mobile_app',async()=>JSON.stringify(plan),{promptAnalysis,selectedGuidance});
  await assert.rejects(planDesign('Settings','mobile_app',async()=>JSON.stringify(plan),{promptAnalysis:analysis({screens:['Settings']}),selectedGuidance}),/requested named screen/);
});
