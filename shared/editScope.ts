import {validateApp,type DesignApp} from './design';
export type EditScope='screen'|'project';
/** Publish only authorized screens. Shared tokens never leak through a local redesign. */
export function mergeScreenEdit(original:DesignApp,candidate:DesignApp,screenIds:string[]):DesignApp {
  if(candidate.productType!==original.productType)throw new Error('Product type changed');
  const allowed=new Set(screenIds);
  if(screenIds.some(id=>!original.screens.some(s=>s.id===id)||!candidate.screens.some(s=>s.id===id)))throw new Error('Selected screen missing from redesign');
  const protectedIds=new Set(original.screens.filter(s=>!allowed.has(s.id)).flatMap(s=>[s.id,...s.components.map(c=>c.id)]));
  const screens=original.screens.map(screen=>{
    if(!allowed.has(screen.id))return structuredClone(screen);
    const next=structuredClone(candidate.screens.find(s=>s.id===screen.id)!);
    if(next.components.some(c=>protectedIds.has(c.id)))throw new Error('Redesign reused an unrelated component ID');
    // Freeze linked settings. Materialize changed shared token values as local overrides.
    if(next.backgroundToken&&candidate.designSystem.colors[next.backgroundToken]!==original.designSystem.colors[next.backgroundToken]){next.background=candidate.designSystem.colors[next.backgroundToken]??next.background;delete next.backgroundToken;}
    for(const c of next.components){
      const textStyle=c.styles.textStyleToken;if(textStyle&&JSON.stringify(candidate.designSystem.textStyles?.[textStyle])!==JSON.stringify(original.designSystem.textStyles?.[textStyle])){c.styles={...candidate.designSystem.textStyles?.[textStyle],...c.styles};delete c.styles.textStyleToken;}
      for(const key of ['background','color','borderColor'] as const){const token=c.styles[`${key}Token`];if(token&&candidate.designSystem.colors[token]!==original.designSystem.colors[token]){c.styles[key]=candidate.designSystem.colors[token];delete c.styles[`${key}Token`];}}
      const font=c.styles.fontToken;if(font&&candidate.designSystem.typography[font]!==original.designSystem.typography[font]){c.styles.font=candidate.designSystem.typography[font];delete c.styles.fontToken;}
      for(const key of ['paddingX','paddingY','gap','margin','radius'] as const){const token=c.styles[`${key}Token`];const incoming=key==='radius'?candidate.designSystem.radii:candidate.designSystem.spacing,previous=key==='radius'?original.designSystem.radii:original.designSystem.spacing;if(token!==undefined&&incoming[token]!==previous[token]){c.styles[key]=incoming[token];delete c.styles[`${key}Token`];}}
    }
    return next;
  });
  return validateApp({...structuredClone(original),screens});
}
