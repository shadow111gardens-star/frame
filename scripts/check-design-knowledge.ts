import assert from 'node:assert/strict';
import {geminiConfig} from '../server/gemini';
import {analyzeDesignPrompt} from '../server/designKnowledge/analysis';
import {selectDesignGuidance} from '../server/designKnowledge/selection';
try {process.loadEnvFile('.env');} catch { /* Host may inject configuration. */ }
const {key,model}=geminiConfig(process.env);
if(!key || !model)throw new Error('Configure GEMINI_API_KEY and GEMINI_MODEL.');
for(const [prompt,type,direction,brand,color] of [
  ['Build a public browser page advertising my fitness phone app Stride. Use a minimal light style, navy #1A2B3C and Inter. Include a hero and features section.','website','minimal','Stride','#1A2B3C'],
  ['Create a premium editorial fitness mobile app named Pulse with workout tracking and progress charts. Use #00BFA6 and Inter. Include Home, Activity, Progress and Profile.','mobile_app','editorial','Pulse','#00BFA6'],
] as const) {
  const analysis=await analyzeDesignPrompt(prompt,async body=>{
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
    if(!response.ok)throw new Error(`Live analysis failed (${response.status}).`);
    const data=await response.json();const candidate=data.candidates?.[0];
    if(candidate?.finishReason!=='STOP')throw new Error('Live analysis did not complete.');
    return candidate.content.parts.map((p:{text?:string})=>p.text??'').join('');
  });
  const selected=selectDesignGuidance(prompt,analysis,'generate');
  assert.equal(analysis.productType,type);assert.equal(selected.direction,direction);
  assert.ok(analysis.preferences.branding.some(value=>value.includes(brand)));
  assert.ok(analysis.preferences.colors.some(value=>value.toLowerCase().includes(color.toLowerCase())));
  assert.ok(analysis.preferences.typography.some(value=>value.includes('Inter')));
  assert.equal(selected.paletteSuggestion,undefined);assert.equal(selected.fontSuggestion,undefined);
  if(type==='mobile_app')assert.deepEqual(analysis.screens,['Home','Activity','Progress','Profile']);
  console.log(`${type}: ${selected.direction}; explicit brand/color/font preserved; ${selected.rules.length} local rules selected.`);
}
