import {createHash} from 'node:crypto';
export interface ScreenRequirement {id:string;key:string;expectedName:string;requiredContent:string}
export const screenNameKey=(name:string)=>name.trim().replace(/\s+/gu,' ').toLowerCase();
const displayName=(name:string)=>name.trim().replace(/\s+/gu,' ');
function titleClause(value:string):string {
  let quote='';
  for(let i=0;i<value.length;i++){
    if(value[i]==='"'||value[i]==="'"){if(!quote)quote=value[i];else if(quote===value[i])quote='';}
    if(!quote&&/^\s+(?:with|for a|for an|for the)\s+/i.test(value.slice(i)))return value.slice(0,i);
  }
  return value;
}
function splitTitles(list:string):string[]{
  const result:string[]=[];let part='',quote='';
  for(let i=0;i<list.length;i++){
    const c=list[i];
    if(/["'“”]/.test(c)){if(!quote)quote=c;else if(c===quote||quote==='“'&&c==='”')quote='';part+=c;continue;}
    const conjunction=!quote&&list.slice(i).match(/^\s+and\s+/i);
    if(!quote&&c===','||conjunction){result.push(part);part='';if(conjunction)i+=conjunction[0].length-1;}else part+=c;
  }
  if(!quote)result.push(part);return result;
}
export function screenRequirement(name:string,requiredContent='',id?:string):ScreenRequirement {
  const key=screenNameKey(name);
  return {id:id??'required-'+createHash('sha256').update(key).digest('hex').slice(0,24),key,expectedName:displayName(name),requiredContent:requiredContent||`Provide the explicitly requested ${displayName(name)} screen.`};
}
/** Recover only explicit title lists and positively requested page/screen phrases.
 * No industry presets, synonyms, fuzzy title matching, or website section inference. */
export function requestedScreenDetails(prompt:string,analyzedNames:string[]):ScreenRequirement[] {
  const explicit:{name:string;content:string;literal?:boolean;offset:number;role?:string}[]=[];
  const positive=(offset:number)=>! /\b(?:do not|don't|never|without|exclude|avoid|omit|for example|such as|optional|perhaps|maybe)\b/i.test(prompt.slice(0,offset).split(/[.!?;\n]/).pop()??'');
  const lists=/\b(?:screens?|pages?)\s*(?:named|called|titled|:)\s*([^.!?;\n]+)/gi;
  for(const match of prompt.matchAll(lists))if(positive(match.index!)){
    for(const title of splitTitles(titleClause(match[1]))){
      const name=title.trim().replace(/^["'“”]+|["'“”]+$/g,'');
      if(name&&name.length<=150&&!/\b(?:with|include|excluding|without)\b/i.test(name))explicit.push({name,content:`The original request explicitly names ${name}.`,literal:true,offset:match.index!});
    }
  }
  const phrases=/\b(?:include|create|design|build|provide|with|and)\s+(?:a\s+|an\s+|the\s+)?([\p{L}\p{N}][\p{L}\p{N} _-]{0,100}?)\s+(page|screen)\b|,\s+(?:a\s+|an\s+|the\s+)([\p{L}\p{N}][\p{L}\p{N} _-]{0,100}?)\s+(page|screen)\b/giu;
  for(const match of prompt.matchAll(phrases))if(positive(match.index!)){
    const name=displayName(match[1]??match[3]);
    if(/^(?:(?:exactly|only|at least|at most)\s+)?(?:a|an|the|one|two|three|four|five|six|seven|eight|nine|ten|\d+)$/i.test(name))continue;
    if(/\b(?:single|multi|responsive|landing|web|website|mobile|app|application|separate|additional|new|every|each|modern|premium|beautiful|complete|professional|polished|simple|dedicated|public|private|marketing|informational)\b/i.test(name)||/^\d+$/.test(name))continue;
    const tail=prompt.slice(match.index!+match[0].length).split(/[.!?;,]/)[0];
    explicit.push({name,content:displayName((name+' '+(match[2]??match[4])+tail).slice(0,1000)),offset:match.index!,role:match[2]??match[4]});
  }
  for(const match of prompt.matchAll(/\b(?:include|create|design|build|with)\s+(?:a\s+|the\s+)?(dashboard)\b/gi))if(positive(match.index!)){
    explicit.push({name:match[1],content:displayName(prompt.slice(match.index!,match.index!+300).split(/[.!?;,]/)[0]),offset:match.index!});
  }
  const original=screenNameKey(prompt);
  const supported=analyzedNames.map(displayName).filter(name=>{
    if(!name)return false;
    const escaped=screenNameKey(name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    return new RegExp('(?<![\\p{L}\\p{N}_])'+escaped+'(?![\\p{L}\\p{N}_])','u').test(original);
  });
  const combined=new Map<string,ScreenRequirement>();
  const grammaticalAliases=new Set<string>();
  const ordered=explicit.sort((a,b)=>a.offset-b.offset);
  for(const [index,item] of ordered.entries()){
    const key=screenNameKey(item.name),alias=item.role?key+' '+item.role.toLowerCase():undefined;
    if(alias)grammaticalAliases.add(alias);
    const model=supported.find(name=>screenNameKey(name)===key)??(alias?supported.find(name=>screenNameKey(name)===alias)?.replace(/\s+(?:page|screen)$/i,''):undefined);
    const content=item.literal?item.content:displayName(prompt.slice(item.offset,ordered[index+1]?.offset??prompt.length).split(/[.!?;\n]/)[0]).slice(0,1000)||item.content;
    combined.set(key,screenRequirement(item.literal?item.name:model??item.name,content));
  }
  const hasExplicitList=ordered.some(item=>item.literal);
  for(const name of supported){
    if(hasExplicitList&&!combined.has(screenNameKey(name)))continue;
    const key=screenNameKey(name);
    if(grammaticalAliases.has(key)&&!combined.has(key))continue;
    // A partial analysis label (Projects) cannot replace an explicit title
    // (Projects Listing). Keep it only when independently named as a title.
    if(!combined.has(key)&&[...combined.keys()].some(explicitKey=>(' '+explicitKey+' ').includes(' '+key+' ')))continue;
    if(!combined.has(key))combined.set(key,screenRequirement(name));
  }
  return [...combined.values()];
}
