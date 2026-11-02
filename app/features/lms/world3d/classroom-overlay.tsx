import {
  BookOpen,
  Check,
  FlaskConical,
  NotebookPen,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Link,
  useNavigate,
  useRevalidator,
  useSearchParams,
} from "react-router";

import { MathText } from "~/components/math-text";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { LABS } from "~/features/labs";
import { cn } from "~/lib/utils";
import type { loadClassroom } from "../api/classroom";
import { LessonLabs } from "../components/lesson-labs";
import { PdfReader } from "../components/pdf-reader";
import { AssignmentPage } from "../pages/assignment-page";
import { QuizPage } from "../pages/quiz-page";
import { useSurfaceRect } from "./board-rect";
import { classroomUrl, type ClassroomFocus } from "./classroom-focus";
import { card, Dock, Overlay, press, TopBar } from "./overlays";
import { useStageScene } from "./store";

type Props = Awaited<ReturnType<typeof loadClassroom>> & {
  focus: ClassroomFocus | null;
  actionError?: string;
  actionCode?: string;
  actionDraft?: string;
  actionStage?: string;
};

const labels = {
  papan: "Papan materi",
  lab: "Meja percobaan",
  kuis: "Papan kuis",
  tugas: "Buku tugas",
};

export function ClassroomOverlay({
  course,
  island,
  lesson,
  labLesson,
  quiz,
  assignment,
  earned,
  focus,
  ...action
}: Props) {
  const courseId = course.course.id;
  const detail = useMemo(() => ({ course, island }), [course, island]);
  useStageScene(
    { detail, shot: { kind: "classroom", courseId, focus }, lesson },
    [detail, courseId, focus, lesson],
  );
  const [search] = useSearchParams();
  const revalidator = useRevalidator();
  const lessons = useMemo(
    () =>
      course.modules
        .slice()
        .sort((a, b) => a.position - b.position)
        .flatMap((module) => module.lessons),
    [course],
  );
  const lessonId = lesson?.id ?? null;
  const selectedLab =
    island.labs.find((lab) => lab.id === search.get("lab")) ?? island.labs[0];
  const nextAssignment =
    course.assignments.find(
      (item) =>
        item.submissionStatus !== "submitted" &&
        item.submissionStatus !== "returned",
    ) ?? course.assignments[0];
  const at = (
    station: ClassroomFocus | null,
    changes: {
      lessonId?: string;
      labId?: string;
      quizId?: string;
      assignmentId?: string;
    } = {},
  ) =>
    classroomUrl(courseId, {
      lessonId,
      focus: station,
      labId: search.get("lab"),
      quizId: search.get("kuis"),
      assignmentId: search.get("tugas"),
      ...changes,
    });
  const closeTo = at(null);
  const labOptions = island.labs.map((lab) => ({
    id: lab.id,
    title: LABS[lab.labKey]?.title ?? lab.labKey,
  }));
  const activeLabs =
    labLesson?.labs.filter(
      (lab) => lab.id === selectedLab?.id && LABS[lab.labKey],
    ) ?? [];

  return (
    <Overlay>
      <TopBar
        back={focus ? closeTo : `/courses/${courseId}?tempat=library`}
        backLabel={focus ? "Kembali melihat kelas" : undefined}
        crumbs={[
          { label: "Dunia", to: "/dunia" },
          {
            label: `Pulau ${course.course.subjectName}`,
            to: `/courses/${courseId}`,
          },
          focus ? { label: "Kelas", to: closeTo } : { label: "Kelas" },
          ...(focus ? [{ label: labels[focus] }] : []),
        ]}
      />
      {focus ? (
        <StationWorkspace key={focus} focus={focus} closeTo={closeTo} pdf={focus === "papan" && Boolean(lesson?.resources.some((resource) => resource.file))}>
          {focus === "papan" ? (
            lesson ? (
              <BoardReader lesson={lesson} />
            ) : (
              <Unavailable title="Belum ada materi" />
            )
          ) : focus === "lab" ? (
            <div className="flex flex-col gap-4 p-4 sm:p-6">
              <ActivityChoices
                label="Pilih percobaan"
                items={labOptions}
                selected={selectedLab?.id}
                href={(id) => at("lab", { labId: id })}
              />
              {activeLabs.length ? (
                <LessonLabs
                  key={selectedLab?.id}
                  labs={activeLabs}
                  onSolved={() => void revalidator.revalidate()}
                />
              ) : (
                <Unavailable title="Belum ada percobaan" />
              )}
            </div>
          ) : focus === "kuis" ? (
            <div className="flex flex-col gap-4 p-4 sm:p-6">
              <ActivityChoices
                label="Pilih kuis"
                items={course.quizzes}
                selected={quiz?.quiz.id}
                href={(id) => at("kuis", { quizId: id })}
              />
              {quiz ? (
                <QuizPage
                  key={quiz.quiz.id}
                  data={quiz}
                  embedded
                  returnTo={closeTo}
                  {...action}
                />
              ) : (
                <Unavailable title="Belum ada kuis" />
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-4 sm:p-6">
              <ActivityChoices
                label="Pilih buku tugas"
                items={course.assignments}
                selected={assignment?.id}
                href={(id) => at("tugas", { assignmentId: id })}
              />
              {assignment ? (
                <AssignmentPage
                  key={assignment.id}
                  data={assignment}
                  earned={earned}
                  embedded
                  returnTo={closeTo}
                  {...action}
                />
              ) : (
                <Unavailable title="Belum ada tugas" />
              )}
            </div>
          )}
        </StationWorkspace>
      ) : (
        <Dock className="pointer-events-auto max-h-[calc(100%-5rem)] overflow-y-auto overscroll-contain [&>nav]:shrink-0 [&>section]:shrink-0">
          {lessons.length > 0 && (
            <section
              aria-label="Materi di papan"
              className={cn(
                card,
                "flex w-full max-w-[34rem] flex-col gap-2 p-3",
              )}
            >
              <div className="flex items-center gap-2 px-1">
                <BookOpen
                  className="size-4 text-[#5e4ac4]"
                  aria-hidden="true"
                />
                <h2 className="text-sm font-bold">Di papan</h2>
                <span className="text-xs text-[#5e5e72] max-sm:hidden">
                  Pilih materi, lalu baca di papan
                </span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {lessons.map((item) => (
                  <Link
                    key={item.id}
                    to={at(null, { lessonId: item.id })}
                    replace
                    preventScrollReset
                    aria-current={item.id === lessonId ? "true" : undefined}
                    className={cn(
                      "flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold",
                      item.id === lessonId
                        ? "border-[#18153a] bg-[#18153a] text-white"
                        : "border-[#e4def8] bg-white hover:bg-[#f6f3fd]",
                      press,
                    )}
                  >
                    {item.status === "completed" && (
                      <Check
                        className="size-3.5 text-[#4bd29f]"
                        aria-label="Selesai"
                      />
                    )}
                    <span className="max-w-[14rem] truncate">{item.title}</span>
                  </Link>
                ))}
              </div>
              <Link
                to={at("papan")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-[14px] bg-[#18153a] px-4 py-3 text-sm font-bold text-white",
                  press,
                )}
              >
                <BookOpen className="size-4" aria-hidden="true" /> Baca di papan
              </Link>
            </section>
          )}
          <nav
            aria-label="Stasiun kelas"
            className={cn(card, "grid w-full max-w-[34rem] grid-cols-3 p-1.5")}
          >
            <Station
              to={selectedLab ? at("lab", { labId: selectedLab.id }) : null}
              icon={<FlaskConical className="size-5" aria-hidden="true" />}
              label="Lab"
            />
            <Station
              to={
                nextAssignment
                  ? at("tugas", { assignmentId: nextAssignment.id })
                  : null
              }
              icon={<NotebookPen className="size-5" aria-hidden="true" />}
              label="Tugas"
            />
            <Station
              to={
                course.quizzes[0]
                  ? at("kuis", { quizId: course.quizzes[0].id })
                  : null
              }
              icon={<Target className="size-5" aria-hidden="true" />}
              label="Kuis"
            />
          </nav>
        </Dock>
      )}
    </Overlay>
  );
}

function ActivityChoices({
  label,
  items,
  selected,
  href,
}: {
  label: string;
  items: { id: string; title: string }[];
  selected?: string;
  href: (id: string) => string;
}) {
  if (items.length < 2) return null;
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.id}
          to={href(item.id)}
          replace
          preventScrollReset
          aria-current={selected === item.id ? "true" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center rounded-lg border px-3 py-2 text-sm",
            selected === item.id
              ? "bg-primary text-primary-foreground"
              : "bg-background text-foreground",
          )}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  );
}

function Station({
  to,
  icon,
  label,
}: {
  to: string | null;
  icon: ReactNode;
  label: string;
}) {
  const content = (
    <>
      {icon}
      {label}
    </>
  );
  return to ? (
    <Link
      to={to}
      className={cn(
        "pointer-events-auto flex flex-col items-center gap-1 rounded-2xl py-2 text-[13px] font-semibold hover:bg-[#f6f3fd]",
        press,
      )}
    >
      {content}
    </Link>
  ) : (
    <span
      className="flex flex-col items-center gap-1 rounded-2xl py-2 text-[13px] font-semibold text-[#a6a3bd]"
      aria-disabled="true"
    >
      {content}
    </span>
  );
}

function StationWorkspace({
  focus,
  closeTo,
  children,
  pdf,
}: {
  focus: ClassroomFocus;
  closeTo: string;
  children: ReactNode;
  pdf: boolean;
}) {
  const rect = useSurfaceRect(focus);
  const [lastRect, setLastRect] = useState(rect);
  const navigate = useNavigate();
  const panel = useRef<HTMLElement>(null);
  const entered = useRef(false);
  useEffect(() => {
    if (rect) setLastRect(rect);
  }, [rect]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !event.isComposing &&
        !event.defaultPrevented
      )
        navigate(closeTo);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, closeTo]);
  useEffect(() => {
    if (rect && !entered.current) {
      panel.current?.focus({ preventScroll: true });
      entered.current = true;
    }
  }, [rect]);
  // Resizing (including a mobile keyboard opening) reframes the camera. Keep
  // the form mounted so its text, focus, timer and pending autosaves survive.
  const position = rect ?? lastRect;
  if (!position)
    return (
      <p
        role="status"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm shadow-sm"
      >
        Mendekati {labels[focus].toLowerCase()}…
      </p>
    );
  return (
    <section
      ref={panel}
      tabIndex={-1}
      aria-label={labels[focus]}
      data-classroom-surface={focus}
      style={{
        "--surface-left": `${position.left}px`,
        "--surface-top": `${position.top}px`,
        "--surface-width": `${position.width}px`,
        "--surface-height": `${position.height}px`,
      } as CSSProperties}
      aria-busy={!rect}
      className={cn(
        "classroom-surface pointer-events-auto absolute overscroll-contain rounded-[4px] bg-background text-foreground shadow-sm outline-none [color-scheme:light] [&_input]:text-base [&_select]:text-base [&_textarea]:text-base",
        focus === "papan" && "bg-white text-[#18153a]",
        pdf ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden",
      )}
    >
      {children}
    </section>
  );
}

function BoardReader({ lesson }: { lesson: NonNullable<Props["lesson"]> }) {
  const file = lesson.resources.find((resource) => resource.file);
  return file ? (
    <PdfReader
      resourceId={file.id}
      title={file.title}
      fitContainer
      guidance={null}
      onContext={ignore}
    />
  ) : (
    <article className="mx-auto max-w-[44rem] px-5 py-6 leading-8">
      {lesson.content ? (
        <MathText>{lesson.content}</MathText>
      ) : (
        <p className="text-[#5e5e72]">Materi ini belum berisi teks atau PDF.</p>
      )}
    </article>
  );
}

function Unavailable({ title }: { title: string }) {
  return (
    <Alert>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        Aktivitas akan muncul di stasiun ini setelah ditambahkan oleh pengajar.
      </AlertDescription>
    </Alert>
  );
}
const ignore = () => {};
