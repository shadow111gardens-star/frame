import {responseJsonSchema,responseSchema} from '../shared/design';
import {resolvedPlanNavigation,type DesignPlan} from './designPlanning';
import type {RepairScope} from './designRepair';
import {validationForRepair} from './designDiagnostics';
export function repairRequest(candidate:unknown,scope:RepairScope|undefined,error:unknown,designMd:string|undefined,plan:DesignPlan|undefined,prompt:string){
  const parsed=responseSchema.safeParse(candidate);
  const patch=scope&&parsed.success;
  const schema=patch?{type:'object',properties:{message:{type:'string'},screens:(responseJsonSchema as any).properties.app.properties.screens,...(scope.designSystem?{designSystem:(responseJsonSchema as any).properties.app.properties.designSystem}:{})},required:['message','screens']}:responseJsonSchema;
  const body={systemInstruction:{parts:[{text:patch?'Repair only the authorized missing screens/components and material validation defects. Return {message,screens}, containing only authorized screens. Preserve existing IDs, types, unrelated components, working navigation and the approved DESIGN.md. Use supported visible interactive actions with targetScreenId exactly equal to approved destination IDs. No decorative/hidden/input navigation. Restore missing screens using exact reserved IDs/names and required content. Do not invent requirements or rewrite valid screens. FRAME merges the patch and revalidates the complete app.':'Recover the malformed/invalid editable JSON using the supported response schema and approved DESIGN.md. Preserve planned screen IDs, names, content and navigation. Never output incomplete JSON or unsupported properties.'}]},contents:[{role:'user',parts:[{text:JSON.stringify({mode:'validation-repair',designMd,resolvedNavigation:resolvedPlanNavigation(parsed.success?parsed.data.app:undefined,plan).filter(edge=>!scope||scope.screenIds.includes(edge.fromScreenId??'')),validation:validationForRepair(error),repairScope:scope,knownScreens:plan?.screens.map(s=>({id:s.id,name:s.name})),screenPlan:patch?plan?.screens.filter(s=>scope.screenIds.includes(s.id!)):plan?.screens,navigationPlan:plan?.journey?.edges,candidate:patch?parsed.data.app.screens.filter(s=>scope.screenIds.includes(s.id)):typeof candidate==='string'?{invalidJsonExcerpt:candidate.slice(0,12000),truncated:candidate.length>12000}:candidate,...(!patch?{originalPrompt:prompt}:{})})}]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema:schema}};
  return {body,restore(value:unknown):unknown{
    if(!patch)return value;
    const output=value as any;
    if(!Array.isArray(output?.screens))return value; // Complete-response compatibility; still scoped by targetedRepair.
    return {message:typeof output.message==='string'?output.message:'Repaired validation defects.',app:{...parsed.data.app,...(scope.designSystem&&output.designSystem?{designSystem:output.designSystem}:{}),screens:[...parsed.data.app.screens.filter(s=>!scope.screenIds.includes(s.id)),...output.screens]}};
  }};
}
