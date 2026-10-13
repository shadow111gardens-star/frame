import type {QualityIssue} from '../../shared/designQuality';

export interface ContentBox {id:string;x:number;y:number;width:number;height:number}
/** Optional saved plans are untrusted and older revisions may have none. */
export function plannedRegionEvidence(screenId:string,boxes:ContentBox[],plan:unknown):QualityIssue[]{
  if(!plan||typeof plan!=='object'||!Array.isArray((plan as any).screens))return [];
  const screen=(plan as any).screens.find((s:any)=>s?.id===screenId),blueprint=screen?.layoutBlueprint;
  if(!blueprint||blueprint.intent==='empty'||!Array.isArray(blueprint.regions))return [];
  return blueprint.regions.slice(0,15).filter((r:any)=>typeof r?.role==='string'&&Number.isFinite(r.top)&&r.top>=0&&Number.isFinite(r.height)&&r.height>0&&r.height<=20000)
    .filter((r:any)=>!boxes.some(b=>b.width>0&&b.height>0&&Math.min(b.y+b.height,r.top+r.height)-Math.max(b.y,r.top)>2))
    .map((r:any)=>({screenId,componentIds:[],code:'empty-area',severity:'warning',detail:`Approved region "${r.role.slice(0,200)}" (${Math.round(r.top)}-${Math.round(r.top+r.height)}px) has no visible content evidence. Compare with DESIGN.md; preserve deliberate whitespace and do not invent features or records.`}));
}
/** Geometry supplies evidence, never proof that whitespace is aesthetically wrong.
 * Evaluate only the first viewport; long page tails and empty states stay valid. */
export function compositionEvidence(screenId:string,boxes:ContentBox[],viewportHeight:number):QualityIssue[]{
  if(boxes.length<3||viewportHeight<=0)return [];
  const intervals=boxes.filter(b=>b.width>0&&b.height>0&&b.y<viewportHeight&&b.y+b.height>0)
    .map(b=>[Math.max(0,b.y),Math.min(viewportHeight,b.y+b.height)]).sort((a,b)=>a[0]-b[0]);
  if(!intervals.length)return [];
  const gaps:{top:number;bottom:number}[]=[];let end=0;
  for(const [top,bottom] of intervals){if(top>end)gaps.push({top:end,bottom:top});end=Math.max(end,bottom);}
  if(end<viewportHeight)gaps.push({top:end,bottom:viewportHeight});
  return gaps.filter(g=>g.bottom-g.top>Math.max(180,viewportHeight*.35)).slice(0,3).map(g=>({
    screenId,componentIds:[],code:'empty-area',severity:'warning',
    detail:`Visible content leaves a ${Math.round(g.bottom-g.top)}px vertical band (${Math.round(g.top)}-${Math.round(g.bottom)}px) in the first viewport. Compare with the approved screen purpose and whitespace/empty-state intent. This is advisory geometry, not a requirement to add filler.`,
  }));
}
