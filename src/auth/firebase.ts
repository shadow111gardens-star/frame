import {getApps,initializeApp,type FirebaseApp} from 'firebase/app';
import {getAuth,GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signInWithRedirect,getRedirectResult,signOut} from 'firebase/auth';
import type {AuthAdapter} from './store';

// Public web-app identifiers, never privileged server credentials.
export const firebaseConfig = {
  apiKey: "AIzaSyDyfk1OKJj4BhhkMDHNdct433dk25WyDvU",
  authDomain: "frame-44bbd.firebaseapp.com",
  projectId: "frame-44bbd",
  storageBucket: "frame-44bbd.firebasestorage.app",
  messagingSenderId: "604049702868",
  appId: "1:604049702868:web:f7ba5e403c6397f63fa041",
  measurementId: "G-JE86TNZB5E"
};
export function initializeFrameFirebase(sdk={getApps,initializeApp}):FirebaseApp {
 const existing=sdk.getApps().find(app=>app.name==='[DEFAULT]');
 if(existing&&existing.options.projectId!==firebaseConfig.projectId)throw {code:'auth/app-not-authorized'};
 return existing??sdk.initializeApp(firebaseConfig);
}
let adapter:AuthAdapter|undefined;
export function firebaseAdapter():AuthAdapter {
 if(adapter)return adapter;
 const app=initializeFrameFirebase(),auth=getAuth(app),provider=new GoogleAuthProvider();
 adapter={observe:(next,error)=>onAuthStateChanged(auth,next,error),popup:async()=> (await signInWithPopup(auth,provider)).user,redirect:()=>signInWithRedirect(auth,provider),redirectResult:async()=> (await getRedirectResult(auth))?.user??null,logout:()=>signOut(auth)};
 // Analytics is optional and must never delay sign-in or fail authentication.
 void import('firebase/analytics').then(async sdk=>{if(await sdk.isSupported())sdk.getAnalytics(app);}).catch(()=>{});
 return adapter;
}
