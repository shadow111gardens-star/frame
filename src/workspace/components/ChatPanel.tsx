import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  useWorkspace,
} from "../store";
import type { Attachment, ChatMessage } from "../types";

export function ChatPanel() {
  const { state, dispatch, generateDesign } = useWorkspace();
  const [editScope,setEditScope]=useState<import('../../../shared/editScope').EditScope>('screen');
  const [input, setInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [state.messages.length, state.generating]);

  // Global Delete / Backspace handler for selected component
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if(state.modal.type!=="none")return;
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        state.selectedComponentId &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        const currentScreen = state.screens.find((s) => s.id === state.currentScreen);
        if (currentScreen) {
          dispatch({
            type: "DELETE_COMPONENT",
            componentId: state.selectedComponentId,
            screenId: currentScreen.id,
          });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.selectedComponentId, state.currentScreen, state.screens, state.modal.type, dispatch]);

  async function handleSend(text: string) {
    if(!text.trim() || state.generating) return;
    setInput("");
    await generateDesign(text,!!state.designSystem,undefined,editScope);
  }

  // File attachment handling
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const accepted = Array.from(files).filter((f) =>
      ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(f.type)
    );
    const newAttachments: Attachment[] = [];
    for (const f of accepted) {
      const dataUrl: string = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(f);
      });
      newAttachments.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        size: f.size,
        type: f.type,
        dataUrl,
      });
    }
    if (newAttachments.length > 0) {
      dispatch({
        type: "SET_ATTACHMENTS",
        attachments: [...state.pendingAttachments, ...newAttachments],
      });
    }
  };

  const removeAttachment = (id: string) => {
    dispatch({
      type: "SET_ATTACHMENTS",
      attachments: state.pendingAttachments.filter((a) => a.id !== id),
    });
  };

  return (
    <aside className="h-full flex flex-col bg-[#0A0A0D] border-r border-white/[0.06]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-white/15 to-white/[0.04] border border-white/[0.08] grid place-items-center">
            <div className="h-2 w-2 rounded-sm bg-white/80" />
          </div>
          <div>
            <div className="text-[12px] text-white font-medium">AI Designer</div>
            <div className="text-[10px] text-white/35 font-mono">Frame Agent v2</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="ws-pulse-dot" />
          <span className="text-[10.5px] text-white/55">{state.generating ? "Generating" : "Ready"}</span>
        </div>
      </div>

      {/* Conversation */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto ws-scrollbar px-4 py-4 space-y-3"
      >
        {state.messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {state.generating && <TypingBubble />}

      </div>

      {/* Pending attachments preview */}
      {state.pendingAttachments.length > 0 && (
        <div className="px-3 pt-2 border-t border-white/[0.04] flex flex-wrap gap-1.5">
          {state.pendingAttachments.map((a) => (
            <div
              key={a.id}
              className="relative h-14 w-14 rounded-md border border-white/[0.08] overflow-hidden group"
            >
              {a.dataUrl ? (
                <img src={a.dataUrl} alt={a.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full grid place-items-center text-[9px] text-white/55">
                  {a.name.split(".").pop()}
                </div>
              )}
              <button
                onClick={() => removeAttachment(a.id)}
                className="absolute top-0 right-0 h-4 w-4 grid place-items-center bg-black/70 text-white/80 hover:text-white text-[10px]"
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-white/[0.06] p-3">
        <div
          className={`rounded-xl border bg-white/[0.025] transition-colors ${
            dragOver
              ? "border-sky-400/60 bg-sky-400/[0.05]"
              : "border-white/[0.08] focus-within:border-white/[0.18]"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
        >
          {state.designSystem&&<label className="flex items-center gap-2 px-3 pt-2 text-[11px] text-white/60">Apply to<select aria-label="AI edit scope" disabled={state.generating} className="ws-input" value={editScope} onChange={e=>setEditScope(e.target.value as 'screen'|'project')}><option value="screen">Selected screen</option><option value="project">Entire project</option></select></label>}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            placeholder="Describe a change..."
            rows={2}
            className="w-full bg-transparent text-[13px] text-white placeholder:text-white/35 px-3 py-2.5 resize-none focus:outline-none leading-snug"
          />
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <button
                title="Attach image (PNG, JPG, WEBP)"
                onClick={() => fileInputRef.current?.click()}
                className="h-6 w-6 grid place-items-center rounded-md text-white/45 hover:text-white hover:bg-white/[0.04] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <button
                title="Insert component reference"
                onClick={() => {
                  const c = state.selectedComponentId
                    ? state.components[state.selectedComponentId]
                    : null;
                  if (c) {
                    setInput((v) => `${v}${v ? " " : ""}@${c.name} `.trim());
                  } else {
                    setInput((v) => `${v}${v ? " " : ""}@`.trim());
                  }
                }}
                className="h-6 w-6 grid place-items-center rounded-md text-white/45 hover:text-white hover:bg-white/[0.04] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim() || state.generating}
              className="h-7 px-3 rounded-md bg-white text-black text-[11px] font-medium disabled:opacity-30 hover:bg-white/90 transition-colors flex items-center gap-1.5"
            >
              <span>Send</span>
              <span className="ws-key !bg-black/10 !border-black/15 !text-black/60">
                ↵
              </span>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-white/30 font-mono">
          <span>Press Enter to send</span>
          <span>Shift + Enter for new line</span>
        </div>
      </div>
    </aside>
  );
}

function MessageBubble({
  message,
}: {
  message: ChatMessage;
}) {
  const {state,generateDesign}=useWorkspace();
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-[12.5px] leading-[1.55] ${
          isUser
            ? "bg-white text-black rounded-br-md"
            : "bg-white/[0.04] border border-white/[0.06] text-white/85 rounded-bl-md"
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
            <span className="text-[9.5px] uppercase tracking-widest text-white/40 font-mono">
              Frame
            </span>
          </div>
        )}
        <div style={{whiteSpace:"pre-wrap"}}>{message.content}</div>
        {message.retryPrompt && message.retryable!==false && <button disabled={state.generating} className="mt-2 px-3 py-1 rounded-md border border-white/15 text-[11px] disabled:opacity-40" onClick={()=>void generateDesign(message.retryPrompt!,message.retryModify,message.retryProductType,message.retryEditScope)}>Retry</button>}
        {message.tasks && (
          <div className="mt-2.5 space-y-1.5">
            {message.tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-[11.5px] text-white/55">
                {t.status === "done" ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-400/80">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                )}
                <span className={t.status === "done" ? "line-through opacity-50" : ""}>
                  {t.label}
                </span>
              </div>
            ))}
          </div>
        )}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.attachments.map((a) => (
              <div
                key={a.id}
                className="relative h-12 w-12 rounded-md border border-black/40 overflow-hidden"
              >
                {a.dataUrl ? (
                  <img src={a.dataUrl} alt={a.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full grid place-items-center text-[8px]">{a.name.split(".").pop()}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TypingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-md px-3.5 py-3 flex items-center gap-1">
        <span className="ws-typing-dot" />
        <span className="ws-typing-dot" />
        <span className="ws-typing-dot" />
      </div>
    </motion.div>
  );
}
