import {useState} from 'react';
import type {ProductType} from '../../../shared/product';
import {useWorkspace} from '../store';
import {Dialog} from './Dialog';
export function NewProjectModal(){
  const {dispatch}=useWorkspace();const [type,setType]=useState<ProductType>('website'),[name,setName]=useState('Untitled project');
  const close=()=>dispatch({type:'CLOSE_MODAL'});
  const create=()=>dispatch({type:'CREATE_PROJECT',productType:type,name:name.trim()||'Untitled project'});
  return <Dialog title="New Project" onClose={close} footer={<div className="flex justify-end gap-2"><button onClick={close} className="btn-ghost px-4 py-2 text-[12px]">Cancel</button><button onClick={create} className="btn-primary px-4 py-2 text-[12px]">Create project</button></div>}>
    <label className="block text-white/60 text-[12px]">Project name<input aria-label="Project name" autoFocus maxLength={150} value={name} onChange={e=>setName(e.target.value)} className="ws-input w-full mt-2 px-3 py-2" onKeyDown={e=>{if(e.key==='Enter')create();}}/></label>
    <div className="flex gap-2 mt-4" role="group" aria-label="Project type">{([['website','Website'],['mobile_app','Mobile App']] as const).map(([value,label])=><button key={value} aria-pressed={type===value} onClick={()=>setType(value)} className={type===value?'btn-primary px-4 py-2 text-[12px]':'btn-ghost px-4 py-2 text-[12px]'}>{label}</button>)}</div>
    <p className="mt-4 text-[12px] text-white/45">Start with a blank editable screen. Your current project stays in this session.</p>
  </Dialog>;
}
