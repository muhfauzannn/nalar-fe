import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIllustration,
  EmptyTitle,
} from "~/components/ui/empty";
import { CourseCard } from "../components/course-card";
import type { CourseSummary } from "../types";

export function CoursesPage({
  data: loaderData,
}: {
  data: {
    school: { id: string; name: string } | null;
    courses: CourseSummary[];
  };
}) {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Course saya</h1>
        <p className="max-w-2xl text-muted-foreground">
          Pelajari materi, kerjakan assignment, dan ikuti quiz dari setiap course.
        </p>
      </header>
      {loaderData.courses.length === 0 ? (
        <Empty className="min-h-96 border">
          <EmptyIllustration alt="Belum ada course" />
          <EmptyHeader>
            <EmptyTitle>Belum ada course yang bisa dibuka</EmptyTitle>
            <EmptyDescription>
              {loaderData.school
                ? "Enrollment aktif dan course yang sudah dipublikasikan akan tampil di sini."
                : "Minta sekolah mengaktifkan membership siswa terlebih dahulu."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {loaderData.courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
