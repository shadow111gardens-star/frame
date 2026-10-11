// Core types for the FRAME workspace

export type ScreenId =
  | "home"
  | "onboarding"
  | "activity"
  | "progress"
  | "profile"
  | string; // allow custom screen ids

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  retryPrompt?: string;
  retryModify?: boolean;
  retryEditScope?: import('../../shared/editScope').EditScope;
  retryProductType?: import("../../shared/product").ProductType;
  retryable?: boolean;
  tasks?: AgentTask[];
  attachments?: Attachment[];
  timestamp: number;
}

export interface AgentTask {
  id: string;
  label: string;
  status: "pending" | "active" | "done";
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
}

export interface ComponentPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export type ComponentStyles = import("../../shared/design").DesignApp["screens"][number]["components"][number]["styles"];

export interface DesignComponent {
  targetScreenId?: string;
  targetComponentId?: string;
  id: string;
  type: string; // mobile: Header, ActivityCard, etc. web: WebHeader, WebHero, etc.
  name: string;
  text?: string;
  source?: string;
  icon?: string;
  children?: string[];
  value?: number;
  values?: number[];
  description?: string;
  styles: ComponentStyles;
  position?: ComponentPosition;
}

export interface ScreenFile {
  backgroundToken?: keyof import("../../shared/design").DesignApp["designSystem"]["colors"];
  id: ScreenId;
  name: string;
  label: string;
  description?: string;
  width?: number;
  height?: number;
  background?: string;
  components: string[];
  createdAt: number;
}

export interface ProjectFile {
  id: string;
  name: string;
  type: "tsx" | "ts" | "css" | "json";
  folder: "screens" | "components" | "assets" | "styles";
  content: string;
  linkedScreenId?: ScreenId;
  linkedComponentId?: string;
}

export interface DesignTokens {
  background: string;
  surface: string;
  card?: string;
  border: string;
  text: string;
  textMuted: string;
  accent?: string;
  primary?: string;
  secondary?: string;
  success?: string;
  warning?: string;
  error?: string;
  radius: number;
}

export type DevicePlatform = "ios" | "android" | "laptop";

export interface DeviceInfo {
  id: string;
  platform: DevicePlatform;
  label: string;
  shortLabel?: string;
  // Logical viewport in points / pixels
  width: number;
  height: number;
  // Preview size in CSS pixels (scaled to fit canvas)
  previewWidth: number;
  previewHeight: number;
  // Visual style of the front sensor / notch (mobile) or webcam (laptop)
  notchStyle: "dynamic-island" | "notch" | "punch-hole" | "punch-hole-center" | "none" | "webcam";
  // Frame style — mobile or laptop
  frameStyle?: "mobile" | "laptop";
  cornerRadius: number; // frame outer radius (mobile) — for laptop, the lid corner radius
  screenRadius: number; // screen inner radius
  // Laptop-specific
  bezelTop?: number; // top bezel height (for webcam)
  bezelSide?: number; // left/right bezel
  bezelBottom?: number; // bottom bezel (chin)
  hingeHeight?: number; // height of the hinge/stand below
}

export type DeviceType = string; // accepts any DeviceInfo["id"]

export type RightTab = "design" | "files";
export type CenterTab = "home" | "prototype";

export type SaveState = "idle" | "saving" | "saved" | "failed";

export interface ModalState {
  type:
    | "none"
    | "project-menu"
    | "rename-project"
    | "new-screen"
    | "new-project"
    | "export"
    | "share"
    | "confirm-delete-project";
  data?: unknown;
}

// ─── AI Action System ─────────────────────────────────

export type AIAction =
  | { type: "CREATE_SCREEN"; label: string; description?: string }
  | { type: "DELETE_SCREEN"; screenId: ScreenId }
  | { type: "RENAME_SCREEN"; screenId: ScreenId; label: string }
  | { type: "CREATE_COMPONENT"; component: Omit<DesignComponent, "id">; insertIntoScreenId?: ScreenId }
  | { type: "DELETE_COMPONENT"; componentId: string }
  | { type: "UPDATE_COMPONENT_STYLES"; componentId: string; styles: Partial<ComponentStyles> }
  | { type: "MOVE_COMPONENT"; componentId: string; position: ComponentPosition }
  | { type: "RESIZE_COMPONENT"; componentId: string; size: { width: number; height: number } }
  | { type: "UPDATE_TOKEN"; key: keyof DesignTokens; value: string | number }
  | { type: "UPDATE_THEME"; theme: Partial<DesignTokens> }
  | { type: "CREATE_FILE"; file: ProjectFile }
  | { type: "UPDATE_FILE"; fileId: string; content: string };
