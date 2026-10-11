/** Indeterminate activity only: no invented percentage or generation stages. */
export function GenerationIndicator({compact=false}:{compact?:boolean}) {
  return <div data-generation-indicator role="status" aria-live="polite" className={compact?'pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 z-20':'h-full w-full grid place-items-center'}>
    <div className={compact?'flex items-center gap-3 rounded-full border border-white/10 bg-[#101014]/95 px-5 py-3 shadow-lg':'flex max-w-sm flex-col items-center text-center'}>
      {compact?<span aria-hidden="true" className="frame-generation-spinner"/>:<div aria-hidden="true" className="frame-generation-art mb-7">
        <span className="frame-generation-orbit"/><span className="frame-generation-outline"/><span className="frame-generation-scan"/>
      </div>}
      <div>
        <p className="text-[14px] font-medium tracking-tight text-white/90">{compact?'Updating your design…':'Creating your design…'}</p>
        {!compact&&<p className="mt-2 text-[12px] leading-5 text-white/40">Turning your idea into editable screens.<br/>Your design will appear here when it’s ready.</p>}
      </div>
      {!compact&&<div aria-hidden="true" className="frame-generation-track mt-6"><span/></div>}
    </div>
  </div>;
}
