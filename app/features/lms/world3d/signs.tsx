import { Html } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import type * as THREE from "three";

import { gameGsap, playSound } from "~/features/game-feel";
import { cn } from "~/lib/utils";

import type { Vec3 } from "./layout";

// Signs over things in the 3D world and the classroom, and the click target
// that makes a model a button.

export function Sign({ position, children, show: wanted, onClick, dark = false, minor = false, label }: { position: Vec3; children: ReactNode; show: boolean; onClick?: () => void; dark?: boolean; minor?: boolean; label: string }) {
  // On a narrow screen the minor signs would pile up; the dock names those places.
  const narrow = useThree((t) => t.size.width < 600);
  const show = wanted && !(minor && narrow);
  return (
    <Html position={position} center zIndexRange={[20, 0]} style={{ pointerEvents: show ? "auto" : "none" }}>
      <button
        type="button"
        onClick={onClick}
        tabIndex={show ? 0 : -1}
        aria-hidden={!show}
        aria-label={label}
        className={cn(
          "whitespace-nowrap rounded-[14px] px-3 py-1.5 text-left shadow-[0_6px_16px_rgba(24,21,58,.2)] transition-[opacity,transform] duration-300 active:scale-[0.96] max-sm:px-2.5 max-sm:py-1",
          dark ? "bg-[#18153a] text-white" : "bg-white/95 text-[#18153a]",
          !show && "pointer-events-none translate-y-1.5 scale-[0.96] opacity-0",
        )}
      >
        {children}
      </button>
    </Html>
  );
}

export function SignText({ small, strong, tag }: { small: string; strong: string; tag?: string }) {
  return (
    <>
      <small className="block text-[10.5px] opacity-70">{small}</small>
      <strong className="block max-w-[14rem] truncate text-[13.5px] max-sm:text-[12.5px]">{strong}</strong>
      {/* Work due soon, in the amber the HUD uses for it. */}
      {tag && <span className="mt-1 inline-block rounded-full bg-[#fdf1d8] px-2 py-0.5 text-[10.5px] font-semibold text-[#855a00]">{tag}</span>}
    </>
  );
}

export function Clickable({ onClick, children, label }: { onClick: () => void; children: ReactNode; label: string }) {
  const ref = useRef<THREE.Group>(null);
  return (
    <group
      ref={ref}
      name={label}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        playSound("click");
        onClick();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "pointer";
        gameGsap().to(ref.current!.scale, { x: 1.04, y: 1.04, z: 1.04, duration: 0.18, ease: "power2.out" });
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
        gameGsap().to(ref.current!.scale, { x: 1, y: 1, z: 1, duration: 0.2, ease: "power2.out" });
      }}
    >
      {children}
    </group>
  );
}
