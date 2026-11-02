// Limit the drawing buffer as well as DPR: crisp phones without unbounded GPU cost.
const PIXEL_BUDGET = 3_000_000;
export function maxWorldDpr(nativeDpr: number, width: number, height: number) {
  const native = Math.max(1, nativeDpr || 1);
  const cap = width < 768 ? 2 : 1.5;
  const budget = Math.sqrt(PIXEL_BUDGET / Math.max(1, width * height));
  return Math.max(1, Math.min(native, cap, budget));
}
export function minWorldDpr(nativeDpr: number, width: number) {
  return Math.min(Math.max(1, nativeDpr || 1), width < 768 ? 1.25 : 1);
}
