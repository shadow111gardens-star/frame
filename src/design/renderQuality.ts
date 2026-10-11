import type {DesignApp} from '../../shared/design';
import {inspectStructure,type QualityIssue} from '../../shared/designQuality';
import {fontMetadata} from './designProperties';
import {colorHex} from './designProperties';
import {resolveStyles} from './designProperties';
import {reflowText,dockedSpace} from './textLayout';
export function measureRenderedReflow(root:HTMLElement,screen:DesignApp['screens'][number],app:DesignApp){
  const scale=root.getBoundingClientRect().width/root.offsetWidth,measured:Record<string,number>={};
  if(!scale)return {positions:{},height:screen.height};
  const excluded=new Set<string>(),byId=new Map(screen.components.map(c=>[c.id,c]));
  const exclude=(id:string)=>{if(excluded.has(id))return;excluded.add(id);byId.get(id)?.children?.forEach(exclude);};
  screen.components.filter(c=>c.styles.dock||['flex','grid'].includes(c.styles.layout??'')).forEach(c=>c.children?.forEach(exclude));
  root.querySelectorAll<HTMLElement>('[data-text-content]').forEach(e=>{const c=byId.get(e.dataset.textContent!);if(c){const s=resolveStyles(c.styles,app.designSystem,root.offsetWidth);measured[c.id]=Math.ceil(e.getBoundingClientRect().height/scale+2*(s.paddingY??0)+(s.border?2:0)+2*(s.margin??0));}});
  root.querySelectorAll<HTMLElement>('[data-component-id]').forEach(e=>{const c=byId.get(e.dataset.componentId!);if(c&&['flex','grid'].includes(c.styles.layout??'')){const s=resolveStyles(c.styles,app.designSystem,root.offsetWidth);measured[c.id]=Math.ceil(Math.max(e.scrollHeight,e.getBoundingClientRect().height/scale)+(s.border?2:0)+2*(s.margin??0));}});
  return reflowText(screen.components.filter(c=>!excluded.has(c.id)&&!c.styles.dock),measured,screen.height,dockedSpace(screen.components,measured));
}
export function contrastRatio(a:string,b:string):number|undefined {
  const parse=(s:string)=>{const h=colorHex(s);if(!h||h.length!==7)return;const v=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];};
  const x=parse(a),y=parse(b);return x===undefined||y===undefined?undefined:(Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
/** Browser geometry, normalized to source pixels. Intentional image/text layers are excluded. */
export function inspectRenderedScreen(root:HTMLElement,screen:DesignApp['screens'][number],app:DesignApp):QualityIssue[] {
  const issues=inspectStructure({...app,screens:[screen]}),nodes=new Map(screen.components.map(c=>[c.id,c]));
  const origin=root.getBoundingClientRect(),scale=origin.width/root.offsetWidth;
  if(!scale||!origin.height)return issues;
  const elements=[...root.querySelectorAll<HTMLElement>('[data-component-id]')].filter(e=>getComputedStyle(e).display!=='none');
  const rect=(e:HTMLElement)=>{const r=e.getBoundingClientRect();return{x:(r.left-origin.left)/scale,y:(r.top-origin.top)/scale,width:r.width/scale,height:r.height/scale};};
  const add=(code:QualityIssue['code'],ids:string[],detail:string,severity:QualityIssue['severity']='warning')=>issues.push({screenId:screen.id,componentIds:ids,code,severity,detail});
  for(const e of elements){const id=e.dataset.componentId!,c=nodes.get(id)!;if(!c)continue;const r=rect(e),s=getComputedStyle(e);
    if(r.x<-.5||r.y<-.5||r.x+r.width>root.offsetWidth+1||r.y+r.height>root.offsetHeight+1)add('bounds',[id],`Rendered box (${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)},${Math.round(r.height)}) exceeds screen bounds.`,'error');
    const text=e.querySelector<HTMLElement>(`[data-text-content]`);
    if(text&&text.dataset.textContent===id){const t=rect(text);if(t.y+t.height>r.y+r.height+1||t.width>r.width+1||text.scrollWidth>text.clientWidth+1)add('text-clipping',[id],'Rendered text exceeds its allocated box after actual font loading.','error');}
    if((e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2)&&c.styles.overflow!=='auto'&&['flex','grid'].includes(c.styles.layout??''))add('bounds',[id],'Flow children overflow their allocated container.','error');
    if(c.text||c.type==='Icon'){let background:string|undefined;let current:HTMLElement|null=e;let reliable=true;
      while(current&&root.contains(current)){const cs=getComputedStyle(current);if(cs.backgroundImage!=='none'||cs.opacity!=='1'){reliable=false;break;}if(cs.backgroundColor!=='rgba(0, 0, 0, 0)'){background=cs.backgroundColor;break;}current=current.parentElement;}
      const ratio=reliable&&background?contrastRatio(s.color,background):undefined;
      const threshold=parseFloat(s.fontSize)>=24||parseFloat(s.fontSize)>=18.66&&Number(s.fontWeight)>=700?3:4.5;
      if(ratio!==undefined&&ratio<threshold)add('contrast',[id],`Measured solid-color contrast ${ratio.toFixed(2)}:1 is below ${threshold}:1. Gradient/image/transparent compositions are not evaluated by this check.`);
    }
    const family=s.fontFamily.split(',')[0].trim().replace(/["']/g,'');
    const loaded=[...document.fonts].some(face=>face.family.replace(/["']/g,'')===family&&face.status==='loaded');
    if(fontMetadata(family)&&(!loaded||!document.fonts.check(`${s.fontStyle} ${s.fontWeight} ${s.fontSize} "${family}"`)))add('font',[id],`Font ${family} is not loaded at this weight/style; the preview currently uses a fallback.`);
    if(c.type==='Image'){const img=e.querySelector('img');if(img&&!img.naturalWidth)add('image',[id],img.complete?'Image failed to load in the browser. Replace or repair the asset URL.':'Image is still loading at the review deadline. Its visual content has not been verified; do not replace a valid source merely because loading is slow.');}
  }
  // Only sibling leaf text/control collisions, not parent backgrounds or intentional layered images.
  const leaves=elements.filter(e=>{const c=nodes.get(e.dataset.componentId!)!;return c&&!c.children?.length&&['Text','Button','Input','Search'].includes(c.type);});
  for(let i=0;i<leaves.length;i++)for(let j=i+1;j<leaves.length;j++){const a=leaves[i],b=leaves[j];if(a.parentElement!==b.parentElement)continue;const x=rect(a),y=rect(b),w=Math.min(x.x+x.width,y.x+y.width)-Math.max(x.x,y.x),h=Math.min(x.y+x.height,y.y+y.height)-Math.max(x.y,y.y);if(w>4&&h>4)add('overlap',[a.dataset.componentId!,b.dataset.componentId!],`Sibling text/controls overlap by ${Math.round(w)} x ${Math.round(h)} source pixels. Confirm whether this is intentional before changing composition.`);}
  // Report large interior gaps only on populated screens, never reject whitespace or unknown-user empty states.
  const meaningful=elements.filter(e=>{const c=nodes.get(e.dataset.componentId!)!;return c&&!c.children?.length&&!!(c.text||c.source)&&c.type!=='Icon';}).map(rect);
  const intervals=meaningful.map(r=>[r.y,r.y+r.height]).sort((a,b)=>a[0]-b[0]);let end=intervals[0]?.[1]??0;
  if(meaningful.length>=6&&!screen.components.some(c=>/no .*yet|nothing .*yet|empty|sign.in|no saved/i.test(c.text??'')))for(const [top,bottom] of intervals.slice(1)){if(top-end>Math.max(160,root.offsetHeight*.2))add('empty-area',[],`Interior empty band from ${Math.round(end)} to ${Math.round(top)}px. Review against the intended hierarchy; retain deliberate editorial whitespace and safe areas.`);end=Math.max(end,bottom);}
  const controlRows=new Map<string,HTMLElement[]>();
  const textElements=elements.filter(e=>nodes.get(e.dataset.componentId!)?.type==='Text');
  if(textElements.length>=8){const sizes=textElements.map(e=>parseFloat(getComputedStyle(e).fontSize)),weights=textElements.map(e=>Number(getComputedStyle(e).fontWeight));if(Math.max(...sizes)/Math.min(...sizes)<1.25&&Math.max(...weights)-Math.min(...weights)<100)add('hierarchy',[],'Many text elements have almost identical size and weight. Review purpose, reading order and primary/secondary emphasis against the plan; do not force oversized headings into dense tools.');}
  for(const e of elements){const c=nodes.get(e.dataset.componentId!)!;if(c?.type!=='Button')continue;const r=rect(e),s=getComputedStyle(e);const key=(e.parentElement?.dataset.componentId??'root')+':'+Math.round(r.y/3)+':'+s.fontFamily+':'+s.fontSize;const row=controlRows.get(key)??[];row.push(e);controlRows.set(key,row);}
  for(const row of controlRows.values())if(row.length>=3){const heights=row.map(e=>rect(e).height),min=Math.min(...heights),max=Math.max(...heights);if(max-min>Math.max(8,min*.2))add('spacing',row.slice(0,8).map(e=>e.dataset.componentId!),`Peer control row has inconsistent heights (${heights.map(Math.round).join(', ')}px). Review padding/text fit and align related controls; retain an intentionally emphasized action if appropriate.`);}
  // A spacing warning needs repeated near-equal values, not an arbitrary global grid mandate.
  const scaleValues=app.designSystem.spacing.filter(n=>n>0);
  for(const key of ['gap','paddingX','paddingY'] as const){const values=screen.components.map(c=>c.styles[key]).filter((v):v is number=>v!==undefined&&v>0);const out=values.filter(v=>!scaleValues.includes(v)&&scaleValues.some(n=>Math.abs(n-v)<=2));if(out.length>=3)add('spacing',[],`Several ${key} values nearly match the shared scale (${[...new Set(out)].join(', ')}px). Review whether these are intentional optical adjustments.`);}
  return issues.slice(0,60);
}
