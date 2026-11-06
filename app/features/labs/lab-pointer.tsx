import { useEffect, useRef, useState } from "react";

import { useLabPointer } from "./pointer";

// The tutor's pointer over a lab: a ring on the part marked `data-lab-part="<id>"`, with the
// tutor's caption beside it. It sits in the lab's own box (which must be `relative`) and
// follows the part while it is shown, since a crank or a basket moves.

type Box = { left: number; top: number; width: number; height: number; host: number };

const PAD = 6;

const same = (a: Box, b: Box) =>
  Math.abs(a.left - b.left) < 0.5 &&
  Math.abs(a.top - b.top) < 0.5 &&
  Math.abs(a.width - b.width) < 0.5 &&
  Math.abs(a.height - b.height) < 0.5 &&
  Math.abs(a.host - b.host) < 0.5;

export function LabPointer() {
  const pointed = useLabPointer();
  const marker = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  // The part brought into view for this pointing, so a student's own scrolling is left alone.
  const shown = useRef<string | null>(null);

  useEffect(() => {
    const host = marker.current?.parentElement;
    if (!pointed || !host) {
      shown.current = null;
      setBox(null);
      return;
    }
    const selector = `[data-lab-part="${CSS.escape(pointed.part)}"]`;
    let frame = 0;
    const measure = () => {
      const part = host.querySelector(selector);
      if (part) {
        // A part below the fold (the fire button) is brought into view once.
        if (shown.current !== pointed.part) {
          shown.current = pointed.part;
          const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          part.scrollIntoView({ block: "nearest", inline: "nearest", behavior: calm ? "auto" : "smooth" });
        }
        const area = host.getBoundingClientRect();
        const rect = part.getBoundingClientRect();
        const next = { left: rect.left - area.left, top: rect.top - area.top, width: rect.width, height: rect.height, host: area.width };
        setBox((current) => (current && same(current, next) ? current : next));
      } else {
        setBox(null);
      }
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [pointed]);

  const above = box ? box.top - PAD >= 32 : true;
  return (
    <div ref={marker} aria-hidden={!pointed} className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {pointed && box ? (
        <>
          <span
            data-testid="lab-pointer"
            data-part={pointed.part}
            className="absolute rounded-2xl ring-[3px] ring-[#7c6ad8] shadow-[0_0_0_6px_rgba(124,106,216,.18),0_0_22px_rgba(124,106,216,.5)] transition-[left,top,width,height] duration-150 motion-safe:animate-pulse"
            style={{ left: box.left - PAD, top: box.top - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 }}
          />
          {pointed.caption ? (
            <span
              data-testid="lab-pointer-caption"
              className="absolute whitespace-nowrap rounded-full bg-[#7c6ad8] px-2.5 py-1 text-[11.5px] font-bold text-white shadow-md"
              style={{
                // Starts at the ring's left edge and stays inside the card.
                left: Math.min(Math.max(box.left - PAD, 8), Math.max(8, box.host - 190)),
                top: above ? box.top - PAD - 6 : box.top + box.height + PAD + 6,
                transform: above ? "translateY(-100%)" : undefined,
              }}
            >
              {pointed.story ? pointed.caption : `NALAR · ${pointed.caption}`}
            </span>
          ) : null}
        </>
      ) : null}
      <span className="sr-only" role="status">
        {pointed?.caption ? `${pointed.story ? "Lihat" : "Tutor menunjuk"}: ${pointed.caption}` : ""}
      </span>
    </div>
  );
}
