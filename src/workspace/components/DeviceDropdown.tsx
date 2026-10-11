import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspace, DEVICES, getDevice } from "../store";
import type { DeviceInfo } from "../types";

export function DeviceDropdown() {
  const { state, dispatch } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activePlatform, setActivePlatform] = useState<"ios" | "android" | "laptop" | "all">("all");
  const buttonRef = useRef<HTMLButtonElement>(null);

  const current = getDevice(state.device);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-device-dropdown]")) {
        setOpen(false);
      }
    };
    setTimeout(() => window.addEventListener("mousedown", onClick), 0);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const select = (device: DeviceInfo) => {
    dispatch({ type: "SET_DEVICE", device: device.id });
    setOpen(false);
    setQuery("");
  };

  // Filter logic
  const filtered = DEVICES.filter((d) => {
    if(state.productType && (d.platform==="laptop") !== (state.productType==="website")) return false;
    if (activePlatform !== "all" && d.platform !== activePlatform) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return d.label.toLowerCase().includes(q);
    }
    return true;
  });

  const iosDevices = filtered.filter((d) => d.platform === "ios");
  const androidDevices = filtered.filter((d) => d.platform === "android");
  const laptopDevices = filtered.filter((d) => d.platform === "laptop");

  return (
    <div className="relative" data-device-dropdown>
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all ${
          open
            ? "bg-white/[0.05] border-white/[0.15] text-white"
            : "bg-white/[0.02] border-white/[0.04] text-white/85 hover:bg-white/[0.04]"
        }`}
      >
        <DeviceIcon platform={current.platform} size={11} />
        <span className="text-[12px] font-medium">{current.label}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[320px] rounded-xl border border-white/[0.08] bg-[#0A0A0D] shadow-2xl z-50 overflow-hidden"
          >
            {/* Search + platform tabs */}
            <div className="p-2 border-b border-white/[0.06]">
              <div className="relative">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/35"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search devices…"
                  className="w-full bg-white/[0.025] border border-white/[0.06] text-white text-[12px] pl-7 pr-2 py-1.5 rounded-md focus:outline-none focus:border-white/[0.15] placeholder:text-white/30"
                />
              </div>
              <div className="flex items-center gap-1 mt-2 bg-white/[0.02] border border-white/[0.06] rounded-md p-0.5">
                {(
                  [
                    { id: "all" as const, label: "All" },
                    { id: "ios" as const, label: "iPhone" },
                    { id: "android" as const, label: "Android" },
                    { id: "laptop" as const, label: "Laptop" },
                  ]
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActivePlatform(t.id)}
                    className={`flex-1 px-2 py-1 text-[11px] rounded transition-all ${
                      activePlatform === t.id
                        ? "bg-white text-black"
                        : "text-white/55 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Device list */}
            <div className="max-h-[360px] overflow-y-auto ws-scrollbar py-1">
              {iosDevices.length > 0 && (
                <Group label="iPhone" icon="apple">
                  {iosDevices.map((d) => (
                    <DeviceRow
                      key={d.id}
                      device={d}
                      selected={state.device === d.id}
                      onSelect={select}
                    />
                  ))}
                </Group>
              )}
              {androidDevices.length > 0 && (
                <Group label="Android" icon="android">
                  {androidDevices.map((d) => (
                    <DeviceRow
                      key={d.id}
                      device={d}
                      selected={state.device === d.id}
                      onSelect={select}
                    />
                  ))}
                </Group>
              )}
              {laptopDevices.length > 0 && (
                <Group label="Laptop" icon="laptop">
                  {laptopDevices.map((d) => (
                    <DeviceRow
                      key={d.id}
                      device={d}
                      selected={state.device === d.id}
                      onSelect={select}
                    />
                  ))}
                </Group>
              )}
              {filtered.length === 0 && (
                <div className="px-3 py-6 text-center text-[11.5px] text-white/40">
                  No devices match "{query}"
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.06] px-3 py-1.5 flex items-center justify-between text-[10px] text-white/35 font-mono">
              <span>{current.width} × {current.height}</span>
              <span>{DEVICES.length} devices</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Group({
  label,
  icon,
  children,
}: {
  label: string;
  icon: "apple" | "android" | "laptop";
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <div className="px-3 py-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/40 font-mono">
        {icon === "apple" ? (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
        ) : icon === "android" ? (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.5 7.5c-.94-.4-1.7-.94-2.32-1.65-.62-.71-.93-1.5-.93-2.35h-3.5v11.5c0 1-.35 1.84-1.04 2.5-.69.67-1.55 1-2.59 1-.55 0-1.07-.13-1.55-.39-.48-.26-.86-.6-1.13-1.03L2.5 18.5c.45.8 1.09 1.45 1.91 1.95.82.5 1.72.75 2.7.75 1.6 0 2.96-.55 4.07-1.65 1.11-1.1 1.66-2.45 1.66-4.05V8.5c.95.6 2.07.95 3.36 1l1.3-2z" />
          </svg>
        ) : (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="12" rx="1.5" />
            <path d="M2 18h20" />
          </svg>
        )}
        {label}
      </div>
      {children}
    </div>
  );
}

function DeviceRow({
  device,
  selected,
  onSelect,
}: {
  device: DeviceInfo;
  selected: boolean;
  onSelect: (d: DeviceInfo) => void;
}) {
  return (
    <button
      onClick={() => onSelect(device)}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 transition-colors ${
        selected
          ? "bg-white/[0.06] text-white"
          : "hover:bg-white/[0.04] text-white/80"
      }`}
    >
      {/* Device preview thumbnail */}
      <DeviceThumb device={device} />
      <div className="flex-1 min-w-0 text-left">
        <div className="text-[12px] font-medium truncate">{device.label}</div>
        <div className="text-[10px] text-white/40 font-mono">
          {device.width} × {device.height}
        </div>
      </div>
      {selected && (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white/85 flex-shrink-0"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

function DeviceThumb({ device }: { device: DeviceInfo }) {
  if (device.platform === "laptop") {
    // Laptop thumbnail: wide lid + small base
    return (
      <div
        className="flex-shrink-0 relative"
        style={{ width: 26, height: 18 }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            bottom: 4,
            background: "linear-gradient(180deg, #1a1a20 0%, #0a0a0d 100%)",
            borderRadius: 2,
            boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.1)",
            padding: 1.5,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#0a0a0d",
              borderRadius: 1,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {device.notchStyle === "webcam" && (
              <div
                style={{
                  position: "absolute",
                  top: 0.5,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 1.5,
                  height: 1.5,
                  borderRadius: "50%",
                  background: "#000",
                  border: "0.5px solid rgba(255,255,255,0.1)",
                }}
              />
            )}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 1.5,
            background: "linear-gradient(180deg, #2a2a32 0%, #0a0a0d 100%)",
            borderRadius: 1,
          }}
        />
      </div>
    );
  }

  const aspect = device.width / device.height;
  const w = 22;
  const h = w / aspect;
  return (
    <div
      className="flex-shrink-0 grid place-items-center"
      style={{
        width: w,
        height: h,
        background: "linear-gradient(180deg, #1a1a20 0%, #0a0a0d 100%)",
        borderRadius: 4,
        boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.1)",
      }}
    >
      <div
        style={{
          width: w - 4,
          height: h - 4,
          borderRadius: 3,
          background: "#0a0a0d",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {device.notchStyle === "dynamic-island" && (
          <div
            style={{
              position: "absolute",
              top: 1.5,
              left: "50%",
              transform: "translateX(-50%)",
              width: 8,
              height: 2,
              borderRadius: 999,
              background: "#000",
            }}
          />
        )}
        {device.notchStyle === "notch" && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: 12,
              height: 3,
              background: "#000",
              borderBottomLeftRadius: 2,
              borderBottomRightRadius: 2,
            }}
          />
        )}
        {device.notchStyle === "punch-hole-center" && (
          <div
            style={{
              position: "absolute",
              top: 2,
              left: "50%",
              transform: "translateX(-50%)",
              width: 2.5,
              height: 2.5,
              borderRadius: "50%",
              background: "#000",
            }}
          />
        )}
      </div>
    </div>
  );
}

function DeviceIcon({
  platform,
  size = 12,
}: {
  platform: "ios" | "android" | "laptop";
  size?: number;
}) {
  if (platform === "laptop") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/55">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M2 20h20" />
      </svg>
    );
  }
  if (platform === "ios") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-white/55">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-white/55">
      <path d="M17.5 7.5c-.94-.4-1.7-.94-2.32-1.65-.62-.71-.93-1.5-.93-2.35h-3.5v11.5c0 1-.35 1.84-1.04 2.5-.69.67-1.55 1-2.59 1-.55 0-1.07-.13-1.55-.39-.48-.26-.86-.6-1.13-1.03L2.5 18.5c.45.8 1.09 1.45 1.91 1.95.82.5 1.72.75 2.7.75 1.6 0 2.96-.55 4.07-1.65 1.11-1.1 1.66-2.45 1.66-4.05V8.5c.95.6 2.07.95 3.36 1l1.3-2z" />
    </svg>
  );
}