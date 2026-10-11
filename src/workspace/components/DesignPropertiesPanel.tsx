import {useEffect,useState} from 'react';
import {useWorkspace,workspaceToApp,getDevice} from '../store';
import {componentSchema,colorSchema} from '../../../shared/design';
import {previewConfig,screenDimensions} from '../../../shared/product';
import {COLOR_ROLES,FONT_CATALOG,SYSTEM_FONTS,fontMetadata,inspectDesign,resolveStyles,colorHex} from '../../design/designProperties';
import type {ComponentStyles} from '../types';

function Section({title,children}:{title:string;children:React.ReactNode}){return <section className="border-b border-white/[0.06] pb-4 space-y-2"><h3 className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-mono">{title}</h3>{children}</section>;}
function Field({label,children}:{label:string;children:React.ReactNode}){return <div className="flex items-center justify-between gap-2 text-[11px] text-white/55"><span>{label}</span><div className="w-[155px] min-w-0">{children}</div></div>;}
function NumberField({label,value,onChange,min=-10000,max=20000,step=1}:{label:string;value:number;onChange:(n:number)=>void;min?:number;max?:number;step?:number}){return <Field label={label}><input aria-label={label} type="number" className="ws-input w-full" min={min} max={max} step={step} value={value} onChange={e=>{if(e.target.value==='')return;const n=Number(e.target.value);if(Number.isFinite(n)&&n>=min&&n<=max)onChange(n);}}/></Field>;}
function Select({label,value,options,onChange,markUnknown=false}:{label:string;value:string;options:string[];onChange:(s:string)=>void;markUnknown?:boolean}){return <Field label={label}><select aria-label={label} className="ws-input w-full" value={value} onChange={e=>onChange(e.target.value)}>{[...new Set([value,...options])].map(v=><option key={v} value={v}>{v}{markUnknown&&!options.includes(v)?' (used; not available)':''}</option>)}</select></Field>;}
function SourceEditor({value,onChange}:{value:string;onChange:(value:string)=>void}){const [draft,setDraft]=useState(value);useEffect(()=>setDraft(value),[value]);const valid=componentSchema.shape.source.safeParse(draft).success;return <><Field label="source"><input aria-label="source" className="ws-input w-full" value={draft} maxLength={4000} onChange={e=>{setDraft(e.target.value);if(componentSchema.shape.source.safeParse(e.target.value).success)onChange(e.target.value);}}/></Field>{!valid&&<p className="text-[10px] text-amber-300">Enter an HTTPS image URL. The current image is kept until the URL is valid.</p>}</>;}
export function ColorEditor({label,value,onChange,allowGradient=false,allowNone=false}:{label:string;value:string;onChange:(s:string)=>void;allowGradient?:boolean;allowNone?:boolean}){
  const [draft,setDraft]=useState(value),[error,setError]=useState('');useEffect(()=>{setDraft(value);setError('');},[value]);
  const commit=(v:string)=>{setDraft(v);const probe=document.createElement('span').style;if(allowGradient)probe.background=v;else probe.color=v;const valid=colorSchema.safeParse(v).success&&(allowNone&&v==='none'||(typeof CSS!=='undefined'?CSS.supports(allowGradient?'background':'color',v):!!(allowGradient?probe.background:probe.color)));if(valid){setError('');onChange(v);}else setError(allowGradient?'Enter a valid CSS color or gradient.':'Enter a valid CSS color.');};
  // Native picker edits RGB only; the text field preserves alpha/gradients exactly.
  const normalized=colorHex(value);const hex=normalized?.slice(0,7)??null;
  return <div className="space-y-1"><Field label={label}><div className="flex gap-1 items-center"><label className="relative h-6 w-6 shrink-0 rounded border border-white/20 cursor-pointer" style={{background:value}} title={hex?'Edit RGB; alpha is preserved':'Use the text field for gradients or CSS colors'}>{hex&&<input aria-label={`${label} picker`} type="color" value={hex} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onChange={e=>commit(e.target.value+(normalized?.length===9?normalized.slice(7):''))}/>}</label><input aria-label={label} className="ws-input w-full text-[10px]" value={draft} onChange={e=>commit(e.target.value)}/></div></Field>{colorHex(value)&&<p className="text-[9px] text-white/40 font-mono text-right">{colorHex(value)}</p>}{error&&<p role="alert" className="text-[10px] text-amber-300">{error}</p>}</div>;
}
function FontPicker({label,value,onChange}:{label:string;value:string;onChange:(s:string)=>void}){return <Select label={label} value={value} options={[...FONT_CATALOG.map(f=>f.family),...SYSTEM_FONTS]} onChange={onChange}/>;}
function FontStatus({family,weight=400,italic=false}:{family:string;weight?:number;italic?:boolean}){
  const [status,setStatus]=useState('Checking font…');
  useEffect(()=>{let alive=true;const metadata=fontMetadata(family);if(!metadata){setStatus(SYSTEM_FONTS.includes(family)?'System font: variants depend on your device.':'Font is not in FRAME’s font source. A system fallback is used.');return;}
    if(!metadata.weights.includes(weight)||(italic&&!metadata.italic)){setStatus('This variant is not available; browser synthesis is disabled.');return;}
    if(!document.fonts){setStatus('Font loading status is unavailable.');return;}
    setStatus('Loading font…');document.fonts.load(`${italic?'italic':'normal'} ${weight} 16px "${family}"`).then(faces=>{if(alive)setStatus(faces.length?'Font loaded.':'Font could not load. System fallback is active.');},()=>{if(alive)setStatus('Font could not load. System fallback is active.');});return()=>{alive=false;};
  },[family,weight,italic]);
  return <p className="text-[10px] text-white/40" role="status">{status}</p>;
}
export function DesignPropertiesPanel(){
  const {state,dispatch}=useWorkspace();const page=state.screens.find(s=>s.id===state.currentScreen);
  const [viewportWidth,setViewportWidth]=useState(screenDimensions(page??{},state.productType).width);
  useEffect(()=>{
    const viewport=document.querySelector<HTMLElement>('[data-prototype-viewport]');
    const measure=()=>setViewportWidth(state.centerTab==='prototype'?(state.productType==='mobile_app'?getDevice(state.device).width:viewport?.clientWidth||getDevice(state.device).width):screenDimensions(page??{},state.productType).width);
    measure();if(!viewport)return;const observer=new ResizeObserver(measure);observer.observe(viewport);return()=>observer.disconnect();
  },[state.centerTab,state.device,state.currentScreen,page?.width,state.productType]);
  if(!state.designSystem||!page)return <div className="p-4 text-[12px] text-white/35">Select a generated screen or component to edit its properties.</div>;
  const app=workspaceToApp(state),system=app.designSystem,inventory=inspectDesign(app,{[page.id]:viewportWidth});
  const c=state.selectedComponentId?state.components[state.selectedComponentId]:undefined;
  const s=c?resolveStyles(c.styles,system,viewportWidth):undefined;
  const breakpointActive=!!c?.styles.responsive&&viewportWidth<=c.styles.responsive.maxWidth;
  const update=(styles:Partial<ComponentStyles>)=>{
    if(c&&breakpointActive&&!('responsive' in styles)){
      const overrides={...c.styles.responsive!};let changed=false;
      for(const key of ['fontSize','paddingX','paddingY','columns'] as const)if(styles[key]!==undefined){overrides[key]=styles[key];delete styles[key];changed=true;}
      if(changed)styles.responsive=overrides;
    }
    if(c&&componentSchema.shape.styles.safeParse({...c.styles,...styles}).success)dispatch({type:'UPDATE_COMPONENT_STYLES',id:c.id,styles});
  };
  const setSystem=(partial:Partial<typeof system>)=>dispatch({type:'UPDATE_DESIGN_SYSTEM',designSystem:{...system,...partial}});
  const dimensions=screenDimensions(page,state.productType);
  const textBearing=c&&(c.text!==undefined||['Text','Button','Input','Search','Navigation','Icon'].includes(c.type));
  return <div className="p-4 space-y-4 text-white/80">
    <Section title={c?'Selected component':'Screen'}>
      <Field label="Name"><input aria-label={c?'Component name':'Screen name'} className="ws-input w-full" value={c?.name??page.label} onChange={e=>c?dispatch({type:'UPDATE_COMPONENT_NAME',id:c.id,name:e.target.value}):dispatch({type:'UPDATE_SCREEN_DATA',id:page.id,data:{label:e.target.value,name:e.target.value}})}/></Field>
      <p className="text-[10px] text-white/40">{c?c.type:previewConfig(state.productType).label} · {c?.id??page.id}</p>
      {breakpointActive&&<p className="text-[10px] text-white/40">Active breakpoint: {viewportWidth}px. Size, padding and columns edits update this override.</p>}
      {c?<>
        {['x','y','width','height'].map(key=><NumberField key={key} label={`Component ${key}`} value={c.position?.[key as 'x']??0} min={key==='width'||key==='height'?1:-10000} max={key==='width'?4000:20000} onChange={n=>dispatch({type:'UPDATE_COMPONENT_POSITION',id:c.id,position:{x:0,y:0,...c.position,[key]:n}})}/>)}
        {(['text','source','icon'] as const).filter(key=>key==='text'?textBearing:key==='source'?['Image','Avatar'].includes(c.type):c.type==='Icon').map(key=>key==='source'?<SourceEditor key={key} value={c.source??''} onChange={source=>dispatch({type:'UPDATE_COMPONENT_DATA',id:c.id,data:{source}})}/>:<Field key={key} label={key}><input maxLength={key==='text'?5000:100} aria-label={key} className="ws-input w-full" value={c[key]??''} onChange={e=>{dispatch({type:'UPDATE_COMPONENT_DATA',id:c.id,data:{[key]:e.target.value}});}}/></Field>)}
        {['Chart','Progress'].includes(c.type)&&<Field label="Values"><input aria-label="Values" className="ws-input w-full" value={c.type==='Chart'?c.values?.join(',')??'':c.value??0} onChange={e=>{const values=e.target.value.split(',').map(Number);if(values.length<=30&&values.every(n=>n>=0&&n<=100))dispatch({type:'UPDATE_COMPONENT_DATA',id:c.id,data:c.type==='Chart'?{values}:{value:values[0]}});}}/></Field>}
        <Select label="Navigate to screen" value={c.targetScreenId??'None'} options={['None',...state.screens.map(p=>p.id)]} onChange={id=>dispatch({type:'UPDATE_COMPONENT_DATA',id:c.id,data:{targetScreenId:id==='None'?undefined:id,targetComponentId:undefined}})}/>
        {state.productType==='website'&&<Select label="Section anchor" value={c.targetComponentId??'None'} options={['None',...page.components.filter(id=>id!==c.id)]} onChange={id=>dispatch({type:'UPDATE_COMPONENT_DATA',id:c.id,data:{targetComponentId:id==='None'?undefined:id,targetScreenId:undefined}})}/>}
      </>:<>
        <NumberField label="Screen width" value={dimensions.width} min={previewConfig(state.productType).minWidth} max={previewConfig(state.productType).maxWidth} onChange={width=>dispatch({type:'UPDATE_SCREEN_DATA',id:page.id,data:{width}})}/>
        <NumberField label="Screen height" value={dimensions.height} min={100} max={20000} onChange={height=>dispatch({type:'UPDATE_SCREEN_DATA',id:page.id,data:{height}})}/>
        <ColorEditor allowGradient label="Screen background" value={(page.backgroundToken?system.colors[page.backgroundToken]:page.background)??system.colors.background} onChange={background=>dispatch({type:'UPDATE_SCREEN_DATA',id:page.id,data:{background,backgroundToken:undefined}})}/>
        <Select label="Screen background link" value={page.backgroundToken??'Local'} options={['Local',...COLOR_ROLES.filter(role=>system.colors[role]!==undefined)]} onChange={v=>dispatch({type:'UPDATE_SCREEN_DATA',id:page.id,data:{backgroundToken:v==='Local'?undefined:v as 'background',background:v==='Local'&&page.backgroundToken?system.colors[page.backgroundToken]:page.background}})}/>
      </>}
    </Section>
    {c&&s&&<>
      {textBearing&&<Section title="Typography">
        <Select label="Text style" value={c.styles.textStyleToken??'Local'} options={['Local',...Object.keys(system.textStyles??{})]} onChange={value=>update(value==='Local'?{...s,textStyleToken:undefined}:{textStyleToken:value as 'body',font:undefined,fontToken:undefined,fontSize:undefined,fontWeight:undefined,lineHeight:undefined,letterSpacing:undefined,fontStyle:undefined})}/>
        <FontPicker label="Font family" value={s.font!} onChange={font=>{const meta=fontMetadata(font);update({font,fontToken:undefined,fontWeight:meta&&!meta.weights.includes(s.fontWeight!)?400:s.fontWeight,fontStyle:meta&&!meta.italic?'normal':s.fontStyle});}}/>
        <Select label="Font role" value={c.styles.fontToken??'Local'} options={['Local','font','display','mono']} onChange={value=>update({fontToken:value==='Local'?undefined:value as 'font',font:value==='Local'?s.font:c.styles.font})}/>
        <Select markUnknown label="Font weight" value={String(s.fontWeight)} options={(fontMetadata(s.font!)?.weights??[400]).map(String)} onChange={v=>update({fontWeight:Number(v) as 400})}/>
        <Select markUnknown label="Font variant" value={s.fontStyle??'normal'} options={fontMetadata(s.font!)?.italic?['normal','italic']:['normal']} onChange={v=>update({fontStyle:v as 'normal'})}/>
        <FontStatus family={s.font!} weight={s.fontWeight} italic={s.fontStyle==='italic'}/>
        <NumberField label="Font size" value={s.fontSize!} min={1} max={300} onChange={fontSize=>update({fontSize})}/>
        <NumberField label="Line height" value={s.lineHeight!} min={0.5} max={5} step={0.05} onChange={lineHeight=>update({lineHeight})}/>
        <NumberField label="Letter spacing" value={s.letterSpacing??0} min={-20} max={100} step={0.1} onChange={letterSpacing=>update({letterSpacing})}/>
        <Select label="Alignment" value={s.alignment??'left'} options={['left','center','right']} onChange={alignment=>update({alignment:alignment as 'left'})}/>
        <p className="text-[10px] text-white/40">Line height is a multiplier; letter spacing is in px.</p>
      </Section>}
      <Section title="Component colors">
        {(['background','color','borderColor'] as const).map(key=><div key={key} className="space-y-1">
          <ColorEditor allowGradient={key==='background'} label={key==='color'?'Text / fill color':key} value={s[key]??(key==='background'?'transparent':key==='color'?system.colors.text:system.colors.border)} onChange={value=>update({[key]:value,[`${key}Token`]:undefined})}/>
          <Select label={`${key} link`} value={c.styles[`${key}Token`]??'Local'} options={['Local',...COLOR_ROLES.filter(role=>system.colors[role]!==undefined)]} onChange={v=>update({[`${key}Token`]:v==='Local'?undefined:v,[key]:v==='Local'?s[key]:c.styles[key]})}/>
        </div>)}
        <NumberField label="Opacity" value={s.opacity??1} min={0} max={1} step={0.05} onChange={opacity=>update({opacity})}/>
        <Field label="Border"><input aria-label="Border" type="checkbox" checked={!!s.border} onChange={e=>update({border:e.target.checked})}/></Field>
        <Select label="Shadow" value={s.shadow??'none'} options={['none','subtle','medium','strong']} onChange={shadow=>update({shadow:shadow as 'none'})}/>
      </Section>
      <Section title="Layout & spacing">
        <Select label="Width mode" value={s.width??'fixed'} options={['fixed','fill','hug']} onChange={width=>update({width:width as 'fixed'})}/>
        <Select label="Height mode" value={s.height??'fixed'} options={['fixed','fill','hug']} onChange={height=>update({height:height as 'fixed'})}/>
        {(['paddingX','paddingY','margin','gap','radius'] as const).map(key=><NumberField key={key} label={key} value={s[key]??0} min={key==='margin'?-10000:0} max={key==='radius'?1000:key==='margin'?20000:500} onChange={value=>update({[key]:value,[`${key}Token`]:undefined})}/>)}
        {(['paddingX','paddingY','margin','gap','radius'] as const).map(key=><Select key={`${key}Token`} label={`${key} token`} value={c.styles[`${key}Token`]===undefined?'Local':String(c.styles[`${key}Token`])} options={['Local',...(key==='radius'?system.radii:system.spacing).map((_,i)=>String(i))]} onChange={v=>update({[`${key}Token`]:v==='Local'?undefined:Number(v),[key]:v==='Local'?s[key]:c.styles[key]})}/>)}
        {['Image','Avatar'].includes(c.type)&&<><Select label="Image fit" value={s.imageFit??'cover'} options={['cover','contain','fill']} onChange={imageFit=>update({imageFit:imageFit as 'cover'})}/><Select label="Image position" value={s.imagePosition??'center'} options={['center','top','bottom','left','right']} onChange={imagePosition=>update({imagePosition:imagePosition as 'center'})}/></>}
        <Select label="Overflow" value={s.overflow??'visible'} options={['visible','hidden','auto']} onChange={overflow=>update({overflow:overflow as 'visible'})}/>
        {c.type==='Navigation'&&<Select label="Dock" value={s.dock??'None'} options={['None','bottom']} onChange={dock=>update({dock:dock==='None'?undefined:'bottom'})}/>}
        {!!c.children?.length&&<>
          <Select label="Child layout" value={s.layout??'absolute'} options={['absolute','flex','grid']} onChange={layout=>update({layout:layout as 'absolute'})}/>
          {s.layout==='flex'&&<Select label="Direction" value={s.direction??'row'} options={['row','column']} onChange={direction=>update({direction:direction as 'row'})}/>}
          {s.layout==='grid'&&<NumberField label="Columns" value={s.columns??1} min={1} max={12} onChange={columns=>update({columns})}/>}
          {s.layout&&s.layout!=='absolute'&&<><Select label="Align children" value={s.alignItems??'stretch'} options={['start','center','end','stretch']} onChange={alignItems=>update({alignItems:alignItems as 'start'})}/><Select label="Distribute children" value={s.justifyContent??'start'} options={['start','center','end','space-between']} onChange={justifyContent=>update({justifyContent:justifyContent as 'start'})}/></>}
        </>}
        <p className="text-[10px] text-white/40">Positions are parent-local px. In flex/grid, child x/y are retained for returning to absolute layout.</p>
      </Section>
      <Section title="Responsive override">
        <Field label="Enable breakpoint"><input aria-label="Enable breakpoint" type="checkbox" checked={!!s.responsive} onChange={e=>update({responsive:e.target.checked?{maxWidth:768}:undefined})}/></Field>
        {s.responsive&&<>
          <NumberField label="Max viewport width" value={s.responsive.maxWidth} min={100} max={4000} onChange={maxWidth=>update({responsive:{...s.responsive!,maxWidth}})}/>
          {(['fontSize','paddingX','paddingY','columns'] as const).map(key=><NumberField key={key} label={`Responsive ${key}`} value={s.responsive![key]??s[key]??(key==='columns'?1:0)} min={key==='fontSize'||key==='columns'?1:0} max={key==='columns'?12:key==='fontSize'?300:500} onChange={n=>update({responsive:{...s.responsive!,[key]:n}})}/>)}
          <NumberField label="Responsive gap" value={s.responsive.gap??s.gap??0} min={0} max={500} onChange={gap=>update({responsive:{...s.responsive!,gap}})}/>
          <Select label="Responsive direction" value={s.responsive.direction??s.direction??'row'} options={['row','column']} onChange={direction=>update({responsive:{...s.responsive!,direction:direction as 'row'}})}/>
          <Select label="Responsive alignment" value={s.responsive.alignItems??s.alignItems??'stretch'} options={['start','center','end','stretch']} onChange={alignItems=>update({responsive:{...s.responsive!,alignItems:alignItems as 'start'}})}/>
          <Select label="Responsive distribution" value={s.responsive.justifyContent??s.justifyContent??'start'} options={['start','center','end','space-between']} onChange={justifyContent=>update({responsive:{...s.responsive!,justifyContent:justifyContent as 'start'}})}/>
          <Field label="Hide at breakpoint"><input aria-label="Hide at breakpoint" type="checkbox" checked={!!s.responsive.hidden} onChange={e=>update({responsive:{...s.responsive!,hidden:e.target.checked}})}/></Field>
        </>}
      </Section>
      <button className="ws-input w-full" onClick={()=>dispatch({type:'DELETE_COMPONENT',componentId:c.id,screenId:page.id})}>Remove component</button>
    </>}
    <Section title="Design font pairing">
      {(['font','display','mono'] as const).map(role=><div key={role}><FontPicker label={`${role} family`} value={system.typography[role]} onChange={family=>setSystem({typography:{...system.typography,[role]:family}})}/><FontStatus family={system.typography[role]}/></div>)}
      <p className="text-[10px] text-white/40">Role edits update linked elements and the inherited body font. Explicit local fonts stay local.</p>
    </Section>
    {system.textStyles&&<Section title="Shared text styles">
      {Object.entries(system.textStyles).map(([role,style])=>style&&<div key={role} className="space-y-2 border border-white/10 rounded p-2">
        <p className="text-[11px]">{role}</p>
        <FontPicker label={`${role} font`} value={style.font} onChange={font=>setSystem({textStyles:{...system.textStyles,[role]:{...style,font,fontWeight:fontMetadata(font)?.weights.includes(style.fontWeight)?style.fontWeight:400}}})}/>
        <Select label={`${role} weight`} value={String(style.fontWeight)} options={(fontMetadata(style.font)?.weights??[400]).map(String)} onChange={fontWeight=>setSystem({textStyles:{...system.textStyles,[role]:{...style,fontWeight:Number(fontWeight) as 400}}})}/>
        <NumberField label={`${role} size`} value={style.fontSize} min={1} max={300} onChange={fontSize=>setSystem({textStyles:{...system.textStyles,[role]:{...style,fontSize}}})}/>
        <NumberField label={`${role} line height`} value={style.lineHeight} min={0.5} max={5} step={0.05} onChange={lineHeight=>setSystem({textStyles:{...system.textStyles,[role]:{...style,lineHeight}}})}/>
        <NumberField label={`${role} tracking`} value={style.letterSpacing??0} min={-20} max={100} step={0.1} onChange={letterSpacing=>setSystem({textStyles:{...system.textStyles,[role]:{...style,letterSpacing}}})}/>
        <Select label={`${role} variant`} value={style.fontStyle??'normal'} options={fontMetadata(style.font)?.italic?['normal','italic']:['normal']} onChange={fontStyle=>setSystem({textStyles:{...system.textStyles,[role]:{...style,fontStyle:fontStyle as 'normal'}}})}/>
      </div>)}
      <p className="text-[10px] text-white/40">Shared edits affect linked text. Explicit element overrides remain local.</p>
    </Section>}
    <Section title="Used typography">
      {inventory.fonts.map(f=><div key={f.family} className="space-y-1 text-[10px] border border-white/10 rounded p-2"><FontPicker label={`${f.family} (${f.uses} uses)`} value={f.family} onChange={to=>dispatch({type:'REPLACE_FONT',from:f.family,to})}/><p>Used weights: {[...f.weights].join(', ')} · {[...f.variants].join(', ')}</p><p>Sizes: {[...f.sizes].join(', ')} px · Leading: {[...f.lineHeights].join(', ')} · Tracking: {[...f.letterSpacing].join(', ')} px</p><p className="text-white/40">Available weights: {fontMetadata(f.family)?.weights.join(', ')??'Platform-dependent / unverified'}. Family edit replaces all matching uses.</p></div>)}
    </Section>
    <Section title="Text & heading styles">
      {inventory.textStyles.map(style=><div key={style.description} className="text-[10px] space-y-1"><p>{style.name} · {style.uses} uses</p><p className="text-white/40">{style.description}</p></div>)}
      <p className="text-[10px] text-white/40">Labels marked inferred describe the size hierarchy, not stored semantic HTML roles. Select an element to edit its style.</p>
    </Section>
    <Section title="Shared color tokens">
      {COLOR_ROLES.filter(role=>system.colors[role]!==undefined).map(role=><div key={role} className="space-y-1"><ColorEditor allowGradient={['background','surface','card','accent'].includes(role)} label={`Token ${role}`} value={system.colors[role]!} onChange={value=>dispatch({type:'UPDATE_TOKEN',key:role,value})}/><button className="text-[10px] text-white/50 underline" onClick={()=>dispatch({type:'LINK_COLOR_TOKEN',key:role})}>Link matching uses to {role}</button></div>)}
      <p className="text-[10px] text-white/40">Token edits update linked elements. Link matching literal colors explicitly; a local color edit detaches its link.</p>
    </Section>
    <Section title="Actual colors across screens">
      {inventory.colors.map((color,index)=><div key={index} className="space-y-1"><ColorEditor allowGradient label={`${color.uses} uses`} value={color.value} onChange={to=>dispatch({type:'REPLACE_COLOR',from:color.value,to})}/><p className="text-[10px] text-white/40">{[...color.roles].join(', ')} · Edit replaces all matching values across screens.</p></div>)}
    </Section>
    <Section title="Spacing & radius scales">
      {(['spacing','radii'] as const).map(key=><Field key={key} label={`Declared ${key}`}><input aria-label={`Declared ${key}`} className="ws-input w-full" defaultValue={system[key].join(', ')} key={system[key].join(',')} onBlur={e=>{const values=e.target.value.trim()?e.target.value.split(',').map(Number):[];if(values.length<=20&&values.every(n=>Number.isFinite(n)&&n>=0&&n<=500))setSystem({[key]:values});else e.target.value=system[key].join(', ');}}/></Field>)}
      <p className="text-[10px] text-white/40">Used spacing: {inventory.spacing.join(', ')} px<br/>Used radii: {inventory.radii.join(', ')} px<br/>Used shadows: {inventory.shadows.join(', ')||'none'}</p>
      <p className="text-[10px] text-white/40">Scale edits update linked spacing/radius properties. Local values stay local. Referenced entries cannot be removed.</p>
    </Section>
  </div>;
}
