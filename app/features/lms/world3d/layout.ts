import { districtsOf, type Place } from "../lib/districts";
import type { CourseData, IslandData, IslandSketch, PostStatus, WorkflowStage, WorldData } from "../types";

// Where everything sits in the 3D world, computed from the student's courses.
// Pure functions, so the same courses always give the same world. Coordinates
// are world units, y up; islands are boards of KayKit hex tiles (pointy along
// z) scaled by TILE.

export const TILE = 1.3;
export type Tile = [number, number];
export type Vec3 = [number, number, number];

export function hex([q, r]: Tile, y = 0): Vec3 {
  return [2 * TILE * (q + r / 2), y, 1.5 * 1.1547 * TILE * r];
}
export const tileKey = ([q, r]: Tile) => `${q},${r}`;
export const ring = ([q, r]: Tile) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
const distance = (a: Tile, b: Tile) => ring([a[0] - b[0], a[1] - b[1]]);

export function tilesWithin(radius: number, cut: Tile[] = []): Tile[] {
  const skip = new Set(cut.map(tileKey));
  const out: Tile[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      if (!skip.has(tileKey([q, r]))) out.push([q, r]);
    }
  }
  return out;
}

// The six neighbours, clockwise when seen from above (east first).
const NEIGHBOURS: Tile[] = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];

export type HallLayout = {
  assignmentId: string;
  title: string;
  center: Tile;
  /** The five posts around the hall, in stage order, then the chest. */
  pads: Tile[];
  chest: Tile;
  /** The five posts in stage order, or null before the hall has a building. */
  posts: Array<{ stage: WorkflowStage; status: PostStatus }> | null;
  chestOpen: boolean;
  href: string;
};

export type PlaceLayout = { place: Exclude<Place, "hall">; tile: Tile; done: number; total: number };

export type IslandLayout = {
  courseId: string;
  name: string;
  subject: string;
  tiles: Tile[];
  free: Tile[];
  places: PlaceLayout[];
  halls: HallLayout[];
  /** The hall the student should go to next (the first not finished). */
  nextHall: string | null;
};

export const STAGE_ORDER: WorkflowStage[] = ["1_independent_effort", "2_guided_questioning", "3_ai_evaluation", "4_revision_finalization", "5_reflection"];

/** The sketch of an island from its full course and island data (what the API sends Dunia, derived here). */
export function sketchOf(course: CourseData, island: IslandData): IslandSketch {
  const stops = districtsOf(course, island).flatMap((district) => district.stops);
  const buildingOf = new Map(island.buildings.map((b) => [b.assignmentId, b]));
  return {
    places: (["library", "lab", "arena"] as const)
      .map((place) => {
        const here = stops.filter((stop) => stop.place === place);
        return { place, done: here.filter((stop) => stop.done).length, total: here.length };
      })
      .filter((place) => place.total > 0),
    halls: stops
      .filter((stop) => stop.place === "hall")
      .map((stop) => {
        const assignmentId = stop.key.replace(/^hall-/, "");
        const building = buildingOf.get(assignmentId);
        return { assignmentId, title: stop.title, chestOpen: Boolean(building?.chestOpen), posts: building ? building.posts.map((post) => post.status) : null };
      }),
  };
}

const PLACE_TILES: Record<Exclude<Place, "hall">, Tile> = { library: [0, 0], lab: [-2, 1], arena: [2, -1] };

/**
 * One course as an island: library, lab and arena in the middle, a hall per
 * assignment around them. Only the sketch decides the island, so Dunia (sketch
 * from the API) and the island up close (sketch from the course) draw the same.
 */
export function islandLayout(course: { id: string; name: string; subjectName: string }, sketch: IslandSketch): IslandLayout {
  const places: PlaceLayout[] = sketch.places.map((item) => ({ ...item, tile: PLACE_TILES[item.place] }));
  const hallStops = sketch.halls;

  // Grow the island until every hall fits with its ring of posts.
  for (let radius = 3; ; radius++) {
    const centers: Tile[] = [];
    const candidates = tilesWithin(radius - 1)
      .filter((tile) => ring(tile) >= 2)
      .sort((a, b) => angleOf(a) - angleOf(b));
    for (const tile of candidates) {
      if (centers.length === hallStops.length) break;
      if (places.some((p) => distance(p.tile, tile) < 2)) continue;
      if (centers.some((c) => distance(c, tile) < 3)) continue;
      centers.push(tile);
    }
    if (centers.length < hallStops.length && radius < 7) continue;
    const halls: HallLayout[] = hallStops.slice(0, centers.length).map((stop, index) => {
      const center = centers[index]!;
      // Posts start on the side facing the island's middle and go clockwise.
      const start = NEIGHBOURS.reduce((best, n, i) => (ring(add(center, n)) < ring(add(center, NEIGHBOURS[best]!)) ? i : best), 0);
      const around = NEIGHBOURS.map((_, i) => add(center, NEIGHBOURS[(start + i) % 6]!));
      return {
        assignmentId: stop.assignmentId,
        title: stop.title,
        center,
        pads: around.slice(0, 5),
        chest: around[5]!,
        posts: stop.posts ? stop.posts.map((status, i) => ({ stage: STAGE_ORDER[i]!, status })) : null,
        chestOpen: stop.chestOpen,
        href: `/courses/${course.id}/balai/${stop.assignmentId}`,
      };
    });
    const tiles = tilesWithin(radius, edgeCuts(radius, course.id));
    const taken = new Set([...places.map((p) => p.tile), ...halls.flatMap((h) => [h.center, ...h.pads, h.chest])].map(tileKey));
    const free = tiles.filter((tile) => !taken.has(tileKey(tile)));
    const nextHall = halls.find((h) => !h.chestOpen)?.assignmentId ?? halls[0]?.assignmentId ?? null;
    return { courseId: course.id, name: course.name, subject: course.subjectName, tiles, free, places, halls, nextHall };
  }
}

const add = (a: Tile, b: Tile): Tile => [a[0] + b[0], a[1] + b[1]];
function angleOf(tile: Tile) {
  const [x, , z] = hex(tile);
  return (Math.atan2(z, x) + Math.PI * 2.5) % (Math.PI * 2);
}

/** A few corner tiles missing makes each coastline its own, the same on every visit. */
function edgeCuts(radius: number, seed: string): Tile[] {
  const corners = tilesWithin(radius).filter((tile) => ring(tile) === radius);
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return corners.filter((_, i) => ((h >> (i % 24)) & 7) === 0).slice(0, 4);
}

export type WorldIsland = {
  courseId: string;
  name: string;
  subject: string;
  position: Vec3;
  halls: number;
  hallsDone: number;
  current: WorldData["islands"][number]["current"];
  sketch: IslandSketch | null;
};

const ISLAND_SPACING = 32;

/** Every course as an island: the first in the middle, the rest around it. */
export function worldLayout(world: WorldData | null, focus: { courseId: string; name: string; subject: string } | null) {
  const listed = world?.islands ?? [];
  const items = listed.map((island) => ({
    courseId: island.course.id,
    name: island.course.name,
    subject: island.course.subjectName,
    halls: island.halls,
    hallsDone: island.hallsDone,
    current: island.current,
    sketch: island.sketch ?? null,
  }));
  if (focus && !items.some((item) => item.courseId === focus.courseId)) {
    items.unshift({ courseId: focus.courseId, name: focus.name, subject: focus.subject, halls: 0, hallsDone: 0, current: null, sketch: null });
  }
  const around = Math.max(5, items.length);
  const islands: WorldIsland[] = items.map((item, index) => ({ ...item, position: slot(index, around) }));
  return { islands, join: slot(items.length, around) };
}

function slot(index: number, around: number): Vec3 {
  if (index === 0) return [0, 0, 0];
  const angle = ((index - 1) / around) * Math.PI * 2 + 0.5;
  return [Math.cos(angle) * ISLAND_SPACING, ((index * 7) % 5) - 2, Math.sin(angle) * ISLAND_SPACING];
}
