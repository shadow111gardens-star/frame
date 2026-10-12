import {responseSchema, type DesignApp} from '../shared/design';
import {DesignValidationError} from './designDiagnostics';
import {resolvedPlanNavigation,type DesignPlan} from './designPlanning';
import {isNavigationAction,type ResolvedNavigationEdge} from '../shared/navigation';
import {screenNameKey} from './screenRequirements';

function repairNavigationScreen(original:DesignApp['screens'][number],updated:DesignApp['screens'][number],missing:ResolvedNavigationEdge[],realScreenIds:Set<string>) {
  const destinations=new Set(missing.filter(edge=>edge.fromScreenId===original.id).flatMap(edge=>edge.toScreenId?[edge.toScreenId]:[]));
  const originalIds=new Set(original.components.map(c=>c.id));
  const nodes=new Map(updated.components.map(c=>[c.id,c]));
  const parents=new Map(updated.components.flatMap(c=>(c.children??[]).map(id=>[id,c.id] as const)));
  const added=new Set<string>();
  const include=(id:string)=>{if(originalIds.has(id)||added.has(id))return;const c=nodes.get(id);if(!c)return;added.add(id);c.children?.forEach(include);const parent=parents.get(id);if(parent)include(parent);};
  updated.components.filter(c=>!originalIds.has(c.id)&&c.targetScreenId&&destinations.has(c.targetScreenId)&&isNavigationAction(updated,c.id)).forEach(c=>include(c.id));
  const components=original.components.map(c=>{
    const next=nodes.get(c.id);
    const children=next?.children?.filter(id=>added.has(id))??[];
    let restored=structuredClone(c);
    if(children.length)restored.children=[...new Set([...(c.children??[]),...children])];
    // A missing action can be added to a visible existing surface. Never redirect
    // a working planned link, recompose its layout, or reveal a hidden subtree.
    if(next?.type===c.type&&next.targetScreenId&&destinations.has(next.targetScreenId)&&isNavigationAction(original,c.id)&&(!c.targetScreenId||!realScreenIds.has(c.targetScreenId))){
      restored={...restored,targetScreenId:next.targetScreenId,...(next.text!==undefined?{text:next.text}:{})};
      delete restored.targetComponentId;
    }
    return restored;
  });
  const additions=updated.components.filter(c=>added.has(c.id)).map(c=>({...structuredClone(c),...(c.children?{children:c.children.filter(id=>added.has(id))}:{})}));
  return {...structuredClone(original),components:[...components,...additions]};
}

export interface RepairScope { screenIds: string[]; componentIds: string[]; designSystem: boolean }
/** Scope only failures with a structurally readable candidate and known diagnostics.
 * Malformed/schema/relationship failures still need full validated recovery. */
export function targetedRepair(candidate: unknown, error: unknown, plan?: DesignPlan) {
  const parsed=responseSchema.safeParse(candidate);
  if(!parsed.success || !(error instanceof DesignValidationError) || !['DESIGN_CONSISTENCY','DESIGN_RELATIONSHIPS','REQUIREMENT_SCREEN'].includes(error.code))return undefined;
  const app=parsed.data.app,details=error.details;
  const approved=resolvedPlanNavigation(app,plan);
  if(details.missingScreens?.length&&plan){
    const missing=details.missingScreens,ids=new Set(missing.map(s=>s.id));
    const neededLinks=approved.filter(edge=>ids.has(edge.toScreenId??'')&&!ids.has(edge.fromScreenId??'')).filter(edge=>{
      const source=app.screens.find(s=>s.id===edge.fromScreenId);
      return source&&!source.components.some(c=>c.targetScreenId===edge.toScreenId&&isNavigationAction(source,c.id));
    });
    const scope:RepairScope={screenIds:[...new Set([...ids,...neededLinks.flatMap(edge=>edge.fromScreenId?[edge.fromScreenId]:[])])],componentIds:[],designSystem:false};
    return {scope,restore(repaired:unknown):unknown{
      const checked=responseSchema.safeParse(repaired);if(!checked.success)return repaired;
      const result=checked.data;
      const corrected=(id:string)=>result.app.screens.find(s=>s.id===id&&missing.some(m=>m.id===id&&m.key===screenNameKey(s.name)));
      const knownIds=new Set(plan.screens.flatMap(s=>s.id?[s.id]:[]));
      const screens=app.screens.map(original=>{
        if(ids.has(original.id))return corrected(original.id)??structuredClone(original);
        const updated=result.app.screens.find(s=>s.id===original.id);
        return updated&&neededLinks.some(edge=>edge.fromScreenId===original.id)?repairNavigationScreen(original,updated,neededLinks,knownIds):structuredClone(original);
      });
      for(const missingScreen of missing)if(!app.screens.some(s=>s.id===missingScreen.id)){
        const added=corrected(missingScreen.id);if(added)screens.push(added);
      }
      result.app={...app,designSystem:structuredClone(app.designSystem),screens};return result;
    }};
  }
  const missing=details.missingNavigation??approved.filter(edge=>details.missingEdgeIndexes?.includes(edge.index)||!edge.actionComponentIds.length);
  const navigationOnly=['PLANNED_NAVIGATION','MISSING_NAVIGATION_TARGET'].includes(details.reason)&&missing.length>0;
  let screens:DesignApp['screens']=[];
  if(details.reason==='DESIGN_SYSTEM')screens=[];
  else if(details.reason==='MISSING_NAVIGATION_TARGET')
    screens=app.screens.filter(s=>s.components.some(c=>c.targetScreenId&&!app.screens.some(target=>target.id===c.targetScreenId)));
  else if(details.reason==='PLANNED_NAVIGATION' && plan?.journey)
    screens=app.screens.filter(s=>missing.some(edge=>edge.fromScreenId===s.id));
  else if(details.screenIndex!==undefined && app.screens[details.screenIndex])screens=[app.screens[details.screenIndex]];
  else return undefined;
  const scope:RepairScope={screenIds:screens.map(s=>s.id),componentIds:details.reason==='MISSING_NAVIGATION_TARGET'?screens.flatMap(s=>s.components.filter(c=>c.targetScreenId&&!app.screens.some(target=>target.id===c.targetScreenId)).map(c=>c.id)):details.componentIndex!==undefined?screens.flatMap(s=>s.components[details.componentIndex!]?.id??[]):[],designSystem:details.reason==='DESIGN_SYSTEM'};
  return {scope,restore(repaired:unknown):unknown {
    const checked=responseSchema.safeParse(repaired);
    if(!checked.success)return repaired; // Let the normal validator report controlled field paths.
    const result=checked.data;
    result.app={...app,designSystem:scope.designSystem?result.app.designSystem:structuredClone(app.designSystem),screens:app.screens.map(original=>{
      if(!scope.screenIds.includes(original.id))return structuredClone(original);
      const updated=result.app.screens.find(s=>s.id===original.id);
      // Retaining the defective original ensures an omitted repair cannot pass validation.
      return updated?(navigationOnly?repairNavigationScreen(original,updated,missing,new Set(app.screens.map(s=>s.id))):{...updated,id:original.id,name:original.name,width:original.width}):original;
    })};
    return result;
  }};
}
