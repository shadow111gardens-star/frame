export type GenerationStage='analysis'|'planning'|'design-md'|'design-json'|'validation'|'render-review'|'repair'|'save'|'complete';
export function generationStage(stage:string):GenerationStage {
  if(stage.includes('repair'))return 'repair';
  if(stage==='specification')return 'design-md';
  if(stage==='analysis'||stage==='planning'||stage==='design-md')return stage;
  if(stage==='draft'||stage==='modification')return 'design-json';
  if(stage==='rendered-review')return 'render-review';
  return 'validation';
}
