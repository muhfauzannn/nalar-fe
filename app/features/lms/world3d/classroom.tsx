import { Html, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import * as THREE from "three";

import { LABS } from "~/features/labs";
import { SceneReady } from "~/features/loading/scene-ready";

import { gameGsap, playSound } from "~/features/game-feel";
import { studentResourceFileUrl } from "~/lib/files";

import { postNames } from "../lib/game";
import { loadPdfjs } from "../lib/pdfjs";
import type { CourseData, IslandData, LessonData } from "../types";
import ROOM from "./classroom-layout.json";
import { setSurfaceRect, useSurfaceRect } from "./board-rect";
import { boardPreviewScale } from "./board-preview";
import { classroomUrl, type ClassroomFocus } from "./classroom-focus";
import { dueText } from "./deadlines";
import { createClassroomInstance } from "./classroom-model";
import { classroomHomeFov, classroomHomePose, classroomSurface, stationAspect, stationPose, stationRect } from "./surface-projection";
import { STILL } from "./ground";
import { sketchOf, type Vec3 } from "./layout";
import { Clickable, Sign, SignText } from "./signs";
import { spirit } from "./spirit-store";
import { paintBook, paintLab, paintQuiz, sizeFace } from "./station-paint";
import { labPictureKey, useStationPicture } from "./station-pictures";
import { preloadTutorSpirit, TutorSpirit } from "./tutor-spirit";

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
  preloadTutorSpirit();
}

/**
 * The stations' signs float above their surfaces now that the surfaces carry the lab, the quiz and the book
 * themselves (station-paint.ts): a sign over the picture would hide it. Raised from the spots the room's layout gives.
 */
const SIGN_RISE: Record<"lab" | "quiz" | "tugas", number> = { lab: 0.85, quiz: 0.8, tugas: 0.55 };
const raised = (at: Vec3, by: number): Vec3 => [at[0], at[1] + by, at[2]];

/** Where the tutor spirit floats while the student looks around the room: beside the board. */
const SPIRIT_HOME: Vec3 = [-2.95, 2.35, -3.05];

// ---- camera ---------------------------------------------------------------------------------

type Pose = { p: Vec3; t: Vec3 };
const HOME: Pose = { p: ROOM.camera.position as Vec3, t: ROOM.camera.target as Vec3 };
/** Just outside the door: the dolly into the room starts here. */
const DOOR: Pose = { p: [HOME.p[0] * 0.4, HOME.p[1] + 0.3, HOME.p[2] + 3.2], t: HOME.t };

function RoomCamera({ focus }: { focus: ClassroomFocus | null }) {
  const ref = useRef<THREE.PerspectiveCamera>(null);
  const { size, setFrameloop, invalidate } = useThree();
  const state = useRef({ px: DOOR.p[0], py: DOOR.p[1], pz: DOOR.p[2], tx: DOOR.t[0], ty: DOOR.t[1], tz: DOOR.t[2] });
  useEffect(() => {
    const pose = focus ? stationPose(focus, size.width, size.height) : classroomHomePose(size.width, size.height);
    const to = { px: pose.p[0], py: pose.p[1], pz: pose.p[2], tx: pose.t[0], ty: pose.t[1], tz: pose.t[2] };
    const g = gameGsap();
    let frame = 0;
    let live = true;
    g.killTweensOf(state.current);
    setSurfaceRect(null);
    setFrameloop("always");
    const done = () => {
      if (!live || !focus || !ref.current) return;
      place();
      setSurfaceRect(focus, stationRect(ref.current, focus, size.width, size.height));
      invalidate();
      frame = requestAnimationFrame(() => { if (live) setFrameloop("demand"); });
    };
    if (STILL) {
      Object.assign(state.current, to);
      done();
    } else {
      playSound("whoosh");
      g.to(state.current, { ...to, duration: focus ? 0.85 : 1.1, ease: "power2.inOut", onComplete: done });
    }
    return () => {
      live = false;
      cancelAnimationFrame(frame);
      g.killTweensOf(state.current);
      setSurfaceRect(null);
      setFrameloop("always");
    };
  }, [focus, size.width, size.height, setFrameloop, invalidate]);
  function place() {
    const camera = ref.current;
    if (!camera) return;
    const s = state.current;
    camera.position.set(s.px, s.py, s.pz);
    camera.lookAt(s.tx, s.ty, s.tz);
    camera.aspect = size.width / size.height;
    camera.fov = focus ? ROOM.camera.fov : classroomHomeFov(size.width, size.height);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }
  useFrame(place);
  return <PerspectiveCamera ref={ref} makeDefault fov={ROOM.camera.fov} near={0.05} far={60} position={DOOR.p} />;
}

/** What a station's surface shows: a key that changes when the picture would, and how to paint it (station-paint.ts). */
type Face = { key: string; paint: (canvas: HTMLCanvasElement) => void };

/**
 * The texture for a station's face, painted at the surface's own shape so nothing is stretched. The shape is rounded
 * to a twentieth so that a window being resized does not repaint it at every pixel.
 */
function useFaceTexture(face: Face | null, aspect: number) {
  const invalidate = useThree((state) => state.invalidate);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const shape = Math.round(aspect * 20) / 20;
  const key = face ? `${face.key}@${shape}` : "";
  useEffect(() => {
    if (!face) {
      setTexture(null);
      return;
    }
    let live = true;
    void (async () => {
      try {
        await document.fonts.load('700 40px "Poppins"');
      } catch {
        // the system font does
      }
      if (!live) return;
      const canvas = document.createElement("canvas");
      sizeFace(canvas, shape);
      face.paint(canvas);
      const next = new THREE.CanvasTexture(canvas);
      next.colorSpace = THREE.SRGBColorSpace;
      next.anisotropy = 4;
      setTexture((old) => {
        old?.dispose();
        return next;
      });
      invalidate();
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return texture;
}

/** Physical screens on the bench, quiz stand, and the opened assignment book. */
function StationSurface({ station, active, onOpen, face }: { station: Exclude<ClassroomFocus, "papan">; active: boolean; onOpen?: () => void; face: Face | null }) {
  const { width, height } = useThree((state) => state.size);
  const surface = classroomSurface(station, active ? stationAspect(width, height) : undefined);
  const texture = useFaceTexture(face, surface.width / surface.height);
  const frame = station === "lab" ? "#256b59" : station === "tugas" ? "#8a614a" : "#5e4ac4";
  return (
    <group position={surface.center} rotation={[surface.tilt, 0, 0]} onClick={(event) => { event.stopPropagation(); onOpen?.(); }}>
      <mesh position={[0, 0, -0.045]} castShadow receiveShadow>
        <boxGeometry args={[surface.width + 0.16, surface.height + 0.16, 0.08]} />
        <meshStandardMaterial color={frame} roughness={0.8} />
      </mesh>
      <mesh>
        <planeGeometry args={[surface.width, surface.height]} />
        {/* keyed: a material made without a map must be remade, not given one, for the shader to use it */}
        <meshBasicMaterial key={texture ? "face" : "plain"} map={texture ?? undefined} color={texture ? "#ffffff" : station === "lab" ? "#edf8f4" : "#fffaf0"} toneMapped={false} />
      </mesh>
      {station === "tugas" && !active && !texture && <mesh position={[0, 0, 0.005]}><planeGeometry args={[0.025, surface.height]} /><meshBasicMaterial color="#d6c8b5" /></mesh>}
    </group>
  );
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
  let preview: HTMLCanvasElement | null = null;
  const file = lesson?.resources.find((resource) => resource.file);
  if (file) {
    try {
      const pdfjs = await loadPdfjs();
      const task = pdfjs.getDocument({ url: studentResourceFileUrl(file.id), withCredentials: true });
      try {
        const pdf = await task.promise;
        // A single complete slide remains legible from the classroom entrance.
        const page = await pdf.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: boardPreviewScale(W, H, base.width, base.height) });
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(viewport.width));
        c.height = Math.max(1, Math.round(viewport.height));
        await page.render({ canvas: c, canvasContext: c.getContext("2d")!, viewport }).promise;
        preview = c;
      } finally {
        void task.destroy().catch(() => {});
      }
    } catch {
      // No PDF on the board: the paper below takes its place.
    }
  }
  preview ??= paperOf(lesson, Math.round(H * 0.86 * 0.707), Math.round(H * 0.86));
  const x = (W - preview.width) / 2, y = (H - preview.height) / 2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(x, y, preview.width, preview.height);
  ctx.shadowColor = "transparent";
  ctx.drawImage(preview, x, y);
  for (const px of [x + 26, x + preview.width - 26]) {
    ctx.beginPath();
    ctx.arc(px, y + 26, 13, 0, Math.PI * 2);
    ctx.fillStyle = "#e0a42c";
    ctx.fill();
  }
  ctx.restore();
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

// ---- what the stations show ----------------------------------------------------------------------

const FINISHED = new Set(["closed", "completed", "expired", "graded", "returned", "submitted"]);

/**
 * The faces of the lab bench's screen, the quiz board and the task book, from the course and island the page already
 * has (station-paint.ts says what each shows). Each is the first of its kind, the one a click on the station opens.
 */
function useStationFaces(course: CourseData | null, island: IslandData | null) {
  const lab = island?.labs[0];
  const entry = lab ? LABS[lab.labKey] : undefined;
  const picture = useStationPicture(lab ? labPictureKey(lab.labKey) : null);
  const quiz = course?.quizzes[0];
  const assignment = course?.assignments[0];
  const building = assignment ? island?.buildings.find((item) => item.assignmentId === assignment.id) : undefined;
  const others = Math.max(0, (course?.assignments.length ?? 0) - 1);
  return useMemo(() => {
    const now = Date.now();
    const make = <T,>(data: T, paint: (canvas: HTMLCanvasElement, data: T) => void): Face => ({
      key: JSON.stringify(data),
      paint: (canvas) => paint(canvas, data),
    });
    // the lab's picture is a canvas, so its arrival (not its pixels) goes into the key
    const labData = lab && entry ? { title: entry.title, subject: entry.subject, solved: Math.min(lab.solved, lab.challenges), total: lab.challenges || entry.challenges } : null;
    const labFace: Face | null = labData
      ? { key: JSON.stringify({ ...labData, picture: Boolean(picture) }), paint: (canvas) => paintLab(canvas, { ...labData, picture }) }
      : null;
    const quizFace = quiz
      ? make(
          {
            title: quiz.title,
            minutes: quiz.timeLimitMinutes,
            due: quiz.dueAt ? dueText(quiz.dueAt, now) : null,
            state: quiz.score !== null || FINISHED.has(quiz.attemptStatus ?? "") ? ("done" as const) : quiz.attemptStatus === "in_progress" ? ("running" as const) : ("new" as const),
            score: quiz.score,
          },
          paintQuiz,
        )
      : null;
    const bookFace = assignment
      ? make(
          {
            title: assignment.title,
            due: assignment.dueAt ? dueText(assignment.dueAt, now) : null,
            state: FINISHED.has(assignment.submissionStatus ?? "") ? ("done" as const) : assignment.submissionStatus === "in_progress" ? ("working" as const) : ("new" as const),
            // an assignment nobody has started has no building yet: its five posts, all still closed
            posts: building
              ? building.posts.map((post) => ({ name: postNames[post.stage], status: post.status }))
              : Object.values(postNames).map((name) => ({ name, status: "locked" as const })),
            more: others,
          },
          paintBook,
        )
      : null;
    return { lab: labFace, kuis: quizFace, tugas: bookFace };
  }, [lab, entry, picture, quiz, assignment, building, others]);
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

export function Classroom({ courseId, focus, lesson, course, island, ready = false }: { ready?: boolean; courseId: string; focus: ClassroomFocus | null; lesson: LessonData | null; course: CourseData | null; island: IslandData | null }) {
  const { scene } = useGLTF(CLASSROOM_URL, false, true);
  const surface = useSurfaceRect(focus ?? "papan");
  const navigate = useNavigate();
  const gl = useThree((state) => state.gl);
  const narrow = useThree((state) => state.size.width < 600);
  const room = useMemo(() => createClassroomInstance(scene), [scene]);
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
    board: () => navigate(classroomUrl(courseId, { lessonId, focus: "papan" })),
    lab: () => labLesson && navigate(classroomUrl(courseId, { lessonId, focus: "lab", labId: island?.labs[0]?.id })),
    book: (assignmentId: string) => { if (!focus) navigate(classroomUrl(courseId, { lessonId, focus: "tugas", assignmentId })); },
    quiz: () => quiz && navigate(classroomUrl(courseId, { lessonId, focus: "kuis", quizId: quiz })),
  };
  const faces = useStationFaces(course, island);
  const show = focus === null;
  return (
    <group>
      <RoomCamera focus={focus} />
      <SceneReady enabled={ready && (!focus || Boolean(surface))} />
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
      <StationSurface station="lab" active={focus === "lab"} onOpen={show ? go.lab : undefined} face={faces.lab} />
      <StationSurface station="kuis" active={focus === "kuis"} onOpen={show ? go.quiz : undefined} face={faces.kuis} />
      <StationSurface station="tugas" active={focus === "tugas"} onOpen={show ? () => course?.assignments[0] && go.book(course.assignments[0].id) : undefined} face={faces.tugas} />
      {course && island && <Books course={course} island={island} onOpen={go.book} />}

      {show && <>
      <Hit at={ROOM.board.center as Vec3} size={[ROOM.board.width, ROOM.board.height, 0.1]} label="Papan tulis" onClick={go.board} />
      <Hit at={s.lab.look as Vec3} size={[1.4, 1.6, 3.4]} label="Meja lab" onClick={go.lab} />
      <Hit at={s.quiz.look as Vec3} size={[1.4, 1.4, 1.4]} label="Target quiz" onClick={go.quiz} />
      <Hit at={classroomSurface("tugas").center} size={[2.4, 1.5, 0.2]} label="Buku tugas" onClick={() => course?.assignments[0] && go.book(course.assignments[0].id)} />
      </>}

      <Sign position={s.materi.sign as Vec3} show={show && !narrow} onClick={go.board} label="Materi: baca di papan">
        <SignText small="Materi" strong={lesson?.title ?? "Papan tulis"} />
      </Sign>
      <Sign position={raised(s.lab.sign as Vec3, SIGN_RISE.lab)} show={show && !narrow && Boolean(labLesson)} onClick={go.lab} label="Lab">
        <SignText small="Lab" strong="Meja percobaan" />
      </Sign>
      <Sign position={raised(s.tugas.sign as Vec3, SIGN_RISE.tugas)} show={show && !narrow && Boolean(course?.assignments.length)} onClick={() => course?.assignments[0] && go.book(course.assignments[0].id)} label="Tugas">
        <SignText small="Tugas" strong={`${course?.assignments.length ?? 0} buku`} />
      </Sign>
      <Sign position={[SPIRIT_HOME[0], SPIRIT_HOME[1] + 0.75, SPIRIT_HOME[2]]} show={show && !narrow} onClick={() => spirit.toggle()} label="Panggil tutor">
        <SignText small="Tutor AI" strong="Panggil aku" />
      </Sign>
      <Sign position={raised(s.quiz.sign as Vec3, SIGN_RISE.quiz)} show={show && !narrow && Boolean(quiz)} onClick={go.quiz} label="Quiz">
        <SignText small="Quiz" strong={course?.quizzes[0]?.title ?? "Target"} />
      </Sign>
      {show && (
        <Clickable onClick={() => spirit.toggle()} label="Tutor AI">
          <group position={SPIRIT_HOME} scale={1.7}>
            <TutorSpirit />
            <pointLight position={[0, 0, 0.25]} intensity={1.6} distance={2.4} decay={1.8} color="#b7a9ff" />
          </group>
        </Clickable>
      )}
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
