import {responseSchema,type DesignApp} from '../shared/design';
import type {DesignPlan} from './designPlanning';
import {isNavigationAction} from '../shared/navigation';
import {screenNameKey} from './screenRequirements';
/** Copy authoritative tokens and uniquely resolve actual planned identities/actions.
 * Never fabricate a screen, component, navigation requirement or content. */
export function localDesignRepair(candidate:unknown,plan?:DesignPlan,knownApp?:DesignApp):unknown {
  const parsed=responseSchema.safeParse(candidate);if(!parsed.success||!plan)return candidate;
  const result=structuredClone(parsed.data),ids=new Map<string,string>();
  for(const screen of result.app.screens){const matches=plan.screens.filter(s=>screenNameKey(s.name)===screenNameKey(screen.name));if(matches.length===1&&result.app.screens.filter(s=>screenNameKey(s.name)===screenNameKey(screen.name)).length===1){ids.set(screen.id,matches[0].id!);screen.id=matches[0].id!;screen.name=matches[0].name;}}
  result.app.designSystem=structuredClone(plan.designSystem);
  for(const screen of result.app.screens)for(const component of screen.components){if(component.targetScreenId&&ids.has(component.targetScreenId))component.targetScreenId=ids.get(component.targetScreenId);}
  for(const edge of plan.journey?.edges??[]){
    const from=plan.screens.find(s=>screenNameKey(s.name)===screenNameKey(edge.from)),to=plan.screens.find(s=>screenNameKey(s.name)===screenNameKey(edge.to));
    const screen=result.app.screens.find(s=>s.id===from?.id);if(!screen||!to||!(knownApp??result.app).screens.some(s=>s.id===to.id))continue;
    for(const c of screen.components){if(!isNavigationAction(screen,c.id))continue;
      if(c.targetScreenId&&screenNameKey(c.targetScreenId)===screenNameKey(to.name)||(!c.targetScreenId&&c.type!=='Text'&&screenNameKey(c.text??'')===screenNameKey(edge.action)))c.targetScreenId=to.id;
    }
  }
  return result;
}
