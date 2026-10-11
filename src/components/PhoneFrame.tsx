import { ReactNode } from "react";
import { cn } from "../utils/cn";

interface PhoneFrameProps {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  tilt?: string;
  glow?: boolean;
}

export function PhoneFrame({ children, className, size = "md", tilt, glow = true }: PhoneFrameProps) {
  const sizes = {
    sm: "w-[200px] h-[410px]",
    md: "w-[280px] h-[575px]",
    lg: "w-[320px] h-[660px]",
  };
  return (
    <div
      className={cn("phone-frame relative", sizes[size], className)}
      style={tilt ? { transform: tilt } : undefined}
    >
      {glow && (
        <div
          className="absolute inset-0 -z-10 opacity-70"
          style={{
            background: "radial-gradient(ellipse at center, rgba(106,138,255,0.18) 0%, transparent 65%)",
            filter: "blur(40px)",
          }}
        />
      )}
      <div className="phone-screen">
        <div className="notch" />
        {children}
      </div>
    </div>
  );
}
