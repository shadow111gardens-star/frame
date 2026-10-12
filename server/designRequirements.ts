import {z} from 'zod';
import {GeminiError} from './geminiResponse';
import {designPolicy} from '../shared/designPolicy';
import {screenNameKey,screenRequirement,type ScreenRequirement} from './screenRequirements';
import {DesignValidationError} from './designDiagnostics';

export const requirementsSchema=z.object({
  purpose:z.string().max(500),
  requestedScreenCount:z.number().int().min(1).max(20).nullable(),
  countEvidence:z.string().max(300),
  excludedScreens:z.array(z.object({name:z.string().min(1).max(100),evidence:z.string().min(1).max(300)})).max(20),
  exclusions:z.array(z.string().min(1).max(300)).max(20),
  conflicts:z.array(z.object({reason:z.string().min(1).max(300),evidence:z.array(z.string().min(1).max(300)).min(1).max(5)})).max(5),
});
export type Requirements=z.infer<typeof requirementsSchema>;
const words:Record<string,number>={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20};
export type ScreenCountConstraint={kind:'exact'|'minimum'|'maximum'|'range';min:number;max:number;evidence:string};
const numberPattern='(?:\\d+|'+Object.keys(words).join('|')+')';
const numberValue=(value:string)=>words[value.toLowerCase()]??Number(value);
// Read complete expressions before individual numbers. A range's upper endpoint
// must never become an exact count. Lists and model evidence are not count sources.
export function screenCountConstraints(prompt:string):ScreenCountConstraint[]{
 const pattern=new RegExp(`\\b(?:(between|from)\\s+(${numberPattern})\\s+(?:and|to)\\s+(${numberPattern})|(${numberPattern})\\s*(?:[-–—]|to)\\s*(${numberPattern})|(?:(at least|at most|up to|no more than|no fewer than|a minimum of|a maximum of|min(?:imum)?(?: of)?|max(?:imum)?(?: of)?)\\s+)?(${numberPattern})|single)[ -]*(?:screens?|pages?)\\b`,'gi');
 const constraints:ScreenCountConstraint[]=[];
 for(const match of prompt.matchAll(pattern)){
  const start=match.index!,end=start+match[0].length;
  const prefix=prompt.slice(0,start).split(/[.!?;\n]/).pop()??'';
  const suffix=prompt.slice(end).split(/[.!?;\n]/)[0];
  // Conservative by design: examples, optional/approximate quantities and
  // descriptive feature counts do not impose a deliverable size.
  if(/\b(?:for example|such as|examples?|suggest(?:ed)?|perhaps|maybe|could|might|approximately|about|around|roughly|ideally|if)\b/i.test(prefix)||/e\.g\.\s*$/i.test(prompt.slice(0,start))||/\b(?:not|never|don.t|exclude|avoid|omit)\b[^,]*$/i.test(prefix)||/^\s*(?:per|each|or\s+\d+|for example)\b/i.test(suffix)||/\b(?:shows?|displays?|contains?|has|had|existing)\b[^,]*$/i.test(prefix))continue;
  const rangeStart=match[2]??match[4],rangeEnd=match[3]??match[5];
  const value=match[7]?numberValue(match[7]):1;
  const modifier=match[6]?.toLowerCase();
  const kind=rangeStart?'range':modifier?(/least|fewer|minimum|^min/.test(modifier)?'minimum':'maximum'):/^\s*(?:or more|at least)\b/i.test(suffix)?'minimum':/^\s*(?:or fewer|or less|at most)\b/i.test(suffix)?'maximum':'exact';
  // Bare numeric descriptions ("the app has 3 screens") and feature lists
  // are ambiguous. Require an instruction, explicit qualifier or single-page.
  if(kind==='exact'&&!/^single/i.test(match[0])&&!/\b(?:create|generate|design|build|make|include|provide|need|want|require|exactly|only|total|with|consist(?:s)? of|must have)\b/i.test(prefix)&&prefix.trim()!=='')continue;
  constraints.push({kind,min:rangeStart?numberValue(rangeStart):kind==='maximum'?1:value,max:rangeEnd?numberValue(rangeEnd):kind==='minimum'?designPolicy.validation.maxScreens:value,evidence:match[0]});
 }return constraints;
}
export function explicitCounts(prompt:string){return [...new Set(screenCountConstraints(prompt).filter(c=>c.kind==='exact').map(c=>c.min))];}
const conflict=(message:string)=>new GeminiError(`Please clarify your requirements: ${message} Your prompt and existing design are preserved.`,'REQUIREMENT_CONFLICT',false,422);
export function resolveRequirements(prompt:string,namedScreens:string[],input?:Requirements):Requirements {
 const counts=explicitCounts(prompt);if(counts.length>1)throw conflict('different exact screen counts were requested.');
 const constraints=screenCountConstraints(prompt);
 const minimum=Math.max(1,...constraints.map(c=>c.min)),maximum=Math.min(designPolicy.validation.maxScreens,...constraints.map(c=>c.max));
 if(minimum>maximum)throw conflict('the requested screen-count bounds are incompatible or unsupported.');
  if(counts.some(n=>n<1||n>designPolicy.validation.maxScreens))throw conflict(`FRAME supports 1–${designPolicy.validation.maxScreens} screens.`);
  const includes=(s:string)=>prompt.toLowerCase().includes(s.toLowerCase());
  const result:Requirements=input?structuredClone(input):{purpose:'Derive the purpose from the original request',requestedScreenCount:null,countEvidence:'',excludedScreens:[],exclusions:[],conflicts:[]};
 // Always replace model guesses and paraphrased evidence with original-prompt
 // evidence. Unsupported constraints are discarded rather than rejecting input.
 result.requestedScreenCount=counts[0]??null;
 result.countEvidence=screenCountConstraints(prompt).find(c=>c.kind==='exact')?.evidence??'';
  result.excludedScreens=result.excludedScreens.filter(s=>includes(s.evidence)&&/\b(no|not|without|exclude|avoid|omit|don.t)\b/i.test(s.evidence)&&includes(s.name));
  result.exclusions=result.exclusions.filter(includes);
 result.conflicts=result.conflicts.filter(c=>c.evidence.every(includes)&&!( /\b(?:screen|page)[ -]*count|number of (?:screens|pages)|counts?\b/i.test(c.reason)&&minimum<=maximum));
  if(result.conflicts.length)throw conflict('the request contains incompatible requirements. Please specify which should take priority.');
  const names=new Set(namedScreens.map(screenNameKey));
  if(names.size>designPolicy.validation.maxScreens)throw conflict('the number of required named screens exceeds FRAME capabilities.');
  if(result.requestedScreenCount!==null&&names.size>result.requestedScreenCount)throw conflict('the number of required named screens exceeds the requested total.');
  if(namedScreens.some(name=>result.excludedScreens.some(e=>screenNameKey(e.name)===screenNameKey(name))))throw conflict('a screen is both required and excluded.');
  return result;
}
export function enforceScreenRequirements(screens:{name:string}[],requiredNames:string[],requirements:Requirements,prompt?:string,details:ScreenRequirement[]=[]){
  const missing=[...new Map(requiredNames.map(name=>[screenNameKey(name),name])).values()].filter(name=>!screens.some(s=>screenNameKey(s.name)===screenNameKey(name))).map(name=>details.find(d=>d.key===screenNameKey(name))??screenRequirement(name));
  if(missing.length)throw new DesignValidationError('The design omitted a requested named screen: '+missing.map(s=>`${s.expectedName} [${s.id}]`).join(', ')+'. Your prompt and existing design are preserved.','REQUIREMENT_SCREEN',{reason:'REQUESTED_SCREENS',missingScreens:missing});
  if(requirements.requestedScreenCount!==null&&screens.length!==requirements.requestedScreenCount)throw new GeminiError(`The design must contain exactly ${requirements.requestedScreenCount} screens. Your prompt and existing design are preserved.`,'REQUIREMENT_COUNT');
 if(prompt!==undefined){
  const constraints=screenCountConstraints(prompt),min=Math.max(1,...constraints.map(c=>c.min)),max=Math.min(designPolicy.validation.maxScreens,...constraints.map(c=>c.max));
  if(screens.length<min||screens.length>max)throw new GeminiError(`The design must contain between ${min} and ${max} screens as requested. Your prompt and existing design are preserved.`,'REQUIREMENT_COUNT');
 }
  if(screens.some(s=>requirements.excludedScreens.some(e=>screenNameKey(e.name)===screenNameKey(s.name))))throw new GeminiError('The design included an excluded screen. Your prompt and existing design are preserved.','REQUIREMENT_EXCLUSION');
}
