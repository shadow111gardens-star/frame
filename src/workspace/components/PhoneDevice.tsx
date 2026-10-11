import type { DeviceInfo } from "../types";
import { ReactNode } from "react";

/**
 * Routes to the right frame type (mobile or laptop) based on device platform.
 * Always renders the device with the proper outer dimensions.
 */
export function DeviceFrame({
  device,
  children,
}: {
  device: DeviceInfo;
  children?: ReactNode;
}) {
  if (device.frameStyle === "laptop" || device.platform === "laptop") {
    return <LaptopFrame device={device}>{children}</LaptopFrame>;
  }
  return <PhoneFrameShell device={device}>{children}</PhoneFrameShell>;
}

export function DeviceScreen({
  device,
  children,
}: {
  device: DeviceInfo;
  children?: ReactNode;
}) {
  if (device.frameStyle === "laptop" || device.platform === "laptop") {
    return <LaptopScreen device={device}>{children}</LaptopScreen>;
  }
  return <PhoneScreen device={device}>{children}</PhoneScreen>;
}

// ─── Laptop frame ─────────────────────────────────────────

function LaptopFrame({
  device,
  children,
}: {
  device: DeviceInfo;
  children?: ReactNode;
}) {
  const lidW = device.previewWidth;
  const lidH = device.previewHeight;
  const hingeH = device.hingeHeight ?? 12;
  const totalH = lidH + hingeH;

  return (
    <div
      className="relative"
      style={{ width: lidW, height: totalH }}
    >
      {/* Glow under the laptop */}
      <div
        className="absolute -inset-x-12 -bottom-10 h-24 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(106,138,255,0.10) 0%, transparent 70%)",
          filter: "blur(28px)",
        }}
      />

      {/* Lid */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          width: lidW,
          height: lidH,
          borderRadius: device.cornerRadius,
          background: "linear-gradient(180deg, #2a2a32 0%, #15151a 100%)",
          padding: 2,
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.06), 0 30px 60px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)",
        }}
      >
        {children}
      </div>

      {/* Hinge / base bar */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          width: lidW,
          height: hingeH,
          background: "linear-gradient(180deg, #1a1a20 0%, #0a0a0d 100%)",
          borderBottomLeftRadius: device.cornerRadius,
          borderBottomRightRadius: device.cornerRadius,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {/* Trackpad notch */}
        <div
          className="absolute"
          style={{
            left: "50%",
            top: 4,
            transform: "translateX(-50%)",
            width: Math.min(80, lidW * 0.18),
            height: 3,
            background: "rgba(0,0,0,0.4)",
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
}

function LaptopScreen({
  device,
  children,
}: {
  device: DeviceInfo;
  children?: ReactNode;
}) {
  const bezelT = device.bezelTop ?? 14;
  const bezelS = device.bezelSide ?? 14;
  const bezelB = device.bezelBottom ?? 16;
  const lidW = device.previewWidth;
  const lidH = device.previewHeight;
  // Inner screen area
  const innerW = lidW - bezelS * 2 - 4; // 4 = 2px padding * 2
  const innerH = lidH - bezelT - bezelB - 4;
  return (
    <div
      className="relative overflow-hidden"
      style={{
        position: "absolute",
        left: bezelS,
        top: bezelT,
        width: innerW,
        height: innerH,
        borderRadius: device.screenRadius,
        background: "#0a0a0d",
      }}
    >
      {/* Webcam */}
      {device.notchStyle === "webcam" && (
        <div
          className="absolute z-30 rounded-full"
          style={{
            top: 4,
            left: "50%",
            transform: "translateX(-50%)",
            width: 6,
            height: 6,
            background: "#000",
            border: "0.5px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            className="absolute"
            style={{
              top: 1.5,
              left: 1.5,
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
            }}
          />
        </div>
      )}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Mobile frame (legacy)
// ─────────────────────────────────────────────────────────

export function DeviceNotch({ device }: { device: DeviceInfo }) {
  const ns = device.notchStyle;
  if (ns === "none") return null;

  if (ns === "dynamic-island") {
    return (
      <div
        className="absolute z-30 bg-black"
        style={{
          top: 14,
          left: "50%",
          transform: "translateX(-50%)",
          width: 96,
          height: 28,
          borderRadius: 999,
        }}
      />
    );
  }
  if (ns === "notch") {
    return (
      <div
        className="absolute z-30 bg-black"
        style={{
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 110,
          height: 26,
          borderBottomLeftRadius: 16,
          borderBottomRightRadius: 16,
        }}
      />
    );
  }
  if (ns === "punch-hole" || ns === "punch-hole-center") {
    return (
      <div
        className="absolute z-30 rounded-full bg-black border border-white/[0.04]"
        style={{
          top: 10,
          left: ns === "punch-hole-center" ? "50%" : "auto",
          right: ns === "punch-hole-center" ? "auto" : 16,
          transform: ns === "punch-hole-center" ? "translateX(-50%)" : "none",
          width: 14,
          height: 14,
        }}
      />
    );
  }
  return null;
}

export function PhoneFrameShell({
  device,
  children,
}: {
  device: DeviceInfo;
  children?: ReactNode;
}) {
  const pad = 8;
  return (
    <div
      className="relative"
      style={{
        width: device.previewWidth + pad * 2,
        height: device.previewHeight + pad * 2,
        borderRadius: device.cornerRadius,
        background: "linear-gradient(180deg, #1a1a20 0%, #0a0a0d 100%)",
        padding: pad,
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 0 0 2px rgba(0,0,0,0.6), 0 60px 120px -30px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
      }}
    >
      {children}
    </div>
  );
}

export function PhoneScreen({
  device,
  children,
}: {
  device: DeviceInfo;
  children?: ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden h-full w-full"
      style={{
        borderRadius: device.screenRadius,
        background: "#0a0a0d",
      }}
    >
      <DeviceNotch device={device} />
      {children}
    </div>
  );
}