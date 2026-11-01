// Builds public/game/world.glb, the models of the 3D world, from KayKit packs
// (CC0, Kay Lousberg). Not part of the app build; run it only to change the set.
//
//   git clone --depth 1 https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0 $KAYKIT/hex
//   git clone --depth 1 https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0 $KAYKIT/furniture
//   git clone --depth 1 https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0 $KAYKIT/dungeon
//   npx -p @gltf-transform/core@4.1.1 -p @gltf-transform/functions@4.1.1 -p @gltf-transform/extensions@4.1.1 \
//     -p meshoptimizer@0.22.0 -p sharp@0.33.5 node scripts/build-world-assets.mjs   (with KAYKIT set)
//
// It packs the chosen KayKit models into one GLB for the world:
// recolours the shared palette atlases to Bernalar's colours, merges every
// model under a root node named by its key, dedups the shared atlases,
// compresses geometry (meshopt) and textures (WebP). `--probe` prints which
// atlas swatch each model uses and its bounds instead.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, weld, meshopt, textureCompress, mergeDocuments, getBounds, unpartition } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const KAYKIT = process.env.KAYKIT ?? "kaykit";
/** Finds a model file anywhere inside a cloned pack (the packs nest them by kind). */
function find(pack, file) {
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        const hit = walk(path);
        if (hit) return hit;
      } else if (name === file && path.includes("gltf")) return path;
    }
    return null;
  };
  const hit = walk(join(KAYKIT, pack));
  if (!hit) throw new Error(`${file} not found in ${pack}`);
  return hit;
}
const HEX = "hex:", FURN = "furniture:", DUN = "dungeon:";
const resolve = (spec) => find(spec.slice(0, spec.indexOf(":")), spec.slice(spec.indexOf(":") + 1));
export const MODELS = {
  // buildings (blue variants: their blue swatches become Bernalar lavender)
  castle: HEX + "building_castle_blue.gltf",
  church: HEX + "building_church_blue.gltf",
  windmill: HEX + "building_windmill_blue.gltf",
  archery: HEX + "building_archeryrange_blue.gltf",
  market: HEX + "building_market_blue.gltf",
  homeA: HEX + "building_home_A_blue.gltf",
  homeB: HEX + "building_home_B_blue.gltf",
  towerA: HEX + "building_tower_A_blue.gltf",
  well: HEX + "building_well_blue.gltf",
  watermill: HEX + "building_watermill_blue.gltf",
  // ground and nature
  hex: HEX + "hex_grass.gltf",
  hills: HEX + "hills_A_trees.gltf",
  mountain: HEX + "mountain_A_grass_trees.gltf",
  trees: HEX + "trees_A_large.gltf",
  treesB: HEX + "trees_B_medium.gltf",
  tree: HEX + "tree_single_A.gltf",
  rock: HEX + "rock_single_A.gltf",
  rockB: HEX + "rock_single_C.gltf",
  cloud: HEX + "cloud_big.gltf",
  cloudS: HEX + "cloud_small.gltf",
  flag: HEX + "flag_blue.gltf",
  tent: HEX + "tent.gltf",
  target: HEX + "target.gltf",
  barrel: HEX + "barrel.gltf",
  crate: HEX + "crate_A_small.gltf",
  // the writing room
  table: FURN + "table_medium.gltf",
  chair: FURN + "chair_A_wood.gltf",
  lamp: FURN + "lamp_table.gltf",
  books: FURN + "book_set.gltf",
  book: FURN + "book_single.gltf",
  shelf: FURN + "shelf_B_large_decorated.gltf",
  cabinet: FURN + "cabinet_medium_decorated.gltf",
  rug: FURN + "rug_rectangle_stripes_A.gltf",
  frame: FURN + "pictureframe_standing_A.gltf",
  // the hall's chest (body + lid nodes)
  chest: DUN + "chest.glb",
};

// Swatch recolours on the 1024² hexagon atlas: 8 columns × 4 rows of 128×256
// vertical gradients. [col, row] → [top, bottom] colours.
const HEX_RECOLOR = {
  "0,2": ["#a6ecc9", "#4fbf8c"], // grass (olive → mint)
  "1,2": ["#5fd3a0", "#1f7f63"], // trees
  "0,3": ["#c3b5fa", "#4b3fa3"], // blue roofs and banners → lavender
  "1,1": ["#c3b5fa", "#4b3fa3"], // the other blue → lavender
};

async function recolor(image, map, cols, rows) {
  const img = sharp(Buffer.from(image));
  const { width, height } = await img.metadata();
  const raw = await img.ensureAlpha().raw().toBuffer();
  const cw = width / cols, ch = height / rows;
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  for (const [key, [top, bottom]] of Object.entries(map)) {
    const [c, r] = key.split(",").map(Number);
    const a = hex(top), b = hex(bottom);
    for (let y = r * ch; y < (r + 1) * ch; y++) {
      const t = (y - r * ch) / (ch - 1);
      for (let x = c * cw; x < (c + 1) * cw; x++) {
        const o = (y * width + x) * 4;
        for (let k = 0; k < 3; k++) raw[o + k] = Math.round(a[k] + (b[k] - a[k]) * t);
      }
    }
  }
  return new Uint8Array(await sharp(raw, { raw: { width, height, channels: 4 } }).png().toBuffer());
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });

if (process.argv.includes("--probe")) {
  for (const [key, file] of Object.entries(MODELS)) {
    const doc = await io.read(resolve(file));
    const swatches = new Map();
    for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
      const uv = prim.getAttribute("TEXCOORD_0");
      if (!uv) continue;
      const el = [];
      for (let i = 0; i < uv.getCount(); i++) {
        uv.getElement(i, el);
        const s = `${Math.min(7, Math.floor(el[0] * 8))},${Math.min(3, Math.floor(el[1] * 4))}`;
        swatches.set(s, (swatches.get(s) ?? 0) + 1);
      }
    }
    const b = getBounds(doc.getRoot().listScenes()[0]);
    console.log(key.padEnd(10), b.min.map((v) => v.toFixed(2)).join(","), "→", b.max.map((v) => v.toFixed(2)).join(","), [...swatches].sort((x, y) => y[1] - x[1]).slice(0, 5).map(([s, n]) => `${s}:${n}`).join(" "));
  }
  process.exit(0);
}

const out = await io.read(resolve(MODELS.hex));
out.getRoot().listScenes()[0].listChildren().forEach((n) => n.dispose());
const scene = out.getRoot().listScenes()[0];
for (const [key, file] of Object.entries(MODELS)) {
  const src = await io.read(resolve(file));
  const srcScene = src.getRoot().listScenes()[0];
  const map = mergeDocuments(out, src);
  const merged = map.get(srcScene);
  const root = out.createNode(key);
  for (const child of merged.listChildren()) root.addChild(child);
  scene.addChild(root);
  merged.dispose();
}
for (const tex of out.getRoot().listTextures()) {
  if (tex.getName() === "hexagons_medieval") tex.setImage(await recolor(tex.getImage(), HEX_RECOLOR, 8, 4)).setMimeType("image/png");
}
await out.transform(
  dedup(),
  unpartition(),
  prune(),
  weld(),
  textureCompress({ encoder: sharp, targetFormat: "webp", resize: [512, 512], quality: 88 }),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);
await io.write("public/game/world.glb", out);
const textures = out.getRoot().listTextures().map((t) => `${t.getName()} ${t.getImage().byteLength}`);
console.log("textures", textures, "meshes", out.getRoot().listMeshes().length);
