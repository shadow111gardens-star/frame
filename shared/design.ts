import { z } from 'zod';
import { previewConfig } from './product';
import {designPolicy} from './designPolicy';

const number = z.number().finite().min(-10000).max(20000);
export const colorSchema = z.string().max(150).refine(v => !/url\s*\(|expression|[<>;]/i.test(v), 'Invalid color');
export const textStyleSchema=z.object({font:z.string().max(100),fontSize:z.number().min(1).max(300),fontWeight:z.union([z.literal(300),z.literal(400),z.literal(500),z.literal(600),z.literal(700),z.literal(800)]),lineHeight:z.number().min(0.5).max(5),letterSpacing:z.number().min(-20).max(100).optional(),fontStyle:z.enum(['normal','italic']).optional()}).strict();
export const textRoles=['display','heading','subheading','body','caption','button','label'] as const;
export const colorRoles=['background','surface','card','border','text','textMuted','accent','primary','secondary','success','warning','error'] as const;
const source = z.string().max(4000).refine(v => v === '' || /^https:\/\//.test(v) || /^data:image\/(png|jpeg|webp);base64,/.test(v), 'Use an HTTPS image');
export const componentSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(['Text','Button','Card','Image','Icon','Input','Search','Avatar','List','Navigation','Divider','Progress','Chart','Container','Stack','Group']),
  name: z.string().max(150),
  text: z.string().max(5000).optional(), source: source.optional(), icon: z.string().max(100).optional(),
  value: z.number().min(0).max(100).optional(), values: z.array(z.number().min(0).max(100)).max(30).optional(),
  children: z.array(z.string()).max(100).optional(),
  targetScreenId:z.string().max(100).optional(),
  targetComponentId:z.string().min(1).max(100).optional(),
  position: z.object({x:number,y:number,width:z.number().positive().max(4000),height:z.number().positive().max(20000)}),
  styles: z.object({
    background: colorSchema.optional(), color: colorSchema.optional(), radius: z.number().min(0).max(1000).optional(),
    paddingX: z.number().min(0).max(500).optional(), paddingY:z.number().min(0).max(500).optional(),
    margin:number.optional(),gap:z.number().min(0).max(500).optional(), font: z.string().max(100).optional(),
    fontSize:z.number().min(1).max(300).optional(), fontWeight:z.union([z.literal(300),z.literal(400),z.literal(500),z.literal(600),z.literal(700),z.literal(800)]).optional(),
    border:z.boolean().optional(), borderColor:colorSchema.optional(), opacity:z.number().min(0).max(1).optional(),
    alignment:z.enum(['left','center','right']).optional(),
    lineHeight:z.number().min(0.5).max(5).optional(), letterSpacing:z.number().min(-20).max(100).optional(),
    fontStyle:z.enum(['normal','italic']).optional(), shadow:z.enum(['none','subtle','medium','strong']).optional(),
    width:z.enum(['fixed','fill','hug']).optional(), height:z.enum(['fixed','fill','hug']).optional(),
    layout:z.enum(['absolute','flex','grid']).optional(), direction:z.enum(['row','column']).optional(),
    columns:z.number().int().min(1).max(12).optional(), alignItems:z.enum(['start','center','end','stretch']).optional(),
    justifyContent:z.enum(['start','center','end','space-between']).optional(),
    imageFit:z.enum(['cover','contain','fill']).optional(), imagePosition:z.enum(['center','top','bottom','left','right']).optional(),
    overflow:z.enum(['visible','hidden','auto']).optional(), dock:z.enum(['bottom']).optional(),
    backgroundToken:z.enum(colorRoles).optional(),
    colorToken:z.enum(colorRoles).optional(),
    borderColorToken:z.enum(colorRoles).optional(),
    fontToken:z.enum(['font','display','mono']).optional(),
    textStyleToken:z.enum(textRoles).optional(),
    paddingXToken:z.number().int().min(0).max(19).optional(),paddingYToken:z.number().int().min(0).max(19).optional(),
    gapToken:z.number().int().min(0).max(19).optional(),marginToken:z.number().int().min(0).max(19).optional(),radiusToken:z.number().int().min(0).max(19).optional(),
    responsive:z.object({maxWidth:z.number().min(100).max(4000),fontSize:z.number().min(1).max(300).optional(),columns:z.number().int().min(1).max(12).optional(),paddingX:z.number().min(0).max(500).optional(),paddingY:z.number().min(0).max(500).optional(),hidden:z.boolean().optional(),direction:z.enum(['row','column']).optional(),gap:z.number().min(0).max(500).optional(),alignItems:z.enum(['start','center','end','stretch']).optional(),justifyContent:z.enum(['start','center','end','space-between']).optional()}).strict().optional(),
  }).strict(),
}).strict();
export const appSchema = z.object({
  productType:z.enum(['website','mobile_app']),
  name:z.string().min(1).max(150),
  screens:z.array(z.object({id:z.string().min(1).max(100),name:z.string().min(1).max(150),width:z.number().min(100).max(4000),height:z.number().min(100).max(20000),background:colorSchema,backgroundToken:z.enum(colorRoles).optional(),components:z.array(componentSchema).max(300)})).min(1).max(designPolicy.validation.maxScreens),
  designSystem:z.object({colors:z.object({background:colorSchema,surface:colorSchema,card:colorSchema,border:colorSchema,text:colorSchema,textMuted:colorSchema,accent:colorSchema,primary:colorSchema.optional(),secondary:colorSchema.optional(),success:colorSchema.optional(),warning:colorSchema.optional(),error:colorSchema.optional()}),typography:z.object({font:z.string().max(100),display:z.string().max(100),mono:z.string().max(100)}),textStyles:z.object({display:textStyleSchema.optional(),heading:textStyleSchema.optional(),subheading:textStyleSchema.optional(),body:textStyleSchema.optional(),caption:textStyleSchema.optional(),button:textStyleSchema.optional(),label:textStyleSchema.optional()}).strict().optional(),spacing:z.array(z.number().min(0).max(500)).max(20),radii:z.array(z.number().min(0).max(500)).max(20)}),
});
export type DesignApp = z.infer<typeof appSchema>;
export function validateApp(input: unknown): DesignApp {
  const app = appSchema.parse(input);
  const ids = new Set<string>();
  for (const screen of app.screens) {
    const config=previewConfig(app.productType);
    if(screen.width<config.minWidth || screen.width>config.maxWidth) throw new Error('Screen width does not match product type');
    if(ids.has(screen.id)) throw new Error('Duplicate screen ID'); ids.add(screen.id);
    if(screen.backgroundToken&&app.designSystem.colors[screen.backgroundToken]===undefined)throw new Error('Missing color token');
    const nodes = new Map(screen.components.map(c => [c.id,c]));
    for (const c of screen.components) {
      for(const key of ['background','color','borderColor'] as const){const token=c.styles[`${key}Token`];if(token&&app.designSystem.colors[token]===undefined)throw new Error('Missing color token');}
      if(c.styles.textStyleToken&&!app.designSystem.textStyles?.[c.styles.textStyleToken])throw new Error('Missing text style token');
      if(!designPolicy.capabilities.components.includes(c.type))throw new Error('Unsupported component capability');
      if(c.type==='Icon'&&(!c.icon||!designPolicy.capabilities.icons.includes(c.icon)))throw new Error('Unsupported icon capability');
      for(const property of ['paddingX','paddingY','gap','margin','radius'] as const){const index=c.styles[`${property}Token`];if(index!==undefined && (property==='radius'?app.designSystem.radii:app.designSystem.spacing)[index]===undefined)throw new Error('Missing spacing or radius token');}
      if(ids.has(c.id)) throw new Error('Duplicate component ID'); ids.add(c.id);
      for(const id of c.children ?? []) if(!nodes.has(id)) throw new Error('Missing child component');
      if(c.targetScreenId && !app.screens.some(s=>s.id===c.targetScreenId)) throw new Error('Missing navigation target');
      if(c.targetComponentId && (app.productType!=='website' || !nodes.has(c.targetComponentId) || c.targetScreenId)) throw new Error('Invalid section anchor target');
    }
    const visited = new Set<string>(), visiting = new Set<string>(), parents = new Set<string>();
    const visit = (id:string) => {
      if(visiting.has(id)) throw new Error('Cyclic component tree');
      if(visited.has(id)) return;
      visiting.add(id);
      for(const child of nodes.get(id)?.children ?? []) { if(parents.has(child)) throw new Error('Multiple component parents'); parents.add(child); visit(child); }
      visiting.delete(id); visited.add(id);
    };
    for(const id of nodes.keys()) visit(id);
  }
  return app;
}
/** Generation may reuse fonts from an imported document, but must not invent unavailable families.
 * General document validation/export preserves externally supplied font sources and fallbacks. */
export function validateGeneratedFonts(app:DesignApp,current?:DesignApp){
  const fonts=(a:DesignApp)=>[...Object.values(a.designSystem.typography),...Object.values(a.designSystem.textStyles??{}).flatMap(s=>s?[s.font]:[]),...a.screens.flatMap(s=>s.components.flatMap(c=>c.styles.font?[c.styles.font]:[]))];
  const available=new Set([...designPolicy.capabilities.fonts,...(current?fonts(current):[])]);
  if(fonts(app).some(f=>!available.has(f)))throw new Error('Unsupported font capability');
}
export const responseSchema = z.object({message:z.string().max(2000),app:appSchema});
// Gemini supports a subset of JSON Schema. Keep strict limits in runtime validation.
function geminiSchema(value: unknown): unknown {
  if(Array.isArray(value)) return value.map(geminiSchema);
  if(!value || typeof value!=='object') return value;
  const obj=value as Record<string,unknown>;
  if(Array.isArray(obj.anyOf) && obj.anyOf.every(v=>typeof v.const==='number')) return {type:'integer',enum:obj.anyOf.map(v=>v.const)};
  return Object.fromEntries(Object.entries(obj).filter(([k])=>!['$schema','exclusiveMinimum','minLength','maxLength','additionalProperties','minItems','maxItems'].includes(k)).map(([k,v])=>[k,geminiSchema(v)]));
}
export const responseJsonSchema = geminiSchema(z.toJSONSchema(responseSchema));


