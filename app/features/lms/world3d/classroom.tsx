import { Html, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import * as THREE from "three";

import { gameGsap, playSound } from "~/features/game-feel";
import { studentResourceFileUrl } from "~/lib/files";

import { loadPdfjs } from "../lib/pdfjs";
import type { CourseData, IslandData, LessonData } from "../types";
import ROOM from "./classroom-layout.json";
import { setBoardRect } from "./board-rect";
import { STILL } from "./ground";
import { sketchOf, type Vec3 } from "./layout";
import { Clickable, Sign, SignText } from "./signs";

// The course classroom (docs/world-concept/classroom-*.png): one room the
// student walks into from the island, with the lesson's PDF on the blackboard,
// the lab bench on the left, a book per assignment on the desk on the right and
// the quiz target by the window. Reading happens at the board: the camera moves
// square to it and the overlay lays the real PDF reader exactly over the board
// (board-rect.ts), while the room stops rendering. Built by
// scripts/world/build-classroom.mjs, which also writes classroom-layout.json.

export const CLASSROOM_URL = "/game/classroom.glb";

export function preloadClassroom() {
  useGLTF.preload(CLASSROOM_URL, false, true);
}

// ---- camera ---------------------------------------------------------------------------------

type Pose = { p: Vec3; t: Vec3 };
const HOME: Pose = { p: ROOM.camera.position as Vec3, t: ROOM.camera.target as Vec3 };
/** Just outside the door: the dolly into the room starts here. */
const DOOR: Pose = { p: [HOME.p[0] * 0.4, HOME.p[1] + 0.3, HOME.p[2] + 3.2], t: HOME.t };

/** Square to the board, as close as the screen allows with a small margin. */
function boardPose(aspect: number, narrow: boolean): Pose {
  const [x, y, z] = ROOM.board.center as Vec3;
  const half = Math.tan(THREE.MathUtils.degToRad(ROOM.camera.fov) / 2);
  const fill = narrow ? 0.98 : 0.9;
  const byHeight = ROOM.board.height / 2 / half / fill;
  const byWidth = ROOM.board.width / 2 / (half * aspect) / fill;
  return { p: [x, y, z + Math.max(byHeight, byWidth)], t: [x, y, z] };
}

function RoomCamera({ board }: { board: boolean }) {
  const ref = useRef<THREE.PerspectiveCamera>(null);
  const { size, setFrameloop, invalidate } = useThree();
  const state = useRef({ px: DOOR.p[0], py: DOOR.p[1], pz: DOOR.p[2], tx: DOOR.t[0], ty: DOOR.t[1], tz: DOOR.t[2] });
  const settled = useRef(false);
  const aspect = size.width / size.height;
  const narrow = size.width < 768;
  useEffect(() => {
    const pose = board ? boardPose(aspect, narrow) : HOME;
    const to = { px: pose.p[0], py: pose.p[1], pz: pose.p[2], tx: pose.t[0], ty: pose.t[1], tz: pose.t[2] };
    const g = gameGsap();
    g.killTweensOf(state.current);
    settled.current = false;
    setBoardRect(null);
    setFrameloop("always");
    const done = () => {
      settled.current = true;
      if (!board) return;
      // Reading at the board: the reader is laid over it and the room stops rendering.
      place();
      setBoardRect(rectOf(ref.current!, size.width, size.height));
      invalidate();
      requestAnimationFrame(() => setFrameloop("demand"));
    };
    if (STILL) {
      Object.assign(state.current, to);
      done();
      return;
    }
    playSound("whoosh");
    g.to(state.current, { ...to, duration: board ? 0.85 : 1.1, ease: "power2.inOut", onComplete: done });
    return () => {
      g.killTweensOf(state.current);
    };
  }, [board, aspect, narrow, setFrameloop]);
  // Leaving the room renders the world again.
  useEffect(() => () => {
    setBoardRect(null);
    setFrameloop("always");
  }, [setFrameloop]);
  function place() {
    const camera = ref.current;
    if (!camera) return;
    const s = state.current;
    camera.position.set(s.px, s.py, s.pz);
    camera.lookAt(s.tx, s.ty, s.tz);
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }
  useFrame(place);
  useEffect(() => invalidate(), [size, invalidate]);
  return <PerspectiveCamera ref={ref} makeDefault fov={ROOM.camera.fov} near={0.05} far={60} position={DOOR.p} />;
}

/** The board surface's corners on screen: the reader is laid exactly over them. */
function rectOf(camera: THREE.PerspectiveCamera, width: number, height: number) {
  const [cx, cy, cz] = ROOM.board.center as Vec3;
  const w = ROOM.board.width / 2, h = ROOM.board.height / 2;
  const a = new THREE.Vector3(cx - w, cy + h, cz).project(camera);
  const b = new THREE.Vector3(cx + w, cy - h, cz).project(camera);
  const left = ((a.x + 1) / 2) * width, top = ((1 - a.y) / 2) * height;
  const right = ((b.x + 1) / 2) * width, bottom = ((1 - b.y) / 2) * height;
  return { left: Math.round(left), top: Math.round(top), width: Math.round(right - left), height: Math.round(bottom - top) };
}

// ---- the blackboard's face: the lesson's PDF pinned on chalk green --------------------------

const BOARD_PX = 2048;

async function paintBoard(lesson: LessonData | null): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = BOARD_PX;
  canvas.height = Math.round((BOARD_PX * ROOM.board.height) / ROOM.board.width);
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = "#2f6b55";
  ctx.fillRect(0, 0, W, H);
  // chalk dust, faint and uneven
  for (let i = 0; i < 26; i++) {
    const x = (Math.sin(i * 12.9) * 0.5 + 0.5) * W, y = (Math.sin(i * 7.3 + 1) * 0.5 + 0.5) * H;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 180 + (i % 5) * 60);
    g.addColorStop(0, "rgba(255,255,255,0.05)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  const pages: HTMLCanvasElement[] = [];
  const file = lesson?.resources.find((resource) => resource.file);
  if (file) {
    try {
      const pdfjs = await loadPdfjs();
      const task = pdfjs.getDocument({ url: studentResourceFileUrl(file.id), withCredentials: true });
      const pdf = await task.promise;
      for (let n = 1; n <= Math.min(2, pdf.numPages); n++) {
        const page = await pdf.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: (H * 0.86) / base.height });
        const c = document.createElement("canvas");
        c.width = Math.round(viewport.width);
        c.height = Math.round(viewport.height);
        await page.render({ canvas: c, canvasContext: c.getContext("2d")!, viewport }).promise;
        pages.push(c);
      }
      void task.destroy();
    } catch {
      // No PDF on the board: the paper below takes its place.
    }
  }
  if (pages.length === 0) pages.push(paperOf(lesson, Math.round(H * 0.86 * 0.707), Math.round(H * 0.86)));
  // pin the pages side by side, a little askew, with gold pins
  const gap = W * 0.04;
  const total = pages.reduce((sum, page) => sum + page.width, 0) + gap * (pages.length - 1);
  let x = (W - total) / 2;
  pages.forEach((page, i) => {
    const y = (H - page.height) / 2;
    ctx.save();
    ctx.translate(x + page.width / 2, y + page.height / 2);
    ctx.rotate((i % 2 ? 1 : -1) * 0.012);
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = "#fffdf8";
    ctx.fillRect(-page.width / 2, -page.height / 2, page.width, page.height);
    ctx.shadowColor = "transparent";
    ctx.drawImage(page, -page.width / 2, -page.height / 2);
    for (const px of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(px * (page.width / 2 - 26), -page.height / 2 + 26, 13, 0, Math.PI * 2);
      ctx.fillStyle = "#e0a42c";
      ctx.fill();
    }
    ctx.restore();
    x += page.width + gap;
  });
  return canvas;
}

/** A sheet with the lesson's title and text, for a lesson without a PDF. */
function paperOf(lesson: LessonData | null, width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#1b1a2e";
  ctx.font = `700 ${Math.round(width * 0.06)}px Georgia, serif`;
  const pad = width * 0.09;
  let y = pad + width * 0.06;
  for (const line of wrap(ctx, lesson?.title ?? "Materi", width - pad * 2)) {
    ctx.fillText(line, pad, y);
    y += width * 0.075;
  }
  ctx.font = `${Math.round(width * 0.034)}px Georgia, serif`;
  ctx.fillStyle = "#3a3850";
  y += width * 0.03;
  for (const line of wrap(ctx, (lesson?.content ?? "").replace(/[$\\{}]/g, ""), width - pad * 2)) {
    if (y > height - pad) break;
    ctx.fillText(line, pad, y);
    y += width * 0.052;
  }
  return c;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function BoardFace({ lesson }: { lesson: LessonData | null }) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const invalidate = useThree((state) => state.invalidate);
  const key = `${lesson?.id}:${lesson?.resources.find((resource) => resource.file)?.id ?? ""}`;
  useEffect(() => {
    let live = true;
    void paintBoard(lesson).then((canvas) => {
      if (!live) return;
      const next = new THREE.CanvasTexture(canvas);
      next.colorSpace = THREE.SRGBColorSpace;
      next.anisotropy = 4;
      setTexture((old) => {
        old?.dispose();
        return next;
      });
      invalidate();
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const [x, y, z] = ROOM.board.center as Vec3;
  if (!texture) return null;
  return (
    <mesh position={[x, y, z + 0.012]}>
      <planeGeometry args={[ROOM.board.width, ROOM.board.height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

// ---- the room -------------------------------------------------------------------------------

/** An invisible box that makes part of the room a button. */
function Hit({ at, size, label, onClick }: { at: Vec3; size: Vec3; label: string; onClick: () => void }) {
  return (
    <Clickable onClick={onClick} label={label}>
      <mesh position={at}>
        <boxGeometry args={size} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </Clickable>
  );
}

function Books({ course, island, onOpen }: { course: CourseData; island: IslandData; onOpen: (assignmentId: string) => void }) {
  const { scene } = useGLTF(CLASSROOM_URL, false, true);
  const halls = useMemo(() => sketchOf(course, island).halls.slice(0, 6), [course, island]);
  const { origin, step } = ROOM.stations.tugas.books as { origin: Vec3; step: Vec3 };
  const items = useMemo(
    () =>
      halls.map((hall, i) => {
        const book = scene.getObjectByName("book")!.clone(true);
        const gems = (hall.posts ?? ["locked", "locked", "locked", "locked", "locked"]).map((status, k) => {
          const gem = scene.getObjectByName(status === "locked" ? "gemOff" : "gem")!.clone(true);
          gem.position.set(-0.24 + k * 0.12, 0.12, 0.37);
          if (status === "current") gem.scale.setScalar(0.8);
          return gem;
        });
        gems.forEach((gem) => book.add(gem));
        book.position.set(origin[0] + step[0] * i, origin[1] + step[1] * i, origin[2] + step[2] * i);
        book.rotation.y = (i % 2 ? 1 : -1) * 0.06;
        return { hall, book };
      }),
    [halls, scene, origin, step],
  );
  return (
    <>
      {items.map(({ hall, book }) => (
        <Clickable key={hall.assignmentId} onClick={() => onOpen(hall.assignmentId)} label={`Buku tugas ${hall.title}`}>
          <primitive object={book} />
        </Clickable>
      ))}
    </>
  );
}

export function Classroom({ courseId, board, lesson, course, island }: { courseId: string; board: boolean; lesson: LessonData | null; course: CourseData | null; island: IslandData | null }) {
  const { scene } = useGLTF(CLASSROOM_URL, false, true);
  const navigate = useNavigate();
  const gl = useThree((state) => state.gl);
  const room = useMemo(() => {
    const node = scene.getObjectByName("classroom")!;
    node.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    return node;
  }, [scene]);
  // The world's fog would wash the room out; it comes back when the student leaves.
  const three = useThree((state) => state.scene);
  useLayoutEffect(() => {
    const fog = three.fog;
    three.fog = null;
    return () => {
      three.fog = fog;
    };
  }, [three]);
  // Shadows are static in this world: bake them once the room is in.
  useEffect(() => {
    const ids = [60, 400, 1200].map((ms) => window.setTimeout(() => { gl.shadowMap.needsUpdate = true; }, ms));
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [gl]);

  const s = ROOM.stations;
  const lessonId = lesson?.id;
  const labLesson = island?.labs[0]?.lessonId ?? null;
  const quiz = course?.quizzes[0]?.id ?? null;
  const go = {
    board: () => navigate(`/courses/${courseId}/kelas?${new URLSearchParams({ ...(lessonId ? { materi: lessonId } : {}), fokus: "papan" })}`),
    lab: () => labLesson && navigate(`/lessons/${labLesson}?ruang=lab`),
    book: (assignmentId: string) => navigate(`/courses/${courseId}/balai/${assignmentId}`),
    quiz: () => quiz && navigate(`/quizzes/${quiz}`),
  };
  const show = !board;
  return (
    <group>
      <RoomCamera board={board} />
      <hemisphereLight args={["#fff7ee", "#8b7fd0", 1.15]} />
      <directionalLight
        castShadow
        position={[5.5, 6.5, 2.5]}
        intensity={1.25}
        color="#fff0dc"
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
      >
        <object3D attach="target" position={[-1, 0, -2]} />
      </directionalLight>
      <pointLight position={[0, ROOM.room.height - 1.6, -0.9]} intensity={14} distance={11} decay={1.6} color="#ffd29a" />
      <ambientLight intensity={0.28} />

      <primitive object={room} />
      <BoardFace lesson={lesson} />
      {course && island && <Books course={course} island={island} onOpen={go.book} />}

      <Hit at={ROOM.board.center as Vec3} size={[ROOM.board.width, ROOM.board.height, 0.1]} label="Papan tulis" onClick={go.board} />
      <Hit at={s.lab.look as Vec3} size={[1.4, 1.6, 3.4]} label="Meja lab" onClick={go.lab} />
      <Hit at={s.quiz.look as Vec3} size={[1.4, 1.4, 1.4]} label="Target quiz" onClick={go.quiz} />

      <Sign position={s.materi.sign as Vec3} show={show} onClick={go.board} label="Materi: baca di papan">
        <SignText small="Materi" strong={lesson?.title ?? "Papan tulis"} />
      </Sign>
      <Sign position={s.lab.sign as Vec3} show={show && Boolean(labLesson)} onClick={go.lab} label="Lab">
        <SignText small="Lab" strong="Meja percobaan" />
      </Sign>
      <Sign position={s.tugas.sign as Vec3} show={show && Boolean(course?.assignments.length)} label="Tugas">
        <SignText small="Tugas" strong={`${course?.assignments.length ?? 0} buku`} />
      </Sign>
      <Sign position={s.quiz.sign as Vec3} show={show && Boolean(quiz)} onClick={go.quiz} label="Quiz">
        <SignText small="Quiz" strong={course?.quizzes[0]?.title ?? "Target"} />
      </Sign>
      {show && (
        <Html center position={[0, 1.62, -2.9]} zIndexRange={[19, 0]} style={{ pointerEvents: "none" }}>
          <span className="block h-[54px] w-[46px] overflow-hidden rounded-full border-[3px] border-[#4bd29f] bg-white shadow-[0_8px_16px_rgba(24,21,58,.3)]">
            <img src="/game/cat-avatar.webp" alt="Kucing guru" className="size-full scale-[1.12] object-cover" />
          </span>
        </Html>
      )}
    </group>
  );
}
