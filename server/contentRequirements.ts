import type {DesignApp} from '../shared/design';
import {isNavigationAction} from '../shared/navigation';
import {screenNameKey} from './screenRequirements';
import type {DesignPlan} from './designPlanning';
export interface ContentRequirement {screenId:string;screenName:string;kind:'content'|'action';text:string}
/** Conservative explicit `X on Screen` clauses; never invent content or additional pages. */
export function contentRequirements(prompt:string,plan:DesignPlan):ContentRequirement[]{
  const requirements:ContentRequirement[]=[];
  for(const screen of plan.screens){
    const name=screen.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const pattern=new RegExp('(?:with|and|include|,)\\s+(?:a |an |the )?([\\p{L}\\p{N}][\\p{L}\\p{N} _-]{0,80}?)\\s+(button\\s+)?on\\s+(?:the\\s+)?'+name+'(?![\\p{L}\\p{N}_])','giu');
    for(const match of prompt.matchAll(pattern)){
      const text=match[1].split(/\s+and\s+(?:a |an |the )?/i).at(-1)!.trim().replace(/^with\s+/i,'');
      requirements.push({screenId:screen.id!,screenName:screen.name,kind:match[2]?'action':'content',text});
    }
  }
  return requirements;
}
export function missingContent(app:DesignApp,requirements:ContentRequirement[]){
  return requirements.filter(requirement=>{
    const screen=app.screens.find(s=>s.id===requirement.screenId);
    const matches=(text:string)=>{
      const key=screenNameKey(requirement.text),actual=screenNameKey(text);
      // A calorie summary commonly renders the real unit rather than the noun.
      // This equivalence applies only to content, never named screens or actions.
      if(requirement.kind==='content'&&/^(?:calorie|calories)$/.test(key))return /\b(?:calories?|kcal|kilocalories?)\b/.test(actual);
      return actual.includes(key);
    };
    return !screen?.components.some(c=>isNavigationAction(screen,c.id)&&matches(c.text??'')&&(requirement.kind!=='action'||c.type!=='Text'||Boolean(c.targetScreenId||c.targetComponentId)));
  });
}
/** Missing requirements may add a component subtree, never overwrite existing valid elements. */
export function restoreContentRepair(original:DesignApp,repaired:DesignApp,missing:ContentRequirement[]):DesignApp {
  const affected=new Set(missing.map(r=>r.screenId)),allIds=new Set(original.screens.flatMap(s=>s.components.map(c=>c.id)));
  return {...original,screens:original.screens.map(screen=>{
    if(!affected.has(screen.id))return screen;
    const added=repaired.screens.find(s=>s.id===screen.id)?.components.filter(c=>!allIds.has(c.id))??[];
    return {...screen,components:[...screen.components,...added]};
  })};
}
