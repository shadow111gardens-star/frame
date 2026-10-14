import {geminiConfig} from '../server/gemini';
import {analyzeDesignPrompt} from '../server/designKnowledge/analysis';
import {generateGeminiText} from '../server/geminiResponse';
import assert from 'node:assert/strict';
try {process.loadEnvFile('.env');} catch { /* Host configuration may supply environment. */ }
const {key,model}=geminiConfig(process.env);
if(!key || !model)throw new Error('Configure Gemini on the server.');
console.log(`Configured model: ${model}`);
// Public diagnostic prompts only. Raw responses stay in memory: never log keys,
// request headers, user prompts, raw envelopes, or generated free-text strings.
for(const prompt of [
  'Create a 3800px single-page portfolio website. Blend minimal, editorial, bold brutalist, and accessible design directions. Include Hero, About, Projects, Services, Testimonials and Contact sections.',
  'Create a website combining all of these seven positive design directions: minimal, editorial, energetic, bold, calm, analytical and accessible. Include Hero, About and Contact sections.',
]) {
  try {
    const analysis=await analyzeDesignPrompt(prompt,body=>generateGeminiText(body,{key,model,deadline:Date.now()+90000},{fetch:(async(input,init)=>{
      const response=await fetch(input,init);
      console.log(`HTTP ${response.status}`);
      if(!response.ok)return response;
      const data=await response.clone().json(),candidate=data.candidates?.[0];
      console.log(JSON.stringify({finishReason:candidate?.finishReason,candidateCount:data.candidates?.length,parts:candidate?.content?.parts?.map((p:any)=>({textLength:typeof p.text==='string'?p.text.length:0,thought:p.thought===true}))}));
      const text=candidate?.content?.parts?.filter((p:any)=>!p.thought).map((p:any)=>p.text??'').join('')??'';
      try {
        const parsed=JSON.parse(text);
        const shape=(v:any):any=>Array.isArray(v)?{type:'array',length:v.length,itemTypes:[...new Set(v.map(x=>typeof x))]}:v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,shape(x)])):{type:typeof v,length:typeof v==='string'?v.length:undefined};
        console.log(JSON.stringify({jsonValid:true,shape:shape(parsed)}));
      } catch {console.log(JSON.stringify({jsonValid:false,length:text.length,fenced:text.trim().startsWith('```')}));}
      return response;
    }) as typeof fetch}));
    assert.equal(analysis.productType,'website');
    assert.ok(analysis.sections.length>=3);
    console.log('Analysis accepted.');
  } catch(e) {process.exitCode=1;console.log(e instanceof Error?e.message:'Analysis failed.');}
}
