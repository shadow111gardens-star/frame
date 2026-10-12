import {contentRequirements} from './contentRequirements';
import {createHash} from 'node:crypto';
import {designMdSections,canonicalJson} from '../shared/generationArtifact';
import {parseGeminiJson,GeminiError} from './geminiResponse';
import type {DesignPlan} from './designPlanning';

export const mdResponseSchema={type:'object',properties:{designMd:{type:'string'}},required:['designMd'],additionalProperties:false};
export function hashArtifact(text:string){return createHash('sha256').update(text,'utf8').digest('hex');}
export function bindDesignMd(value:unknown,plan:DesignPlan):unknown {
  if(typeof value!=='string')return value;
  const md=value.replace(/^#{1,6}\s+(.+)$/gm,(line,title:string)=>(designMdSections as readonly string[]).includes(title.trim())?'## '+title.trim():line);
  // The Markdown prose is model-generated. Its machine-readable token appendix
  // comes directly from the already approved plan, never from a second copy.
  if(!md.includes('<!-- FRAME_TOKENS -->'))return md+'\n\n<!-- FRAME_TOKENS -->\n```json\n'+JSON.stringify(plan.designSystem,null,2)+'\n```\n';
  if(!/<!-- FRAME_TOKENS -->\s*```json/.test(md)){
    const block=md.match(/<!-- FRAME_TOKENS -->\s*(\{[\s\S]*?\})(?=\s*\n## |\s*$)/);
    if(block){
      let parsed:Record<string,unknown>;try{parsed=JSON.parse(block[1]);}catch{return md;}
      const supplied=Object.fromEntries(Object.keys(plan.designSystem).map(key=>[key,parsed[key]]));
      if(canonicalJson(supplied)!==canonicalJson(plan.designSystem))throw new GeminiError('DESIGN.md contradicts the approved design tokens.','DESIGN_MD');
      return md.replace(block[0],'<!-- FRAME_TOKENS -->\n```json\n'+JSON.stringify(plan.designSystem,null,2)+'\n```\n');
    }
  }
  return md;
}
export function validateDesignMd(md:unknown,plan?:DesignPlan):string {
  if(typeof md!=='string'||md.length>100000||md.length<100)throw new GeminiError('DESIGN.md is missing or exceeds its safe size limit.','DESIGN_MD',false,502,undefined,'design-md');
  for(const heading of designMdSections){
    const section=md.split(/^##\s+/m).find(s=>s.split('\n')[0].trim()===heading);
    if(!section||section.slice(section.indexOf('\n')+1).trim().length<30)throw new GeminiError('DESIGN.md needs a complete section: '+heading+'.','DESIGN_MD',false,502,undefined,'design-md');
  }
  const tokens=md.match(/<!-- FRAME_TOKENS -->\s*```json\s*([\s\S]*?)\s*```/);
  if(!tokens)throw new GeminiError('DESIGN.md is missing its exact approved token contract.','DESIGN_MD',false,502,undefined,'design-md');
  let system:unknown;try{system=JSON.parse(tokens[1]);}catch{throw new GeminiError('DESIGN.md contains invalid token JSON.','DESIGN_MD',false,502,undefined,'design-md');}
  if(plan&&canonicalJson(system)!==canonicalJson(plan.designSystem))throw new GeminiError('DESIGN.md contradicts the approved design tokens.','DESIGN_MD',false,502,undefined,'design-md');
  if(plan){
    const colorKey=(value:string)=>value.toLowerCase().replace(/^#([a-f0-9])([a-f0-9])([a-f0-9])$/,'#$1$1$2$2$3$3');
    const colors=new Set([...Object.values(plan.designSystem.colors),...Object.values(plan.visualTokens.colors)].map(colorKey));
    for(const color of md.match(/#[a-f\d]{3,8}\b/gi)??[])if(!colors.has(colorKey(color)))throw new GeminiError('DESIGN.md contains a color that contradicts the approved palette.','DESIGN_MD',false,502,undefined,'design-md');
  }
  if(plan&&plan.screens.some(s=>!md.includes(s.id!)||!md.includes(s.name)))throw new GeminiError('DESIGN.md omitted an approved screen name or stable screen ID.','DESIGN_MD',false,502,undefined,'design-md');
  return md;
}
export async function generateDesignMd(prompt:string,plan:DesignPlan,generate:(body:unknown,stage:string)=>Promise<string>) {
  let previous:unknown,diagnostic:string|undefined;
  for(let attempt=0;attempt<2;attempt++){
    const text=await generate({systemInstruction:{parts:[{text:`Write project-specific DESIGN.md, not design JSON. The original prompt takes precedence. Explain how this product applies the approved plan; do not contradict it. Include exactly these level-two sections with substantive content: ${designMdSections.join('; ')}. Include each exact screen name and stable ID. Explain the exact supplied palette and typography by role in Markdown. FRAME appends the exact machine-readable designSystem itself; do not emit FRAME_TOKENS, JSON, or copy the whole plan into the document. Explain semantic roles, component states, typography and layout rules beyond tokens; no generic boilerplate, invented implemented capabilities, private credentials or unsupported renderer features. Explicit user preferences take precedence. No invented navigation, screens, transitions or implemented workout execution. Return only {"designMd":"Markdown content"}. A repair must preserve valid sections and fix only the diagnostic.`}]},contents:[{role:'user',parts:[{text:JSON.stringify({originalPrompt:prompt,productType:plan.productType,designPlan:plan,canonicalRequirements:contentRequirements(prompt,plan),previous,diagnostic})}]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema:mdResponseSchema}},attempt?'design-md-repair':'design-md');
    try{previous=parseGeminiJson(text,'design-md');const md=validateDesignMd(bindDesignMd((previous as {designMd?:unknown})?.designMd,plan),plan);return {designMd:md,designMdHash:hashArtifact(md),attempts:attempt+1};}
    catch(error){if(attempt)throw error;diagnostic=error instanceof Error?error.message:'Invalid DESIGN.md';}
  }
  throw new Error('Unreachable');
}
