import { expect, test } from "@playwright/test";
import { createServer } from "vite";
import {
  assignment,
  course,
  island,
  lesson,
  quiz,
} from "./fixtures/classroom-data";

let api: typeof import("../app/features/lms/api/student").studentApi;
let load: typeof import("../app/features/lms/api/classroom").loadClassroom;
let act: typeof import("../app/features/lms/api/classroom").actInClassroom;
let quizAction: typeof import("../app/features/lms/api/quiz-action").quizAction;
let assignmentAction: typeof import("../app/features/lms/api/assignment-action").assignmentAction;
let drafts: typeof import("../app/features/lms/lib/activity-drafts");
let originals: typeof api;
const base = "http://localhost/courses/course-a/kelas?materi=lesson-a";
const storage = new Map<string, string>();
const previousStorage = Object.getOwnPropertyDescriptor(
  globalThis,
  "sessionStorage",
);
const request = (search: string, fields?: Record<string, string>) =>
  new Request(
    base + search,
    fields ? { method: "POST", body: new URLSearchParams(fields) } : undefined,
  );

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  const server = await createServer({
    configFile: "tests/vite.config.ts",
    server: { middlewareMode: true, hmr: false },
  });
  try {
    ({ studentApi: api } = await server.ssrLoadModule(
      "/app/features/lms/api/student.ts",
    ));
    ({ loadClassroom: load, actInClassroom: act } = await server.ssrLoadModule(
      "/app/features/lms/api/classroom.ts",
    ));
    ({ quizAction } = await server.ssrLoadModule(
      "/app/features/lms/api/quiz-action.ts",
    ));
    ({ assignmentAction } = await server.ssrLoadModule(
      "/app/features/lms/api/assignment-action.ts",
    ));
    drafts = (await server.ssrLoadModule(
      "/app/features/lms/lib/activity-drafts.ts",
    )) as typeof drafts;
    originals = { ...api };
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    });
  } finally {
    await server.close();
  }
});
test.beforeEach(() => {
  storage.clear();
  Object.assign(api, originals, {
    course: async () => structuredClone(course),
    island: async () => structuredClone(island),
    lesson: async () => structuredClone(lesson),
    quiz: async () => structuredClone(quiz),
    assignment: async () => structuredClone(assignment),
  });
});
test.afterAll(() => {
  Object.assign(api, originals);
  if (previousStorage)
    Object.defineProperty(globalThis, "sessionStorage", previousStorage);
  else Reflect.deleteProperty(globalThis, "sessionStorage");
});

test("opening the lab reads its real lesson without loading an unrelated quiz", async () => {
  api.quiz = async () => {
    throw new Error("The lab must not request a quiz");
  };
  const data = await load(request("&fokus=lab&lab=lab-a"), "course-a");
  expect(data.labLesson?.labs[0]?.id).toBe("lab-a");
  expect(data.quiz).toBeNull();
  expect(data.assignment).toBeNull();
});

test("an activity from another course is rejected before it is loaded or started", async () => {
  let called = false;
  api.quiz = async () => {
    called = true;
    return quiz;
  };
  api.startQuiz = async () => {
    called = true;
  };
  await expect(
    load(request("&fokus=kuis&kuis=foreign-quiz"), "course-a"),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    act(
      request("&fokus=kuis&kuis=foreign-quiz", { intent: "start" }),
      "course-a",
    ),
  ).rejects.toMatchObject({ status: 404 });
  expect(called).toBe(false);
});

test("a direct link pins the chosen activity ID before attempts can change its status", async () => {
  await expect(load(request("&fokus=tugas"), "course-a")).rejects.toMatchObject(
    { status: 302 },
  );
  try {
    await load(request("&fokus=tugas"), "course-a");
  } catch (response) {
    expect((response as Response).headers.get("Location")).toContain(
      "tugas=assignment-a",
    );
  }
});

test("starting a quiz stays at its classroom station", async () => {
  let started = "";
  api.startQuiz = async (_request, id) => {
    started = id;
  };
  const req = request("&fokus=kuis&kuis=quiz-a", { intent: "start" });
  const result = await act(req, "course-a");
  expect(started).toBe("quiz-a");
  expect(result).toBeInstanceOf(Response);
  expect((result as Response).headers.get("Location")).toBe(
    new URL(req.url).pathname + new URL(req.url).search,
  );
});

test("quiz autosave keeps the question acknowledgement required by the existing component", async () => {
  let saved: unknown;
  api.saveQuizAnswer = async (_request, attemptId, answer) => {
    saved = { attemptId, answer };
    return { saved: true, savedAt: "now" };
  };
  const result = await act(
    request("&fokus=kuis&kuis=quiz-a", {
      intent: "save-answer",
      attemptId: "attempt-a",
      questionId: "question-a",
      questionType: "multiple_choice",
      answer: "option-a",
    }),
    "course-a",
  );
  expect(result).toMatchObject({ saved: true, questionId: "question-a" });
  expect(saved).toEqual({
    attemptId: "attempt-a",
    answer: { questionId: "question-a", selectedOptionId: "option-a" },
  });
});

test("a failed submit returns its error without redirecting away from the classroom", async () => {
  drafts.writeActivityDraft(
    drafts.quizDraftKey("attempt-a", "question-a"),
    "option-a",
  );
  api.submitQuiz = async () => {
    throw new TypeError("offline");
  };
  const result = await act(
    request("&fokus=kuis&kuis=quiz-a", {
      intent: "submit",
      attemptId: "attempt-a",
      questionId: "question-a",
      "questionType:question-a": "multiple_choice",
      "answer:question-a": "option-a",
    }),
    "course-a",
  );
  expect(result).toMatchObject({
    error: "Koneksi terputus. Perubahan belum diproses.",
  });
  expect(
    drafts.readActivityDraft(drafts.quizDraftKey("attempt-a", "question-a")),
  ).toBe("option-a");
});

test("a failed course read during autosave remains a form error with its question ID", async () => {
  api.course = async () => {
    throw new TypeError("offline");
  };
  const result = await act(
    request("&fokus=kuis&kuis=quiz-a", {
      intent: "save-answer",
      attemptId: "attempt-a",
      questionId: "question-a",
      questionType: "multiple_choice",
      answer: "option-a",
    }),
    "course-a",
  );
  expect(result).toMatchObject({
    error: "Koneksi terputus. Perubahan belum diproses.",
    questionId: "question-a",
  });
});

test("a successful quiz submit clears its recovery draft after server confirmation", async () => {
  const key = drafts.quizDraftKey("attempt-a", "question-a");
  drafts.writeActivityDraft(key, "option-a");
  api.submitQuiz = async () => undefined;
  const result = await act(
    request("&fokus=kuis&kuis=quiz-a", {
      intent: "submit",
      attemptId: "attempt-a",
      questionId: "question-a",
      "questionType:question-a": "multiple_choice",
      "answer:question-a": "option-a",
    }),
    "course-a",
  );
  expect(result).toBeInstanceOf(Response);
  expect(drafts.readActivityDraft(key)).toBeUndefined();
});

test("completing a task stage stays in its book rather than redirecting to the hall", async () => {
  const key = drafts.assignmentDraftKey("submission-a", "1_independent_effort");
  drafts.writeActivityDraft(key, "Pengamatan dari meja percobaan");
  api.completeStage = async () => ({
    currentStage: "2_guided_questioning",
    submitted: false,
    points: [],
  });
  const req = request("&fokus=tugas&tugas=assignment-a", {
    intent: "complete-stage",
    submissionId: "submission-a",
    courseId: "course-a",
    stage: "1_independent_effort",
    content: "Pengamatan dari meja percobaan",
  });
  const result = await act(req, "course-a");
  expect((result as Response).headers.get("Location")).toBe(
    new URL(req.url).pathname + new URL(req.url).search,
  );
  expect(drafts.readActivityDraft(key)).toBeUndefined();
});

test("the last post is not finished in the book: it lights up at the hall, where the chest is", async () => {
  api.completeStage = async () => ({ currentStage: null, submitted: true, points: [] });
  const result = await act(
    request("&fokus=tugas&tugas=assignment-a", {
      intent: "complete-stage",
      submissionId: "submission-a",
      courseId: "course-a",
      stage: "5_reflection",
      content: "Yang berubah dari drafku adalah caraku memeriksa.",
    }),
    "course-a",
  );
  expect((result as Response).headers.get("Location")).toBe("/courses/course-a/balai/assignment-a?nyala=5_reflection");
});

test("standalone quiz and assignment routes keep their existing redirects", async () => {
  api.startQuiz = async () => undefined;
  api.startAssignment = async () => undefined;
  expect(
    (
      (await quizAction(request("", { intent: "start" }), "quiz-a")) as Response
    ).headers.get("Location"),
  ).toBe("/quizzes/quiz-a");
  expect(
    (
      (await assignmentAction(
        request("", { intent: "start" }),
        "assignment-a",
      )) as Response
    ).headers.get("Location"),
  ).toBe("/assignments/assignment-a");
});
