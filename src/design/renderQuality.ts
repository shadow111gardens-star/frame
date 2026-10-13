import {compositionEvidence,plannedRegionEvidence} from './compositionQuality';
import {previewConfig} from '../../shared/product';
import type {DesignApp} from '../../shared/design';
import {inspectStructure,type QualityIssue} from '../../shared/designQuality';
import {fontMetadata} from './designProperties';
import {colorHex} from './designProperties';
import {resolveStyles} from './designProperties';
import {reflowText,dockedSpace,flowOuterHeight,flowTextGrowth} from './textLayout';
/** Sample measured defects first, then a composition unlike the first capture.
 * All screens remain measured even when the existing two-image budget is reached. */
export function representativeScreenIds(app:DesignApp,issues:QualityIssue[],limit:number):string[]{
  const selected:string[]=[];
  const remaining=[...app.screens];
  while(selected.length<limit&&remaining.length){
    const seenTypes=new Set(app.screens.filter(s=>selected.includes(s.id)).flatMap(s=>s.components.map(c=>c.type)));
    const score=(s:DesignApp['screens'][number])=>issues.filter(i=>i.screenId===s.id&&i.severity==='error').length*1000+(selected.length?new Set(s.components.filter(c=>!seenTypes.has(c.type)).map(c=>c.type)).size:0);
    remaining.sort((a,b)=>score(b)-score(a));selected.push(remaining.shift()!.id);
  }
  return selected;
}
export function measureRenderedReflow(root:HTMLElement,screen:DesignApp['screens'][number],app:DesignApp){
  const scale=root.getBoundingClientRect().width/root.offsetWidth,measured:Record<string,number>={};
  if(!scale)return {positions:{},height:screen.height};
  const excluded=new Set<string>(),byId=new Map(screen.components.map(c=>[c.id,c]));
  const exclude=(id:string)=>{if(excluded.has(id))return;excluded.add(id);byId.get(id)?.children?.forEach(exclude);};
  screen.components.filter(c=>c.styles.dock||['flex','grid'].includes(c.styles.layout??'')).forEach(c=>c.children?.forEach(exclude));
  root.querySelectorAll<HTMLElement>('[data-text-content]').forEach(e=>{const c=byId.get(e.dataset.textContent!);if(c){const s=resolveStyles(c.styles,app.designSystem,root.offsetWidth);measured[c.id]=Math.ceil(e.getBoundingClientRect().height/scale+2*(s.paddingY??0)+(s.border?2:0)+2*(s.margin??0));}});
  root.querySelectorAll<HTMLElement>('[data-component-id]').forEach(e=>{const c=byId.get(e.dataset.componentId!);if(c&&['flex','grid'].includes(c.styles.layout??'')){const s=resolveStyles(c.styles,app.designSystem,root.offsetWidth);measured[c.id]=flowOuterHeight(e.scrollHeight,e.getBoundingClientRect().height/scale,s.border?2:0,s.margin??0);}});
  const layout=reflowText(screen.components.filter(c=>!excluded.has(c.id)&&!c.styles.dock),measured,screen.height,dockedSpace(screen.components,measured));
  return {...layout,positions:{...layout.positions,...flowTextGrowth(screen.components,measured)}};
}
export function contrastRatio(a:string,b:string):number|undefined {
  const parse=(s:string)=>{const h=colorHex(s);if(!h||h.length!==7)return;const v=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];};
  const x=parse(a),y=parse(b);return x===undefined||y===undefined?undefined:(Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
/** DOM Range rectangles include unused font ascender/descender space. Compare
 * painted glyphs when browser font metrics are available, retaining strict bounds. */
export function paintedTextBounds(box:{left:number;right:number;top:number;bottom:number},metrics:Pick<TextMetrics,'fontBoundingBoxAscent'|'actualBoundingBoxAscent'|'actualBoundingBoxDescent'|'actualBoundingBoxLeft'|'actualBoundingBoxRight'>,scale=1){
  if(!Number.isFinite(metrics.fontBoundingBoxAscent)||!Number.isFinite(metrics.actualBoundingBoxAscent))return box;
  const baseline=box.top+metrics.fontBoundingBoxAscent*scale;
  return {left:box.left-metrics.actualBoundingBoxLeft*scale,right:Math.max(box.right,box.left+metrics.actualBoundingBoxRight*scale),top:baseline-metrics.actualBoundingBoxAscent*scale,bottom:baseline+metrics.actualBoundingBoxDescent*scale};
}
/** Browser geometry, normalized to source pixels. Intentional image/text layers are excluded. */
export function inspectRenderedScreen(root:HTMLElement,screen:DesignApp['screens'][number],app:DesignApp,approvedPlan?:unknown):QualityIssue[] {
  const issues=inspectStructure({...app,screens:[screen]}),nodes=new Map(screen.components.map(c=>[c.id,c]));
  const origin=root.getBoundingClientRect(),scale=origin.width/root.offsetWidth;
  if(!scale||!origin.height)return issues;
  const visible=(e:HTMLElement)=>{let current:HTMLElement|null=e;while(current&&root.contains(current)){const s=getComputedStyle(current);if(s.display==='none'||s.visibility==='hidden'||s.opacity==='0')return false;current=current.parentElement;}return true;};
  const elements=[...root.querySelectorAll<HTMLElement>('[data-component-id]')].filter(visible);
  const rect=(e:HTMLElement)=>{const r=e.getBoundingClientRect();return{x:(r.left-origin.left)/scale,y:(r.top-origin.top)/scale,width:r.width/scale,height:r.height/scale};};
  const add=(code:QualityIssue['code'],ids:string[],detail:string,severity:QualityIssue['severity']='warning')=>issues.push({screenId:screen.id,componentIds:ids,code,severity,detail});
  for(const e of elements){const id=e.dataset.componentId!,c=nodes.get(id)!;if(!c)continue;const r=rect(e),s=getComputedStyle(e);
    if(r.x<-.5||r.y<-.5||r.x+r.width>root.offsetWidth+1||r.y+r.height>root.offsetHeight+1)add('bounds',[id],`Rendered box (${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)},${Math.round(r.height)}) exceeds screen bounds.`,'error');
    const text=e.querySelector<HTMLElement>(`[data-text-content]`);
    if(text&&text.dataset.textContent===id){
      const t=rect(text),px=(v:string)=>parseFloat(v)||0;
      const content={left:r.x+px(s.borderLeftWidth)+px(s.paddingLeft),right:r.x+r.width-px(s.borderRightWidth)-px(s.paddingRight),top:r.y+px(s.borderTopWidth)+px(s.paddingTop),bottom:r.y+r.height-px(s.borderBottomWidth)-px(s.paddingBottom)};
      // A centered wrapped button can clip at its top, despite a valid span width
      // and component position. Actual line rectangles expose that case.
      const range=document.createRange(),lines:{left:number;right:number;top:number;bottom:number}[]=[];
      const canvas=document.createElement('canvas').getContext('2d');
      if(canvas){const style=getComputedStyle(text);canvas.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;}
      // A whole-text Range includes trailing wrap whitespace outside the line,
      // even when all visible glyphs fit. Measure non-whitespace words instead.
      const walker=document.createTreeWalker(text,NodeFilter.SHOW_TEXT);let node:Node|null;
      while((node=walker.nextNode())){
        const words=(node.textContent??'').matchAll(/\S+/g);
        for(const word of words){range.setStart(node,word.index!);range.setEnd(node,word.index!+word[0].length);if(typeof range.getClientRects==='function'){const boxes=[...range.getClientRects()];const metrics=canvas?.measureText(word[0]);lines.push(...boxes.map(box=>metrics&&boxes.length===1?paintedTextBounds(box,metrics,scale):box));}}
      }
      const outside=lines.some(line=>(line.left-origin.left)/scale<content.left-1||(line.right-origin.left)/scale>content.right+1||(line.top-origin.top)/scale<content.top-1||(line.bottom-origin.top)/scale>content.bottom+1);
      // A visible span can have a taller font metric scroll box without clipping
      // its painted glyphs. The component's padded bounds remain authoritative.
      const textStyle=getComputedStyle(text),clipsOwnText=['hidden','clip'].includes(textStyle.overflowY);
      if(outside||t.x<content.left-1||t.y<content.top-1||t.x+t.width>content.right+1||t.y+t.height>content.bottom+1||text.scrollWidth>text.clientWidth+1||clipsOwnText&&text.scrollHeight>text.clientHeight+1)add('text-clipping',[id],'Rendered wrapped text exceeds the padded content area after actual font loading.','error');
    }
    // Screen bounds alone miss children clipped by a smaller absolute parent.
    // Explicit scrolling is intentional; hidden overflow is not a repair for lost text.
    let ancestor=e.parentElement;
    while(ancestor&&ancestor!==root){
      const parent=getComputedStyle(ancestor),box=rect(ancestor);
      const clippedX=['hidden','clip'].includes(parent.overflowX||parent.overflow),clippedY=['hidden','clip'].includes(parent.overflowY||parent.overflow);
      if(clippedX&&(r.x<box.x-1||r.x+r.width>box.x+box.width+1)||clippedY&&(r.y<box.y-1||r.y+r.height>box.y+box.height+1)){
        if(c.text||['Button','Input','Search'].includes(c.type))add('bounds',[id,...(ancestor.dataset.componentId?[ancestor.dataset.componentId]:[])],'Rendered content is clipped by an ancestor container. Enlarge/reflow the container; do not hide the overflow.','error');
        break;
      }
      ancestor=ancestor.parentElement;
    }
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
  // A later opaque sibling can erase text without changing its DOM bounds.
  // Limit this to the renderer's normal stacking order and solid backgrounds.
  for(const leaf of leaves){const text=leaf.querySelector<HTMLElement>('[data-text-content]');if(!text)continue;
    const range=document.createRange();range.selectNodeContents(text);const ink=range.getBoundingClientRect();
    const a={x:(ink.left-origin.left)/scale,y:(ink.top-origin.top)/scale,width:ink.width/scale,height:ink.height/scale};
    for(const cover of elements){if(cover.parentElement!==leaf.parentElement||!(leaf.compareDocumentPosition(cover)&Node.DOCUMENT_POSITION_FOLLOWING))continue;
      const css=getComputedStyle(cover);if(css.opacity!=='1'||css.backgroundImage!=='none'||!/^rgb\(/.test(css.backgroundColor)||css.zIndex!=='auto')continue;
      const b=rect(cover),w=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)),h=Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
      if(a.width*a.height>0&&w>2&&h>2&&w*h/(a.width*a.height)>.1)add('overlap',[leaf.dataset.componentId!,cover.dataset.componentId!],'Text is covered by a later opaque sibling surface in the renderer stacking order. Correct the parent/child membership or local coordinates; preserve valid content.','error');
    }
  }
  // Evaluate visible content, not background area or a universal fill quota.
  const meaningful=elements.filter(e=>{const c=nodes.get(e.dataset.componentId!)!;return c&&!c.children?.length&&!!(c.text||c.source)&&!['Icon','Image','Avatar'].includes(c.type);});
  const content=elements.filter(e=>{const c=nodes.get(e.dataset.componentId!)!;return c&&(!!c.source||!!c.values?.length||meaningful.includes(e));}).map(e=>({id:e.dataset.componentId!,...rect(e)}));
  if(root.offsetWidth===screen.width)issues.push(...plannedRegionEvidence(screen.id,content,approvedPlan));
  issues.push(...compositionEvidence(screen.id,content,Math.min(root.offsetHeight,previewConfig(app.productType).viewportHeight)));
  // Empty named content surfaces are demonstrable omissions, but safe to display
  // with a warning. Never manufacture records or trigger paid aesthetic repair.
  for(const e of elements){const c=nodes.get(e.dataset.componentId!)!;
    if(!c||!['List','Navigation','Card'].includes(c.type)||c.text?.trim())continue;
    const descendants=elements.filter(n=>n!==e&&e.contains(n));
    const hasContent=descendants.some(n=>{const node=nodes.get(n.dataset.componentId!);return !!(node?.text?.trim()||node?.source||node?.type==='Icon'||node?.values?.length);});
    const box=rect(e);
    if(!hasContent&&box.width>24&&box.height>24)add(c.type==='Navigation'?'hierarchy':'empty-area',[c.id],`Visible ${c.type} "${c.name}" has no rendered labels, rows, assets or empty-state explanation. Populate the approved content or explain its empty state; preserve valid navigation and do not invent user records.`);
  }
  const controlRows=new Map<string,HTMLElement[]>();
  const textElements=elements.filter(e=>nodes.get(e.dataset.componentId!)?.type==='Text');
  if(textElements.length>=8){const sizes=textElements.map(e=>parseFloat(getComputedStyle(e).fontSize)),weights=textElements.map(e=>Number(getComputedStyle(e).fontWeight));if(Math.max(...sizes)/Math.min(...sizes)<1.25&&Math.max(...weights)-Math.min(...weights)<100)add('hierarchy',[],'Many text elements have almost identical size and weight. Review purpose, reading order and primary/secondary emphasis against the plan; do not force oversized headings into dense tools.');}
  for(const e of elements){const c=nodes.get(e.dataset.componentId!)!;if(c?.type!=='Button')continue;const r=rect(e),s=getComputedStyle(e);const key=(e.parentElement?.dataset.componentId??'root')+':'+Math.round(r.y/3)+':'+s.fontFamily+':'+s.fontSize;const row=controlRows.get(key)??[];row.push(e);controlRows.set(key,row);}
  for(const row of controlRows.values())if(row.length>=3){const heights=row.map(e=>rect(e).height),min=Math.min(...heights),max=Math.max(...heights);if(max-min>Math.max(8,min*.2))add('spacing',row.slice(0,8).map(e=>e.dataset.componentId!),`Peer control row has inconsistent heights (${heights.map(Math.round).join(', ')}px). Review padding/text fit and align related controls; retain an intentionally emphasized action if appropriate.`);}
  // A spacing warning needs repeated near-equal values, not an arbitrary global grid mandate.
  const scaleValues=app.designSystem.spacing.filter(n=>n>0);
  for(const key of ['gap','paddingX','paddingY'] as const){const values=elements.map(e=>{const c=nodes.get(e.dataset.componentId!);return c?resolveStyles(c.styles,app.designSystem,root.offsetWidth)[key]:undefined;}).filter((v):v is number=>v!==undefined&&v>0);const out=values.filter(v=>!scaleValues.includes(v)&&scaleValues.some(n=>Math.abs(n-v)<=2));if(out.length>=3)add('spacing',[],`Several ${key} values nearly match the shared scale (${[...new Set(out)].join(', ')}px). Review whether these are intentional optical adjustments.`);}
  // Warnings must not crowd out later clipping/overflow errors at the evidence cap.
  return issues.sort((a,b)=>Number(b.severity==='error')-Number(a.severity==='error')).slice(0,60);
}
