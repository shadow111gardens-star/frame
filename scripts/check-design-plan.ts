import {geminiConfig,designRoute} from '../server/gemini';
import {generateGeminiText,parseGeminiJson} from '../server/geminiResponse';
import {planDesign,designPlanSchema} from '../server/designPlanning';
import {readFile} from 'node:fs/promises';
import {analyzeDesignPrompt} from '../server/designKnowledge/analysis';
import {createServer} from 'node:http';
import {validateApp} from '../shared/design';
import assert from 'node:assert/strict';
try {process.loadEnvFile('.env');}catch{}
const {key,model}=geminiConfig(process.env);if(!key||!model)throw new Error('Configure Gemini on the server.');
for(const [prompt,type] of [
  [await readFile(new URL('../tests/portfolioPrompt.txt',import.meta.url),'utf8'),'website'],
  ['Create a 3800px single-page portfolio website with a premium editorial style. Include hero, about, projects, services and contact sections.','website'],
  ['Create a minimalist portfolio website with a giant 144px hero display headline. The display typography size must be 144px. Include a hero, about and contact section.','website'],
  ['Create a fitness mobile app with Home, Activity, Progress and Profile. Use editorial typography and a blue accent.','mobile_app'],
] .slice(0,process.argv.includes('--generate')?0:process.argv.includes('--all')?4:1) as [string,'website'|'mobile_app'][]) {
  try {
    const promptAnalysis=await analyzeDesignPrompt(prompt,body=>generateGeminiText(body,{key,model,deadline:Date.now()+180000}));
    console.log(JSON.stringify({analysisProductType:promptAnalysis.productType,namedScreens:promptAnalysis.screens.length,sections:promptAnalysis.sections.length}));

    const plan=await planDesign(prompt,type,async body=>{
      const text=await generateGeminiText(body,{key,model,deadline:Date.now()+180000},{fetch:(async(url,init)=>{
        const response=await fetch(url,init);
        if(!response.ok)console.log(JSON.stringify({http:response.status}));
        return response;
      }) as typeof fetch});
      const parsed=parseGeminiJson(text,'design plan');const result=designPlanSchema.safeParse(parsed);
      const numericPlan=parsed as any;
      console.log(JSON.stringify({radii:Array.isArray(numericPlan?.visualTokens?.radii)?numericPlan.visualTokens.radii.map((r:any)=>typeof r.value==='number'?r.value:null):null,designRadii:Array.isArray(numericPlan?.designSystem?.radii)?numericPlan.designSystem.radii.filter((v:unknown)=>typeof v==='number'):null}));
      console.log(JSON.stringify({productType:type,characters:text.length,schemaValid:result.success,issues:result.success?[]:result.error.issues.map(i=>({path:i.path.join('.'),code:i.code}))}));
      if(result.success) {
        const p=result.data,c=p.visualTokens.colors,d=p.designSystem.colors;
        console.log(JSON.stringify({colorMatches:[d.background===c.background,d.surface===c.surface,d.card===c.elevatedSurface,d.accent===c.accent,d.text===c.text,d.textMuted===c.mutedText,d.border===c.border],spacingRoles:p.visualTokens.spacing.map(s=>s.role),radiusRoles:p.visualTokens.radii.map(s=>s.role),touchTarget:p.visualTokens.touchTarget,fontMatches:[p.designSystem.typography.font===p.visualTokens.typography.find(t=>t.role==='body')?.font,p.designSystem.typography.display===p.visualTokens.typography.find(t=>t.role==='display')?.font]}));
      }
      return text;
    },{promptAnalysis});
    console.log(`${type}: plan accepted (${plan.screens.length} screens).`);
  }catch(e){process.exitCode=1;console.log(e instanceof Error?e.message:'Planning failed.');}
}
if(process.argv.includes('--generate')) {
  const nativeFetch=globalThis.fetch;
  globalThis.fetch=(async(input,init)=>{
    if(!String(input).startsWith('https://generativelanguage.googleapis.com/'))return nativeFetch(input,init);
    const request=JSON.parse(String(init?.body)),properties=request.generationConfig.responseJsonSchema.properties;
    const stage=properties.visualTokens?'planning':properties.app?(JSON.parse(request.contents[0].parts[0].text).mode==='review'?'review':'draft'):'analysis';
    console.log(`${stage}: requesting Gemini`);
    const response=await nativeFetch(input,init);console.log(`${stage}: HTTP ${response.status}`);
    return response;
  }) as typeof fetch;
  const route=designRoute(process.env),server=createServer((req,res)=>void route(req,res,()=>{res.writeHead(404);res.end();}));
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const address=server.address() as {port:number};
    const prompt=await readFile(new URL('../tests/portfolioPrompt.txt',import.meta.url),'utf8');
    const response=await fetch(`http://127.0.0.1:${address.port}/api/design`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'generate',prompt}),signal:AbortSignal.timeout(370000)});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error);
    const app=validateApp(result.app);assert.equal(app.productType,'website');assert.equal(app.screens.length,1);
    console.log(JSON.stringify({status:response.status,productType:app.productType,screens:app.screens.length,width:app.screens[0].width,height:app.screens[0].height,components:app.screens[0].components.length}));
  } finally {globalThis.fetch=nativeFetch;await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
