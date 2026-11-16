// The lab workshop's stickers (fun-isometric): an anvil the lab is forged on, a flask a photo is poured into,
// and two meshing gears for the search. Colours are palette slots; `BENGKEL` is the palette they ship in.
import { VIEWS, ellipse, line, pill, poly, rect, spark } from './fun'
import { impact, latch, sparkle, twinkle, twist, wobble } from './motions'
import type { Icon, Layer, Motion, Palette, Vec } from './fun'

const LINE = 5
const { tilt: FACE, extrude: EXT } = VIEWS.right

/** Bernalar's lavender and mint, laid over the sticker slots. */
export const BENGKEL: Partial<Palette> = {
  main: '#b49bff',
  deep: '#2f2a6b',
  tint: '#ece7fb',
  ok: '#4bd29f',
  gold: '#ffd75e',
  hot: '#ff8a5b',
}

const glow = (parent: string, p: Vec, r: number, m: Motion | ReadonlyArray<Motion>, extra: { ip?: number; op?: number } = {}): Layer => ({
  parent,
  a: p,
  p,
  m,
  ...extra,
  shapes: [{ d: spark(p[0], p[1], r), fill: 'white' }],
})

// an anvil seen from the front, horn to the left: one silhouette on one leaned plane
const ANVIL =
  'M-170 -66Q-124 -80 -80 -80L130 -80L130 -30L56 -30L40 24L92 56L92 90L-92 90L-92 56L-40 24L-56 -30L-100 -30Q-140 -34 -170 -66Z'

/** The hammer comes down on frame 30, the anvil takes the hit, sparks fly off the glowing part. */
export const bengkel: Icon = {
  name: 'bengkel',
  frames: 180,
  line: LINE,
  extrude: EXT,
  still: 60,
  layers: [
    { id: 'anvil', p: [236, 330], m: { ...impact([4, 10]), at: 6 }, shapes: [] },
    {
      id: 'face',
      parent: 'anvil',
      tilt: FACE,
      shapes: [
        { d: ANVIL, fill: 'deep', depth: 1, edges: [[130, -80], [92, 56]] },
        { d: rect(-40, -104, 96, 26, 8), fill: 'gold', depth: 0.8 },
        { d: line([-70, 70], [70, 70]) },
      ],
    },
    {
      id: 'hammer',
      a: [0, 0],
      p: [296, 150],
      r: 38,
      m: latch([-40, 50]),
      shapes: [
        { d: rect(-13, -140, 26, 118, 12), fill: 'white', depth: 0.6 },
        { d: rect(-74, -36, 148, 70, 14), fill: 'main', depth: 1 },
        { d: rect(-14, -36, 28, 70), fill: 'tint', depth: 1 },
      ],
    },
    glow('anvil', [-118, -146], 30, [twinkle(30), twinkle(96, true)], { ip: 30, op: 126 }),
    glow('anvil', [92, -176], 22, [twinkle(34), twinkle(100, true)], { ip: 34, op: 130 }),
    glow('anvil', [-30, -190], 16, [twinkle(38), twinkle(104, true)], { ip: 38, op: 134 }),
  ],
}

const FLASK = 'M-28 -118L28 -118L28 -48L112 76Q122 100 96 100L-96 100Q-122 100 -112 76L-28 -48Z'
const LIQUID = 'M-74 20L74 20L102 74Q110 90 90 90L-90 90Q-110 90 -102 74Z'

/** A flask that sways while bubbles pop at its surface: drop a photo into it. */
export const labu: Icon = {
  name: 'labu',
  frames: 168,
  line: LINE,
  extrude: EXT,
  layers: [
    { id: 'flask', a: [0, 100], p: [250, 336], m: wobble, shapes: [] },
    {
      id: 'glass',
      parent: 'flask',
      tilt: [-14, 28],
      shapes: [
        { d: FLASK, fill: 'tint', depth: 1, edges: [[112, 76]] },
        { d: LIQUID, fill: 'ok' },
        { d: pill(-44, -140, 88, 26), fill: 'white', depth: 0.6 },
        { d: line([-12, -90], [-12, -60]) },
      ],
    },
    ...([[-30, 44, 12, 10], [24, 56, 9, 40], [4, 34, 7, 74]] as const).map(([x, y, r, t]): Layer => ({
      parent: 'glass',
      a: [x, y],
      p: [x, y],
      m: [twinkle(t), twinkle(t + 50, true)],
      ip: t,
      op: t + 80,
      shapes: [{ d: ellipse(x, y, r), fill: 'white', depth: 0.3 }],
    })),
    glow('flask', [-130, -180], 24, sparkle(20)),
    glow('flask', [120, -60], 16, sparkle(92)),
  ],
}

/** A cog outline: n square teeth around a ring, as one poly so its corners crease. */
function cog(r: number, teeth: number, tooth = 0.22): string {
  const points: Vec[] = []
  for (let i = 0; i < teeth; i++) {
    const base = (i / teeth) * Math.PI * 2
    const step = (Math.PI * 2) / teeth
    const outer = r * (1 + tooth)
    for (const [a, rad] of [[0.05, r], [0.18, outer], [0.47, outer], [0.6, r]] as const) {
      const angle = base + a * step
      points.push([Math.cos(angle) * rad, Math.sin(angle) * rad])
    }
  }
  return poly(points, 3)
}

const hole = (r: number) => `M${-r} 0A${r} ${r} 0 1 0 ${r} 0A${r} ${r} 0 1 0 ${-r} 0Z`

/** Two gears lying flat, the small one turning against the big one a beat behind. */
export const gir: Icon = {
  name: 'gir',
  frames: 180,
  line: LINE,
  extrude: VIEWS.flat.extrude,
  layers: [
    {
      id: 'big',
      p: [212, 270],
      tilt: VIEWS.flat.tilt,
      m: { ...twist, k: 1.6 },
      shapes: [{ d: cog(104, 10) + hole(34), fill: 'main', depth: 1 }, { d: ellipse(0, 0, 62) }],
    },
    {
      id: 'small',
      p: [344, 168],
      tilt: VIEWS.flat.tilt,
      m: { ...twist, k: -2.4, at: 5 },
      shapes: [{ d: cog(56, 7) + hole(18), fill: 'ok', depth: 1 }],
    },
    glow('big', [-140, -112], 22, sparkle(24)),
    glow('small', [92, -50], 14, sparkle(100)),
  ],
}

export const icons = { bengkel, labu, gir }
