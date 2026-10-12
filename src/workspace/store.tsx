import type {GenerationArtifact} from '../../shared/generationArtifact';
import {designPolicy} from '../../shared/designPolicy';
import {useProjects} from '../projects/ProjectsProvider';
import {mergeScreenEdit,type EditScope} from '../../shared/editScope';
import {COLOR_ROLES} from '../design/designProperties';
import {RenderedDesignReview,type ReviewJob,type RenderReview} from './components/RenderedDesignReview';
import { previewConfig, screenDimensions, type ProductType } from "../../shared/product";
import { componentSchema, colorSchema, appSchema, validateApp, type DesignApp } from "../../shared/design";
import { pendingPrompt, takePrompt, requestDesign, DesignRequestError } from "../design/api";
import {
  createContext,
  useContext,
  useCallback,
  useReducer,
  useRef,
  ReactNode,
  Dispatch,
  useEffect,
  useState,
} from "react";
import type {
  ChatMessage,
  ComponentStyles,
  ComponentPosition,
  DesignComponent,
  DesignTokens,
  DeviceInfo,
  DeviceType,
  ModalState,
  ProjectFile,
  RightTab,
  SaveState,
  ScreenFile,
  ScreenId,
  CenterTab,
  Attachment,
} from "./types";

// ─────────────────────────────────────────────────────────
// Device catalog
// ─────────────────────────────────────────────────────────

export const DEVICES: DeviceInfo[] = [
  // iPhone — modern
  {
    id: "iphone-17-pro-max",
    platform: "ios",
    label: "iPhone 17 Pro Max",
    width: 440,
    height: 956,
    previewWidth: 304,
    previewHeight: 660,
    notchStyle: "dynamic-island",
    cornerRadius: 56,
    screenRadius: 48,
  },
  {
    id: "iphone-17-pro",
    platform: "ios",
    label: "iPhone 17 Pro",
    width: 402,
    height: 874,
    previewWidth: 300,
    previewHeight: 652,
    notchStyle: "dynamic-island",
    cornerRadius: 54,
    screenRadius: 46,
  },
  {
    id: "iphone-17",
    platform: "ios",
    label: "iPhone 17",
    width: 393,
    height: 852,
    previewWidth: 296,
    previewHeight: 642,
    notchStyle: "dynamic-island",
    cornerRadius: 52,
    screenRadius: 44,
  },
  {
    id: "iphone-16-pro-max",
    platform: "ios",
    label: "iPhone 16 Pro Max",
    width: 430,
    height: 932,
    previewWidth: 302,
    previewHeight: 654,
    notchStyle: "dynamic-island",
    cornerRadius: 54,
    screenRadius: 46,
  },
  {
    id: "iphone-16-pro",
    platform: "ios",
    label: "iPhone 16 Pro",
    width: 402,
    height: 874,
    previewWidth: 300,
    previewHeight: 652,
    notchStyle: "dynamic-island",
    cornerRadius: 54,
    screenRadius: 46,
  },
  {
    id: "iphone-16",
    platform: "ios",
    label: "iPhone 16",
    width: 393,
    height: 852,
    previewWidth: 296,
    previewHeight: 642,
    notchStyle: "dynamic-island",
    cornerRadius: 52,
    screenRadius: 44,
  },
  {
    id: "iphone-15-pro-max",
    platform: "ios",
    label: "iPhone 15 Pro Max",
    width: 430,
    height: 932,
    previewWidth: 302,
    previewHeight: 654,
    notchStyle: "dynamic-island",
    cornerRadius: 54,
    screenRadius: 46,
  },
  {
    id: "iphone-15-pro",
    platform: "ios",
    label: "iPhone 15 Pro",
    width: 402,
    height: 874,
    previewWidth: 300,
    previewHeight: 652,
    notchStyle: "dynamic-island",
    cornerRadius: 54,
    screenRadius: 46,
  },
  {
    id: "iphone-15",
    platform: "ios",
    label: "iPhone 15",
    width: 393,
    height: 852,
    previewWidth: 296,
    previewHeight: 642,
    notchStyle: "dynamic-island",
    cornerRadius: 52,
    screenRadius: 44,
  },
  {
    id: "iphone-14-pro-max",
    platform: "ios",
    label: "iPhone 14 Pro Max",
    width: 430,
    height: 932,
    previewWidth: 302,
    previewHeight: 654,
    notchStyle: "dynamic-island",
    cornerRadius: 54,
    screenRadius: 46,
  },
  {
    id: "iphone-14",
    platform: "ios",
    label: "iPhone 14",
    width: 390,
    height: 844,
    previewWidth: 294,
    previewHeight: 636,
    notchStyle: "notch",
    cornerRadius: 50,
    screenRadius: 42,
  },
  {
    id: "iphone-se",
    platform: "ios",
    label: "iPhone SE",
    width: 375,
    height: 667,
    previewWidth: 270,
    previewHeight: 480,
    notchStyle: "none",
    cornerRadius: 40,
    screenRadius: 32,
  },

  // Android — Pixel / Galaxy / OnePlus / Xiaomi / tablet
  {
    id: "pixel-9-pro",
    platform: "android",
    label: "Pixel 9 Pro",
    width: 412,
    height: 892,
    previewWidth: 296,
    previewHeight: 642,
    notchStyle: "punch-hole-center",
    cornerRadius: 44,
    screenRadius: 36,
  },
  {
    id: "pixel-9",
    platform: "android",
    label: "Pixel 9",
    width: 412,
    height: 869,
    previewWidth: 296,
    previewHeight: 624,
    notchStyle: "punch-hole-center",
    cornerRadius: 44,
    screenRadius: 36,
  },
  {
    id: "pixel-8-pro",
    platform: "android",
    label: "Pixel 8 Pro",
    width: 412,
    height: 892,
    previewWidth: 296,
    previewHeight: 642,
    notchStyle: "punch-hole-center",
    cornerRadius: 44,
    screenRadius: 36,
  },
  {
    id: "pixel-8",
    platform: "android",
    label: "Pixel 8",
    width: 412,
    height: 869,
    previewWidth: 296,
    previewHeight: 624,
    notchStyle: "punch-hole-center",
    cornerRadius: 44,
    screenRadius: 36,
  },
  {
    id: "pixel-7",
    platform: "android",
    label: "Pixel 7",
    width: 412,
    height: 869,
    previewWidth: 296,
    previewHeight: 624,
    notchStyle: "punch-hole-center",
    cornerRadius: 44,
    screenRadius: 36,
  },
  {
    id: "galaxy-s25-ultra",
    platform: "android",
    label: "Galaxy S25 Ultra",
    width: 412,
    height: 915,
    previewWidth: 296,
    previewHeight: 658,
    notchStyle: "punch-hole-center",
    cornerRadius: 32,
    screenRadius: 24,
  },
  {
    id: "galaxy-s25",
    platform: "android",
    label: "Galaxy S25",
    width: 393,
    height: 852,
    previewWidth: 282,
    previewHeight: 612,
    notchStyle: "punch-hole-center",
    cornerRadius: 32,
    screenRadius: 24,
  },
  {
    id: "galaxy-s24",
    platform: "android",
    label: "Galaxy S24",
    width: 360,
    height: 800,
    previewWidth: 260,
    previewHeight: 578,
    notchStyle: "punch-hole-center",
    cornerRadius: 32,
    screenRadius: 24,
  },
  {
    id: "oneplus-13",
    platform: "android",
    label: "OnePlus 13",
    width: 412,
    height: 915,
    previewWidth: 296,
    previewHeight: 658,
    notchStyle: "punch-hole-center",
    cornerRadius: 36,
    screenRadius: 28,
  },
  {
    id: "xiaomi-14",
    platform: "android",
    label: "Xiaomi 14",
    width: 412,
    height: 892,
    previewWidth: 296,
    previewHeight: 642,
    notchStyle: "punch-hole-center",
    cornerRadius: 36,
    screenRadius: 28,
  },

  // Laptops
  {
    id: "macbook-pro-16",
    platform: "laptop",
    label: "MacBook Pro 16",
    width: 1728,
    height: 1117,
    previewWidth: 600,
    previewHeight: 388,
    notchStyle: "webcam",
    frameStyle: "laptop",
    cornerRadius: 14,
    screenRadius: 8,
    bezelTop: 14,
    bezelSide: 14,
    bezelBottom: 16,
    hingeHeight: 12,
  },
  {
    id: "macbook-pro-14",
    platform: "laptop",
    label: "MacBook Pro 14",
    width: 1512,
    height: 982,
    previewWidth: 560,
    previewHeight: 364,
    notchStyle: "webcam",
    frameStyle: "laptop",
    cornerRadius: 14,
    screenRadius: 8,
    bezelTop: 14,
    bezelSide: 14,
    bezelBottom: 16,
    hingeHeight: 12,
  },
  {
    id: "macbook-air-13",
    platform: "laptop",
    label: "MacBook Air 13",
    width: 1470,
    height: 956,
    previewWidth: 540,
    previewHeight: 352,
    notchStyle: "webcam",
    frameStyle: "laptop",
    cornerRadius: 14,
    screenRadius: 8,
    bezelTop: 14,
    bezelSide: 14,
    bezelBottom: 16,
    hingeHeight: 12,
  },
  {
    id: "macbook-air-15",
    platform: "laptop",
    label: "MacBook Air 15",
    width: 1710,
    height: 1107,
    previewWidth: 580,
    previewHeight: 376,
    notchStyle: "webcam",
    frameStyle: "laptop",
    cornerRadius: 14,
    screenRadius: 8,
    bezelTop: 14,
    bezelSide: 14,
    bezelBottom: 16,
    hingeHeight: 12,
  },
  {
    id: "dell-xps-15",
    platform: "laptop",
    label: "Dell XPS 15",
    width: 1920,
    height: 1200,
    previewWidth: 560,
    previewHeight: 350,
    notchStyle: "webcam",
    frameStyle: "laptop",
    cornerRadius: 10,
    screenRadius: 4,
    bezelTop: 10,
    bezelSide: 10,
    bezelBottom: 14,
    hingeHeight: 10,
  },
  {
    id: "thinkpad-x1",
    platform: "laptop",
    label: "ThinkPad X1 Carbon",
    width: 1920,
    height: 1200,
    previewWidth: 540,
    previewHeight: 338,
    notchStyle: "webcam",
    frameStyle: "laptop",
    cornerRadius: 8,
    screenRadius: 3,
    bezelTop: 14,
    bezelSide: 14,
    bezelBottom: 22,
    hingeHeight: 10,
  },
];

export function getDevice(id: string): DeviceInfo {
  return DEVICES.find((d) => d.id === id) ?? DEVICES[0];
}

// ─────────────────────────────────────────────────────────
// Session snapshots (client memory only)
// ─────────────────────────────────────────────────────────

let workspaceSnapshot: string | null = null;
let pendingNewProject=false;
export function beginNewProject(){pendingNewProject=true;}
const sessionProjects=new Map<string,{snapshot:string;createdAt:number;editedAt:number}>();
export function clearSessionProjects(){sessionProjects.clear();workspaceSnapshot=null;pendingNewProject=false;projectCreatedAt=0;projectEditedAt=0;}
export function getSessionProjects(){return [...sessionProjects.entries()].map(([id,p])=>({id,name:JSON.parse(p.snapshot).projectName,icon:'\u25c7',color:'#FFFFFF',createdAt:p.createdAt,lastEdited:p.editedAt}));}
export function activateSessionProject(id:string){const p=sessionProjects.get(id);if(p){workspaceSnapshot=p.snapshot;projectCreatedAt=p.createdAt;projectEditedAt=p.editedAt;}return !!p;}
export function duplicateSessionProject(id:string){const p=sessionProjects.get(id);if(!p)return null;const next=crypto.randomUUID(),data=JSON.parse(p.snapshot);data.projectId=next;data.projectName+=' copy';data.selectedComponentId=null;data.selectedFileId=null;sessionProjects.set(next,{snapshot:JSON.stringify(data),createdAt:Date.now(),editedAt:Date.now()});return getSessionProjects().find(p=>p.id===next)!;}
export function renameSessionProject(id:string,name:string){const p=sessionProjects.get(id);if(!p)return;const state=JSON.parse(p.snapshot);state.projectName=name;p.snapshot=JSON.stringify(state);p.editedAt=Date.now();if(loadPersisted()?.projectId===id)workspaceSnapshot=p.snapshot;}
export function deleteSessionProject(id:string){sessionProjects.delete(id);if(loadPersisted()?.projectId===id)workspaceSnapshot=null;}

let projectCreatedAt=0;
let projectEditedAt=0;

export interface PersistedState {
  projectId:string;
  device: DeviceType;
  productType: ProductType | null;
  designSystem?: DesignApp["designSystem"];
  generationArtifact?:GenerationArtifact;
  projectName: string;
  screens: ScreenFile[];
  components: Record<string, DesignComponent>;
  files: ProjectFile[];
  tokens: DesignTokens;
  messages: ChatMessage[];
  currentScreen: ScreenId;
  selectedComponentId: string | null;
  selectedFileId: string | null;
  centerTab?: CenterTab;
  rightTab?: RightTab;
  zoom?: number;
  fit?: boolean;
  expandedFolders?: Record<string,boolean>;
}

function loadPersisted(): Partial<PersistedState> | null {
  try {
    const raw = workspaceSnapshot;
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistState(s: PersistedState) {
  try {
    workspaceSnapshot = JSON.stringify(s);
    if(s.designSystem) {const old=sessionProjects.get(s.projectId);sessionProjects.set(s.projectId,{snapshot:workspaceSnapshot,createdAt:old?.createdAt??Date.now(),editedAt:Date.now()});}
  } catch {
    // ignore
  }
}

// ─────────────────────────────────────────────────────────
// Initial data
// ─────────────────────────────────────────────────────────

const initialTokens: DesignTokens = {
  background: "#0B0B0B",
  surface: "#0F0F12",
  card: "#141418",
  border: "rgba(255,255,255,0.08)",
  text: "#FFFFFF",
  textMuted: "#7A7A85",
  accent: "#FFFFFF",
  radius: 16,
};

export interface WorkspaceState {
  projectId:string;
  // Persistent project data
  productType: ProductType | null;
  designSystem?: DesignApp["designSystem"];
  generationArtifact?:GenerationArtifact;
  projectName: string;
  components: Record<string, DesignComponent>;
  screens: ScreenFile[];
  files: ProjectFile[];
  tokens: DesignTokens;
  messages: ChatMessage[];

  // Session UI state (not persisted)
  currentScreen: ScreenId;
  centerTab: CenterTab;
  rightTab: RightTab;
  device: DeviceType;
  zoom: number;
  fit: boolean;
  selectedComponentId: string | null;
  selectedFileId: string | null;
  expandedFolders: Record<string, boolean>;
  generating: boolean;
  saveState: SaveState;
  saveError: string | null;
  lastSavedAt: number;

  // History
  past: string[]; // JSON snapshots
  future: string[];

  // Modals / overlays
  modal: ModalState;
  pendingAttachments: Attachment[];
}

type Action =
  | {type:'REFLOW_TEXT';screenId:string;expectedComponents:Record<string,DesignComponent>;positions:Record<string,ComponentPosition>;height:number}
  | { type: "FINISH_TASKS"; success: boolean }
  | { type: "APPLY_DESIGN"; app: DesignApp; generationArtifact?:GenerationArtifact }
  | { type: "UPDATE_COMPONENT_DATA"; id: string; data: Partial<DesignComponent> }
  | { type: "UPDATE_SCREEN_DATA"; id: string; data: Partial<ScreenFile> }
  // Navigation / selection
  | { type: "SELECT_SCREEN"; id: ScreenId }
  | { type: "SET_CENTER_TAB"; tab: CenterTab }
  | { type: "SET_RIGHT_TAB"; tab: RightTab }
  | { type: "SET_DEVICE"; device: DeviceType }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "TOGGLE_FIT" }
  | { type: "SELECT_COMPONENT"; id: string | null }
  | { type: "SELECT_FILE"; id: string | null }
  | { type: "TOGGLE_FOLDER"; folder: string }

  // Mutations (transactable)
  | { type: "BEGIN_TRANSACTION"; label?: string }
  | { type: "COMMIT_TRANSACTION" }
  | { type: "UNDO" }
  | { type: "REDO" }

  // Direct mutations
  | { type: "UPDATE_COMPONENT_STYLES"; id: string; styles: Partial<ComponentStyles>; transient?: boolean }
  | { type: "UPDATE_COMPONENT_NAME"; id: string; name: string }
  | { type: "UPDATE_COMPONENT_POSITION"; id: string; position: DesignComponent["position"] }
  | { type: "UPDATE_COMPONENT_SIZE"; id: string; size: { width: number; height: number } }
  | { type: "MOVE_COMPONENT"; componentId: string; toIndex: number; screenId: ScreenId }
  | { type: "DELETE_COMPONENT"; componentId: string; screenId: ScreenId }
  | { type: "ADD_COMPONENT"; component: DesignComponent; insertIntoScreenId: ScreenId; atIndex?: number }
  | { type:"UPDATE_DESIGN_SYSTEM"; designSystem:DesignApp["designSystem"] }
  | { type:"LINK_COLOR_TOKEN"; key:keyof DesignApp["designSystem"]["colors"] }
  | { type:"REPLACE_COLOR"; from:string; to:string }
  | { type:"REPLACE_FONT"; from:string; to:string }
  | { type: "UPDATE_TOKEN"; key: keyof DesignTokens; value: string | number }
  | { type: "UPDATE_THEME"; theme: Partial<DesignTokens> }
  | { type: "ADD_SCREEN"; screen: ScreenFile; file: ProjectFile; switchTo?: boolean }
  | { type: "DELETE_SCREEN"; screenId: ScreenId }
  | { type: "RENAME_SCREEN"; screenId: ScreenId; label: string }

  // Project
  | { type: "RENAME_PROJECT"; name: string }
  | { type: "RESET_PROJECT" }
  | {type:"CREATE_PROJECT";productType:ProductType;name?:string}
  | {type:"OPEN_PROJECT";id:string}
  | {type:"DUPLICATE_PROJECT"}

  // Chat
  | { type: "SEND_MESSAGE"; message: string; attachments?: Attachment[] }
  | { type: "AI_TYPING"; typing: boolean }
  | { type: "AI_RESPOND"; message: ChatMessage }
  | { type: "CLEAR_CHAT" }

  // Save state
  | { type: "SAVING" }
  | { type: "SAVED" }
  | { type: "SAVE_FAILED"; error: string }
  | { type: "RETRY_SAVE" }

  // Modal
  | { type: "OPEN_MODAL"; modal: ModalState }
  | { type: "CLOSE_MODAL" }

  // Bulk load (for project reset / undo-redo)
  | { type: "HYDRATE"; snapshot: PersistedState }
  | { type: "SET_ATTACHMENTS"; attachments: Attachment[] };

// ─────────────────────────────────────────────────────────
// Persistence helpers — derive a persisted snapshot
// ─────────────────────────────────────────────────────────

export function toPersisted(state: WorkspaceState): PersistedState {
  return {
    projectId:state.projectId,
    device: state.device,
    productType: state.productType,
    designSystem: state.designSystem,
    generationArtifact:state.generationArtifact,
    projectName: state.projectName,
    screens: state.screens,
    components: state.components,
    files: state.files,
    tokens: state.tokens,
    messages: state.messages,
    currentScreen: state.currentScreen,
    selectedComponentId: state.selectedComponentId,
    selectedFileId: state.selectedFileId,
    centerTab:state.centerTab,rightTab:state.rightTab,zoom:state.zoom,fit:state.fit,expandedFolders:state.expandedFolders,
  };
}

function fromPersisted(p: PersistedState): Partial<WorkspaceState> {
  return {
    projectId:p.projectId,
    device: p.device,
    productType: p.productType,
    designSystem: p.designSystem,
    generationArtifact:p.generationArtifact,
    projectName: p.projectName,
    screens: p.screens,
    components: p.components,
    files: p.files,
    tokens: p.tokens,
    messages: p.messages,
    currentScreen: p.currentScreen,
    selectedComponentId: p.selectedComponentId,
    selectedFileId: p.selectedFileId,
    centerTab:p.centerTab??'home',rightTab:p.rightTab??'design',zoom:p.zoom??100,fit:p.fit??true,expandedFolders:p.expandedFolders??{screens:true,components:true,styles:true,assets:true},
  };
}

// ─────────────────────────────────────────────────────────
// Undo/Redo snapshot helpers
// ─────────────────────────────────────────────────────────

function snapshotForUndo(state: WorkspaceState): string {
  return JSON.stringify({
    device: state.device,
    productType: state.productType,
    designSystem: state.designSystem,
    generationArtifact:state.generationArtifact,
    currentScreen: state.currentScreen,
    projectName: state.projectName,
    screens: state.screens,
    components: state.components,
    files: state.files,
    tokens: state.tokens,
    selectedComponentId: state.selectedComponentId,
    selectedFileId: state.selectedFileId,
  });
}

function applySnapshot(state: WorkspaceState, raw: string): WorkspaceState {
  const snap = JSON.parse(raw);
  return {
    ...state,
    device: snap.device??previewConfig(snap.productType).defaultDevice,
    productType: snap.productType,
    designSystem: snap.designSystem,
    generationArtifact:snap.generationArtifact,
    currentScreen: snap.screens.some((screen:ScreenFile)=>screen.id===snap.currentScreen)?snap.currentScreen:snap.screens[0]?.id??"",
    projectName: snap.projectName,
    screens: snap.screens,
    components: snap.components,
    files: snap.files,
    tokens: snap.tokens,
    selectedComponentId: snap.selectedComponentId,
    selectedFileId: snap.selectedFileId,
    saveState: "saving",
  };
}

// Transactions: group multiple mutations into one undo step
let transactionDepth = 0;
let transactionSnapshot: string | null = null;

function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case 'REFLOW_TEXT': {
      if(state.components!==action.expectedComponents || action.height>20000 || Object.values(action.positions).some(p=>(p.height??0)>20000||p.y>20000) || !state.screens.some(s=>s.id===action.screenId))return state;
      // Automatic text sizing belongs to the originating edit's undo step.
      return {...state,components:Object.fromEntries(Object.entries(state.components).map(([id,c])=>[id,action.positions[id]?{...c,position:action.positions[id]}:c])),screens:state.screens.map(s=>s.id===action.screenId?{...s,height:action.height}:s),saveState:'saving'};
    }
    case "FINISH_TASKS":
      return {...state,messages:state.messages.map(m=>({...m,tasks:m.tasks?.map(t=>t.status==="active"?{...t,status:action.success?"done":"pending",label:action.success?t.label:`${t.label} - failed; retry available`}:t)}))};
    case "APPLY_DESIGN": {
      const app = action.app;
      if(!state.designSystem) projectCreatedAt=Date.now();
      projectEditedAt=Date.now();
      const screens = app.screens.map(screen => ({id:screen.id,name:screen.name,label:screen.name,width:screen.width,height:screen.height,background:screen.background,backgroundToken:screen.backgroundToken,components:screen.components.map(c=>c.id),createdAt:state.screens.find(s=>s.id===screen.id)?.createdAt??Date.now()}));
      return pushUndoSnapshot(state, {...state,productType:app.productType,device:state.productType===app.productType?state.device:previewConfig(app.productType).defaultDevice,projectName:app.name,designSystem:app.designSystem,generationArtifact:action.generationArtifact??state.generationArtifact,screens,components:Object.fromEntries(app.screens.flatMap(s=>s.components.map(c=>[c.id,c]))),tokens:{...app.designSystem.colors,radius:app.designSystem.radii[0]??16},files:[],currentScreen:screens.some(s=>s.id===state.currentScreen)?state.currentScreen:screens[0].id,selectedComponentId:null,selectedFileId:null,saveState:"saving"});
    }
    case "UPDATE_COMPONENT_DATA": {
      const c=state.components[action.id];if(!c) return state;
      return pushUndoSnapshot(state,{...state,components:{...state.components,[action.id]:{...c,...action.data,id:c.id}},saveState:"saving"});
    }
    case "UPDATE_SCREEN_DATA":
      return pushUndoSnapshot(state,{...state,screens:state.screens.map(s=>s.id===action.id?{...s,...action.data,id:s.id}:s),saveState:"saving"});

    // ── Navigation ────────────────────────────────────────
    case "SELECT_SCREEN":
      return { ...state, currentScreen: action.id, selectedComponentId: null };
    case "SET_CENTER_TAB":
      return { ...state, centerTab: action.tab };
    case "SET_RIGHT_TAB":
      return { ...state, rightTab: action.tab };
    case "SET_DEVICE":
      if(state.productType && (getDevice(action.device).platform==="laptop") !== (state.productType==="website")) return state;
      return { ...state, device: action.device }; // action.device is a DeviceInfo["id"]
    case "SET_ZOOM":
      return { ...state, zoom: action.zoom, fit: false };
    case "TOGGLE_FIT":
      return { ...state, fit: !state.fit, zoom: state.fit ? state.zoom : 100 };
    case "SELECT_COMPONENT":
      return { ...state, selectedComponentId: action.id };
    case "SELECT_FILE":
      return { ...state, selectedFileId: action.id, rightTab: "files" };
    case "TOGGLE_FOLDER":
      return {
        ...state,
        expandedFolders: {
          ...state.expandedFolders,
          [action.folder]: !(state.expandedFolders[action.folder] ?? true),
        },
      };

    // ── Transactions / Undo/Redo ──────────────────────────
    case "BEGIN_TRANSACTION": {
      if (transactionDepth === 0) {
        transactionSnapshot = snapshotForUndo(state);
      }
      transactionDepth += 1;
      return state;
    }
    case "COMMIT_TRANSACTION": {
      transactionDepth -= 1;
      if (transactionDepth === 0 && transactionSnapshot) {
        const snap = transactionSnapshot;
        transactionSnapshot = null;
        // Only push if state actually changed
        if (snap !== snapshotForUndo(state)) {
          return {
            ...state,
            past: [...state.past.slice(-49), snap],
            future: [],
            saveState: "saving",
          };
        }
      }
      return state;
    }
    case "UNDO": {
      if (state.past.length === 0) return state;
      const last = state.past[state.past.length - 1];
      const futureSnap = snapshotForUndo(state);
      const restored = applySnapshot(state, last);
      return {
        ...restored,
        past: state.past.slice(0, -1),
        future: [...state.future, futureSnap],
      };
    }
    case "REDO": {
      if (state.future.length === 0) return state;
      const next = state.future[state.future.length - 1];
      const pastSnap = snapshotForUndo(state);
      const restored = applySnapshot(state, next);
      return {
        ...restored,
        past: [...state.past, pastSnap],
        future: state.future.slice(0, -1),
      };
    }

    // ── Component mutations ───────────────────────────────
    case "UPDATE_COMPONENT_STYLES": {
      const c = state.components[action.id];
      if (!c) return state;
      if(!componentSchema.shape.styles.safeParse({...c.styles,...action.styles}).success)return state;
      for(const property of ['paddingX','paddingY','gap','margin','radius'] as const){const index=action.styles[`${property}Token`];if(index!==undefined&&(property==='radius'?state.designSystem?.radii:state.designSystem?.spacing)?.[index]===undefined)return state;}
      const newComponents = {
        ...state.components,
        [action.id]: {
          ...c,
          styles: { ...c.styles, ...action.styles },
        },
      };
      const newState: WorkspaceState = {
        ...state,
        components: newComponents,
        saveState: "saving",
      };
      // Transient edits (slider drag) don't push history
      if (action.transient) return newState;
      return pushUndoSnapshot(state, newState);
    }
    case "UPDATE_COMPONENT_NAME": {
      const c = state.components[action.id];
      if (!c) return state;
      return pushUndoSnapshot(state, {
        ...state,
        components: {
          ...state.components,
          [action.id]: { ...c, name: action.name },
        },
        saveState: "saving",
      });
    }
    case "UPDATE_COMPONENT_POSITION": {
      const c = state.components[action.id];
      if (!c) return state;
      return pushUndoSnapshot(state, {
        ...state,
        components: {
          ...state.components,
          [action.id]: { ...c, position: action.position },
        },
        saveState: "saving",
      });
    }
    case "UPDATE_COMPONENT_SIZE": {
      const c = state.components[action.id];
      if (!c) return state;
      return pushUndoSnapshot(state, {
        ...state,
        components: {
          ...state.components,
          [action.id]: { ...c, position: { ...(c.position ?? { x: 0, y: 0 }), ...action.size, height: action.size.height, width: action.size.width } },
        },
        saveState: "saving",
      });
    }
    case "MOVE_COMPONENT": {
      const screen = state.screens.find((s) => s.id === action.screenId);
      if (!screen) return state;
      const components = [...screen.components];
      const idx = components.indexOf(action.componentId);
      if (idx === -1) return state;
      components.splice(idx, 1);
      const newIdx = Math.max(0, Math.min(components.length, action.toIndex));
      components.splice(newIdx, 0, action.componentId);
      return pushUndoSnapshot(state, {
        ...state,
        screens: state.screens.map((s) =>
          s.id === action.screenId ? { ...s, components } : s
        ),
        saveState: "saving",
      });
    }
    case "DELETE_COMPONENT": {
      const screen=state.screens.find(s=>s.id===action.screenId);
      if(!screen) return state;
      const removed=new Set<string>();
      const collect=(id:string)=>{if(removed.has(id))return;removed.add(id);for(const child of state.components[id]?.children??[])collect(child);};
      collect(action.componentId);
      return pushUndoSnapshot(state,{...state,screens:state.screens.map(s=>({...s,components:s.components.filter(id=>!removed.has(id))})),components:Object.fromEntries(Object.entries(state.components).filter(([id])=>!removed.has(id)).map(([id,c])=>[id,{...c,children:c.children?.filter(child=>!removed.has(child)),targetComponentId:c.targetComponentId&&removed.has(c.targetComponentId)?undefined:c.targetComponentId}])),selectedComponentId:state.selectedComponentId&&removed.has(state.selectedComponentId)?null:state.selectedComponentId,saveState:"saving"});
    }
    case "ADD_COMPONENT": {
      const screen = state.screens.find((s) => s.id === action.insertIntoScreenId);
      if (!screen) return state;
      const newScreenComponents = [...screen.components];
      const idx = action.atIndex ?? newScreenComponents.length;
      newScreenComponents.splice(idx, 0, action.component.id);
      return pushUndoSnapshot(state, {
        ...state,
        components: {
          ...state.components,
          [action.component.id]: action.component,
        },
        screens: state.screens.map((s) =>
          s.id === action.insertIntoScreenId ? { ...s, components: newScreenComponents } : s
        ),
        saveState: "saving",
      });
    }

    // ── Tokens ────────────────────────────────────────────
    case "UPDATE_DESIGN_SYSTEM": {
      const parsed=appSchema.shape.designSystem.safeParse(action.designSystem);if(!parsed.success)return state;
      try {validateApp({...workspaceToApp(state),designSystem:parsed.data});}catch{return state;}
      return pushUndoSnapshot(state,{...state,designSystem:parsed.data,tokens:{...state.tokens,...parsed.data.colors},saveState:"saving"});
    }
    case "LINK_COLOR_TOKEN": {
      if(!state.designSystem)return state;
      const value=state.tokens[action.key];
      const components=Object.fromEntries(Object.entries(state.components).map(([id,c])=>{
        const styles={...c.styles};for(const property of ['background','color','borderColor'] as const)if(styles[property]===value)styles[`${property}Token`]=action.key;
        return [id,{...c,styles}];
      }));
      return pushUndoSnapshot(state,{...state,components,screens:state.screens.map(screen=>screen.background===value?{...screen,backgroundToken:action.key}:screen),saveState:"saving"});
    }
    case "REPLACE_COLOR": {
      if(!colorSchema.safeParse(action.to).success)return state;
      const components=Object.fromEntries(Object.entries(state.components).map(([id,c])=>[id,{...c,styles:Object.fromEntries(Object.entries(c.styles).map(([k,v])=>[k,['background','color','borderColor'].includes(k)&&v===action.from?action.to:v]))}]));
      const tokens={...state.tokens};for(const key of COLOR_ROLES)if(tokens[key]===action.from)tokens[key]=action.to;
      return pushUndoSnapshot(state,{...state,components,tokens,designSystem:state.designSystem?{...state.designSystem,colors:{...state.designSystem.colors,...Object.fromEntries(Object.entries(tokens).filter(([,value])=>typeof value==="string"))}}:undefined,screens:state.screens.map(screen=>({...screen,background:screen.background===action.from?action.to:screen.background})),saveState:"saving"});
    }
    case "REPLACE_FONT": {
      if(!action.to.trim()||action.to.length>100)return state;
      const components=Object.fromEntries(Object.entries(state.components).map(([id,c])=>[id,{...c,styles:{...c.styles,...(c.styles.font===action.from?{font:action.to}: {})}}]));
      const typography=state.designSystem?Object.fromEntries(Object.entries(state.designSystem.typography).map(([k,v])=>[k,v===action.from?action.to:v])) as DesignApp['designSystem']['typography']:undefined;
      return pushUndoSnapshot(state,{...state,components,designSystem:state.designSystem&&typography?{...state.designSystem,typography,textStyles:state.designSystem.textStyles?Object.fromEntries(Object.entries(state.designSystem.textStyles).map(([role,style])=>[role,style?{...style,font:style.font===action.from?action.to:style.font}:style])):undefined}:state.designSystem,saveState:"saving"});
    }
    case "UPDATE_TOKEN": {
      if(action.key!=="radius" && !colorSchema.safeParse(action.value).success)return state;
      return pushUndoSnapshot(state, {
        ...state,
        tokens: { ...state.tokens, [action.key]: action.value },
        designSystem:state.designSystem&&action.key!=="radius"?{...state.designSystem,colors:{...state.designSystem.colors,[action.key]:action.value}}:state.designSystem,
        saveState: "saving",
      });
    }
    case "UPDATE_THEME": {
      return pushUndoSnapshot(state, {
        ...state,
        tokens: { ...state.tokens, ...action.theme },
        saveState: "saving",
      });
    }

    // ── Screens ───────────────────────────────────────────
    case "ADD_SCREEN": {
      // Avoid duplicates
      if (state.screens.find((s) => s.id === action.screen.id)) {
        return {
          ...state,
          currentScreen: action.screen.id,
          saveState: "saving",
        };
      }
      const switchTo = action.switchTo !== false;
      return pushUndoSnapshot(state, {
        ...state,
        screens: [...state.screens, action.screen],
        files: [...state.files, action.file],
        currentScreen: switchTo ? action.screen.id : state.currentScreen,
        saveState: "saving",
      });
    }
    case "DELETE_SCREEN": {
      // Don't delete the last remaining screen
      if (state.screens.length <= 1) return state;
      const nextScreen =
        state.currentScreen === action.screenId
          ? state.screens.find((s) => s.id !== action.screenId)?.id ?? state.screens[0].id
          : state.currentScreen;
      return pushUndoSnapshot(state, {
        ...state,
        screens: state.screens.filter((s) => s.id !== action.screenId),
        files: state.files.filter((f) => f.linkedScreenId !== action.screenId),
        currentScreen: nextScreen as ScreenId,
        selectedComponentId: null,
        saveState: "saving",
      });
    }
    case "RENAME_SCREEN": {
      const screen = state.screens.find((s) => s.id === action.screenId);
      if (!screen) return state;
      const newName = action.label.endsWith(".tsx") ? action.label : `${action.label}.tsx`;
      return pushUndoSnapshot(state, {
        ...state,
        screens: state.screens.map((s) =>
          s.id === action.screenId ? { ...s, label: action.label.replace(/\.tsx$/, ""), name: newName } : s
        ),
        files: state.files.map((f) =>
          f.linkedScreenId === action.screenId ? { ...f, name: newName } : f
        ),
        saveState: "saving",
      });
    }

    // ── Project ───────────────────────────────────────────
    case "RENAME_PROJECT":
      return pushUndoSnapshot(state, { ...state, projectName: action.name, saveState: "saving" });
    case "CREATE_PROJECT": return createProjectState(action.productType,action.name);
    case "OPEN_PROJECT": {
      if(!activateSessionProject(action.id))return state;
      return {...buildEmptyState(),...loadPersisted(),selectedComponentId:null,selectedFileId:null,generating:false};
    }
    case "DUPLICATE_PROJECT": {
      return {...structuredClone(state),projectId:crypto.randomUUID(),projectName:state.projectName+' copy',past:[],future:[],modal:{type:'none'},generating:false,pendingAttachments:[],saveState:'saving'};
    }
    case "RESET_PROJECT": {
      sessionProjects.delete(state.projectId);
      workspaceSnapshot=null;
      projectCreatedAt=0;projectEditedAt=0;
      return {
        ...buildEmptyState(),
        past: [],
        future: [],
        saveState: "idle",
        lastSavedAt: 0,
      };
    }

    // ── Chat ──────────────────────────────────────────────
    case "SEND_MESSAGE": {
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: "user",
        content: action.message,
        attachments: action.attachments,
        timestamp: Date.now(),
      };
      return {
        ...state,
        messages: [...state.messages, userMsg],
        pendingAttachments: [],
      };
    }
    case "AI_TYPING":
      return { ...state, generating: action.typing };
    case "AI_RESPOND":
      return { ...state, messages: [...state.messages, action.message] };
    case "CLEAR_CHAT":
      return { ...state, messages: [], past: [], future: [] };

    // ── Save ──────────────────────────────────────────────
    case "SAVING":
      return { ...state, saveState: "saving" };
    case "SAVED":
      return { ...state, saveState: "saved", saveError: null, lastSavedAt: Date.now() };
    case "SAVE_FAILED":
      return { ...state, saveState: "failed", saveError: action.error };
    case "RETRY_SAVE":
      return { ...state, saveState: "saving" };

    // ── Modal ─────────────────────────────────────────────
    case "OPEN_MODAL":
      return { ...state, modal: action.modal };
    case "CLOSE_MODAL":
      return { ...state, modal: { type: "none" } };

    // ── Hydrate / attachments ─────────────────────────────
    case "HYDRATE": {
      const p = action.snapshot;
      return {
        ...(p.projectId===state.projectId?state:buildEmptyState()),
        ...fromPersisted(p),
      };
    }
    case "SET_ATTACHMENTS":
      return { ...state, pendingAttachments: action.attachments };

    default:
      return state;
  }
}

function pushUndoSnapshot(prev: WorkspaceState, next: WorkspaceState): WorkspaceState {
  // If we're in a transaction, don't push — the COMMIT will push the original snapshot
  if (transactionDepth > 0) return next;
  const past = prev.past.slice(-49);
  return {
    ...next,
    past: [...past, snapshotForUndo(prev)],
    future: [],
  };
}

// ─────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────

export function buildEmptyState(): WorkspaceState {

  const base: WorkspaceState = {
    projectId:crypto.randomUUID(),
    productType: null,
    projectName: "",
    currentScreen: "",
    centerTab: "home",
    rightTab: "design",
    device: "iphone-17",
    zoom: 100,
    fit: true,
    selectedComponentId: null,
    selectedFileId: null,
    expandedFolders: { screens: true, components: true, styles: true, assets: true },
    components: {},
    screens: [],
    files: [],
    tokens: initialTokens,
    messages: [],
    generating: false,
    saveState: "idle",
    saveError: null,
    lastSavedAt: 0,
    past: [],
    future: [],
    modal: { type: "none" },
    pendingAttachments: [],
  };


  return base;
}



export function createProjectState(productType:ProductType,name?:string):WorkspaceState {
  const state=buildEmptyState(),id=crypto.randomUUID();
  const app=validateApp({name:name?.trim()||'Untitled project',productType,designSystem:{colors:{background:'#FFFFFF',surface:'#F8F9FA',card:'#FFFFFF',border:'#E5E7EB',text:'#111827',textMuted:'#6B7280',accent:'#2563EB'},typography:{font:'Inter',display:'Inter',mono:'JetBrains Mono'},spacing:[0,4,8,12,16,24,32,48,64],radii:[0,4,8,12,16,24]},screens:[{id,name:'Home',width:productType==='website'?1440:390,height:productType==='website'?900:844,background:'#FFFFFF',backgroundToken:'background',components:[]}]});
  return {...state,productType,projectName:app.name,designSystem:app.designSystem,device:previewConfig(productType).defaultDevice,currentScreen:id,screens:[{...app.screens[0],label:'Home',components:[],createdAt:Date.now()}],tokens:{...app.designSystem.colors,radius:8},saveState:'saving'};
}

function buildInitialState(): WorkspaceState {
  const base=buildEmptyState();
  const persisted=pendingPrompt?null:loadPersisted();
  const initial=persisted?.designSystem ? {...base,...persisted} : base;
  if(pendingNewProject){initial.modal={type:'new-project'};}
  return initial;
}
export function getCurrentProject() {
  const saved=loadPersisted();
  const entry=saved?.projectId?sessionProjects.get(saved.projectId):undefined;
  return saved?.designSystem && saved.screens?.length ? {id:saved.projectId!,name:saved.projectName??"Untitled project",icon:"\u25c7",color:"#FFFFFF",createdAt:entry?.createdAt??projectCreatedAt,lastEdited:entry?.editedAt??projectEditedAt} : null;
}

// ─────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────

interface CtxShape {
  state: WorkspaceState;
  dispatch: Dispatch<Action>;
  // Convenience helpers
  canUndo: boolean;
  canRedo: boolean;
  generateDesign: (prompt:string, modify?:boolean, productType?:ProductType, editScope?:EditScope) => Promise<void>;
}

const WorkspaceCtx = createContext<CtxShape | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const cloud = useProjects();
  const [state, rawDispatch] = useReducer(reducer, undefined, () => {
    const initial=buildInitialState();
    return cloud?.state.active ? {...initial,...cloud.state.active.snapshot,saveState:'saved' as const,lastSavedAt:cloud.state.active.updatedAt} : initial;
  });
  useEffect(()=>{pendingNewProject=false;},[]);
  const epoch=useRef(0),controller=useRef<AbortController|null>(null);
  const projectOperation=useRef(false);
  const pendingCreation=useRef<{key:string;snapshot:PersistedState}|null>(null);
  const dispatch:Dispatch<Action>=useCallback((action:Action)=>{
    if (cloud && ['OPEN_PROJECT','DUPLICATE_PROJECT','RESET_PROJECT','CREATE_PROJECT','RETRY_SAVE'].includes(action.type)) {
      if (action.type==='RETRY_SAVE') {void cloud.store.flush().catch(error=>cloud.store.report(error));return;}
      if(projectOperation.current)return;
      projectOperation.current=true;
      const run=async()=>{
        const latest=latestState.current;
        if(latest.designSystem||latest.messages.length)cloud.store.queue(toPersisted(latest));
        await cloud.store.flush();
        epoch.current++;controller.current?.abort(new DOMException('Project changed.','AbortError'));requestLock.current=false;
        pendingReview.current?.(new Error('Project changed.'));setReviewJob(null);transactionDepth=0;transactionSnapshot=null;
        if(action.type==='OPEN_PROJECT')await cloud.store.open(action.id);
        if(action.type==='DUPLICATE_PROJECT'){const id=await cloud.store.duplicate(latest.projectId);await cloud.store.open(id);}
        if(action.type==='CREATE_PROJECT'){
          const key=latest.projectId+'|'+action.productType+'|'+(action.name??'');
          if(pendingCreation.current?.key!==key)pendingCreation.current={key,snapshot:toPersisted(createProjectState(action.productType,action.name))};
          await cloud.store.create(pendingCreation.current.snapshot);pendingCreation.current=null;
        }
        if(action.type==='RESET_PROJECT'){await cloud.store.remove(latest.projectId);rawDispatch(action);}
      };
      void run().catch(error=>cloud.store.report(error)).finally(()=>{projectOperation.current=false;});return;
    }
    if(action.type==="OPEN_PROJECT"&&!sessionProjects.has(action.id))return;
    if(['CREATE_PROJECT','OPEN_PROJECT','RESET_PROJECT','DUPLICATE_PROJECT'].includes(action.type)){
      if(latestState.current.designSystem){const snapshot=toPersisted(latestState.current);snapshot.messages=snapshot.messages.map(m=>({...m,tasks:m.tasks?.map(t=>t.status==='active'?{...t,status:'pending',label:t.label+' - cancelled when leaving project'}:t)}));persistState(snapshot);}
      epoch.current++;if(controller.current)console.info('[FRAME generation]',{event:'cancelled',source:'project_change'});controller.current?.abort(new DOMException('Project changed.','AbortError'));requestLock.current=false;
      pendingReview.current?.(new Error('Project changed.'));setReviewJob(null);
      transactionDepth=0;transactionSnapshot=null;
    }
    rawDispatch(action);
  },[cloud?.store]);

  const [reviewJob,setReviewJob]=useState<ReviewJob|null>(null);
  const pendingReview=useRef<((e:Error)=>void)|null>(null);
  useEffect(()=>()=>pendingReview.current?.(new Error('Review cancelled.')),[]);
  async function reviewApp(app:DesignApp,screenIds?:string[]):Promise<RenderReview> {
    // jsdom has no layout. Production browsers always take the measured path.
    if(typeof ResizeObserver==='undefined'||!document.fonts||typeof requestAnimationFrame==='undefined')return {issues:[],screenshots:[]};
    const run=()=>{const snapshot:WorkspaceState={...latestState.current,productType:app.productType,designSystem:app.designSystem,tokens:{...app.designSystem.colors,radius:app.designSystem.radii[0]??0},components:Object.fromEntries(app.screens.flatMap(s=>s.components.map(c=>[c.id,c]))),screens:app.screens.filter(s=>!screenIds||screenIds.includes(s.id)).map(s=>({...s,label:s.name,components:s.components.map(c=>c.id),createdAt:0}))};
    return new Promise<RenderReview>((resolve,reject)=>{
      const finish=()=>{clearTimeout(timer);pendingReview.current=null;if(alive.current)setReviewJob(null);};
      const fail=(e:Error)=>{finish();reject(e);};
      const timer=setTimeout(()=>fail(new Error('Browser layout review timed out. Your original prompt and design are preserved.')),25000);
      pendingReview.current=fail;
      setReviewJob({app,snapshot,resolve:r=>{finish();resolve(r);},reject:fail});
    });
    };
    const first=await run();let changed=false;
    for(const repair of first.reflow??[]){const screen=app.screens.find(s=>s.id===repair.screenId)!;
      if(Object.keys(repair.layout.positions).length||repair.layout.height!==screen.height){changed=true;screen.height=repair.layout.height;screen.components=screen.components.map(c=>{const p=repair.layout.positions[c.id];return p?{...c,position:{...c.position,...p,width:p.width??c.position.width,height:p.height??c.position.height}}:c;});}
    }
    if(changed){validateApp(app);return run();}return first;
  }

  const requestLock = useRef(false);
  const latestState=useRef(state);latestState.current=state;
  const alive = useRef(true);
  useEffect(() => { alive.current=true;return () => {alive.current=false;epoch.current++;if(controller.current)console.info('[FRAME generation]',{event:'cancelled',source:'workspace_cleanup'});controller.current?.abort(new DOMException('Workspace closed.','AbortError'));requestLock.current=false;}; }, []);
  async function generateDesign(prompt:string, modify=false, productType?:ProductType,editScope:EditScope='screen') {
    if(requestLock.current) return;
    requestLock.current=true;
    const runEpoch=epoch.current;const active=()=>alive.current&&epoch.current===runEpoch;
    const abort=new AbortController();controller.current=abort;
    productType=productType??state.productType??undefined;
    modify=modify&&Object.keys(state.components).length>0;
    dispatch({type:"SEND_MESSAGE",message:prompt});
    dispatch({type:"AI_TYPING",typing:true});
    dispatch({type:"AI_RESPOND",message:{id:`tasks-${Date.now()}`,role:"assistant",content:modify?"Updating your current design...":"Creating your editable screens...",tasks:[{id:"request",label:modify?"Apply instruction to the current screen and design":"Generate all requested screens and editable components",status:"active"}],timestamp:Date.now()}});
    const generationRunId=crypto.randomUUID();
    const run={projectId:state.projectId,generationRunId,idempotencyKey:generationRunId,originalPrompt:prompt};
    const startedAt=Date.now();
    const onStage=async(stage:import('../../shared/generationProgress').GenerationStage)=>{if(!active())return;dispatch({type:'AI_RESPOND',message:{id:'stage-'+generationRunId+'-'+stage,role:'assistant',content:stage.replace(/-/g,' ')+' - '+Math.round((Date.now()-startedAt)/1000)+'s elapsed',timestamp:Date.now()}});if(cloud)await cloud.store.updateGeneration(run,stage);};
    const before=JSON.stringify({screens:state.screens,components:state.components,tokens:state.tokens,designSystem:state.designSystem,name:state.projectName,productType:state.productType});
    try {
      if(cloud)await cloud.store.startGeneration(run);
      let result=await requestDesign(prompt,modify?workspaceToApp(state):undefined,state.currentScreen,productType,undefined,abort.signal,{editScope,projectId:state.projectId,generationRunId,idempotencyKey:generationRunId,generationArtifact:modify?state.generationArtifact:undefined,onStage});
      if(!active())return;
      await onStage('render-review');
      let quality:RenderReview={issues:[],screenshots:[]};
      let visualReviewedIds:string[]=[];
      const reviewScreenIds=modify&&editScope==='screen'?[state.currentScreen]:result.app.screens.map(s=>s.id);
      if(modify&&editScope==='screen')result.app=mergeScreenEdit(workspaceToApp(state),result.app,reviewScreenIds);
      if(!modify||designPolicy.quality.reviewModifications){
        quality=await reviewApp(result.app,reviewScreenIds);
        if(!active())return;
        if(quality.visualReview||quality.issues.some(i=>i.severity==='error'||i.code==='contrast'||i.code==='empty-area'||i.code==='navigation'||i.code==='spacing'&&i.detail.includes('Peer control row'))){
          dispatch({type:'AI_RESPOND',message:{id:`review-${Date.now()}`,role:'assistant',content:'Checking the rendered layout and correcting measured issues...',timestamp:Date.now()}});
          result=await requestDesign(prompt,result.app,undefined,productType,quality,abort.signal,{projectId:state.projectId,generationRunId,idempotencyKey:generationRunId,generationArtifact:result.generationArtifact,onStage});
          if(!active())return;
          visualReviewedIds=quality.screenshots.map(s=>s.screenId);
          quality=await reviewApp(result.app,reviewScreenIds); // One bounded correction, never a retry loop.
        }
        if(quality.issues.some(i=>i.severity==='error'))throw new DesignRequestError('The rendered design still has clipping or overflow after one correction: '+quality.issues.filter(i=>i.severity==='error').slice(0,3).map(i=>i.screenId+'/'+i.componentIds.join(',')+' ('+i.code+')').join('; ')+'. Your prompt and existing design are preserved.',false,'RENDER_QUALITY');
      }
      if(!active()) return;
      const latest=latestState.current;
      if(before!==JSON.stringify({screens:latest.screens,components:latest.components,tokens:latest.tokens,designSystem:latest.designSystem,name:latest.projectName,productType:latest.productType})) throw new Error("The design changed while generation was running. Your edits have been kept. Retry to apply the instruction to your latest design.");
      await onStage('save');
      dispatch({type:"FINISH_TASKS",success:true});
      if(result.generationArtifact){result.generationArtifact.validationSummary={...result.generationArtifact.validationSummary,render:'measured',measuredScreenIds:reviewScreenIds};result.generationArtifact.warnings=[...result.generationArtifact.warnings,...quality.issues.map(i=>(i.screenId+': '+i.code+': '+i.detail).slice(0,1000))].slice(0,100);result.generationArtifact.status=result.generationArtifact.warnings.length?'partial':'complete';}
      dispatch({type:"APPLY_DESIGN",app:result.app,generationArtifact:result.generationArtifact});
      dispatch({type:"AI_RESPOND",message:{id:`done-${Date.now()}`,role:"assistant",content:(result.generationArtifact?.status==='partial'?'Partial result. ':'')+result.message+(result.generationArtifact?.warnings.length?'\n'+result.generationArtifact.warnings.join('\n'):'')+(visualReviewedIds.length?' Rendered captures reviewed for '+visualReviewedIds.join(', ')+'.':'')+(quality.issues.length?' Browser review flagged '+quality.issues.length+' advisory layout/asset issues; review these before publishing.':''),tasks:result.app.screens.map(s=>({id:s.id,label:s.name,status:"done"})),timestamp:Date.now()}});
    } catch(e) {
      if(cloud)try{await cloud.store.failGeneration(run,{code:e instanceof DesignRequestError?e.code??"GENERATION_FAILED":"GENERATION_FAILED",message:e instanceof Error?e.message:"Generation failed."});}catch(saveError){cloud.store.report(saveError);}
      if(active()) dispatch({type:"FINISH_TASKS",success:false});
      if(active()) dispatch({type:"AI_RESPOND",message:{retryPrompt:prompt,retryModify:modify,retryProductType:productType,retryEditScope:editScope,retryable:e instanceof DesignRequestError?e.retryable:true,id:`error-${Date.now()}`,role:"assistant",content:e instanceof Error?e.message:"Generation failed. Your prompt is preserved.",timestamp:Date.now()}});
    } finally { if(active()){requestLock.current=false;controller.current=null;dispatch({type:"AI_TYPING",typing:false});} }
  }
  useEffect(() => {
    // StrictMode probes setup/cleanup synchronously. Consume the prompt only after
    // the committed mount survives that probe; never start an already-cancelled fetch.
    const timer=setTimeout(()=>{const prompt=takePrompt();if(prompt)void generateDesign(prompt.prompt,false,prompt.productType);},0);
    return ()=>clearTimeout(timer);
  }, []);

  useEffect(() => { if(!cloud && state.designSystem) persistState(toPersisted(state)); }, [state,cloud?.store]);

  // Feed the real editor snapshot to the page-lifetime autosave queue. The
  // queue journals immediately and survives home/workspace navigation.
  const cloudSnapshot = JSON.stringify(toPersisted(state));
  useEffect(()=>{
    if(!cloud || cloud.state.loading || (!state.designSystem && !state.messages.length))return;
    try{cloud.store.queue(JSON.parse(cloudSnapshot));}catch(error){cloud.store.report(error);}
  },[cloud?.store,cloud?.state.loading,cloudSnapshot]);
  useEffect(()=>()=>{
    if(!cloud)return;
    if(cloud.store.state.uid!==cloud.state.uid)return;
    const latest=latestState.current;
    try{if(latest.designSystem||latest.messages.length)cloud.store.queue(toPersisted(latest));void cloud.store.flush().catch(error=>cloud.store.report(error));}catch(error){cloud.store.report(error);}
  },[cloud?.store]);
  useEffect(()=>{
    const active=cloud?.state.active;
    if(!active||active.id===latestState.current.projectId)return;
    epoch.current++;controller.current?.abort(new DOMException('Project changed.','AbortError'));requestLock.current=false;
    rawDispatch({type:'HYDRATE',snapshot:active.snapshot});
  },[cloud?.state.active?.id]);
  useEffect(()=>{
    if(!cloud)return;
    const status=cloud.state.saves[state.projectId];
    if(status==='saving'&&state.saveState!=='saving')rawDispatch({type:'SAVING'});
    if(status==='saved'&&state.saveState!=='saved')rawDispatch({type:'SAVED'});
    if(status==='failed'&&state.saveState!=='failed')rawDispatch({type:'SAVE_FAILED',error:cloud.state.error||'Save failed. Please retry.'});
  },[cloud?.state.saves,state.projectId,state.saveState]);

  // Session snapshot observer — when state.saveState is "saving", keep the client-memory snapshot
  useEffect(() => {
    if (cloud || state.saveState !== "saving") return;
    const t = setTimeout(() => {
      try {
        persistState(toPersisted(state));
        dispatch({ type: "SAVED" });
      } catch (e) {
        dispatch({
          type: "SAVE_FAILED",
          error: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }, 700);
    return () => clearTimeout(t);
  }, [state.saveState, state,cloud?.store]);

  return (
    <WorkspaceCtx.Provider
      value={{
        state,
        dispatch,
        canUndo: state.past.length > 0,
        canRedo: state.future.length > 0,
        generateDesign,
      }}
    >
      {children}
      {reviewJob&&<RenderedDesignReview job={reviewJob}/>}
    </WorkspaceCtx.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceCtx);
  if (!ctx) throw new Error("useWorkspace must be inside WorkspaceProvider");
  return ctx;
}

// ─────────────────────────────────────────────────────────
// Design serialization — converts free-form text to structured actions
// ─────────────────────────────────────────────────────────

export function workspaceToApp(state: WorkspaceState): DesignApp {
  if(!state.designSystem) throw new Error("Generate an app from the main workspace before requesting AI changes.");
  if(!state.productType) throw new Error("Generate a design before requesting modifications.");
  return {productType:state.productType,name:state.projectName,designSystem:{...state.designSystem,colors:{...state.designSystem.colors,...Object.fromEntries(Object.entries(state.tokens).filter(([,value])=>typeof value==="string"))}},screens:state.screens.map(s=>({id:s.id,name:s.label,...screenDimensions(s,state.productType),background:s.background??state.tokens.background,backgroundToken:s.backgroundToken,components:s.components.map(id=>state.components[id]).filter(Boolean) as DesignApp["screens"][number]["components"]}))};
}
