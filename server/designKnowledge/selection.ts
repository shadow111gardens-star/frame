import type {DesignApp} from '../../shared/design';
import type {PromptAnalysis} from './analysis';
import {directions,styleKnowledge,featureKnowledge,type Direction,type Category,type Need} from './catalog';

const aliases:Record<Direction,string[]>={minimal:['minimal','minimalist','swiss'],editorial:['editorial','magazine'],energetic:['playful','vibrant','energetic','colorful'],bold:['brutalist','brutalism','bold','neubrutalism'],calm:['calm','organic','earthy'],analytical:['data-dense','analytical','compact'],accessible:['accessible','inclusive','high contrast']};
export function editAnalysis(prompt:string,app:DesignApp):PromptAnalysis {
  // Local retrieval only. Never use keyword matching to change productType.
  const context=[app.name,...app.screens.map(s=>s.name)].join(' ').toLowerCase();
  const categoryPatterns:Partial<Record<Category,RegExp>>={fitness:/fitness|workout|exercise/,travel:/travel|trip|destination/,finance:/finance|budget|bank/,commerce:/shop|store|commerce/,wellness:/wellness|spa|meditat/,education:/learn|education|course/,productivity:/task|productivity/};
  const category=(Object.entries(categoryPatterns).find(([,pattern])=>pattern.test(context))?.[0]??'general') as Category;
  const positive=prompt.toLowerCase().split(/[.!?;\n]/).filter(clause=>!/\b(no|not|never|avoid|without|don't|do not)\b/.test(clause)).join(' ');
  const styleHints=directions.filter(d=>aliases[d].some(word=>new RegExp(`\\b${word}\\b`).test(positive))).slice(0,2);
  const uxNeeds:Need[]=[];
  if(/\b(chart|data|metric|progress)\b/i.test(prompt))uxNeeds.push('data');
  if(/\b(form|input|validation|field)\b/i.test(prompt))uxNeeds.push('forms');
  if(/\b(search|filter)\b/i.test(prompt))uxNeeds.push('search');
  if(/\b(contrast|accessible|accessibility)\b/i.test(prompt))uxNeeds.push('accessibility');
  return {productType:app.productType,category,audience:'Preserve the existing product audience',styleHints,theme:'unspecified',preferences:{style:[],colors:[],typography:[],branding:[]},goals:[],screens:[],sections:[],uxNeeds};
}
export function selectDesignGuidance(_prompt:string,analysis:PromptAnalysis,mode:'generate'|'modify') {
  const selectedDirection=analysis.styleHints[0];
  const rules=[{id:'a11y',...featureKnowledge.accessibility}];
  if(mode==='generate')rules.push({id:'product-reasoning',source:'FRAME policy',rule:'Derive art direction, composition and journey from this request, its audience and primary task. Provide a reasoned visual direction; never use a category preset or fixed screen list.'});
  if(selectedDirection)rules.push({id:`direction:${selectedDirection}`,source:styleKnowledge[selectedDirection].source,rule:styleKnowledge[selectedDirection].rule});
  for(const need of [...new Set(analysis.uxNeeds)].filter(n=>n!=='accessibility'))rules.push({id:`ux:${need}`,...featureKnowledge[need]});
  return {
    selectionMode:mode==='generate'?'semantic-analysis-local-retrieval':'current-design-local-edit-retrieval',
    productType:analysis.productType,direction:selectedDirection??(mode==='generate'?'derive-from-request':'preserve-existing'),
    platformRule:analysis.productType==='mobile_app'?'Keep primary controls at least 44 logical pixels (48 for Android), with touch separation and system-bar clearance. Prefer 16px body/input text; small captions must stay legible.':'Use browser-oriented navigation and readable desktop columns; plan narrower-width priorities without claiming responsive breakpoints are implemented.',
    rules,
    // Palette/font seeds are suggestions, never preset screens or component data.
    paletteSuggestion:undefined,
    ...(mode==='generate' && selectedDirection && analysis.preferences.typography.length===0?{fontSuggestion:{display:styleKnowledge[selectedDirection].fonts[0],body:styleKnowledge[selectedDirection].fonts[1]}}:{}),
    ...(mode==='modify'?{preservation:'Keep currentDesign tokens, brand, manual edits and unrelated screens authoritative. Retrieved rules apply only to the instruction scope; no palette/font reset.'}:{}),
  };
}
export type SelectedGuidance=ReturnType<typeof selectDesignGuidance>;
export const KNOWLEDGE_PRECEDENCE=`SELECTED LOCAL DESIGN INTELLIGENCE
Use selectedGuidance and promptAnalysis as concise local recommendations adapted from the Claude UI/UX Pro Max skill, alongside existing Appllama principles. Original user requirements outrank recommended styles/palettes; currentDesign is authoritative for scoped edits. Product type and renderer/schema constraints remain authoritative. Suggestions are not copied designs or mandatory templates. Preserve explicit positive styles, colors, type and own-brand requirements; do not force an industry stereotype or infer premium always means serif/dark/gold. Choose one coherent direction, not a mixture of every retrieved style.
Palette suggestions are starting points, not verified accessible color pairs; select appropriate foregrounds and check contrast. Use real CSS values resolved from semantic roles or link the supported semantic color/font/spacing tokens. If an explicitly requested effect or font is unsupported, preserve its feasible visual intent using supported properties/families and explain material substitutions truthfully. Use supported shadows and responsive overrides only as defined in the authoritative capability registry. Do not invent blur, 3D, motion libraries, new icon sets, native gestures or tooltips. Avoid gratuitous decoration; an explicitly requested bold/playful direction may use purposeful color or asymmetry. Never claim live accessibility/native behavior was implemented or tested.`;
