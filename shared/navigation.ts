import type { DesignApp } from './design';
type Screen = DesignApp['screens'][number];
export interface ResolvedNavigationEdge {
  index:number; from:string; to:string; action:string;
  fromScreenId?:string; toScreenId?:string; actionComponentIds:string[];
}
// These components have useful clickable surfaces in GeneratedSurface's prototype.
// Inputs/search edit text; decorative separators/charts/progress cannot satisfy a journey action.
export const navigationComponentTypes = ['Button','Text','Icon','Card','List','Image','Avatar','Navigation','Container','Stack','Group'] as const;
export function isNavigationAction(screen: Screen, id: string): boolean {
  const nodes = new Map(screen.components.map(c=>[c.id,c]));
  const parents = new Map(screen.components.flatMap(c=>(c.children??[]).map(child=>[child,c.id] as const)));
  const component = nodes.get(id);
  if (!component || component.targetComponentId || !(navigationComponentTypes as readonly string[]).includes(component.type)) return false;
  const visited = new Set<string>();
  let current: typeof component | undefined = component;
  while (current) {
    if (visited.has(current.id) || current.styles.opacity===0 || current.styles.responsive?.hidden && screen.width<=current.styles.responsive.maxWidth) return false;
    visited.add(current.id);current=nodes.get(parents.get(current.id)??'');
  }
  return component.position.width>0 && component.position.height>0;
}
