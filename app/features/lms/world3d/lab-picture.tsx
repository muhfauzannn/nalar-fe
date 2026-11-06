import { useEffect, useRef, useState } from "react";

import { LABS } from "~/features/labs";

import { labPictureKey, stationPictures } from "./station-pictures";

// The lab bench's screen shows the real lab. The lab is a React component whose figure is an SVG styled by CSS
// classes and variables, so it cannot be drawn into a 3D texture directly. It is mounted off screen for a moment,
// its SVG is copied with the styles it computed to (so it no longer needs the page's CSS), turned into an image
// and drawn on a canvas, and unmounted again. Nothing here is visible to the student.

/** The presentation properties an iso figure gets from its stylesheet, which the copy has to carry itself. */
const PAINT = [
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-opacity",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "opacity",
  "display",
  "paint-order",
  "mix-blend-mode",
  "filter",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "letter-spacing",
  "text-anchor",
  "dominant-baseline",
] as const;

/**
 * Draw an SVG that lives in the page onto a canvas `width` px wide, with the look its CSS gives it there.
 * The figure's strokes are `non-scaling` (a fixed number of screen px), so they are converted to the figure's own
 * units to keep their share of the picture whatever size it is drawn at.
 */
export async function rasterizeSvg(svg: SVGSVGElement, width: number): Promise<HTMLCanvasElement> {
  const live = svg.getBoundingClientRect();
  const box = svg.viewBox.baseVal;
  if (!live.width || !box.width || !box.height) throw new Error("The figure has no size");
  const perUnit = live.width / box.width;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const from = [svg, ...svg.querySelectorAll("*")];
  const to = [clone, ...clone.querySelectorAll("*")];
  from.forEach((element, index) => {
    const target = to[index] as SVGElement | undefined;
    if (!target || !("style" in target)) return;
    const computed = getComputedStyle(element);
    for (const property of PAINT) {
      const value = computed.getPropertyValue(property);
      if (value) target.style.setProperty(property, value);
    }
    const fixed = computed.getPropertyValue("vector-effect") === "non-scaling-stroke";
    const units = (px: number) => (fixed ? px / perUnit : px);
    const strokeWidth = parseFloat(computed.getPropertyValue("stroke-width"));
    if (Number.isFinite(strokeWidth)) target.style.setProperty("stroke-width", String(units(strokeWidth)));
    const dashes = computed.getPropertyValue("stroke-dasharray");
    if (dashes && dashes !== "none") {
      target.style.setProperty("stroke-dasharray", dashes.split(/[ ,]+/).map((part) => String(units(parseFloat(part)))).join(" "));
      target.style.setProperty("stroke-dashoffset", String(units(parseFloat(computed.getPropertyValue("stroke-dashoffset")) || 0)));
    }
    target.style.removeProperty("vector-effect");
  });
  const height = Math.round((width * box.height) / box.width);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.removeAttribute("class");
  clone.style.cssText = "overflow:hidden";
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(image, 0, 0, width, height);
  return canvas;
}

const noSolve = async () => 0;

/**
 * Takes the lab's picture for the bench's screen, once per lab per visit: mounts the real lab off screen,
 * waits for it to draw, and keeps the picture in `stationPictures`. If anything goes wrong the screen shows
 * its card without a picture instead.
 */
export function LabPicture({ labKey }: { labKey: string }) {
  const entry = LABS[labKey];
  const key = labPictureKey(labKey);
  const host = useRef<HTMLDivElement>(null);
  // the lab is client-only work: never rendered on the server
  const [mounted, setMounted] = useState(false);
  const [done, setDone] = useState(() => Boolean(stationPictures.get(key)));
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted || !entry || done) return;
    let live = true;
    let frame = 0;
    // two frames: the lab draws, and its fonts and first state settle
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(async () => {
        const figures = Array.from(host.current?.querySelectorAll<SVGSVGElement>("svg.iso-svg") ?? []);
        const main = figures.sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0];
        try {
          if (main) stationPictures.set(key, await rasterizeSvg(main, 1400));
        } catch {
          // no picture: the card stands alone
        }
        if (live) setDone(true);
      });
    });
    return () => {
      live = false;
      cancelAnimationFrame(frame);
    };
  }, [mounted, entry, done, key]);
  if (!mounted || !entry || done) return null;
  return (
    <div ref={host} aria-hidden="true" inert className="pointer-events-none fixed top-0 -left-[4000px] w-[900px] opacity-0">
      <entry.Component solved={[]} onSolve={noSolve} />
    </div>
  );
}
