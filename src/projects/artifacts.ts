import {generationArtifactSchema,type GenerationArtifact} from '../../shared/generationArtifact';
import {ProjectDataError} from './types';

export async function sha256(content:string){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(content));
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function verifyArtifact(artifact:GenerationArtifact){
  generationArtifactSchema.parse(artifact);
  if(await sha256(artifact.designMd)!==artifact.designMdHash)throw new ProjectDataError('The saved DESIGN.md checksum does not match. Your current design is preserved.');
}
export interface GenerationRunStart {projectId:string;generationRunId:string;idempotencyKey:string;originalPrompt:string}
