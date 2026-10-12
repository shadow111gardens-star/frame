import { getSessionProjects, activateSessionProject, renameSessionProject, deleteSessionProject, duplicateSessionProject } from "../workspace/store";
import { buildEmptyState, toPersisted, type PersistedState } from '../workspace/store';
import { useProjects } from '../projects/ProjectsProvider';
import { beginGeneration } from '../design/api';
import type { ProductType } from '../../shared/product';
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
  Dispatch,
  useRef,
} from "react";
import type {
  Credits,
  GenerationStep,
  HomeChat,
  HomeChatMessage,
  HomeModal,
  HomeProject,
  HomeSettings,
  SettingsSection,
} from "./types";

// ─────────────────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────────────────

const STORAGE_KEY = "frame.home.v1";

interface PersistedHome {
  projects: HomeProject[];
  chats: HomeChat[];
  currentChatId: string | null;
  settings: HomeSettings;
  credits: Credits;
  authed: boolean;
}

function loadPersisted(): Partial<PersistedHome> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persist(s: PersistedHome) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

// ─────────────────────────────────────────────────────────
// Initial data
// ─────────────────────────────────────────────────────────

const defaultSettings: HomeSettings = {
  theme: "dark",
  accent: "white",
  aiTone: "balanced",
  aiModel: "server-configured",
  notifications: {
    projectUpdates: true,
    weeklyDigest: false,
    newFeatures: true,
  },
  email: "",
  displayName: "",
};

const initialProjects: HomeProject[] = [];

const initialChats: HomeChat[] = [];

const initialCredits: Credits = {total:0,remaining:0,resetAt:0,history:[]};

export interface HomeState extends PersistedHome {
  collapsedSidebar: boolean;
  mobileSidebarOpen: boolean;
  modal: HomeModal;
  prompt: string;
  promptFocused: boolean;
  generating: boolean;
  generationSteps: GenerationStep[];
  routingTo: string | null; // project id to switch to when generation finishes
}

type Action =
  // Sidebar
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "SET_SIDEBAR"; collapsed: boolean }
  | { type: "SET_MOBILE_SIDEBAR"; open: boolean }
  // Projects
  | { type: "ADD_PROJECT"; project: HomeProject }
  | { type: "RENAME_PROJECT"; id: string; name: string }
  | { type: "DELETE_PROJECT"; id: string }
  | { type: "DUPLICATE_PROJECT"; id: string }
  | { type: "TOGGLE_FAVORITE"; id: string }
  // Chats
  | { type: "NEW_CHAT" }
  | { type: "DELETE_CHAT"; id: string }
  | { type: "ADD_CHAT_MESSAGE"; chatId: string; message: HomeChatMessage }
  // Settings
  | { type: "OPEN_MODAL"; modal: HomeModal }
  | { type: "CLOSE_MODAL" }
  | { type: "UPDATE_SETTINGS"; partial: Partial<HomeSettings> }
  | { type: "UPDATE_NOTIFICATIONS"; partial: Partial<HomeSettings["notifications"]> }
  | { type: "SETTINGS_SECTION"; section: SettingsSection }
  // Prompt
  | { type: "SET_PROMPT"; value: string }
  | { type: "CLEAR_PROMPT" }
  | { type: "SET_PROMPT_FOCUSED"; value: boolean }
  // Generation
  | { type: "START_GENERATION"; prompt: string; routingTo: string }
  | { type: "STEP_ACTIVE"; id: string }
  | { type: "STEP_DONE"; id: string }
  | { type: "GENERATION_DONE" }
  | { type: "GENERATION_FAILED"; error: string }
  // Credits
  | { type: "USE_CREDITS"; amount: number; label: string }
  // Auth
  | { type: "LOGIN" }
  | { type: "LOGOUT" }
  // Hydration
  | { type: "HYDRATE"; snapshot: Partial<PersistedHome> };

function buildHomeState(): HomeState {
  const persisted = loadPersisted();
  const projects=getSessionProjects();
  const base: HomeState = {
    projects: initialProjects,
    chats: initialChats,
    currentChatId: null,
    settings: defaultSettings,
    credits: initialCredits,
    authed: true,
    collapsedSidebar: false,
    mobileSidebarOpen: false,
    modal: { type: "none" },
    prompt: "",
    promptFocused: false,
    generating: false,
    generationSteps: [],
    routingTo: null,
  };
  if (persisted) {
    return {
      ...base,
      ...persisted,
      projects,
      chats:[],
      currentChatId:null,
      credits:initialCredits,
      settings:{...defaultSettings,...persisted.settings,aiModel:"server-configured",email:persisted.settings?.email==="alex@frame.studio"?"":persisted.settings?.email??"",displayName:persisted.settings?.displayName==="Alex Carter"?"":persisted.settings?.displayName??""},
      collapsedSidebar: false,
      mobileSidebarOpen: false,
      modal: { type: "none" },
      prompt: "",
      promptFocused: false,
      generating: false,
      generationSteps: [],
      routingTo: null,
    };
  }
  return {...base,projects};
}

function reducer(state: HomeState, action: Action): HomeState {
  switch (action.type) {
    case "TOGGLE_SIDEBAR":
      return { ...state, collapsedSidebar: !state.collapsedSidebar };
    case "SET_SIDEBAR":
      return { ...state, collapsedSidebar: action.collapsed };
    case "SET_MOBILE_SIDEBAR":
      return { ...state, mobileSidebarOpen: action.open };

    // Projects
    case "ADD_PROJECT":
      return {
        ...state,
        projects: [action.project, ...state.projects],
      };
    case "RENAME_PROJECT":
      renameSessionProject(action.id,action.name);
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.id ? { ...p, name: action.name, lastEdited: Date.now() } : p
        ),
      };
    case "DELETE_PROJECT":
      deleteSessionProject(action.id);
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.id),
        chats: state.chats.map((c) =>
          c.projectId === action.id ? { ...c, projectId: undefined } : c
        ),
        modal: { type: "none" },
      };
    case "DUPLICATE_PROJECT": {
      const copy=duplicateSessionProject(action.id);
      return copy?{...state,projects:[copy,...state.projects],modal:{type:'none'}}:state;
    }

    case "TOGGLE_FAVORITE":
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.id ? { ...p, favorite: !p.favorite } : p
        ),
      };

    // Chats
    case "NEW_CHAT":
      return {
        ...state,
        currentChatId: null,
        prompt: "",
        promptFocused: false,
        modal: { type: "none" },
      };
    case "DELETE_CHAT":
      return {
        ...state,
        chats: state.chats.filter((c) => c.id !== action.id),
        currentChatId:
          state.currentChatId === action.id ? null : state.currentChatId,
      };
    case "ADD_CHAT_MESSAGE":
      return {
        ...state,
        chats: state.chats.map((c) =>
          c.id === action.chatId
            ? { ...c, messages: [...c.messages, action.message] }
            : c
        ),
      };

    // Settings
    case "OPEN_MODAL":
      return { ...state, modal: action.modal };
    case "CLOSE_MODAL":
      return { ...state, modal: { type: "none" } };
    case "UPDATE_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.partial } };
    case "UPDATE_NOTIFICATIONS":
      return {
        ...state,
        settings: {
          ...state.settings,
          notifications: { ...state.settings.notifications, ...action.partial },
        },
      };
    case "SETTINGS_SECTION":
      return {
        ...state,
        modal: { type: "settings", section: action.section },
      };

    // Prompt
    case "SET_PROMPT":
      return { ...state, prompt: action.value };
    case "CLEAR_PROMPT":
      return { ...state, prompt: "" };
    case "SET_PROMPT_FOCUSED":
      return { ...state, promptFocused: action.value };

    // Generation
    case "START_GENERATION": {
      const steps: GenerationStep[] = [
        { id: "s1", label: "Understanding your idea", status: "active" },
        
        { id: "s3", label: "Designing your app", status: "pending" },
        { id: "s4", label: "Creating screens", status: "pending" },
        { id: "s5", label: "Preparing your workspace", status: "pending" },
      ];
      // Add chat
      const chat: HomeChat = {
        id: `chat-${Date.now()}`,
        title: action.prompt.slice(0, 60),
        messages: [
          {
            id: `m-${Date.now()}`,
            role: "user",
            content: action.prompt,
            timestamp: Date.now(),
          },
        ],
        projectId: action.routingTo,
        createdAt: Date.now(),
      };
      return {
        ...state,
        generating: true,
        generationSteps: steps,
        routingTo: action.routingTo,
        chats: [chat, ...state.chats],
        currentChatId: chat.id,
        prompt: "",
      };
    }
    case "STEP_ACTIVE":
      return {
        ...state,
        generationSteps: state.generationSteps.map((s) =>
          s.id === action.id ? { ...s, status: "active" } : s
        ),
      };
    case "STEP_DONE":
      return {
        ...state,
        generationSteps: state.generationSteps.map((s) =>
          s.id === action.id ? { ...s, status: "done" } : s
        ),
      };
    case "GENERATION_DONE":
      return {
        ...state,
        generating: false,
        generationSteps: state.generationSteps.map((s) => ({
          ...s,
          status: "done",
        })),
        routingTo: null,
      };
    case "GENERATION_FAILED":
      return {
        ...state,
        generating: false,
        routingTo: null,
      };

    // Credits
    case "USE_CREDITS": {
      const remaining = Math.max(0, state.credits.remaining - action.amount);
      const history = [
        {
          id: `c-${Date.now()}`,
          amount: -action.amount,
          label: action.label,
          at: Date.now(),
        },
        ...state.credits.history,
      ].slice(0, 50);
      return {
        ...state,
        credits: { ...state.credits, remaining, history },
      };
    }

    // Auth
    case "LOGIN":
      return { ...state, authed: true };
    case "LOGOUT":
      return {
        ...state,
        authed: false,
        modal: { type: "none" },
      };

    case "HYDRATE":
      return { ...state, ...action.snapshot };
    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────

interface CtxShape {
  state: HomeState;
  dispatch: Dispatch<Action>;
  projectsLoading: boolean;
  startProject: (prompt: string, productType: ProductType) => Promise<void>;
  openProject: (id: string) => Promise<void>;
}

const HomeCtx = createContext<CtxShape | null>(null);

export function HomeProvider({ children }: { children: ReactNode }) {
  const cloud = useProjects();
  const [state, rawDispatch] = useReducer(reducer, undefined, buildHomeState);
  const draft = useRef<{uid:string;prompt:string;type:ProductType;snapshot:PersistedState}|null>(null);
  const projectOperation=useRef(false);
  const dispatch: Dispatch<Action> = action => {
    if (cloud && ['RENAME_PROJECT','DELETE_PROJECT','DUPLICATE_PROJECT','TOGGLE_FAVORITE'].includes(action.type)) {
      if(projectOperation.current)return;
      projectOperation.current=true;
      const run = async () => {
        if (action.type === 'RENAME_PROJECT') await cloud.store.rename(action.id, action.name);
        if (action.type === 'DELETE_PROJECT') await cloud.store.remove(action.id);
        if (action.type === 'DUPLICATE_PROJECT') await cloud.store.duplicate(action.id);
        if (action.type === 'TOGGLE_FAVORITE') await cloud.store.favorite(action.id);
        rawDispatch({type:'CLOSE_MODAL'});
      };
      void run().catch(error => cloud.store.report(error)).finally(()=>{projectOperation.current=false;});
      return;
    }
    rawDispatch(action);
  };
  const openProject = async (id:string) => {
    if (cloud) {
      const uid=cloud.state.uid;
      try { await cloud.store.open(id); } catch(error) { cloud.store.report(error); throw error; }
      if(cloud.store.state.uid!==uid)throw new Error('The account changed.');
    } else activateSessionProject(id);
    window.location.hash = 'workspace';
  };
  const startProject = async (prompt:string, productType:ProductType) => {
    if (cloud) {
      const uid = cloud.state.uid;
      if (!uid || cloud.state.loading) throw new Error('Wait until your projects have loaded.');
      if (!draft.current || draft.current.uid !== uid || draft.current.prompt !== prompt || draft.current.type !== productType) {
        const empty = buildEmptyState();
        draft.current = { uid, prompt, type:productType, snapshot:toPersisted({...empty, projectName:prompt.trim().slice(0,60),productType}) };
      }
      try { await cloud.store.create(draft.current.snapshot, prompt); } catch(error) { cloud.store.report(error); throw error; }
      if(cloud.store.state.uid!==uid)throw new Error('The account changed.');
    }
    beginGeneration(prompt, productType);
    window.location.hash = 'workspace';
  };
  const displayState = cloud ? { ...state, projects: cloud.state.projects.filter(p=>p.status!=='deleting').map(p=>({id:p.id,name:p.title,icon:'\u25c7',color:'#FFFFFF',createdAt:p.createdAt,lastEdited:p.updatedAt,favorite:p.favorite})),chats:[],currentChatId:null } : state;

  // Persist
  useEffect(() => {
    const t = setTimeout(() => {
      persist({
        projects: cloud ? [] : state.projects,
        chats: cloud ? [] : state.chats,
        currentChatId: state.currentChatId,
        settings: state.settings,
        credits: state.credits,
        authed: state.authed,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [
    state.projects,
    state.chats,
    state.currentChatId,
    state.settings,
    state.credits,
    state.authed,
  ]);

  return <HomeCtx.Provider value={{ state:displayState, dispatch, projectsLoading:!!cloud?.state.loading || !!cloud?.state.opening, startProject, openProject }}>{children}</HomeCtx.Provider>;
}

export function useHome() {
  const ctx = useContext(HomeCtx);
  if (!ctx) throw new Error("useHome must be inside HomeProvider");
  return ctx;
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = 60 * 1000;
  const h = 60 * m;
  const d = 24 * h;
  if (diff < m) return "just now";
  if (diff < h) return `${Math.floor(diff / m)}m ago`;
  if (diff < d) return `${Math.floor(diff / h)}h ago`;
  if (diff < 7 * d) return `${Math.floor(diff / d)}d ago`;
  return new Date(ts).toLocaleDateString();
}
