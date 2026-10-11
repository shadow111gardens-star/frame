// Types for the FRAME Main Workspace / Home screen

export interface HomeProject {
  id: string;
  name: string;
  icon: string; // emoji or letter
  color: string; // tint color (silver/gray palette)
  lastEdited: number;
  createdAt: number;
  description?: string;
  favorite?: boolean;
  archived?: boolean;
}

export interface HomeChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface HomeChat {
  id: string;
  title: string;
  messages: HomeChatMessage[];
  projectId?: string;
  createdAt: number;
}

export type SettingsSection =
  | "account"
  | "appearance"
  | "ai"
  | "notifications"
  | "billing";

export interface HomeSettings {
  theme: "dark"; // FRAME is dark-only
  accent: "white" | "sky" | "mint";
  aiTone: "concise" | "balanced" | "detailed";
  aiModel: "server-configured";
  notifications: {
    projectUpdates: boolean;
    weeklyDigest: boolean;
    newFeatures: boolean;
  };
  email: string;
  displayName: string;
}

export interface Credits {
  total: number;
  remaining: number;
  resetAt: number;
  history: { id: string; amount: number; label: string; at: number }[];
}

export type HomeModal =
  | { type: "none" }
  | { type: "settings"; section?: SettingsSection }
  | { type: "rename-project"; projectId: string }
  | { type: "confirm-delete"; projectId: string }
  | { type: "project-menu"; projectId: string }
  | { type: "logout" }
  | { type: "templates" }
  | { type: "import" }
  | { type: "credits-billing" };

export interface GenerationStep {
  id: string;
  label: string;
  status: "pending" | "active" | "done";
}