import {createHash} from 'node:crypto';
import {referenceIndexSchema} from '../shared/designReference';
import {canonical,IMPORTER,type CatalogSource,type WritePlan} from './designmdFirestoreCatalog';
export const INDEX_COLLECTION='designReferenceCatalogIndex';
export function indexPlan(source:CatalogSource):WritePlan{
  const data=referenceIndexSchema.parse({slug:source.slug,title:source.record.title,category:source.record.category,keywords:source.record.keywords,summary:(source.record.description??'').slice(0,600),availableTokenSections:Object.keys(source.record.designTokens??{}),sourceUrl:source.record.source.sourceUrl,contentHash:source.record.source.sha256});
  const base={...data,catalogImporter:IMPORTER,schemaVersion:1,summarySource:source.record.description?'source-description-excerpt':null};
  return {slug:source.slug,path:INDEX_COLLECTION+'/'+source.slug,record:{...base,sourceFingerprint:createHash('sha256').update(canonical(base)).digest('hex')},chunks:[]};
}
