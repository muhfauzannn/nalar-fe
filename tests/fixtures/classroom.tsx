import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createMemoryRouter,
  Outlet,
  RouterProvider,
  useActionData,
  useLoaderData,
  useSearchParams,
} from "react-router";
import { TooltipProvider } from "../../app/components/ui/tooltip";
import {
  actInClassroom,
  loadClassroom,
} from "../../app/features/lms/api/classroom";
import WorldStage from "../../app/features/lms/world3d/stage";
import { ClassroomOverlay } from "../../app/features/lms/world3d/classroom-overlay";
import { WorldOverlayContext } from "../../app/features/lms/world3d/mode";
import {
  classroomFocus,
  classroomUrl,
} from "../../app/features/lms/world3d/classroom-focus";
import {
  course,
  island,
  lesson,
  quiz,
  assignment,
  stages,
} from "./classroom-data";
import "../../app/app.css";

// All student requests in this fixture stay in memory. No backend or AI calls.
const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
    location.href,
  );
  const path = url.pathname;
  if (!path.startsWith("/api/")) return nativeFetch(input, init);
  const method = init?.method ?? "GET";
  const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
  let data: unknown = {};
  if (path === "/api/student/courses/course-a") data = course;
  else if (path.endsWith("/island")) data = island;
  else if (path === "/api/student/lessons/lesson-a") data = lesson;
  else if (path === "/api/student/quizzes/quiz-a") data = quiz;
  else if (path === "/api/student/assignments/assignment-a") data = assignment;
  else if (path === "/api/student/quizzes/quiz-a/attempts") {
    quiz.attempt = {
      id: "attempt-a",
      status: "in_progress",
      score: null,
      startedAt: new Date().toISOString(),
      submittedAt: null,
      expiresAt: null,
      isExpired: false,
      remainingSeconds: 600,
      canContinue: true,
      answers: [],
    };
  } else if (path.includes("/quiz-attempts/attempt-a/answers")) {
    const questionId = body.questionId ?? path.split("/").at(-1);
    if (quiz.attempt)
      quiz.attempt.answers =
        method === "DELETE"
          ? []
          : [
              {
                questionId,
                selectedOptionId: body.selectedOptionId ?? null,
                textAnswer: body.textAnswer ?? null,
                isCorrect: null,
                awardedPoints: null,
              },
            ];
    data = {
      saved: method !== "DELETE",
      deleted: method === "DELETE",
      savedAt: new Date().toISOString(),
    };
  } else if (path.endsWith("/quiz-attempts/attempt-a/submit")) {
    if (quiz.attempt) {
      quiz.attempt.status = "submitted";
      quiz.attempt.score = "100";
      quiz.attempt.submittedAt = new Date().toISOString();
    }
  } else if (path === "/api/student/assignments/assignment-a/submissions") {
    assignment.submission = {
      id: "submission-a",
      status: "in_progress",
      currentStage: stages[0],
      submittedAt: null,
      stages: stages.map((stage, i) => ({
        stage,
        status: i ? "locked" : "in_progress",
      })),
      artifacts: [],
      assessment: null,
      offloading: null,
    };
  } else if (path.includes("/stages/") && path.endsWith("/complete")) {
    const stage = path.split("/").at(-2)!;
    if (assignment.submission) {
      const i = stages.indexOf(stage as (typeof stages)[number]);
      assignment.submission.artifacts.push({
        stage: stages[i]!,
        content: body.content ?? "",
        version: 1,
      });
      assignment.submission.stages[i]!.status = "completed";
      if (i < stages.length - 1) {
        assignment.submission.currentStage = stages[i + 1]!;
        assignment.submission.stages[i + 1]!.status = "in_progress";
      } else assignment.submission.status = "submitted";
    }
    data = { points: [], submitted: false };
  } else if (path.includes("/labs/")) data = { points: 10 };
  else
    return Response.json(
      { error: "Layanan ini tidak diaktifkan dalam fixture lokal." },
      { status: 503 },
    );
  // Clone responses just as the real JSON API does.
  return Response.json(data);
};
function Shell() {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <WorldStage />
      <div
        ref={setHost}
        className="pointer-events-none absolute inset-0 z-10"
      />
      <WorldOverlayContext.Provider value={host}>
        <Outlet />
      </WorldOverlayContext.Provider>
    </main>
  );
}
function Classroom() {
  const data = useLoaderData<typeof loader>();
  const action = useActionData<typeof actInClassroom>();
  const [search] = useSearchParams();
  return (
    <ClassroomOverlay
      {...data}
      focus={classroomFocus(search)}
      actionError={action?.error}
      actionCode={action?.code}
    />
  );
}
const loader = ({ request }: { request: Request }) =>
  loadClassroom(request, "course-a");
const station = new URL(location.href).searchParams.get("station");
const router = createMemoryRouter(
  [
    {
      Component: Shell,
      children: [
        {
          path: "/courses/:courseId/kelas",
          loader,
          action: ({ request }) => actInClassroom(request, "course-a"),
          Component: Classroom,
        },
      ],
    },
  ],
  {
    initialEntries: [
      classroomUrl("course-a", {
        focus: classroomFocus(new URLSearchParams({ fokus: station ?? "" })),
        labId: "lab-a",
        quizId: "quiz-a",
        assignmentId: "assignment-a",
      }),
    ],
  },
);
createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <RouterProvider router={router} />
  </TooltipProvider>,
);
