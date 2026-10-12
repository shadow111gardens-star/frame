import {z} from 'zod';

export const designMdSections = [
  'Overview and Visual Theme','Audience and Product Context','Color Palette and Semantic Roles',
  'Typography Rules and Hierarchy','Spacing and Layout System','Shapes, Borders, and Elevation',
  'Component Styling and States','Screen-Specific Layout Principles','Navigation and Interaction Rules',
  'Responsive Behavior','Accessibility Guidance',"Do's and Don'ts",'Known Gaps and Assumptions',
] as const;
export const generationArtifactSchema=z.object({
  version:z.literal(1), generationRunId:z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  idempotencyKey:z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),originalPrompt:z.string().max(20000),
  designMd:z.string().min(100).max(100000),designMdHash:z.string().regex(/^[a-f0-9]{64}$/),
  status:z.enum(['complete','partial']),warnings:z.array(z.string().max(1000)).max(100),
  validationSummary:z.object({schema:z.literal('valid'),screens:z.literal('valid'),navigation:z.literal('valid'),
    tokens:z.literal('valid'),render:z.enum(['pending','measured']),measuredScreenIds:z.array(z.string()).max(20)}),
  approvedPlan:z.unknown().optional(),
  attemptCounts:z.record(z.string(),z.number().int().min(0).max(3)),
});
export type GenerationArtifact=z.infer<typeof generationArtifactSchema>;
/** Portable deterministic ordering; array order and conflicting literal values remain significant. */
export function canonicalJson(value:unknown):string {
  if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonicalJson(v)).join(',')+'}';
  return JSON.stringify(value);
}
