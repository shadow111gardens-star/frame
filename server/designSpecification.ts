import {UI_QUALITY_CONTRACT} from './uiQualityInstructions';
import {analyzeDesignPrompt,promptAnalysisJsonSchema} from './designKnowledge/analysis';
import {selectDesignGuidance} from './designKnowledge/selection';
import {planDesign,planningJsonSchema,planningInstructions,restoreMissingPlanScreens,type DesignPlan} from './designPlanning';
import {bindDesignMd,validateDesignMd,hashArtifact} from './designDocument';
import {designMdSections} from '../shared/generationArtifact';
import {DesignValidationError} from './designDiagnostics';
import type {ScreenRequirement} from './screenRequirements';
import {requestedScreenDetails} from './screenRequirements';
import {GeminiError,parseGeminiJson} from './geminiResponse';
import {PRODUCT_INTENT_INSTRUCTION} from './productDetection';
import type {ProductType} from '../shared/product';

/** Remove annotations, never supported properties/enums or runtime validation. */
export function compactSchema(value:unknown):any {
  if(Array.isArray(value))return value.map(compactSchema);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!['description','title','default','$schema','maxItems','additionalProperties'].includes(key)).map(([key,item])=>[key,compactSchema(item)]));
  return value;
}
export async function createSpecification(prompt:string,selectedProductType:ProductType|undefined,generate:(body:unknown,stage:string)=>Promise<string>){
  const schema=compactSchema({type:'object',properties:{analysis:promptAnalysisJsonSchema,plan:planningJsonSchema(selectedProductType??'mobile_app'),designMd:{type:'string'}},required:['analysis','plan','designMd']});
  if(!selectedProductType)schema.properties.plan.properties.productType={type:'string',enum:['website','mobile_app']};
  let instructions=planningInstructions(selectedProductType??'mobile_app').replace(selectedProductType?'__not_present__':/Authoritative productType: mobile_app\. Design for 390 by 844\./, 'Classify the product intent first. Mobile viewport: 390 by 844. Website viewport: 1440 by 900. Use mobile hierarchy for phone apps and desktop columns/vertical scrolling for websites.');
  if(!selectedProductType)instructions=instructions.replace(/Use native mobile hierarchy, safe-area allowances[\s\S]*?allow supporting content to scroll if needed\./,'For mobile apps use phone safe areas, meaningful touch targets and peer/drill-down navigation. For websites use desktop columns and browser navigation, full-length scrolling sections and footer; never impose phone safe areas or peer tabs.');
  const request={systemInstruction:{parts:[{text:instructions+'\n'+UI_QUALITY_CONTRACT+'\n'+PRODUCT_INTENT_INSTRUCTION+`\nCOMBINED SPECIFICATION: Return {analysis,plan,designMd} in one request. Analyze the original prompt before planning. analysis must distinguish named screens from sections, content and actions, preserve exact positive style/color/type/brand quotes, counts and exclusions, and resolve product intent. The selected product type overrides wording. When no selection exists, analyze the product type from the prompt; apply mobile rules only to mobile apps and desktop rules to websites. Reject ambiguous or conflicting requirements locally; do not invent names. designMd is concise project-specific Markdown using these exact headings: ${designMdSections.join('; ')}. Use approximately 500-900 words total with distinct practical rules in each section, no repeated boilerplate. It must agree with plan.visualTokens and screen names. Explain exact roles, hierarchy, composition, states, responsive/accessibility behavior and limitations. Do not copy JSON into Markdown; FRAME locally appends exact tokens and stable screen bindings. Do not generate editable app JSON yet. Critique and improve the plan and Markdown silently within this request.`}]},contents:[{role:'user',parts:[{text:JSON.stringify({originalPrompt:prompt,selectedProductType,requiredScreens:requestedScreenDetails(prompt,[])})}]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema:schema}};
  let approved:{analysis:Awaited<ReturnType<typeof analyzeDesignPrompt>>;plan:DesignPlan;selectedGuidance:ReturnType<typeof selectDesignGuidance>}|undefined;
  let prior:unknown,diagnostic:string|undefined,repairBase:DesignPlan|undefined;let missingScreens:ScreenRequirement[]=[];
  for(let attempt=0;attempt<2;attempt++){
    const mdRepair={systemInstruction:{parts:[{text:'Repair only the identified DESIGN.md defects. Preserve the approved screen plan and exact token values, and valid Markdown sections. Return only {designMd}. Use all required section headings with concise project-specific guidance; do not replan or generate app JSON.'}]},contents:[{role:'user',parts:[{text:JSON.stringify({originalPrompt:prompt,designPlan:approved?{designSystem:approved.plan.designSystem,screens:approved.plan.screens,visualDirection:approved.plan.visualDirection}:undefined,requiredSections:designMdSections,diagnostic,previous:(prior as any)?.designMd})}]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema:{type:'object',properties:{designMd:{type:'string'}},required:['designMd']}}};
    const body=attempt&&approved?mdRepair:attempt?{...request,contents:[{role:'user',parts:[{text:JSON.stringify({originalPrompt:prompt,selectedProductType,invalidSpecification:prior,diagnostic,instruction:'Repair only the identified material specification defects. Preserve valid screen plans, tokens and Markdown sections. Return the same combined specification.'})}]}]}:request;
    try{
      const raw=parseGeminiJson(await generate(body,attempt?'specification-repair':'specification'),'specification') as any;prior=raw;
  if(!approved||!attempt){
  // Reuse all strict existing validators with local providers. No nested Gemini calls.
  const analysis=await analyzeDesignPrompt(prompt,async()=>JSON.stringify(raw.analysis),selectedProductType);
  const selectedGuidance=selectDesignGuidance(prompt,analysis,'generate');
  let plan=await planDesign(prompt,analysis.productType,async(body:any,stage)=>{if(stage){const payload=JSON.parse(body.contents[0].parts[0].text);repairBase=payload.originalPlan;missingScreens=payload.missingScreens;throw new DesignValidationError('The combined specification omitted a required screen. No JSON was generated.','REQUIREMENT_SCREEN',{reason:'REQUESTED_SCREENS',missingScreens});}return JSON.stringify(raw.plan);},{promptAnalysis:analysis,selectedGuidance});
  if(attempt&&repairBase){const restored=restoreMissingPlanScreens(repairBase,plan,missingScreens);plan=await planDesign(prompt,analysis.productType,async()=>JSON.stringify(restored),{promptAnalysis:analysis,selectedGuidance});}
  approved={analysis,plan,selectedGuidance};
  }
  const {analysis,plan,selectedGuidance}=approved;
  const markdown=typeof raw.designMd==='string'?raw.designMd+'\n\n### Canonical screen bindings\n'+plan.screens.map(s=>`- ${s.name}: ${s.id}`).join('\n'):raw.designMd;
  const designMd=validateDesignMd(bindDesignMd(markdown,plan),plan);
  return {analysis,plan,selectedGuidance,designMd,designMdHash:hashArtifact(designMd)};
    }catch(error){if(attempt||!(error instanceof GeminiError)||!['DESIGN_MD','PLAN_SCHEMA','PLAN_CONSISTENCY','REQUIREMENT_SCREEN','ANALYSIS_SCHEMA','MALFORMED_JSON'].includes(error.code))throw error;diagnostic=error.message;}
  }
  throw new GeminiError('Specification validation failed.','DESIGN_MD');
}
