export interface AuthUser {uid:string;displayName:string|null;email:string|null;photoURL:string|null}
export interface AuthAdapter {
 observe(next:(user:AuthUser|null)=>void,error:(error:unknown)=>void):()=>void;
 popup():Promise<AuthUser>;redirect():Promise<void>;redirectResult():Promise<AuthUser|null>;logout():Promise<void>;
}
export interface AuthState {status:'loading'|'authenticated'|'unauthenticated';user:AuthUser|null;busy:boolean;error:string|null}
export function authError(error:unknown):string {
 const code=(error as {code?:string})?.code;
 switch(code){
  case 'auth/popup-closed-by-user':case 'auth/cancelled-popup-request':return 'Google sign-in was cancelled. You can try again.';
  case 'auth/network-request-failed':return 'Could not connect to Google sign-in. Check your connection and retry.';
  case 'auth/unauthorized-domain':return 'This domain is not authorized for FRAME sign-in. Add it in Firebase Authentication settings.';
  case 'auth/operation-not-allowed':return 'Google sign-in is not enabled for FRAME. Enable it in Firebase Authentication.';
  case 'auth/invalid-api-key':case 'auth/app-not-authorized':case 'auth/invalid-auth-event':return 'FRAME authentication is not configured correctly. Check the Firebase project and authorized domains.';
  case 'auth/web-storage-unsupported':return 'Sign-in needs browser storage. Allow site storage and try again.';
  default:return 'Could not sign in to FRAME. Please try again or check Firebase Authentication configuration.';
 }
}
export function safeDestination(value:unknown):'#home'|'#workspace' {return value==='#home'?'#home':'#workspace';}
export function protectedRoute(route:string){return route==='home'||route==='workspace';}
const destinationKey='frame.auth.destination';
export class AuthStore {
 state:AuthState={status:'loading',user:null,busy:false,error:null};
 private listeners=new Set<()=>void>();private startup?:Promise<void>;private sdk?:AuthAdapter;
 constructor(private load:()=>Promise<AuthAdapter>,private storage:()=>Storage|undefined,private navigate:(hash:string)=>void){}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return ()=>{this.listeners.delete(listener);};};
 snapshot=()=>this.state;
 private update(patch:Partial<AuthState>){this.state={...this.state,...patch};this.listeners.forEach(listener=>listener());}
 remember(destination:string){try{this.storage()?.setItem(destinationKey,safeDestination(destination));}catch{/* Popup still works without session storage. */}}
 private destination(){try{return safeDestination(this.storage()?.getItem(destinationKey));}catch{return '#workspace';}}
 private clearDestination(){try{this.storage()?.removeItem(destinationKey);}catch{}}
 start(){return this.startup??=(async()=>{
  try{
   this.sdk=await this.load();
   let restored:AuthUser|null=null,initialized=false;
   const ready=new Promise<void>((resolve,reject)=>this.sdk!.observe(user=>{restored=user;if(initialized)this.update({user,status:user?'authenticated':'unauthenticated'});resolve();},error=>{if(initialized)this.update({user:null,status:'unauthenticated',error:authError(error)});else reject(error);}));
   // Install exactly one page-lifetime listener, including under React StrictMode.
   const [redirect]=await Promise.all([this.sdk.redirectResult(),ready]);
   const user=redirect??restored;initialized=true;
   this.update({user,status:user?'authenticated':'unauthenticated'});
   if(redirect){const target=this.destination();this.clearDestination();this.navigate(target);}
  }catch(error){this.update({status:'unauthenticated',user:null,error:authError(error)});}
 })();}
 signIn=async(destination?:string)=>{
  if(this.state.busy)return;
  this.update({busy:true,error:null});if(destination)this.remember(destination);
  try{
   await this.start();if(!this.sdk)throw new Error('Authentication unavailable');
   if(this.state.user){const target=this.destination();this.clearDestination();this.navigate(target);return;}
   let user:AuthUser;
   try{user=await this.sdk.popup();}catch(error){
    if(['auth/popup-blocked','auth/operation-not-supported-in-this-environment'].includes((error as {code:string})?.code)){
     // Persist only an allowlisted local hash before leaving the page.
     this.remember(this.destination());await this.sdk.redirect();return;
    }
    throw error;
   }
   this.update({user,status:'authenticated'});const target=this.destination();this.clearDestination();this.navigate(target);
  }catch(error){this.update({error:authError(error)});}finally{this.update({busy:false});}
 };
 logout=async()=>{
  if(this.state.busy)return;
  this.update({busy:true,error:null});
  try{await this.start();if(!this.sdk)throw new Error('Authentication unavailable');await this.sdk.logout();this.clearDestination();this.update({user:null,status:'unauthenticated'});this.navigate('');}
  catch(error){this.update({error:'Could not sign out. Check your connection and try again.'});throw error;}
  finally{this.update({busy:false});}
 };
}
