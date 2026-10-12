import { Dialog } from './Dialog';
import { useState,useRef,useLayoutEffect,useEffect } from "react";
import { useWorkspace,workspaceToApp } from "../store";

import {GeneratedSurface} from "./GeneratedSurface";
import {validateApp} from "../../../shared/design";
import {downloadBlob,ExportAssets,renderRasterSvg,svgToImage,screenFilenames,safeFilename,zipImages,EXPORT_LIMITS,type ImageFormat,type ExportScope} from "../../design/imageExport";
import type {ScreenFile} from "../types";

type ExportFormat = "rn" | "json" | "screenshots" | "design-md";

export function ExportModal() {
  const { state, dispatch } = useWorkspace();
  const [format, setFormat] = useState<ExportFormat>("json");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [imageFormat,setImageFormat]=useState<ImageFormat>('png');
  const [scope,setScope]=useState<ExportScope>('current');
  const [jpegBackground,setJpegBackground]=useState('#ffffff');
  const [status,setStatus]=useState('');
  const [error,setError]=useState('');
  const [warnings,setWarnings]=useState<string[]>([]);
  const lock=useRef(false),alive=useRef(true);
  const activeAssets=useRef<ExportAssets|null>(null),rejectRender=useRef<((error:Error)=>void)|null>(null);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;activeAssets.current?.clear();rejectRender.current?.(new Error('Export cancelled.'));};},[]);
  const [job,setJob]=useState<{screen:ScreenFile;snapshot:typeof state;ready:(root:HTMLElement)=>void}|null>(null);

  const exportCount=format==='screenshots'&&scope==='current'?(state.screens.some(s=>s.id===state.currentScreen)?1:0):state.screens.length;

  const start = async () => {
    if(lock.current)return;
    lock.current=true;setBusy(true);setDone(false);setError('');setWarnings([]);
    try {
    if(format==='screenshots'){
      if(!state.screens.length)throw new Error('Generate a design before exporting screen images.');
      try{validateApp(workspaceToApp(state));}catch{throw new Error('The current design has invalid screen dimensions or component data. Fix its properties and retry.');}
      const screens=scope==='all'?state.screens:state.screens.filter(s=>s.id===state.currentScreen);
      if(!screens.length)throw new Error('Select a screen to export.');
      const names=screenFilenames(screens.map(s=>s.label),imageFormat),files:Record<string,Uint8Array>={};
      const assets=new ExportAssets();activeAssets.current=assets;let total=0;
      try{for(let i=0;i<screens.length;i++){
        const screen=screens[i];setStatus(`Rendering ${i+1} of ${screens.length}: ${screen.label}`);
        const root=await new Promise<HTMLElement>((ready,reject)=>{rejectRender.current=reject;setJob({screen,snapshot:state,ready:root=>{rejectRender.current=null;ready(root);}});});
        const svg=await renderRasterSvg(root,assets);
        const blob=await svgToImage(svg,imageFormat,root.offsetWidth,root.offsetHeight,jpegBackground);
        if(!alive.current)throw new Error('Export cancelled.');
        if(scope==='current')downloadBlob(names[i],blob);else{const bytes=new Uint8Array(await blob.arrayBuffer());total+=bytes.byteLength;if(total>EXPORT_LIMITS.archiveBytes)throw new Error('The archive exceeds 150 MB. Export screens individually.');files[names[i]]=bytes;}
      }
      setWarnings([...assets.warnings]);
      if(scope==='all'){setStatus('Packaging screen images...');const archive=await zipImages(files,assets.signal);if(alive.current)downloadBlob(`${safeFilename(state.projectName)}-screens-${imageFormat}.zip`,archive);}
      }finally{assets.clear();activeAssets.current=null;if(alive.current)setJob(null);}
    }else {

    if(format==='design-md'){if(!state.generationArtifact)throw new Error('This older project has no saved DESIGN.md. Generate a new design to create one.');downloadBlob('DESIGN.md',new Blob([state.generationArtifact.designMd],{type:'text/markdown;charset=utf-8'}));}
    else if (format === "rn") {
      downloadFile(
        `${state.projectName.replace(/\s+/g, "-")}.zip-placeholder.txt`,
        generateRNReadme(state)
      );
    } else if (format === "json") {
      const payload = {
        projectId:state.projectId,
        productType: state.productType,
        designSystem: state.designSystem,
        projectName: state.projectName,
        screens: state.screens,
        components: state.components,
        files: state.files,
        tokens: state.tokens,
        exportedAt: new Date().toISOString(),
      };
      downloadFile(
        `${state.projectName.replace(/\s+/g, "-")}.json`,
        JSON.stringify(payload, null, 2)
      );
    }
    }
    setDone(true);setStatus('Download ready.');
    }catch(e){if(!alive.current)return;setError(e instanceof Error?e.message:'Export failed. Please retry.');setStatus('');}
    finally{lock.current=false;if(alive.current){setBusy(false);setJob(null);}}

  };

  return (
    <Dialog title="Export project" busy={busy} onClose={() => {if(!lock.current)dispatch({type:'CLOSE_MODAL'});}} footer={<div className="flex justify-between items-center gap-2 flex-wrap">
      <span className="text-[11px] text-white/40 font-mono">{state.screens.length} screens &middot; {Object.keys(state.components).length} components</span>
      <div className="flex gap-2"><button disabled={busy} onClick={()=>dispatch({type:'CLOSE_MODAL'})} className="btn-ghost px-4 py-2 text-[12px]">Cancel</button><button disabled={busy||!state.screens.length} onClick={()=>void start()} className="btn-primary px-4 py-2 text-[12px] disabled:opacity-40">{busy?'Exporting...':done?'Export again':'Export'}</button></div>
    </div>}>
      <div className="space-y-1.5">
        {(
          [
            ...(state.productType==="website"?[{ id: "rn" as const, label: "Website project", desc: "ZIP with screens, components, theme." }]:[]),
            { id:"design-md" as const,label:"DESIGN.md",desc:"View and download the approved visual specification." },
            { id: "json" as const, label: "JSON", desc: "Full design state for backup or migration." },
            { id: "screenshots" as const, label: "Screenshots", desc: "Full-screen PNG or JPEG images." },
          ]
        ).map((opt) => (
          <button
            key={opt.id}
            disabled={busy}
            onClick={() => {setFormat(opt.id);setDone(false);setError('');setStatus('');}}
            className={`w-full text-left p-3 rounded-md border transition-colors ${
              format === opt.id
                ? "border-white/[0.18] bg-white/[0.04]"
                : "border-white/[0.06] hover:bg-white/[0.025]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-[12.5px] text-white font-medium">{opt.label}</div>
              <span
                className={`h-3.5 w-3.5 rounded-full border-2 ${
                  format === opt.id
                    ? "border-white bg-white"
                    : "border-white/30"
                }`}
              />
            </div>
            <div className="text-[11px] text-white/45 mt-1">{opt.desc}</div>
          </button>
        ))}
      </div>
      {format==='design-md'&&<pre aria-label="DESIGN.md preview" className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap text-[11px] text-white/70">{state.generationArtifact?.designMd??'No DESIGN.md exists for this legacy project.'}</pre>}
      {format==='screenshots'&&<div className="mt-4 space-y-3 text-[11px] text-white/60">
        <label className="flex justify-between items-center gap-3">Image format<select aria-label="Image format" className="ws-input px-2 py-1" disabled={busy} value={imageFormat} onChange={e=>{setImageFormat(e.target.value as ImageFormat);setDone(false);}}><option value="png">PNG</option><option value="jpeg">JPG / JPEG</option></select></label>
        <label className="flex justify-between items-center gap-3">Export scope<select aria-label="Export scope" className="ws-input px-2 py-1" disabled={busy} value={scope} onChange={e=>{setScope(e.target.value as ExportScope);setDone(false);}}><option value="current">Current Screen</option><option value="all">All Screens (ZIP)</option></select></label>
        {imageFormat==='jpeg'&&<label className="flex justify-between items-center gap-3">JPEG background<input aria-label="JPEG background" type="color" disabled={busy} value={jpegBackground} onChange={e=>setJpegBackground(e.target.value)} className="h-7 w-12"/></label>}
        <p>{scope==='current'?`Export "${state.screens.find(s=>s.id===state.currentScreen)?.label??'No screen selected'}" as one complete ${imageFormat==='jpeg'?'JPEG':imageFormat.toUpperCase()} image.`:`Export ${exportCount} ${exportCount===1?'screen':'screens'} as individual ${imageFormat==='jpeg'?'JPEG':imageFormat.toUpperCase()} files in one ZIP.`}</p>
      </div>}
      {status&&<p role="status" aria-live="polite" className="mt-3 text-[11px] text-white/60">{status}</p>}
      {error&&<p role="alert" className="mt-3 text-[11px] text-red-300">{error}</p>}
      {!!warnings.length&&<ul className="mt-3 text-[10px] text-amber-200 space-y-1">{warnings.map(w=><li key={w}>{w}</li>)}</ul>}
      {job&&<ExportRenderHost job={job}/>}

    </Dialog>
  );
}


function downloadFile(name: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function generateRNReadme(state: ReturnType<typeof useWorkspace>["state"]): string {
  return `# ${state.projectName}

Exported from FRAME on ${new Date().toISOString()}

## Product type
${state.productType}

Code generation is not available yet.

## Structure
${state.screens
  .map((s) => `- screens/${s.name}`)
  .join("\n")}

## Files
${state.files
  .map((f) => `- ${f.folder}/${f.name}`)
  .join("\n")}

Generated by FRAME — Frame AI Studio.
`;
}

function ExportRenderHost({job}:{job:{screen:ScreenFile;snapshot:ReturnType<typeof useWorkspace>['state'];ready:(root:HTMLElement)=>void}}){
  const ref=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{let active=true;const id=requestAnimationFrame(()=>{if(active){const root=ref.current?.querySelector<HTMLElement>('[data-generated-screen]');if(root)job.ready(root);}});return()=>{active=false;cancelAnimationFrame(id);};},[job]);
  return <div ref={ref} aria-hidden="true" data-export-host style={{position:'fixed',left:-100000,top:0,pointerEvents:'none'}}><GeneratedSurface screen={job.screen} exporting snapshot={job.snapshot}/></div>;
}
