import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

// Each skeleton has the shape of the page it stands in for (PageHeader first,
// then the same grid), so the real page replaces it without the layout jumping.

function LoadingRegion({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

/** Mirrors `PageHeader`: optional crumbs and eyebrow, title, description, meta. */
function PageHeaderSkeleton({
  crumbs = false,
  eyebrow = false,
  meta = false,
}: {
  crumbs?: boolean;
  eyebrow?: boolean;
  meta?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {crumbs && (
        <div className="flex items-center gap-2 py-0.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="size-3.5" />
          <Skeleton className="h-4 w-32" />
        </div>
      )}
      <div className="flex flex-col gap-2.5">
        {eyebrow && <Skeleton className="h-5 w-28 rounded-full" />}
        <Skeleton className="h-9 w-80 max-w-full sm:h-10" />
        <Skeleton className="h-5 w-xl max-w-full" />
        {meta && (
          <div className="flex gap-4 pt-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        )}
      </div>
    </div>
  );
}

function CourseCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <Skeleton className="mb-1 h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="mt-auto flex flex-col gap-3">
          <div className="flex justify-between gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-1 w-full rounded-full" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-9 w-full rounded-full" />
      </CardFooter>
    </Card>
  );
}

function ActivityListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="size-9 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** The two-panel "before you start" layout shared by quiz and assignment. */
function StartPanelSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <Card className="lg:col-span-8">
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 border-b pb-4 last:border-0">
              <Skeleton className="size-8 rounded-xl" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="lg:col-span-4">
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-full max-w-52" />
        </CardHeader>
        <CardFooter className="mt-auto">
          <Skeleton className="h-9 w-full rounded-full" />
        </CardFooter>
      </Card>
    </div>
  );
}

function DashboardSkeletonContent() {
  return (
    <div className="flex flex-col gap-10 lg:gap-12">
      <PageHeaderSkeleton />
      <Skeleton className="h-60 rounded-2xl sm:h-52" />
      <div className="grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <CourseCardSkeleton key={index} />
            ))}
          </div>
        </div>
        <ActivityListSkeleton />
      </div>
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <LoadingRegion label="Memuat dashboard siswa">
      <DashboardSkeletonContent />
    </LoadingRegion>
  );
}

export function CoursesPageSkeleton() {
  return (
    <LoadingRegion label="Memuat daftar course">
      <div className="flex flex-col gap-10 lg:gap-12">
        <PageHeaderSkeleton meta />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <CourseCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

export function ManageCoursesPageSkeleton() {
  return (
    <LoadingRegion label="Memuat course yang kamu kelola">
      <div className="flex flex-col gap-10">
        <PageHeaderSkeleton />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="h-full">
              <CardHeader>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                <Skeleton className="h-6 w-2/3" />
              </CardHeader>
              <CardContent className="mt-auto flex flex-col gap-4">
                <Skeleton className="h-4 w-48" />
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

export function CourseDetailPageSkeleton() {
  return (
    <LoadingRegion label="Memuat detail course">
      <div className="flex flex-col gap-8 lg:gap-10">
        <PageHeaderSkeleton crumbs eyebrow meta />

        <Card>
          <CardContent className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] md:items-center md:gap-8">
            <div className="flex flex-col gap-4">
              <div className="flex items-end justify-between gap-4">
                <Skeleton className="h-9 w-40" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-1 w-full rounded-full" />
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex flex-col gap-1.5">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-10" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-8">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-full max-w-48" />
              <Skeleton className="h-9 w-40 rounded-full" />
            </div>
          </CardContent>
        </Card>

        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_23rem] xl:gap-10">
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-44" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <Card>
              <CardContent className="flex flex-col gap-5">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-4 border-b py-4 last:border-0">
                    <Skeleton className="h-8 w-10 shrink-0" />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-14 rounded-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <ActivityListSkeleton />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function LessonPageSkeleton() {
  return (
    <LoadingRegion label="Memuat materi course">
      <div className="flex flex-col gap-10 lg:gap-14">
        <PageHeaderSkeleton crumbs eyebrow />

        <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
          <Card className="lg:col-span-8">
            <CardHeader>
              <Skeleton className="size-10 rounded-xl" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className={index === 7 ? "h-4 w-2/3" : "h-4 w-full"} />
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-4">
            <CardHeader>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <Skeleton className="size-12 rounded-2xl" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-3 w-full max-w-44" />
                </div>
              </div>
              <Skeleton className="h-px w-full" />
              <Skeleton className="h-9 w-full rounded-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </LoadingRegion>
  );
}

export function QuizPageSkeleton() {
  return (
    <LoadingRegion label="Memuat quiz">
      <div className="flex flex-col gap-8 lg:gap-10">
        <PageHeaderSkeleton crumbs eyebrow meta />
        <StartPanelSkeleton />
      </div>
    </LoadingRegion>
  );
}

export function AssignmentPageSkeleton() {
  return (
    <LoadingRegion label="Memuat assignment">
      <div className="flex flex-col gap-8 lg:gap-10">
        <PageHeaderSkeleton crumbs eyebrow meta />
        <StartPanelSkeleton />
      </div>
    </LoadingRegion>
  );
}

export function ActivityPageSkeleton() {
  return (
    <LoadingRegion label="Memuat halaman">
      <div className="flex flex-col gap-8">
        <PageHeaderSkeleton crumbs eyebrow />
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-52 w-full" />
              <Skeleton className="h-9 w-40 rounded-full" />
            </CardContent>
          </Card>
          <ActivityListSkeleton />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function StudentRouteSkeleton({ pathname }: { pathname: string }) {
  if (pathname === "/dashboard") return <DashboardPageSkeleton />;
  if (pathname === "/courses") return <CoursesPageSkeleton />;
  if (pathname === "/manage") return <ManageCoursesPageSkeleton />;
  if (pathname.startsWith("/courses/")) return <CourseDetailPageSkeleton />;
  if (pathname.startsWith("/lessons/")) return <LessonPageSkeleton />;
  if (pathname.startsWith("/assignments/")) return <AssignmentPageSkeleton />;
  if (pathname.startsWith("/quizzes/")) return <QuizPageSkeleton />;
  return <ActivityPageSkeleton />;
}

export function StudentAppShellSkeleton() {
  return (
    <LoadingRegion label="Memuat ruang belajar siswa">
      <div className="flex min-h-svh w-full bg-background">
        <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar p-4 lg:flex">
          <Skeleton className="h-9 w-40" />
          <div className="mt-12 flex flex-col gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="mt-auto flex flex-col gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Skeleton className="size-7" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="size-8 rounded-full" />
          </header>
          <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
            <div className="mx-auto w-full max-w-7xl">
              <DashboardSkeletonContent />
            </div>
          </main>
        </div>
      </div>
    </LoadingRegion>
  );
}
