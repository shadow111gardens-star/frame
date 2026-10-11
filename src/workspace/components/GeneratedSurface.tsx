import {DesignIcon} from './DesignIcon';
import {useRef,useLayoutEffect,useState,type CSSProperties} from 'react';
import { useWorkspace,getDevice } from '../store';
import type { DesignComponent, ScreenFile } from '../types';
import {screenDimensions} from '../../../shared/product';
import {flowSizing} from '../../design/layoutStyle';
import {reflowText,dockedSpace} from '../../design/textLayout';
import {resolveStyles,SHADOWS,fontMetadata,SYSTEM_FONTS} from '../../design/designProperties';

export function GeneratedSurface({screen,interactive=false,exporting=false,snapshot}:{screen:ScreenFile;interactive?:boolean;exporting?:boolean;snapshot?:ReturnType<typeof useWorkspace>['state']}) {
  const workspace=useWorkspace();const state=snapshot??workspace.state;const {dispatch}=workspace;
  const surfaceRef=useRef<HTMLDivElement>(null);
  const [viewportWidth,setViewportWidth]=useState(screenDimensions(screen,state.productType).width);
  useLayoutEffect(()=>{const root=surfaceRef.current;if(!root)return;const viewport=root.closest<HTMLElement>('[data-prototype-viewport]')??root;
    const measure=()=>setViewportWidth(viewport.dataset.prototypeViewport==='mobile_app'?getDevice(state.device).width:viewport.clientWidth||screenDimensions(screen,state.productType).width);
    measure();const observer=new ResizeObserver(measure);observer.observe(viewport);return()=>observer.disconnect();
  },[screen.id,state.centerTab,state.device]);
  const system=state.designSystem?{...state.designSystem,colors:{...state.designSystem.colors,...Object.fromEntries(Object.entries(state.tokens).filter(([,value])=>typeof value==="string"))}}:null;
  const nodes=screen.components.map(id=>state.components[id]).filter(Boolean);
  const children=new Set(nodes.flatMap(c=>c.children??[]));
  useLayoutEffect(()=>{
    let cancelled=false;
    const measure=()=>{
      const root=surfaceRef.current;if(!root||cancelled||exporting||interactive&&nodes.some(c=>c.styles.responsive))return;
      const scale=root.getBoundingClientRect().width/root.offsetWidth;if(!scale)return;
      const measured:Record<string,number>={};
      root.querySelectorAll<HTMLElement>('[data-text-content]').forEach(el=>{
        const id=el.dataset.textContent!,c=state.components[id];
        if(c&&system&&!(interactive&&c.styles.responsive&&viewportWidth<=c.styles.responsive.maxWidth)){const s=resolveStyles(c.styles,system,viewportWidth);measured[id]=Math.ceil(el.getBoundingClientRect().height/scale+2*(s.paddingY??0)+(s.border?2:0)+2*(s.margin??0));}
      });
      root.querySelectorAll<HTMLElement>('[data-component-id]').forEach(el=>{const c=state.components[el.dataset.componentId!];if(c&&(c.styles.layout==='flex'||c.styles.layout==='grid')){const s=system?resolveStyles(c.styles,system,viewportWidth):c.styles;measured[c.id]=Math.ceil(Math.max(el.scrollHeight,el.getBoundingClientRect().height/scale)+(s.border?2:0)+2*(s.margin??0));}});
      const flowChildren=new Set<string>();const exclude=(id:string)=>{if(flowChildren.has(id))return;flowChildren.add(id);state.components[id]?.children?.forEach(exclude);};nodes.filter(c=>c.styles.dock||c.styles.layout==='flex'||c.styles.layout==='grid').forEach(c=>c.children?.forEach(exclude));
      const layout=reflowText(nodes.filter(c=>!flowChildren.has(c.id)&&!c.styles.dock),measured,screenDimensions(screen,state.productType).height,dockedSpace(nodes,measured));
      if(Object.keys(layout.positions).length||layout.height!==screen.height)dispatch({type:'REFLOW_TEXT',screenId:screen.id,expectedComponents:state.components,positions:layout.positions,height:layout.height});
    };
    measure();void document.fonts?.ready.then(measure);document.fonts?.addEventListener('loadingdone',measure);
    return()=>{cancelled=true;document.fonts?.removeEventListener('loadingdone',measure);};
  },[state.components,screen,state.productType,state.designSystem,state.tokens,viewportWidth,interactive,exporting,dispatch]);
  function render(c:DesignComponent,parentStyles?:DesignComponent['styles']):React.ReactNode {
    const s=system?resolveStyles(c.styles,system,viewportWidth):c.styles,p=c.position,selected=!exporting&&state.selectedComponentId===c.id;
    const parentLayout=parentStyles?.layout;
    const style:CSSProperties={position:parentLayout&&parentLayout!=='absolute'?'relative':'absolute',left:parentLayout&&parentLayout!=='absolute'?undefined:p?.x??0,top:parentLayout&&parentLayout!=='absolute'?undefined:p?.y??0,width:s.width==='fill'?'100%':s.width==='hug'?'max-content':p?.width??100,height:s.height==='fill'?'100%':s.height==='hug'?'auto':p?.height??40,background:s.background,color:s.color??state.tokens.text,borderRadius:s.radius,padding:`${s.paddingY??0}px ${s.paddingX??0}px`,margin:s.margin,fontFamily:SYSTEM_FONTS.includes(s.font??'')?s.font:`"${(s.font??'Inter').replace(/["\\]/g,'')}", ${fontMetadata(s.font??'Inter')?.fallback??'sans-serif'}`,fontSynthesis:'none',fontStyle:s.fontStyle,letterSpacing:s.letterSpacing,fontSize:s.fontSize??14,fontWeight:s.fontWeight,lineHeight:s.lineHeight,overflowWrap:'anywhere',opacity:s.opacity,textAlign:s.alignment,boxSizing:'border-box',border:s.border?`1px solid ${s.borderColor??state.tokens.border}`:undefined,outline:selected?'2px solid #7AA2FF':undefined,outlineOffset:2,whiteSpace:'pre-wrap',cursor:'pointer',boxShadow:SHADOWS[s.shadow??'none'],display:s.responsive?.hidden&&viewportWidth<=s.responsive.maxWidth?'none':s.layout==='flex'?'flex':s.layout==='grid'?'grid':undefined,flexDirection:s.direction,gap:s.gap,gridTemplateColumns:s.layout==='grid'?`repeat(${s.columns??1}, minmax(0,1fr))`:undefined,alignItems:s.alignItems,justifyContent:s.justifyContent,flexShrink:0,...flowSizing(s,parentStyles),...(s.dock==='bottom'?{top:undefined,bottom:0}:{} )};
    style.width??=p?.width??100;style.height??=p?.height??40;
    if(!parentLayout||parentLayout==='absolute'){
      const margin=s.margin??0;
      if(s.width==='fill')style.width=`calc(100% - ${(p?.x??0)+2*margin}px)`;
      else if(s.width!=='hug')style.width=Math.max(1,(p?.width??100)-2*margin);
      if(s.height==='fill')style.height=`calc(100% - ${(p?.y??0)+2*margin}px)`;
      else if(s.height!=='hug')style.height=Math.max(1,(p?.height??40)-2*margin);
    }
    const text=c.text?<span data-text-content={c.id} style={{display:'block',...(c.type==='Button'?{overflowWrap:'normal' as const,whiteSpace:'normal' as const}:{})}}>{c.text}</span>:null;
    let content:React.ReactNode;
    switch(c.type) {
      case 'Image': case 'Avatar': content=c.source?<img draggable={false} src={c.source} alt={c.text??c.name} style={{width:'100%',height:'100%',objectFit:s.imageFit??'cover',objectPosition:s.imagePosition??'center',display:'block',borderRadius:'inherit'}}/>:<div style={{height:'100%',display:'grid',placeItems:'center',background:s.background??state.tokens.surface}}>{c.text??(c.type==='Avatar'?'Avatar':'Image')}</div>;break;
      case 'Button': content=interactive&&c.targetComponentId?<a href={`#${encodeURIComponent(c.targetComponentId)}`} style={{display:'flex',alignItems:'center',justifyContent:'center',width:'100%',height:'100%',color:'inherit',font:'inherit',letterSpacing:'inherit',textAlign:'inherit',textDecoration:'none'}}>{text}</a>:<button type="button" tabIndex={interactive?0:-1} style={{width:'100%',height:'100%',color:'inherit',font:'inherit',letterSpacing:'inherit',textAlign:'inherit',borderRadius:'inherit',background:'transparent',border:0,padding:0,display:'flex',alignItems:'center',justifyContent:'center',cursor:interactive?'pointer':'inherit'}}>{text}</button>;break;
      case 'Search': case 'Input': content=<input className="generated-input" readOnly={!interactive} tabIndex={interactive?0:-1} aria-label={c.name} placeholder={c.text} style={{width:'100%',height:'100%',font:'inherit',letterSpacing:'inherit',textAlign:'inherit',color:'inherit',background:'transparent',border:0,pointerEvents:interactive?'auto':'none'}}/>;break;
      case 'Icon': content=<span style={{display:'grid',placeItems:'center',height:'100%'}}><DesignIcon name={c.icon??'compass'}/></span>;break;
      case 'Divider': content=<div style={{height:1,width:'100%',background:s.color??state.tokens.border}}/>;break;
      case 'Progress': content=<div style={{height:'100%',background:state.tokens.surface,borderRadius:'inherit',overflow:'hidden'}}><div style={{width:`${c.value??0}%`,height:'100%',background:s.color??state.tokens.accent}}/></div>;break;
      case 'Chart': content=<div style={{display:'flex',alignItems:'end',gap:s.gap??6,height:'100%'}}>{(c.values??[]).map((v,i)=><div key={i} style={{flex:1,height:`${v}%`,background:s.color??state.tokens.accent,borderRadius:s.radius??3}}/>)}</div>;break;
      default: content=text;
    }
    return <div key={c.id} style={style} data-component-id={c.id} title={c.name} onClick={e=>{
      if(exporting)return;
      if(interactive) {
        if(c.targetComponentId) {
          e.preventDefault();e.stopPropagation();
          const target=Array.from(surfaceRef.current?.querySelectorAll<HTMLElement>('[data-component-id]')??[]).find(el=>el.dataset.componentId===c.targetComponentId);
          const viewport=surfaceRef.current?.closest<HTMLElement>('[data-prototype-viewport]');
          if(target && viewport) {
            const scale=viewport.getBoundingClientRect().height/viewport.offsetHeight;
            viewport.scrollTo({top:viewport.scrollTop+(target.getBoundingClientRect().top-viewport.getBoundingClientRect().top)/(scale||1),behavior:'smooth'});
          }
          return;
        }
        if(c.targetScreenId) {e.stopPropagation();dispatch({type:'SELECT_SCREEN',id:c.targetScreenId});}
      } else {e.stopPropagation();dispatch({type:'SELECT_COMPONENT',id:c.id});}
    }}>{content}{c.children?.map(id=>state.components[id]?render(state.components[id],s):null)}</div>;
  }
  return <div ref={surfaceRef} data-generated-screen={screen.id} style={{position:'relative',flexShrink:0,...screenDimensions(screen,state.productType),width:interactive&&nodes.some(c=>c.styles.responsive)?viewportWidth:screenDimensions(screen,state.productType).width,background:screen.backgroundToken?system?.colors[screen.backgroundToken]:screen.background??state.tokens.background,overflow:'hidden'}}>{nodes.filter(c=>!children.has(c.id)).map(c=>render(c))}</div>;
}
