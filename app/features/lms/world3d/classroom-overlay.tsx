import { BookOpen, Check, FlaskConical, NotebookPen, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

import { MathText } from "~/components/math-text";
import { cn } from "~/lib/utils";

import { PdfReader } from "../components/pdf-reader";
import type { CourseData, IslandData, LessonData } from "../types";
import { useBoardRect } from "./board-rect";
import { sketchOf } from "./layout";
import { card, Dock, Overlay, press, TopBar } from "./overlays";
import { useStageScene } from "./store";

// The buttons and cards over the classroom. In the room: which lesson is on
// the board and the four stations. At the board: only the lesson's PDF (or its
// text), laid exactly over the blackboard the 3D camera has squared up to.

const kelas = (courseId: string, lessonId: string | null, board = false) =>
  `/courses/${courseId}/kelas?${new URLSearchParams({ ...(lessonId ? { materi: lessonId } : {}), ...(board ? { fokus: "papan" } : {}) })}`;

export function ClassroomOverlay({ course, island, lesson, board }: { course: CourseData; island: IslandData; lesson: LessonData | null; board: boolean }) {
  const courseId = course.course.id;
  const detail = useMemo(() => ({ course, island }), [course, island]);
  useStageScene({ detail, shot: { kind: "classroom", courseId, board }, lesson }, [detail, courseId, board, lesson]);
  const lessons = useMemo(() => course.modules.slice().sort((a, b) => a.position - b.position).flatMap((module) => module.lessons), [course]);
  // The book to open: the first unfinished one, or the first when all are done.
  const nextHall = useMemo(() => {
    const halls = sketchOf(course, island).halls;
    return halls.find((hall) => !hall.chestOpen) ?? halls[0] ?? null;
  }, [course, island]);
  const labLesson = island.labs[0]?.lessonId ?? null;
  const quiz = course.quizzes[0] ?? null;
  const lessonId = lesson?.id ?? null;
  return (
    <Overlay>
      <TopBar
        back={board ? kelas(courseId, lessonId) : `/courses/${courseId}?tempat=library`}
        crumbs={[{ label: "Dunia", to: "/dunia" }, { label: `Pulau ${course.course.subjectName}`, to: `/courses/${courseId}` }, board ? { label: "Kelas", to: kelas(courseId, lessonId) } : { label: "Kelas" }, ...(board && lesson ? [{ label: lesson.title }] : [])]}
      />
      {board ? (
        lesson && <BoardReader lesson={lesson} closeTo={kelas(courseId, lessonId)} />
      ) : (
        <Dock>
          {lessons.length > 0 && (
            <section aria-label="Materi di papan" className={cn(card, "flex w-full max-w-[34rem] flex-col gap-2 p-3")}>
              <div className="flex items-center gap-2 px-1">
                <BookOpen className="size-4 text-[#5e4ac4]" aria-hidden="true" />
                <h2 className="text-sm font-bold">Di papan</h2>
                <span className="text-xs text-[#5e5e72]">Pilih materi, lalu baca di papan</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {lessons.map((item) => (
                  <Link
                    key={item.id}
                    to={kelas(courseId, item.id)}
                    replace
                    preventScrollReset
                    aria-current={item.id === lessonId ? "true" : undefined}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold",
                      item.id === lessonId ? "border-[#18153a] bg-[#18153a] text-white" : "border-[#e4def8] bg-white hover:bg-[#f6f3fd]",
                      press,
                    )}
                  >
                    {item.status === "completed" && <Check className="size-3.5 text-[#4bd29f]" aria-label="Selesai" />}
                    <span className="max-w-[14rem] truncate">{item.title}</span>
                  </Link>
                ))}
              </div>
              <Link to={kelas(courseId, lessonId, true)} className={cn("flex items-center justify-center gap-2 rounded-[14px] bg-[#18153a] px-4 py-3 text-sm font-bold text-white", press)}>
                <BookOpen className="size-4" aria-hidden="true" /> Baca di papan
              </Link>
            </section>
          )}
          <nav aria-label="Stasiun kelas" className={cn(card, "grid w-full max-w-[34rem] grid-cols-3 p-1.5")}>
            <Station to={labLesson ? `/lessons/${labLesson}?ruang=lab` : null} icon={<FlaskConical className="size-5" aria-hidden="true" />} label="Lab" />
            <Station to={nextHall ? `/courses/${courseId}/balai/${nextHall.assignmentId}` : null} icon={<NotebookPen className="size-5" aria-hidden="true" />} label="Tugas" />
            <Station to={quiz ? `/quizzes/${quiz.id}` : null} icon={<Target className="size-5" aria-hidden="true" />} label="Quiz" />
          </nav>
        </Dock>
      )}
    </Overlay>
  );
}

function Station({ to, icon, label }: { to: string | null; icon: React.ReactNode; label: string }) {
  if (!to) {
    return (
      <span className="flex flex-col items-center gap-1 rounded-2xl py-2 text-[13px] font-semibold text-[#a6a3bd]" aria-disabled="true">
        {icon}
        {label}
      </span>
    );
  }
  return (
    <Link to={to} className={cn("pointer-events-auto flex flex-col items-center gap-1 rounded-2xl py-2 text-[13px] font-semibold hover:bg-[#f6f3fd]", press)}>
      {icon}
      {label}
    </Link>
  );
}

/**
 * The board, opened: only the lesson's PDF, laid exactly over the blackboard
 * once the camera has settled (full width under the top bar on a phone). The
 * back button or Esc returns to the room.
 */
function BoardReader({ lesson, closeTo }: { lesson: LessonData; closeTo: string }) {
  const rect = useBoardRect();
  const navigate = useNavigate();
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const onChange = () => setNarrow(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") navigate(closeTo);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, closeTo]);
  const file = lesson.resources.find((resource) => resource.file);

  if (!rect) return null;
  const style = narrow ? undefined : { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  return (
    <section
      aria-label={`Papan: ${lesson.title}`}
      style={style}
      className={cn(
        "pointer-events-auto absolute overflow-y-auto overscroll-contain bg-white transition-opacity duration-200 ease-out starting:opacity-0",
        narrow ? "inset-x-0 bottom-0 top-[4.25rem]" : "rounded-[6px]",
      )}
    >
      {file ? (
        <PdfReader resourceId={file.id} title={file.title} guidance={null} onContext={ignore} />
      ) : (
        <article className="mx-auto max-w-[44rem] px-5 py-6 leading-8">
          {lesson.content ? <MathText>{lesson.content}</MathText> : <p className="text-[#5e5e72]">Materi ini belum berisi teks atau PDF.</p>}
        </article>
      )}
    </section>
  );
}

const ignore = () => {};
