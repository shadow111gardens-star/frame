/** Source-shape inspection, not a fallback Markdown extractor. */
export function contentFieldPaths(value:unknown):string[]{
  const paths:string[]=[];let visited=0;
  function inspect(v:unknown,p:string){if(++visited>10000||!v||typeof v!=='object')return;
    for(const [key,item] of Object.entries(v)){const next=p+'.'+key;if(/^(designmd|content|markdown)$/i.test(key))paths.push(next+':'+typeof item);inspect(item,next);}
  }
  inspect(value,'$');return paths;
}
export function safeBodySample(body:string){
  // Redact before bounding, so a long credential cannot leak at the cutoff.
  return body.replace(/\bBearer\s+\S+/gi,'Bearer [REDACTED]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[REDACTED JWT]')
    .replace(/("(?:access_token|refresh_token|api_key|apikey|password|authorization|secret|token)"\s*:\s*)"(?:\\.|[^"\\])*"/gi,'$1"[REDACTED]"').slice(0,512);
}
