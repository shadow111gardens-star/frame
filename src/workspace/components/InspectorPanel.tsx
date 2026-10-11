import {DesignPropertiesPanel} from "./DesignPropertiesPanel";
import { useWorkspace } from "../store";
import type { RightTab } from "../types";

const TABS: { id: RightTab; label: string }[] = [
  { id: "design", label: "Design" },
  { id: "files", label: "Files" },
];

export function InspectorPanel() {
  const { state, dispatch } = useWorkspace();

  return (
    <aside className="h-full flex flex-col bg-[#0A0A0D] border-l border-white/[0.06]">
      {/* Tab header */}
      <div className="px-3 pt-3 border-b border-white/[0.06]">
        <div className="flex items-center bg-white/[0.02] border border-white/[0.06] rounded-md p-0.5 mb-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => dispatch({ type: "SET_RIGHT_TAB", tab: t.id })}
              className={`flex-1 px-2.5 py-1.5 text-[11.5px] rounded transition-all ${
                state.rightTab === t.id
                  ? "bg-white text-black"
                  : "text-white/55 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto ws-scrollbar">
        {state.rightTab === "design" ? (
          <DesignPropertiesPanel />
        ) : (
          <FilesTab />
        )}
      </div>
    </aside>
  );
}

function FilesTab() {
  const { state, dispatch } = useWorkspace();
  const folders: Array<"screens" | "components" | "assets" | "styles"> = [
    "screens",
    "components",
    "assets",
    "styles",
  ];

  return (
    <div className="p-2">
      {/* Project label */}
      <div className="px-2 py-2 mb-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-mono mb-1.5">
          Project
        </div>
        <button className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors">
          <div className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/55">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
            <span className="text-[12px] text-white/85 font-medium">{state.projectName}</span>
          </div>
          <span className="text-[10px] text-white/30 font-mono">{state.files.length} files</span>
        </button>
      </div>

      {folders.map((folder) => {
        const files = state.files.filter((f) => f.folder === folder);
        if (files.length === 0) return null;
        const expanded = state.expandedFolders[folder] ?? true;
        return (
          <div key={folder} className="mb-1">
            <button
              onClick={() => dispatch({ type: "TOGGLE_FOLDER", folder })}
              className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-white/[0.03] rounded-md transition-colors"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`text-white/35 transition-transform ${expanded ? "rotate-90" : ""}`}
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
              <span className="text-[10.5px] text-white/45 font-mono">{folder}/</span>
              <span className="text-[10px] text-white/25 font-mono ml-auto">
                {files.length}
              </span>
            </button>
            {expanded &&
              files.map((f) => {
                const selected = state.selectedFileId === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => dispatch({ type: "SELECT_FILE", id: f.id })}
                    className={`w-full flex items-center justify-between pl-5 pr-2 py-1.5 rounded-md text-[12px] transition-colors ${
                      selected
                        ? "bg-white/[0.05] text-white"
                        : "text-white/65 hover:text-white hover:bg-white/[0.025]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <FileIcon type={f.type} />
                      <span className="font-mono text-[11.5px]">{f.name}</span>
                    </div>
                  </button>
                );
              })}
          </div>
        );
      })}

      {/* Selected file preview */}
      {state.selectedFileId && (
        <div className="mx-2 mt-4 rounded-md border border-white/[0.06] bg-black/30 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.06]">
            <span className="text-[11px] text-white/70 font-mono">
              {state.files.find((f) => f.id === state.selectedFileId)?.name}
            </span>
            <span className="text-[9.5px] text-white/30 font-mono">
              {state.files.find((f) => f.id === state.selectedFileId)?.type}
            </span>
          </div>
          <pre className="p-3 ws-code-block max-h-44 overflow-y-auto ws-scrollbar text-[10.5px]">
            <code
              dangerouslySetInnerHTML={{
                __html: highlightCode(
                  state.files.find((f) => f.id === state.selectedFileId)?.content ?? ""
                ),
              }}
            />
          </pre>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────
// Sub-components
// ───────────────────────────────────────

function FileIcon({ type }: { type: "tsx" | "ts" | "css" | "json" }) {
  const colors: Record<string, string> = {
    tsx: "text-sky-300/70",
    ts: "text-sky-300/70",
    css: "text-violet-300/70",
    json: "text-amber-300/70",
  };
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={colors[type] ?? "text-white/45"}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function highlightCode(src: string): string {
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  let s = escapeHtml(src);
  s = s.replace(/(\/\/[^\n]*)/g, '<span class="tk-com">$1</span>');
  s = s.replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, '<span class="tk-str">$1</span>');
  s = s.replace(/\b(import|from|export|default|const|let|var|return|function|interface|type)\b/g, '<span class="tk-key">$1</span>');
  s = s.replace(/\b(\d+)\b/g, '<span class="tk-num">$1</span>');
  s = s.replace(/(&lt;\/?)([A-Z][a-zA-Z]+)/g, '$1<span class="tk-tag">$2</span>');
  s = s.replace(/(&lt;\/?)([a-z]+)/g, '$1<span class="tk-tag">$2</span>');
  s = s.replace(/([a-z]+)=/g, '<span class="tk-attr">$1</span>=');
  return s;
}