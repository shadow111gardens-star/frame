import {z} from 'zod';
import {appSchema,type DesignApp} from '../shared/design';
import {previewConfig,type ProductType} from '../shared/product';
import {KNOWLEDGE_PRECEDENCE,type SelectedGuidance} from './designKnowledge/selection';
import type {PromptAnalysis} from './designKnowledge/analysis';
import {parseGeminiJson,GeminiError} from './geminiResponse';
import {textLineHeight} from '../shared/typography';
import {policyInstructions,designPolicy} from '../shared/designPolicy';
import {resolveRequirements,enforceScreenRequirements} from './designRequirements';

const text=z.string().min(1).max(2000);
const scale=z.object({role:text,value:z.number().finite().min(0).max(500)});
const radiusScale=z.object({role:text,value:z.number().finite().min(0).max(1000)});
const availableFont=z.enum(['Inter','Instrument Serif','JetBrains Mono','Arial','Georgia','Verdana','Tahoma','Trebuchet MS','Courier New','system-ui','sans-serif','serif','monospace']);
// Internal creative specification. Never rendered or added to the editable app schema.
export const designPlanSchema=z.object({
  productType:z.enum(['mobile_app','website']),product:text,targetUser:text,mainGoal:text,
  primaryAction:text,secondaryActions:z.array(text).max(20),importantInformation:z.array(text).max(30),
  navigation:text,visualDirection:text,contentDensity:text,
  visualRationale:text.optional(),
  journey:z.object({mode:z.enum(['interactive','static']),entryScreens:z.array(text).min(1).max(20),edges:z.array(z.object({from:text,to:text,action:text})).max(80),rationale:text}).optional(),
  designSystem:appSchema.shape.designSystem,
  visualTokens:z.object({
    colors:z.object({background:text,surface:text,elevatedSurface:text,primary:text,secondary:text,accent:text,text:text,mutedText:text,border:text,success:text,warning:text,error:text}),
    typography:z.array(z.object({role:z.enum(['display','heading','subheading','body','caption','button','label']),font:availableFont,size:z.number().min(10).max(100),weight:z.union([z.literal(300),z.literal(400),z.literal(500),z.literal(600),z.literal(700),z.literal(800)]),lineHeight:z.number().min(1).max(3)})).length(7),
    spacing:z.array(scale.extend({role:z.enum(['xs','sm','md','lg','xl','2xl'])})).length(6),radii:z.array(radiusScale.extend({role:z.enum(['small','medium','large','pill'])})).length(4),
    borderStyle:text,shadowLevels:text,componentDensity:text,iconSize:z.number().min(12).max(64),touchTarget:z.number().min(24).max(100),
  }),
  screens:z.array(z.object({name:text,purpose:text,primaryContent:text,primaryAction:text,secondaryContent:text,supportingInformation:text,hierarchy:text,composition:text,layoutBlueprint:z.object({intent:z.enum(['content','empty','editorial']),inset:z.number().min(0).max(120),sectionGap:z.number().min(0).max(120),navigationHeight:z.number().min(0).max(120),regions:z.array(z.object({role:text,top:z.number().min(0).max(20000),height:z.number().positive().max(20000),emphasis:z.enum(['primary','secondary','supporting'])})).min(1).max(15)}).optional(),patterns:z.array(text).min(1).max(20),navigation:text,states:text})).min(1).max(20),
});
export type DesignPlan=z.infer<typeof designPlanSchema>;
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
const modelPlanSchema=designPlanSchema.omit({designSystem:true}).extend({visualTokens:designPlanSchema.shape.visualTokens.extend({radii:z.array(radiusScale.extend({role:z.enum(['small','medium','large','pill']),value:z.number().min(0).max(500)})).length(4)})});
export const designPlanJsonSchema=supportedSchema(z.toJSONSchema(modelPlanSchema));
export function planningJsonSchema(productType:ProductType) {
  return supportedSchema(z.toJSONSchema(modelPlanSchema.extend({visualRationale:text,journey:designPlanSchema.shape.journey.unwrap(),productType:z.enum([productType]),screens:z.array(designPlanSchema.shape.screens.element.extend({layoutBlueprint:designPlanSchema.shape.screens.element.shape.layoutBlueprint.unwrap()})).min(1).max(designPolicy.validation.maxScreens),visualTokens:modelPlanSchema.shape.visualTokens.extend({touchTarget:z.number().min(productType==='mobile_app'?44:24).max(100)})})));
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
export async function planDesign(prompt:string,productType:ProductType,generate:(body:unknown)=>Promise<string>,knowledge?:{promptAnalysis:PromptAnalysis;selectedGuidance:SelectedGuidance}):Promise<DesignPlan> {
  const requirements=resolveRequirements(prompt,knowledge?.promptAnalysis.screens??[],knowledge?.promptAnalysis.requirements);
  const normalizedKnowledge=knowledge?{...knowledge,promptAnalysis:{...knowledge.promptAnalysis,requirements}}:undefined;
  const raw=await generate({systemInstruction:{parts:[{text:planningInstructions(productType)+(knowledge?'\n\n'+KNOWLEDGE_PRECEDENCE:'')}]},contents:[{role:'user',parts:[{text:JSON.stringify({prompt,productType,...normalizedKnowledge})}]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema:planningJsonSchema(productType)}});
  try {
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
    const plan=parsed.data;
    if(!plan.journey||!plan.visualRationale)throw new GeminiError('The design plan omitted its journey or product-specific visual rationale. Your prompt is preserved.','PLAN_CONSISTENCY');
    enforceScreenRequirements(plan.screens,knowledge?.promptAnalysis.screens??[],requirements,prompt);
    if(plan.journey)validateJourney(plan);
    if(plan.productType!==productType)throw new Error('Type mismatch');
    if(new Set(plan.screens.map(s=>s.name)).size!==plan.screens.length)throw new Error('Duplicate screens');
    if(knowledge?.promptAnalysis.screens.some(name=>!plan.screens.some(screen=>screen.name.toLowerCase()===name.toLowerCase())))throw new Error('Missing requested screen');
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
    return plan;
  } catch(error) {
    if(error instanceof GeminiError)throw error;
    const reasons=['Type mismatch','Duplicate screens','Missing requested screen','Duplicate typography roles','Missing scale roles','Inconsistent roles','Small touch targets','Inconsistent fonts'];
    const reason=error instanceof Error&&reasons.includes(error.message)?error.message:'Invalid planning structure';
    throw new GeminiError(`Gemini returned an invalid design plan: ${reason}. Your original prompt and existing design are preserved.`,'PLAN_CONSISTENCY');
  }
}
export function validatePlannedDesign(app:DesignApp,plan:DesignPlan) {
  if(app.screens.length!==plan.screens.length || plan.screens.some(s=>!app.screens.some(a=>a.name===s.name)))throw new Error('Missing planned screens');
  if(JSON.stringify(app.designSystem)!==JSON.stringify(plan.designSystem))throw new Error('Design system changed');
  if(plan.journey){validateJourney(plan);for(const edge of plan.journey.edges){const from=app.screens.find(s=>s.name===edge.from)!,to=app.screens.find(s=>s.name===edge.to)!;if(!from.components.some(c=>c.targetScreenId===to.id))throw new Error('Missing planned navigation edge');}}
  for(const screen of app.screens) {
    const parents=new Map(screen.components.flatMap(c=>(c.children??[]).map(id=>[id,c] as const)));
    for(const c of screen.components) {
      const parent=parents.get(c.id),bounds=parent?.position??screen,p=c.position;
      const flow=parent?.styles.layout==='flex'||parent?.styles.layout==='grid';
      if(!flow&&(p.x<0 || p.y<0 || p.x+p.width>bounds.width+0.5 || p.y+p.height>bounds.height+0.5))throw new Error('Content outside visible bounds');
      if(['Input','Search'].includes(c.type) && !c.text?.trim())throw new Error('Missing control label');
      if(c.type==='Button' && !c.text?.trim() && !(c.children??[]).some(id=>screen.components.some(child=>child.id===id && (child.text?.trim() || child.type==='Icon'))))throw new Error('Missing control label');
      if(c.styles.font && !availableFont.safeParse(c.styles.font).success)throw new Error('Unavailable font');
    }
  }
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


