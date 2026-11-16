// Stickers for the lesson editor (fun-isometric): a book for the material, a folder for resources, and one per
// resource type (link, note, PDF). Palette slots only; they ship in BENGKEL like the workshop's stickers.
import { VIEWS, line, pill, poly, rect, spark } from './fun'
import { erase, glint, hop, jolt, sway, toss, tossLag, tossLag2, twinkle, twist } from './motions'
import type { Icon, Layer, Motion, Shape, Vec } from './fun'

const LINE = 5
const { tilt: FACE, extrude: EXT } = VIEWS.right

const glow = (parent: string, p: Vec, r: number, m: Motion | ReadonlyArray<Motion>, extra: { ip?: number; op?: number } = {}): Layer => ({
  parent,
  a: p,
  p,
  m,
  ...extra,
  shapes: [{ d: spark(p[0], p[1], r), fill: 'white' }],
})

/** Drawn for a 500px canvas; shown at 32 to 48px the outline needs to be heavier to still read as one. */
export const small = (icon: Icon, line = 13): Icon => ({ ...icon, name: `${icon.name}-kecil`, line })

/** Materi: a book hops and lands, its ribbon a beat behind, a star on the landing. */
export const buku: Icon = {
  name: 'buku',
  frames: 140,
  line: LINE,
  extrude: EXT,
  layers: [
    { id: 'book', p: [244, 262], m: hop, shapes: [] },
    {
      id: 'cover',
      parent: 'book',
      tilt: FACE,
      shapes: [
        { d: rect(-96, -128, 212, 250, 14), fill: 'white', depth: 1 },
        { d: rect(-118, -136, 220, 262, 18), fill: 'main', depth: 1 },
        { d: poly([[-118, -136], [-82, -136], [-82, 126], [-118, 126]], [18, 0, 0, 18]), fill: 'deep', depth: 1 },
        { d: rect(-48, -84, 120, 64, 12), fill: 'tint', depth: 0.3 },
        { d: line([-28, -62], [52, -62]) },
        { d: line([-28, -42], [24, -42]) },
      ],
    },
    {
      parent: 'cover',
      a: [64, 120],
      p: [64, 120],
      m: { ...hop, at: 5, k: 0.7 },
      shapes: [{ d: poly([[50, 110], [78, 110], [78, 186], [64, 170], [50, 186]], 3), fill: 'hot', depth: 0.4 }],
    },
    glow('book', [150, -120], 26, [twinkle(54), twinkle(110, true)], { ip: 54, op: 140 }),
  ],
}

/** Resource: the folder tosses its papers. */
export const map: Icon = {
  name: 'map',
  frames: 180,
  line: LINE,
  extrude: EXT,
  layers: [
    { parent: 'body', shapes: [{ d: poly([[-130, -100], [-56, -100], [-34, -76], [130, -76], [130, 92], [-130, 92]], [18, 8, 8, 18, 18, 18]), fill: 'main', depth: 1 }] },
    {
      parent: 'body',
      a: [-108, 50],
      p: [-108, 50],
      m: tossLag2,
      shapes: [{ d: rect(-104, -136, 206, 192, 12), fill: 'white', depth: 0.3 }, { d: line([-78, -118], [8, -118]) }],
    },
    { parent: 'body', a: [-116, 52], p: [-116, 52], m: tossLag, shapes: [{ d: rect(-116, -104, 226, 164, 12), fill: 'ok', depth: 0.3 }] },
    {
      id: 'body',
      a: [-130, 20],
      p: [126, 294],
      tilt: FACE,
      m: toss,
      shapes: [{ d: rect(-130, -46, 260, 138, 18), fill: 'deep', depth: 1 }, { d: pill(-46, -12, 92, 28), fill: 'white', depth: 0.3 }],
    },
  ],
}

/** A rounded frame with a hole: the outer edge one way round, the hole the other. */
function frame(w: number, h: number, bar: number, r: number): string {
  const outer = poly([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], r)
  const [iw, ih] = [w / 2 - bar, h / 2 - bar]
  const inner = poly([[-iw, -ih], [-iw, ih], [iw, ih], [iw, -ih]], Math.max(0, r - bar))
  return outer + inner
}

/** Link: two chain links twisting against each other. */
export const tautan: Icon = {
  name: 'tautan',
  frames: 180,
  line: LINE,
  extrude: EXT,
  layers: [
    { id: 'chain', p: [250, 250], m: twist, shapes: [] },
    { parent: 'chain', p: [-62, 52], r: -40, tilt: [0, 20], shapes: [{ d: frame(210, 112, 36, 56), fill: 'ok', depth: 1 }] },
    {
      parent: 'chain',
      a: [0, 0],
      p: [62, -52],
      r: -40,
      tilt: [0, 20],
      m: { ...twist, at: 5, k: -0.8 },
      shapes: [{ d: frame(210, 112, 36, 56), fill: 'main', depth: 1 }],
    },
    glow('chain', [130, 70], 20, [twinkle(30), twinkle(100, true)], { ip: 30, op: 130 }),
  ],
}

/** Note: a pad whose lines are erased and written back. */
export const catatan: Icon = {
  name: 'catatan',
  frames: 180,
  still: 0,
  line: LINE,
  extrude: EXT,
  layers: [
    {
      a: [0, 136],
      p: [250, 374],
      tilt: FACE,
      m: { ...sway, k: 0.8 },
      shapes: [
        { d: rect(-118, -136, 236, 272, 24), fill: 'gold', depth: 1 },
        { d: rect(-96, -108, 192, 222, 10), fill: 'white', depth: 0.2 },
        { d: pill(-52, -154, 104, 42), fill: 'grey', depth: 0.6 },
        ...[0, 1, 2, 3].map((i): Shape => ({ d: line([-68, -66 + i * 40], [i === 3 ? 10 : 68, -66 + i * 40]), trim: erase(22 - i * 5, 80 + i * 5) })),
      ],
    },
  ],
}

/** PDF: a page with a folded corner and a red label, kicked and settling, with a glare. */
export const dokumen: Icon = {
  name: 'dokumen',
  frames: 180,
  line: LINE,
  extrude: EXT,
  layers: [
    { id: 'doc', p: [248, 262], m: jolt([-6, 12]), shapes: [] },
    {
      parent: 'doc',
      tilt: FACE,
      shapes: [
        { d: poly([[-104, -136], [52, -136], [104, -84], [104, 136], [-104, 136]], [16, 0, 0, 16, 16]), fill: 'white', depth: 1 },
        { d: poly([[52, -136], [52, -84], [104, -84]], 4), fill: 'grey', depth: 0.3 },
        { d: rect(-76, -60, 120, 52, 10), fill: 'hot', depth: 0.4 },
        { d: line([-76, 30], [72, 30]) },
        { d: line([-76, 66], [72, 66]) },
        { d: line([-76, 102], [20, 102]) },
      ],
    },
    glow('doc', [-150, -110], 24, glint(20, 110)),
  ],
}

export const editorIcons = { buku, map, tautan, catatan, dokumen }
