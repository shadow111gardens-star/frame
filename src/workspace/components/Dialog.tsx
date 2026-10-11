import {useEffect,useId,useRef,type ReactNode} from 'react';
import {createPortal} from 'react-dom';

/** Viewport-owned dialog: never inherit a blurred/transformed toolbar's containing block. */
export function Dialog({title,onClose,children,footer,busy=false}:{title:string;onClose:()=>void;children:ReactNode;footer?:ReactNode;busy?:boolean}) {
  const id=useId(),ref=useRef<HTMLDivElement>(null),close=useRef(onClose);close.current=onClose;
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    const root=document.getElementById('root');const inert=root?.inert;if(root)root.inert=true;
    const panel=ref.current!;
    const controls=()=>Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(e=>e.getClientRects().length);
    (panel.querySelector<HTMLElement>('[autofocus]')??controls()[0]??panel).focus();
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();close.current();}
      if(e.key==='Tab'){const list=controls(),first=list[0],last=list[list.length-1];if(!first){e.preventDefault();panel.focus();}else if(e.shiftKey&&(document.activeElement===first||!panel.contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||!panel.contains(document.activeElement))){e.preventDefault();first.focus();}}
    };
    document.addEventListener('keydown',key);
    return ()=>{document.removeEventListener('keydown',key);document.body.style.overflow=overflow;if(root)root.inert=inert??false;if(previous?.isConnected)previous.focus();};
  },[]);
  return createPortal(<div data-modal className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} aria-busy={busy} tabIndex={-1} className="w-full max-w-[550px] flex flex-col min-h-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0A0A0D] shadow-2xl" style={{maxHeight:'calc(100dvh - 48px)'}} onClick={e=>e.stopPropagation()}>
      <div className="shrink-0 flex items-center justify-between border-b border-white/[0.06] px-5 py-3"><span id={id} className="text-[13px] text-white font-medium">{title}</span><button disabled={busy} onClick={onClose} aria-label="Close" className="h-7 w-7 text-white/70">&times;</button></div>
      <div data-dialog-content className="min-h-0 overflow-y-auto overscroll-contain ws-scrollbar p-5">{children}</div>
      {footer&&<div data-dialog-footer className="shrink-0 border-t border-white/[0.06] px-5 py-3">{footer}</div>}
    </div>
  </div>,document.body);
}
