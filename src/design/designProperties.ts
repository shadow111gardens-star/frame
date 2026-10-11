import type {DesignApp} from '../../shared/design';
import {colorRoles} from '../../shared/design';
import {textLineHeight} from '../../shared/typography';
type Styles=DesignApp['screens'][number]['components'][number]['styles'];
export const COLOR_ROLES=colorRoles;
// Google Fonts METADATA.pb (Inter, Instrument Serif, JetBrains Mono), checked 2026-10-09.
// Only variants requested by index.html are offered. System families are platform-dependent.
export const FONT_CATALOG=[
  {family:'Inter',weights:[300,400,500,600,700,800],italic:true,fallback:'sans-serif'},
  {family:'Instrument Serif',weights:[400],italic:true,fallback:'serif'},
  {family:'JetBrains Mono',weights:[300,400,500,600,700,800],italic:true,fallback:'monospace'},
];
export const SYSTEM_FONTS=['system-ui','sans-serif','serif','monospace','Arial','Georgia','Verdana','Tahoma','Trebuchet MS','Courier New'];
export function fontMetadata(family:string){return FONT_CATALOG.find(f=>f.family===family);}
export function resolveStyles(styles:Styles,system:DesignApp['designSystem'],viewportWidth?:number):Styles {
  const s={...(styles.textStyleToken?system.textStyles?.[styles.textStyleToken]:undefined),...styles};
  for(const key of ['background','color','borderColor'] as const){const token=s[`${key}Token`];if(token)s[key]=system.colors[token];}
  if(s.fontToken)s.font=system.typography[s.fontToken];
  for(const key of ['paddingX','paddingY','gap','margin','radius'] as const){const index=s[`${key}Token`];if(index!==undefined)s[key]=(key==='radius'?system.radii:system.spacing)[index]??s[key];}
  s.font??=system.typography.font;s.fontSize??=14;s.fontWeight??=400;s.lineHeight??=textLineHeight(s.fontSize);
  if(s.responsive && viewportWidth!==undefined && viewportWidth<=s.responsive.maxWidth) {
    const {maxWidth,hidden,...overrides}=s.responsive;Object.assign(s,overrides);
    if(styles.lineHeight===undefined)s.lineHeight=textLineHeight(s.fontSize!);
  }
  return s;
}
export function inspectDesign(app:DesignApp,viewportWidths:Record<string,number>={}) {
  const colors=new Map<string,{value:string;roles:Set<string>;uses:number}>();
  const fonts=new Map<string,{family:string;weights:Set<number>;variants:Set<string>;sizes:Set<number>;lineHeights:Set<number>;letterSpacing:Set<number>;uses:number}>();
  const spacing=new Set(app.designSystem.spacing),radii=new Set(app.designSystem.radii),shadows=new Set<string>();
  const textStyles=new Map<string,{name:string;description:string;uses:number}>();
  const addColor=(value:string|undefined,role:string,used=true)=>{if(!value)return;const c=colors.get(value)??{value,roles:new Set<string>(),uses:0};c.roles.add(role);if(used)c.uses++;colors.set(value,c);};
  for(const [role,value] of Object.entries(app.designSystem.colors))addColor(value,role,false);
  for(const screen of app.screens){addColor(screen.backgroundToken?app.designSystem.colors[screen.backgroundToken]:screen.background,'screen background');for(const c of screen.components){
    const s=resolveStyles(c.styles,app.designSystem,viewportWidths[screen.id]??screen.width);
    addColor(s.background,`${c.type} background`);addColor(s.color??app.designSystem.colors.text,`${c.type} text`);
    const semantic=c.name.match(/\b(primary|secondary|accent|muted)\b/i)?.[0]?.toLowerCase();if(semantic)addColor(s.background??s.color,semantic,false);
    if(s.border)addColor(s.borderColor??app.designSystem.colors.border,'component border');
    if(['Chart','Progress'].includes(c.type))addColor(s.color??app.designSystem.colors.accent,`${c.type} fill`);
    if(c.text||['Input','Search','Icon'].includes(c.type)){
      const f=fonts.get(s.font!)??{family:s.font!,weights:new Set<number>(),variants:new Set<string>(),sizes:new Set<number>(),lineHeights:new Set<number>(),letterSpacing:new Set<number>(),uses:0};
      f.weights.add(s.fontWeight!);f.variants.add(s.fontStyle??'normal');f.sizes.add(s.fontSize!);f.lineHeights.add(s.lineHeight!);f.letterSpacing.add(s.letterSpacing??0);f.uses++;fonts.set(f.family,f);
      const description=`${s.font}, ${s.fontSize}px / ${s.lineHeight}, ${s.fontWeight} ${s.fontStyle??'normal'}, tracking ${s.letterSpacing??0}px`;
      const name=s.fontToken==='display'?'Display':c.type==='Button'?'Button':s.fontSize!>=32?'Heading (inferred)':s.fontSize!>=20?'Subheading (inferred)':'Body / label (inferred)';
      const entry=textStyles.get(description)??{name,description,uses:0};entry.uses++;textStyles.set(description,entry);
    }
    for(const key of ['paddingX','paddingY','gap','margin'] as const)if(s[key]!==undefined)spacing.add(s[key]!);
    if(s.radius!==undefined)radii.add(s.radius);if(s.shadow)shadows.add(s.shadow);
    if(s.responsive){if(s.responsive.fontSize)fonts.get(s.font!)?.sizes.add(s.responsive.fontSize);for(const n of [s.responsive.paddingX,s.responsive.paddingY])if(n!==undefined)spacing.add(n);}
  }}
  return {colors:[...colors.values()],fonts:[...fonts.values()],textStyles:[...textStyles.values()],spacing:[...spacing].sort((a,b)=>a-b),radii:[...radii].sort((a,b)=>a-b),shadows:[...shadows]};
}
export const SHADOWS={none:'none',subtle:'0 2px 8px #00000026',medium:'0 8px 24px #00000040',strong:'0 16px 48px #00000066'};
export function colorHex(value:string):string|undefined {
  if(/^#[\da-f]{6}([\da-f]{2})?$/i.test(value))return value.toUpperCase();
  if(/^#[\da-f]{3,4}$/i.test(value))return '#'+[...value.slice(1)].map(c=>c+c).join('').toUpperCase();
  const rgba=value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if(rgba){const numbers=rgba.slice(1,4).map(Number);if(numbers.some(n=>n>255))return;const alpha=rgba[4]===undefined?undefined:Number(rgba[4]);if(alpha!==undefined&&(alpha<0||alpha>1))return;return '#'+[...numbers,...(alpha===undefined?[]:[Math.round(alpha*255)])].map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();}
}
