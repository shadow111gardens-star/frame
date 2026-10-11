import {zip} from 'fflate';
export type ImageFormat='png'|'jpeg';
export type ExportScope='current'|'all';
export const EXPORT_LIMITS={pixels:40_000_000,dimension:20000,assetBytes:15_000_000,archiveBytes:150_000_000};
export function safeFilename(name:string){const result=name.normalize('NFKC').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').replace(/\s+/g,'-').replace(/[^\p{L}\p{M}\p{N}._-]/gu,'-').replace(/[-.]+$/,'').replace(/^[-.]+/,'').replace(/-+/g,'-').slice(0,100)||'screen';return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(result)?`screen-${result}`:result;}
export function screenFilenames(names:string[],format:ImageFormat){const used=new Set<string>();return names.map(name=>{const base=safeFilename(name).toLowerCase();let candidate=base,index=2;while(used.has(candidate))candidate=`${base}-${index++}`;used.add(candidate);return `${candidate}.${format==='jpeg'?'jpg':format}`;});}
export function checkDimensions(width:number,height:number){if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>EXPORT_LIMITS.dimension||height>EXPORT_LIMITS.dimension||width*height>EXPORT_LIMITS.pixels)throw new Error('This screen exceeds the safe image export limit (40 million pixels, 20,000px per side), or has invalid dimensions. Export a smaller screen.');}
export async function zipImages(files:Record<string,Uint8Array>,signal?:AbortSignal):Promise<Blob>{
  if(!Object.keys(files).length)throw new Error('There are no screen images to package.');
  if(Object.values(files).reduce((n,bytes)=>n+bytes.byteLength,0)>EXPORT_LIMITS.archiveBytes)throw new Error('The image archive exceeds the 150 MB safety limit. Export screens individually.');
  if(signal?.aborted)throw new Error('Export cancelled.');
  return new Promise((resolve,reject)=>{let terminate:()=>void=()=>{};const cancel=()=>{terminate();reject(new Error('Export cancelled.'));};signal?.addEventListener('abort',cancel,{once:true});terminate=zip(files,{level:0},(error,bytes)=>{signal?.removeEventListener('abort',cancel);error?reject(new Error('Could not package the screen images. Try exporting one screen.')):resolve(new Blob([new Uint8Array(bytes)],{type:'application/zip'}));});});
}
export function downloadBlob(name:string,blob:Blob){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}}
async function dataUrl(blob:Blob){if(blob.size>EXPORT_LIMITS.assetBytes)throw new Error('An export asset exceeds the 15 MB safety limit.');return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Could not read an image or font asset.'));reader.readAsDataURL(blob);});}
async function fetchAsset(url:string,signal:AbortSignal){const response=await fetch(url,{mode:'cors',credentials:'omit',signal:AbortSignal.any([signal,AbortSignal.timeout(15000)])});if(!response.ok)throw new Error('Asset request failed.');const declared=Number(response.headers.get('content-length'));if(declared>EXPORT_LIMITS.assetBytes){await response.body?.cancel();throw new Error('Asset is too large.');}
  if(!response.body)return response.blob();const reader=response.body.getReader(),chunks:Uint8Array<ArrayBuffer>[]=[];let size=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>EXPORT_LIMITS.assetBytes){await reader.cancel();throw new Error('Asset is too large.');}chunks.push(new Uint8Array(value));}}finally{reader.releaseLock();}
  return new Blob(chunks,{type:response.headers.get('content-type')??'application/octet-stream'});
}
async function timed<T>(promise:Promise<T>,ms:number,signal?:AbortSignal):Promise<T>{
  if(signal?.aborted)throw new Error('Export cancelled.');
  return new Promise((resolve,reject)=>{const cancel=()=>finish(()=>reject(new Error('Export cancelled.'))),timer=setTimeout(()=>finish(()=>reject(new Error('An export asset took too long to load. Retry when it is available.'))),ms);function finish(callback:()=>void){clearTimeout(timer);signal?.removeEventListener('abort',cancel);callback();}signal?.addEventListener('abort',cancel,{once:true});promise.then(value=>finish(()=>resolve(value)),error=>finish(()=>reject(error)));});
}
export class ExportAssets {
  private controller=new AbortController();
  get signal(){return this.controller.signal;}
  private urls=new Map<string,Promise<string>>();
  warnings=new Set<string>();
  get(url:string){let result=this.urls.get(url);if(!result){result=(async()=>{if(this.signal.aborted)throw new Error('Export cancelled.');if(url.startsWith('data:')){if(url.length>EXPORT_LIMITS.assetBytes*1.4)throw new Error('An embedded image is too large.');return url;}return dataUrl(await fetchAsset(url,this.signal));})();this.urls.set(url,result);}return result;}
  async fonts(root:HTMLElement){
    const used=new Set(Array.from(root.querySelectorAll<HTMLElement>('[data-component-id]')).map(el=>getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g,'').trim()));
    let css='';for(const sheet of Array.from(document.styleSheets)){
      let source='';try{source=Array.from(sheet.cssRules).map(r=>r.cssText).join('\n');}catch{if(sheet.href){try{source=await (await fetch(sheet.href,{mode:'cors',signal:AbortSignal.any([this.signal,AbortSignal.timeout(15000)])})).text();}catch{this.warnings.add('A font stylesheet could not be embedded; installed fallback fonts are used.');}}}
      for(const face of source.match(/@font-face\s*\{[^}]+\}/g)??[]){const family=face.match(/font-family:\s*([^;]+)/)?.[1].replace(/["']/g,'').trim();if(!family||!used.has(family))continue;
        let embedded=face;for(const match of face.matchAll(/url\((?:['"])?([^)'"\s]+)(?:['"])?\)/g)){try{const url=new URL(match[1],sheet.href??document.baseURI).href;embedded=embedded.replace(match[0],`url("${await this.get(url)}")`);}catch{this.warnings.add(`Font ${family} could not be embedded; fallback typography may differ on other devices.`);embedded='';break;}}css+=embedded;
      }
    }
    for(const family of used){if(!['serif','sans-serif','monospace','system-ui'].includes(family)&&!css.includes(`font-family: ${family}`)&&!css.includes(`font-family: '${family}'`)&&!css.includes(`font-family: "${family}"`))this.warnings.add(`Font ${family} is not embedded; the exported file depends on an installed fallback.`);}
    return css;
  }
  clear(){this.controller.abort();this.urls.clear();}
}

export async function svgToImage(svg:string,format:ImageFormat,width:number,height:number,jpegBackground:string):Promise<Blob>{
  checkDimensions(width,height);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');if(!context)throw new Error('This browser cannot render image exports.');
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  try{const image=new Image();image.src=svg.includes('<foreignObject')?`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`:url;await timed(image.decode(),20000);if(format==='jpeg'){if(!CSS.supports('color',jpegBackground))throw new Error('Enter a valid JPEG background color.');context.fillStyle=jpegBackground;context.fillRect(0,0,width,height);}context.drawImage(image,0,0,width,height);
    return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('The browser could not encode this image. Try a smaller screen.')),format==='png'?'image/png':'image/jpeg',.95));
  }catch(error){throw error instanceof Error?error:new Error('Image rendering failed.');}finally{URL.revokeObjectURL(url);canvas.width=0;canvas.height=0;}
}

/** Full-size DOM capture for raster exports and rendered design review.
 * This intermediate SVG is used only for PNG/JPEG, never offered as SVG export. */
export async function renderRasterSvg(root:HTMLElement,assets:ExportAssets):Promise<string>{
  checkDimensions(root.offsetWidth,root.offsetHeight);if(document.fonts)await timed(document.fonts.ready,20000,assets.signal);const fonts=await assets.fonts(root);
  async function clone(el:HTMLElement|SVGElement):Promise<HTMLElement|SVGElement>{
    const copy=el.cloneNode(false) as HTMLElement|SVGElement,style=getComputedStyle(el);
    for(const property of Array.from(style))copy.style.setProperty(property,style.getPropertyValue(property));
    copy.style.setProperty('outline','none');copy.removeAttribute('data-component-id');copy.removeAttribute('data-generated-screen');copy.removeAttribute('id');
    if(el===root){copy.style.position='relative';copy.style.left='0';copy.style.top='0';}
    if(el instanceof HTMLImageElement){try{(copy as HTMLImageElement).src=await assets.get(el.currentSrc||el.src);}catch{throw new Error(`Could not export image “${el.alt||'image'}”. Check that it loads and allows cross-origin access, then retry.`);}}
    for(const child of Array.from(el.childNodes)){if(child instanceof HTMLElement||child instanceof SVGElement)copy.appendChild(await clone(child));else if(child.nodeType===Node.TEXT_NODE)copy.appendChild(child.cloneNode());}
    return copy;
  }
  const content=await clone(root);content.setAttribute('xmlns','http://www.w3.org/1999/xhtml');const fontStyle=document.createElement('style');fontStyle.textContent=fonts;content.prepend(fontStyle);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${root.offsetWidth}" height="${root.offsetHeight}"><foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(content)}</foreignObject></svg>`;
}
