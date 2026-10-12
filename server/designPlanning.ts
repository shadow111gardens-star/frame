import {z} from 'zod';
import {appSchema,type DesignApp} from '../shared/design';
import {previewConfig,type ProductType} from '../shared/product';
import {KNOWLEDGE_PRECEDENCE,type SelectedGuidance} from './designKnowledge/selection';
import type {PromptAnalysis} from './designKnowledge/analysis';
import {parseGeminiJson,GeminiError} from './geminiResponse';
import {textLineHeight} from '../shared/typography';
import {policyInstructions,designPolicy} from '../shared/designPolicy';
import {resolveRequirements,enforceScreenRequirements} from './designRequirements';
import {isDeepStrictEqual} from 'node:util';
import {DesignValidationError,systemDifferences,type DesignFailureDetails} from './designDiagnostics';
import {isNavigationAction,type ResolvedNavigationEdge} from '../shared/navigation';
import {requestedScreenDetails,screenNameKey,screenRequirement,type ScreenRequirement} from './screenRequirements';

const text=z.string().min(1).max(2000);
const scale=z.object({role:text,value:z.number().finite().min(0).max(500)});
const radiusScale=z.object({role:text,value:z.number().finite().min(0).max(1000)});
const availableFont=z.enum(['Inter','Instrument Serif','JetBrains Mono','Arial','Georgia','Verdana','Tahoma','Trebuchet MS','Courier New','system-ui','sans-serif','serif','monospace']);
const plannedEdgeSchema=z.object({from:text,to:text,action:text,fromScreenId:z.string().min(1).max(100).optional(),toScreenId:z.string().min(1).max(100).optional()});
// Internal creative specification. Never rendered or added to the editable app schema.
export const designPlanSchema=z.object({
  productType:z.enum(['mobile_app','website']),product:text,targetUser:text,mainGoal:text,
  primaryAction:text,secondaryActions:z.array(text).max(20),importantInformation:z.array(text).max(30),
  navigation:text,visualDirection:text,contentDensity:text,
  visualRationale:text.optional(),
  journey:z.object({mode:z.enum(['interactive','static']),entryScreens:z.array(text).min(1).max(20),edges:z.array(plannedEdgeSchema).max(80),rationale:text}).optional(),
  designSystem:appSchema.shape.designSystem,
  visualTokens:z.object({
    colors:z.object({background:text,surface:text,elevatedSurface:text,primary:text,secondary:text,accent:text,text:text,mutedText:text,border:text,success:text,warning:text,error:text}),
    typography:z.array(z.object({role:z.enum(['display','heading','subheading','body','caption','button','label']),font:availableFont,size:z.number().min(10).max(100),weight:z.union([z.literal(300),z.literal(400),z.literal(500),z.literal(600),z.literal(700),z.literal(800)]),lineHeight:z.number().min(1).max(3)})).length(7),
    spacing:z.array(scale.extend({role:z.enum(['xs','sm','md','lg','xl','2xl'])})).length(6),radii:z.array(radiusScale.extend({role:z.enum(['small','medium','large','pill'])})).length(4),
    borderStyle:text,shadowLevels:text,componentDensity:text,iconSize:z.number().min(12).max(64),touchTarget:z.number().min(24).max(100),
  }),
  screens:z.array(z.object({id:z.string().min(1).max(100).optional(),name:text,purpose:text,primaryContent:text,primaryAction:text,secondaryContent:text,supportingInformation:text,hierarchy:text,composition:text,layoutBlueprint:z.object({intent:z.enum(['content','empty','editorial']),inset:z.number().min(0).max(120),sectionGap:z.number().min(0).max(120),navigationHeight:z.number().min(0).max(120),regions:z.array(z.object({role:text,top:z.number().min(0).max(20000),height:z.number().positive().max(20000),emphasis:z.enum(['primary','secondary','supporting'])})).min(1).max(15)}).optional(),patterns:z.array(text).min(1).max(20),navigation:text,states:text})).min(1).max(20),
});
export type DesignPlan=z.infer<typeof designPlanSchema> & {requiredScreens?:ScreenRequirement[]};
function supportedSchema(value:unknown,path:string[]=[]):unknown {
  if(Array.isArray(value))return value.map(item=>supportedSchema(item,path));
  if(!value || typeof value!=='object')return value;
  const obj=value as Record<string,unknown>;
  if(Array.isArray(obj.anyOf) && obj.anyOf.every(v=>typeof v.const==='number'))return {type:'integer',enum:obj.anyOf.map(v=>v.const)};
  const lengths=[typeof obj.minLength==='number'?`At least ${obj.minLength} characters.`:'',typeof obj.maxLength==='number'?`At most ${obj.maxLength} characters.`:''].filter(Boolean).join(' ');
  // The configured model rejects maxItems in this large planning schema with
  // HTTP 400 (isolated against the same schema without array upper bounds).
  // Keep every strict runtime length/cap and express upper bounds as guidance.
  const screenList=path.join('.')==='properties.screens';
  return {...Object.fromEntries(Object.entries(value).filter(([key])=>!['$schema','additionalProperties','minLength','maxLength','exclusiveMinimum','maxItems'].includes(key)).map(([key,item])=>[key,supportedSchema(item,[...path,key])])),...(lengths?{description:lengths}:screenList?{description:'One to twenty screens; do not invent extra pages for single-page websites.'}:typeof obj.maxItems==='number'?{description:obj.minItems===obj.maxItems?`Exactly ${obj.maxItems} entries.`:`At most ${obj.maxItems} entries.`}:{})};
}
const modelPlanSchema=designPlanSchema.omit({designSystem:true}).extend({screens:z.array(designPlanSchema.shape.screens.element.omit({id:true})).min(1).max(20),journey:designPlanSchema.shape.journey.unwrap().extend({edges:z.array(plannedEdgeSchema.omit({fromScreenId:true,toScreenId:true})).max(80)}).optional(),visualTokens:designPlanSchema.shape.visualTokens.extend({radii:z.array(radiusScale.extend({role:z.enum(['small','medium','large','pill']),value:z.number().min(0).max(500)})).length(4)})});
export const designPlanJsonSchema=supportedSchema(z.toJSONSchema(modelPlanSchema));
export function planningJsonSchema(productType:ProductType) {
  return supportedSchema(z.toJSONSchema(modelPlanSchema.extend({visualRationale:text,journey:modelPlanSchema.shape.journey.unwrap(),productType:z.enum([productType]),screens:z.array(designPlanSchema.shape.screens.element.omit({id:true}).extend({layoutBlueprint:designPlanSchema.shape.screens.element.shape.layoutBlueprint.unwrap()})).min(1).max(designPolicy.validation.maxScreens),visualTokens:modelPlanSchema.shape.visualTokens.extend({touchTarget:z.number().min(productType==='mobile_app'?44:24).max(100)})})));
}
export function planningInstructions(productType:ProductType) {
  const viewport=previewConfig(productType);
  return policyInstructions()+`\nDESIGN PLANNING STAGE. Return only the internal planning JSON matching the supplied schema, not components or an app response. Authoritative productType: ${productType}. Design for ${viewport.viewportWidth} by ${viewport.viewportHeight}.
Derive the journey from this individual request, never an industry flow. Include journey.mode interactive or static, entryScreens using exact planned names, directed edges from/to planned names with meaningful actions and a rationale. Every interactive planned screen must be reachable from an entry. Use static only when a noninteractive screen collection is requested; justify it. Explicit screen counts, names and exclusions in promptAnalysis.requirements are mandatory; do not add screens to satisfy a preset journey. If requirements conflict, analysis must clarify them. Describe visualDirection as a concrete composition, typographic/asset language and reason why it suits this product/audience; never use a prompt hash or category default.
Include layoutBlueprint for each screen: numeric inset, sectionGap, navigationHeight and ordered region top/height budgets; classify intent content, empty or editorial. Specify image proportions in composition. Reserve navigation space outside content, and make budgets add up to the intended viewport/content height. These values guide browser-measured review rather than enforcing a generic template. Establish product, target user, main goal, primary/secondary actions, important information and navigation first. Include every requested screen, each with a specific purpose, ranked content, primary action and distinct composition. Specify spatial arrangement, proportional emphasis, grouping and density concretely, not just "header, cards, button". In each composition provide an approximate vertical budget (header/content/supporting action/navigation), column alignment, section gaps, and a clear dominant visual anchor. Budget the available viewport intentionally: avoid leaving the lower half unused on populated discovery/dashboard screens, but do not fabricate records or add filler. Empty screens can have spacious purposeful content with a useful next action. Choose product-specific patterns and explain how they support the user's task. Prefer unboxed aligned rows, editorial image/text pairings and timeline groups to adding a border or card behind every item. A premium design means precise hierarchy, typography, alignment and useful content, not decorative effects.
Every required text field must contain nonempty text; use "None" or "Not applicable" when appropriate instead of empty strings. Respect all schema numeric and array bounds: exactly seven typography, six spacing and four radius roles; typography size 10–100, lineHeight 1–3, designSystem spacing/radii at most 500. Use pill radius 500 (not 9999). Keep visualTokens radii and designSystem radii within their declared bounds. Create one design system before composing screens. Provide all visualTokens colors, typography roles display/heading/subheading/body/caption/button/label exactly once, spacing roles xs/sm/md/lg/xl/2xl, radii small/medium/large/pill, border/shadow policy, density, icon and control sizes. Choose only the supplied font enum: FRAME loads Inter, Instrument Serif and JetBrains Mono; the other choices are system families. Never request Playfair Display, SF Pro or another unloaded family. Match designSystem.typography.font to the body role and display to the display role. Use deliberate size/weight contrasts and readable line heights. Related content has smaller gaps than unrelated sections. Avoid repetitive rounded cards, huge empty heroes, arbitrary icons, excessive borders, pills, shadows, gradients, glass and decorative blobs.
Do not output a second, duplicated designSystem. visualTokens is the canonical source: FRAME derives the editable designSystem from these roles and scales, so they cannot disagree. FRAME maps visualTokens.accent to colors.accent (primary may be a distinct high-contrast action color), elevatedSurface to card, mutedText to textMuted; choose a neutral secondary role. The body and display typography roles provide the font pairing, and the loaded JetBrains Mono supplies the mono fallback. Spacing/radii arrays are derived from the chosen role values. Rich role names stay internal; never extend the app schema. Status colors have semantic meaning, not decorative purposes. Shadow policy may use none/subtle/medium/strong, with restraint. Optional lineHeight output is a multiplier. Font variants must be available: Instrument Serif 400 only; Inter and JetBrains Mono 300?800 normal/italic.
${productType==='mobile_app'?'Use native mobile hierarchy, safe-area allowances, touch targets at least 44 logical pixels, compact readable content and peer tabs only where useful. Use drill-down for detail; forms need labels. Design specifically for a phone, never a shrunken desktop. Plan content to fit the visible viewport: keep primary navigation/actions visible and allow supporting content to scroll if needed.':'Use desktop/web composition, navigation, readable columns and intentional browser-width sections; do not impose mobile safe areas or tab bars. Website content scrolls vertically: plan full-length sections and footer instead of compressing the page into the initial viewport. The output screen height may extend to 20000 pixels. Use same-page section anchors where appropriate.'}
Use realistic product-specific catalog/editorial content when appropriate (such as destination names), never lorem ipsum, Card title, Item 1 or fabricated personal records, account balances or live activity. Unless supplied by the user, profile is unsigned-in or unset, saved items are empty, fitness metrics/activity are unrecorded, and trip detail is a clearly labeled destination/itinerary preview rather than a confirmed booking. Do not plan fake membership tiers, loyalty points, passport details, cache sizes, live forecasts or confirmed flights. Use useful empty states for unknown personal data. Plan editable HTTPS images only where helpful, with aspect ratio, crop, size, placement and coherent visual language. Never use UI screenshots. Navigation must connect requested screens. Detail pages are drill-down destinations, not automatic peer tabs. Loading/error states belong only where relevant, not all at once.
Before returning, critique each composition: obvious purpose and primary action, differentiated hierarchy, rhythm, balanced density, consistent system, product identity, no generic card stack or unfinished empty areas. Revise weak plans silently. Use only static design principles; no external tools, research claims, MCP or Appllama runtime services.`;
}
export async function planDesign(prompt:string,productType:ProductType,generate:(body:unknown,stage?:string)=>Promise<string>,knowledge?:{promptAnalysis:PromptAnalysis;selectedGuidance:SelectedGuidance}):Promise<DesignPlan> {
  const requiredScreens=requestedScreenDetails(prompt,knowledge?.promptAnalysis.screens??[]),requiredNames=requiredScreens.map(s=>s.expectedName);
  const requirements=resolveRequirements(prompt,requiredNames,knowledge?.promptAnalysis.requirements);
  const normalizedKnowledge=knowledge?{...knowledge,promptAnalysis:{...knowledge.promptAnalysis,screens:requiredNames,requirements}}:undefined;
  const configuration={responseMimeType:'application/json',responseJsonSchema:planningJsonSchema(productType)};
  let raw=await generate({systemInstruction:{parts:[{text:planningInstructions(productType)+(knowledge?'\n\n'+KNOWLEDGE_PRECEDENCE:'')}]},contents:[{role:'user',parts:[{text:JSON.stringify({prompt,productType,requiredScreens,...normalizedKnowledge})}]}],generationConfig:configuration});
  let partial:DesignPlan|undefined,repairBase:DesignPlan|undefined,missingToRepair:ScreenRequirement[]=[];
  for(let attempt=0;attempt<2;attempt++)try {
    const input=parseGeminiJson(raw,'design plan') as any;
    // The common 999px pill convention is equivalent here to 500px, the
    // existing shared token limit. Canonicalize it before validating the plan.
    const pill=Array.isArray(input?.visualTokens?.radii)?input.visualTokens.radii.find((r:{role?:string}|null)=>r?.role==='pill'):undefined;
    if(typeof pill?.value==='number' && pill.value>500 && pill.value<=1000) {
      const original=pill.value;pill.value=500;
      if(Array.isArray(input?.designSystem?.radii))input.designSystem.radii=input.designSystem.radii.map((v:unknown)=>v===original?500:v);
    }
    if(input&&typeof input==='object'&&!input.designSystem){
      const v=input.visualTokens,c=v?.colors,t=Array.isArray(v?.typography)?v.typography:[];
      input.designSystem={colors:{background:c?.background,surface:c?.surface,card:c?.elevatedSurface,border:c?.border,text:c?.text,textMuted:c?.mutedText,accent:c?.accent,primary:c?.primary,secondary:c?.secondary,success:c?.success,warning:c?.warning,error:c?.error},typography:{font:t.find((r:any)=>r?.role==='body')?.font,display:t.find((r:any)=>r?.role==='display')?.font,mono:'JetBrains Mono'},textStyles:Object.fromEntries(t.map((r:any)=>[r.role,{font:r.font,fontSize:r.size,fontWeight:r.weight,lineHeight:r.lineHeight}])),spacing:Array.isArray(v?.spacing)?v.spacing.map((r:any)=>r?.value):[],radii:Array.isArray(v?.radii)?v.radii.map((r:any)=>r?.value):[]};
    }
    const parsed=designPlanSchema.safeParse(input);
    if(!parsed.success)throw new GeminiError(`Gemini returned an invalid design plan: ${parsed.error.issues.slice(0,4).map(issue=>`${issue.path.join('.')||'response'} (${issue.code})`).join(', ')}. The response did not match FRAME's planning schema. Your prompt and existing design are preserved.`,'PLAN_SCHEMA');
    let plan=canonicalPlanNames(parsed.data,requiredNames);
    if(repairBase){
      plan=restoreMissingPlanScreens(repairBase,plan,missingToRepair);
      if(!designPlanSchema.safeParse(plan).success)throw new GeminiError('The repaired plan exceeded the original schema limits. Your prompt and existing design are preserved.','PLAN_SCHEMA');
    }
    plan.screens.forEach((screen,index)=>{screen.id??=requiredScreens.find(required=>required.key===screenNameKey(screen.name))?.id??`screen-${index+1}`;});
    partial=plan;
    if(!plan.journey||!plan.visualRationale)throw new GeminiError('The design plan omitted its journey or product-specific visual rationale. Your prompt is preserved.','PLAN_CONSISTENCY');
    enforceScreenRequirements(plan.screens,requiredNames,requirements,prompt,requiredScreens);
    if(plan.journey)validateJourney(plan);
    if(plan.productType!==productType)throw new Error('Type mismatch');
    if(new Set(plan.screens.map(s=>screenNameKey(s.name))).size!==plan.screens.length)throw new Error('Duplicate screens');
    if(new Set(plan.visualTokens.typography.map(t=>t.role)).size!==7)throw new Error('Duplicate typography roles');
    for(const [roles,expected] of [[plan.visualTokens.spacing,['xs','sm','md','lg','xl','2xl']],[plan.visualTokens.radii,['small','medium','large','pill']]] as const) {
      if(!expected.every(role=>roles.some(t=>t.role===role)))throw new Error('Missing scale roles');
    }
    const c=plan.visualTokens.colors,d=plan.designSystem.colors;
    for(const [field,token] of [['background','background'],['surface','surface'],['card','elevatedSurface'],['accent','accent'],['text','text'],['textMuted','mutedText'],['border','border']] as const) {
      if(d[field]!==c[token])throw new GeminiError(`Gemini returned an invalid design plan: designSystem.colors.${field} does not match visualTokens.colors.${token}. Your original prompt and existing design are preserved.`,'PLAN_CONSISTENCY');
    }
    if(productType==='mobile_app' && plan.visualTokens.touchTarget<44)throw new Error('Small touch targets');
    if(plan.designSystem.typography.font!==plan.visualTokens.typography.find(t=>t.role==='body')?.font || plan.designSystem.typography.display!==plan.visualTokens.typography.find(t=>t.role==='display')?.font)throw new Error('Inconsistent fonts');
    const approved=approvePlanNavigation(plan);
    if(requiredScreens.length)approved.requiredScreens=requiredScreens.map(screen=>{
      const role=approved.screens.find(s=>screenNameKey(s.name)===screen.key)!;
      return {...screen,id:role.id!,requiredContent:[screen.requiredContent,role.primaryContent,role.secondaryContent,role.supportingInformation].join(' ').slice(0,2000)};
    });
    return approved;
  } catch(error) {
    if(attempt===0&&partial&&error instanceof DesignValidationError&&error.code==='REQUIREMENT_SCREEN'){
      repairBase=structuredClone(partial);missingToRepair=error.details.missingScreens??[];
      raw=await generate({systemInstruction:{parts:[{text:planningInstructions(productType)+'\nTARGETED PLANNING REPAIR: Add exactly the requested missing screens described in missingScreens. Use expectedName exactly and cover requiredContent. Preserve every existing valid screen specification, token, purpose and composition. Keep existing journey links; add only necessary links/entries involving a missing screen. Never replace a requested name with a synonym or treat unrelated screens as satisfying it. Return the complete internal planning JSON in the original schema; FRAME binds the supplied missing-screen IDs afterward.'}]},contents:[{role:'user',parts:[{text:JSON.stringify({mode:'planning-repair',prompt,productType,...normalizedKnowledge,requiredScreens,missingScreens:missingToRepair,originalPlan:repairBase})}]}],generationConfig:configuration},'planning-repair');
      continue;
    }
    if(error instanceof GeminiError)throw error;
    const reasons=['Type mismatch','Duplicate screens','Missing requested screen','Duplicate typography roles','Missing scale roles','Inconsistent roles','Small touch targets','Inconsistent fonts'];
    const reason=error instanceof Error&&reasons.includes(error.message)?error.message:'Invalid planning structure';
    throw new GeminiError(`Gemini returned an invalid design plan: ${reason}. Your original prompt and existing design are preserved.`,'PLAN_CONSISTENCY');
  }
  throw new GeminiError('Screen planning did not complete.','PLAN_CONSISTENCY');
}

function canonicalPlanNames(plan:DesignPlan,requiredNames:string[]):DesignPlan {
  const result=structuredClone(plan);
  result.screens.forEach(screen=>{screen.name=requiredNames.find(name=>screenNameKey(name)===screenNameKey(screen.name))??screen.name.trim().replace(/\s+/gu,' ');});
  const canonical=(name:string)=>result.screens.find(s=>screenNameKey(s.name)===screenNameKey(name))?.name??requiredNames.find(n=>screenNameKey(n)===screenNameKey(name))??name;
  if(result.journey){result.journey.entryScreens=result.journey.entryScreens.map(canonical);result.journey.edges=result.journey.edges.map(edge=>({...edge,from:canonical(edge.from),to:canonical(edge.to)}));}
  return result;
}
function restoreMissingPlanScreens(original:DesignPlan,corrected:DesignPlan,missing:ScreenRequirement[]):DesignPlan {
  const result=structuredClone(original),keys=new Set(missing.map(s=>s.key));
  result.screens.push(...corrected.screens.filter(s=>keys.has(screenNameKey(s.name))&&!original.screens.some(o=>screenNameKey(o.name)===screenNameKey(s.name))).map(s=>({...s,id:missing.find(m=>m.key===screenNameKey(s.name))!.id})));
  if(result.journey&&corrected.journey){
    result.journey.entryScreens=[...new Set([...result.journey.entryScreens,...corrected.journey.entryScreens.filter(name=>keys.has(screenNameKey(name)))])];
    for(const edge of corrected.journey.edges)if((keys.has(screenNameKey(edge.from))||keys.has(screenNameKey(edge.to)))&&!result.journey.edges.some(e=>e.from===edge.from&&e.to===edge.to&&e.action===edge.action))result.journey.edges.push(edge);
  }
  return result;
}
/** Check presence before relationships: an existing link to a missing screen
 * should be repaired by restoring the destination, not by deleting that link. */
export function validatePlannedScreens(app:DesignApp,plan:DesignPlan) {
  const missing=plan.screens.filter(screen=>!app.screens.some(s=>screenNameKey(s.name)===screenNameKey(screen.name))).map(screen=>plan.requiredScreens?.find(r=>r.key===screenNameKey(screen.name))??screenRequirement(screen.name,[screen.primaryContent,screen.secondaryContent,screen.supportingInformation].join(' ').slice(0,2000),screen.id));
  if(missing.length){
    const required=missing.some(s=>plan.requiredScreens?.some(r=>r.key===s.key));
    throw new DesignValidationError((required?'The design omitted a requested named screen: ':'Missing planned screens: ')+missing.map(s=>`${s.expectedName} [${s.id}]`).join(', ')+'. Your prompt and existing design are preserved.',required?'REQUIREMENT_SCREEN':'DESIGN_CONSISTENCY',{reason:required?'REQUESTED_SCREENS':'PLANNED_SCREENS',missingScreens:missing,plannedScreenCount:plan.screens.length,outputScreenCount:app.screens.length});
  }
  if(app.screens.length!==plan.screens.length)throw new DesignValidationError('Missing planned screens or unexpected extra screens. Your existing design is unchanged.','DESIGN_CONSISTENCY',{reason:'PLANNED_SCREENS',plannedScreenCount:plan.screens.length,outputScreenCount:app.screens.length});
  if(plan.screens.some(s=>s.id&&app.screens.find(a=>screenNameKey(a.name)===screenNameKey(s.name))?.id!==s.id))throw new DesignValidationError('Screen IDs differ from the approved plan. Your existing design is unchanged.','DESIGN_CONSISTENCY',{reason:'PLANNED_SCREEN_IDS'});
}
export function validatePlannedDesign(app:DesignApp,plan:DesignPlan) {
  const fail=(message:string,reason:string,details:Partial<DesignFailureDetails>={})=>{throw new DesignValidationError('Gemini returned an invalid design: '+message+'. Your existing design is unchanged.','DESIGN_CONSISTENCY',{reason,plannedScreenCount:plan.screens.length,outputScreenCount:app.screens.length,...details});};
  if(app.productType!==plan.productType)fail('Product type changed','PRODUCT_TYPE');
  validatePlannedScreens(app,plan);
  const outputSystem=semanticDesignSystem(app.designSystem),approvedSystem=semanticDesignSystem(plan.designSystem);
  if(!isDeepStrictEqual(outputSystem,approvedSystem))fail('Design system changed','DESIGN_SYSTEM',{changedFields:systemDifferences(outputSystem,approvedSystem)});
  if(plan.journey){
    validateJourney(plan);
    const missing=resolvedPlanNavigation(app,plan).filter(edge=>!edge.actionComponentIds.length);
    if(missing.length)fail('Missing planned navigation edge: '+missing.slice(0,3).map(edge=>`${edge.from} [${edge.fromScreenId}] → ${edge.to} [${edge.toScreenId}] (${edge.action})`).join('; '),'PLANNED_NAVIGATION',{missingEdgeIndexes:missing.map(edge=>edge.index),missingNavigation:missing});
  }
  for(const [screenIndex,screen] of app.screens.entries()) {
    const parents=new Map(screen.components.flatMap(c=>(c.children??[]).map(id=>[id,c] as const)));
    for(const [componentIndex,c] of screen.components.entries()) {
      const parent=parents.get(c.id),bounds=parent?.position??screen,p=c.position;
      const flow=parent?.styles.layout==='flex'||parent?.styles.layout==='grid';
      if(!flow&&(p.x<0 || p.y<0 || p.x+p.width>bounds.width+0.5 || p.y+p.height>bounds.height+0.5))fail('Content outside visible bounds','BOUNDS',{screenIndex,componentIndex});
      if(['Input','Search'].includes(c.type) && !c.text?.trim())fail('Missing control label','CONTROL_LABEL',{screenIndex,componentIndex});
      if(c.type==='Button' && !c.text?.trim() && !(c.children??[]).some(id=>screen.components.some(child=>child.id===id && (child.text?.trim() || child.type==='Icon'))))fail('Missing control label','CONTROL_LABEL',{screenIndex,componentIndex});
      if(c.styles.font && !availableFont.safeParse(c.styles.font).success)fail('Unavailable font','FONT',{screenIndex,componentIndex});
    }
  }
}

/** Canonical object keys and equivalent hex spellings only. Preserve array indexes,
 * numeric values, fonts, alpha and all optional declarations. No fuzzy color matching. */
export function semanticDesignSystem(system:DesignApp['designSystem']) {
  const copy=structuredClone(system);
  for(const key of Object.keys(copy.colors) as (keyof typeof copy.colors)[]){
    const color=copy.colors[key];if(color===undefined)continue;
    if(/^#[\da-f]{3}(?:[\da-f])?$/i.test(color))copy.colors[key]='#'+color.slice(1).split('').map(c=>c+c).join('').toLowerCase();
    else if(/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(color))copy.colors[key]=color.toLowerCase();
  }
  const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,canonical(v)])):value;
  return canonical(copy);
}

/** The planning response describes named journeys. Once approved, bind every edge
 * to reserved screen IDs before the first component-generation call. */
export function approvePlanNavigation(plan:DesignPlan):DesignPlan {
  const approved=structuredClone(plan),ids=new Set<string>();
  approved.screens.forEach((screen,index)=>{screen.id??=`screen-${index+1}`;if(ids.has(screen.id))throw new GeminiError('The plan contains duplicate screen IDs.','PLAN_JOURNEY');ids.add(screen.id);});
  validateJourney(approved);
  approved.journey?.edges.forEach(edge=>{edge.fromScreenId=approved.screens.find(s=>s.name===edge.from)!.id;edge.toScreenId=approved.screens.find(s=>s.name===edge.to)!.id;});
  return approved;
}

export function resolvedPlanNavigation(app:DesignApp|undefined,plan?:DesignPlan):ResolvedNavigationEdge[] {
  return (plan?.journey?.edges??[]).map((edge,index)=>{
    const fromScreenId=edge.fromScreenId??plan?.screens.find(s=>screenNameKey(s.name)===screenNameKey(edge.from))?.id??app?.screens.find(s=>screenNameKey(s.name)===screenNameKey(edge.from))?.id;
    const toScreenId=edge.toScreenId??plan?.screens.find(s=>screenNameKey(s.name)===screenNameKey(edge.to))?.id??app?.screens.find(s=>screenNameKey(s.name)===screenNameKey(edge.to))?.id;
    const from=app?.screens.find(s=>s.id===fromScreenId),to=app?.screens.find(s=>s.id===toScreenId);
    return {index,...edge,fromScreenId,toScreenId,
      actionComponentIds:from&&to?from.components.filter(c=>c.targetScreenId===toScreenId&&isNavigationAction(from,c.id)).map(c=>c.id):[]};
  });
}

/** The plan owns these optional declarations. Complete omitted fields only;
 * supplied values/arrays are never overwritten to conceal an inconsistency. */
export function completePlannedSystem(app:DesignApp,plan:DesignPlan):string[]{
  const restored:string[]=[];
  for(const key of ['primary','secondary','success','warning','error'] as const){
    const value=plan.designSystem.colors[key];
    if(app.designSystem.colors[key]===undefined&&value!==undefined){app.designSystem.colors[key]=value;restored.push('designSystem.colors.'+key);}
  }
  if(plan.designSystem.textStyles){
    app.designSystem.textStyles??={};
    for(const key of ['display','heading','subheading','body','caption','button','label'] as const){
      const value=plan.designSystem.textStyles[key];
      if(app.designSystem.textStyles[key]===undefined&&value){app.designSystem.textStyles[key]=structuredClone(value);restored.push('designSystem.textStyles.'+key);}
    }
  }
  return restored;
}

export function validateJourney(plan:DesignPlan){
  const journey=plan.journey;if(!journey)return;
  const names=new Set(plan.screens.map(s=>s.name));
  if(journey.entryScreens.some(n=>!names.has(n))||journey.edges.some(e=>!names.has(e.from)||!names.has(e.to)))throw new GeminiError('The planned journey references an unknown screen. Your prompt is preserved.','PLAN_JOURNEY');
  if(journey.mode==='interactive'){
    const reachable=new Set(journey.entryScreens);let changed=true;
    while(changed){changed=false;for(const e of journey.edges)if(reachable.has(e.from)&&!reachable.has(e.to)){reachable.add(e.to);changed=true;}}
    if(plan.screens.some(s=>!reachable.has(s.name)))throw new GeminiError('The planned journey contains unreachable screens. Your prompt is preserved.','PLAN_JOURNEY');
  }
}

// Leaf surfaces with direct text need explicit insets in this absolute renderer.
// Nested layouts already own their child coordinates; never double-pad them.
export function applyPlannedInsets(app:DesignApp,plan:DesignPlan) {
  const horizontal=plan.visualTokens.spacing.find(s=>s.role==='md')!.value;
  const vertical=plan.visualTokens.spacing.find(s=>s.role==='sm')!.value;
  for(const screen of app.screens)for(const c of screen.components) {
    if(!['Card','List','Input','Search'].includes(c.type) || c.children?.length || !c.text?.trim())continue;
    const line=(c.styles.fontSize??14)*textLineHeight(c.styles.fontSize??14);
    c.styles.paddingX??=Math.min(horizontal,Math.max(0,(c.position.width-line)/2));
    c.styles.paddingY??=Math.min(vertical,Math.max(0,(c.position.height-line*c.text.split('\n').length)/2));
  }
}


