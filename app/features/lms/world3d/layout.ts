import { districtsOf, type Place, type Stop } from "../lib/districts";
import type { CourseData, IslandData, WorldData } from "../types";

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
  building: IslandData["buildings"][number] | null;
  href: string;
};

export type PlaceLayout = { place: Exclude<Place, "hall">; tile: Tile; stops: Stop[] };

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

const PLACE_TILES: Record<Exclude<Place, "hall">, Tile> = { library: [0, 0], lab: [-2, 1], arena: [2, -1] };

/** One course as an island: library, lab and arena in the middle, a hall per assignment around them. */
export function islandLayout(course: CourseData, island: IslandData): IslandLayout {
  const stops = districtsOf(course, island).flatMap((district) => district.stops);
  const places: PlaceLayout[] = (["library", "lab", "arena"] as const)
    .map((place) => ({ place, tile: PLACE_TILES[place], stops: stops.filter((stop) => stop.place === place) }))
    .filter((item) => item.stops.length > 0);
  const hallStops = stops.filter((stop) => stop.place === "hall");

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
    const buildingOf = new Map(island.buildings.map((b) => [b.assignmentId, b]));
    const halls: HallLayout[] = hallStops.slice(0, centers.length).map((stop, index) => {
      const center = centers[index]!;
      // Posts start on the side facing the island's middle and go clockwise.
      const start = NEIGHBOURS.reduce((best, n, i) => (ring(add(center, n)) < ring(add(center, NEIGHBOURS[best]!)) ? i : best), 0);
      const around = NEIGHBOURS.map((_, i) => add(center, NEIGHBOURS[(start + i) % 6]!));
      const assignmentId = stop.key.replace(/^hall-/, "");
      return { assignmentId, title: stop.title, center, pads: around.slice(0, 5), chest: around[5]!, building: buildingOf.get(assignmentId) ?? null, href: stop.href };
    });
    const tiles = tilesWithin(radius, edgeCuts(radius, course.course.id));
    const taken = new Set([...places.map((p) => p.tile), ...halls.flatMap((h) => [h.center, ...h.pads, h.chest])].map(tileKey));
    const free = tiles.filter((tile) => !taken.has(tileKey(tile)));
    const nextHall = halls.find((h) => !h.building?.chestOpen)?.assignmentId ?? halls[0]?.assignmentId ?? null;
    return { courseId: course.course.id, name: course.course.name, subject: course.course.subjectName, tiles, free, places, halls, nextHall };
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
  }));
  if (focus && !items.some((item) => item.courseId === focus.courseId)) {
    items.unshift({ courseId: focus.courseId, name: focus.name, subject: focus.subject, halls: 0, hallsDone: 0, current: null });
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
