import {z} from 'zod';
import {type ProductType} from '../../shared/product';
import {requirementsSchema,resolveRequirements} from '../designRequirements';
import {policyInstructions} from '../../shared/designPolicy';
import {PRODUCT_INTENT_INSTRUCTION} from '../productDetection';
import {categories,directions,needs} from './catalog';
import {GeminiError,parseGeminiJson,analysisDiagnostic} from '../geminiResponse';

const phrases=z.array(z.string().max(300)).max(20);
export const analysisSchema=z.object({
  productType:z.enum(['website','mobile_app','ambiguous']),
  category:z.enum(categories).default('general'),audience:z.string().max(500).default('Unspecified'),
  styleHints:z.array(z.enum(directions)).max(3).default([]),theme:z.enum(['light','dark','unspecified']).default('unspecified'),
  preferences:z.object({style:phrases,colors:phrases,typography:phrases,branding:phrases}).default({style:[],colors:[],typography:[],branding:[]}),
  goals:phrases.default([]),screens:phrases.default([]),sections:phrases.default([]),uxNeeds:z.array(z.enum(needs)).max(9).default([]),
  requirements:requirementsSchema.optional(),
});
export type PromptAnalysis=Omit<z.infer<typeof analysisSchema>,'productType'> & {productType:ProductType};
// Derive the request schema from the validator so bounds cannot silently drift.
// maxItems is supported by Gemini. String length remains strictly validated;
// unsupported maxLength is expressed as guidance, not an unsupported API keyword.
function analysisJsonSchema(value:unknown):unknown {
  if(Array.isArray(value))return value.map(analysisJsonSchema);
  if(!value || typeof value!=='object')return value;
  const obj=value as Record<string,unknown>;
  return {...Object.fromEntries(Object.entries(obj).filter(([key])=>!['$schema','default','maxLength'].includes(key)).map(([key,v])=>[key,analysisJsonSchema(v)])),...(typeof obj.maxLength==='number'?{description:`At most ${obj.maxLength} characters.`}:{})};
}
export const promptAnalysisJsonSchema=analysisJsonSchema(z.toJSONSchema(analysisSchema));

export async function analyzeDesignPrompt(prompt:string,generate:(body:unknown)=>Promise<string>,selectedProductType?:ProductType):Promise<PromptAnalysis> {
  const text=await generate({systemInstruction:{parts:[{text:policyInstructions()+"\n"+PRODUCT_INTENT_INSTRUCTION+`\nAnalyze product category, audience, goals, requested screens/pages and UX needs semantically in this same call. screens contains only explicitly named screen/page titles, copied exactly; website areas such as hero, features and pricing belong in sections, not separate pages unless requested as pages. styleHints must describe positive requested art direction, not a negated style. Return at most three styleHints, prioritizing the strongest requested directions; all exact style preferences still belong in preferences.style. Keep each preference/goal/screen/section phrase within 300 characters and each list within 20 entries. Keep audience within 500 characters. Use empty styleHints when unspecified; never infer editorial from the word premium alone. theme is an explicitly requested theme, not an industry default. preferences must contain exact short phrases copied from the user's positive style/color/type/own-brand requirements, including color hex codes and brand names. Do not invent requirements, color values, records, or a brand. Respect negation and the requested deliverable. When selectedProductType is supplied, it is the user?s explicit UI selection and overrides product-type wording in the prompt: analyze screens and UX for that selected deliverable. Return requirements with the product purpose, exact requestedScreenCount or null, a verbatim countEvidence quote, excludedScreens with exact names and verbatim negative evidence, exclusions as verbatim requirements, and conflicts with verbatim supporting quotes. Never invent a count. Only list positively required names in screens. Infer audience, goals and relevant UX needs for any original idea, not a fixed industry flow. Identify incompatible counts or required/excluded screens instead of silently resolving them. Only classify and analyze; do not generate a design.`}]},contents:[{role:'user',parts:[{text:JSON.stringify({prompt,selectedProductType})}]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema:promptAnalysisJsonSchema}});
  try {
    const validation=analysisSchema.safeParse(parseGeminiJson(text,'prompt analysis'));
    if(!validation.success) {
      const issues=validation.error.issues.slice(0,4).map(issue=>({path:issue.path.join('.')||'response',code:issue.code}));
      analysisDiagnostic({code:'ANALYSIS_SCHEMA',characters:text.length,issues});
      throw new GeminiError(`Gemini returned invalid prompt analysis: ${issues.map(i=>`${i.path} (${i.code})`).join(', ')}. The response did not match FRAME's analysis schema. Your original prompt and existing design are preserved.`,'ANALYSIS_SCHEMA');
    }
    const result=validation.data;
    // Treat the original prompt as authoritative, never a model-invented quote.
    for(const key of ['style','colors','typography','branding'] as const)result.preferences[key]=result.preferences[key].filter(value=>value.trim() && prompt.toLowerCase().includes(value.toLowerCase()));
    result.screens=result.screens.filter(value=>value.trim() && prompt.toLowerCase().includes(value.toLowerCase()));
    result.requirements=resolveRequirements(prompt,result.screens,result.requirements);
    if(!selectedProductType&&result.productType==='ambiguous')throw new GeminiError('Please select Web or App, or clarify the intended deliverable. Your prompt and existing design are preserved.','REQUIREMENT_CONFLICT',false,422);
    return {...result,productType:selectedProductType??result.productType as ProductType};
  } catch(error) {
    if(error instanceof GeminiError){if(error.code!=='ANALYSIS_SCHEMA')analysisDiagnostic({code:error.code,characters:text.length});throw error;}
    throw new GeminiError('Gemini prompt analysis failed validation. Your original prompt and existing design are preserved.','ANALYSIS_SCHEMA');
  }
}

