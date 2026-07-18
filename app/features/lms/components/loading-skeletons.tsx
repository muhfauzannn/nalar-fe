import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

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

function PageHeadingSkeleton() {
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="h-5 w-xl max-w-full" />
    </div>
  );
}

function BreadcrumbSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="size-4" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

function CourseCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-10" />
          </div>
          <Skeleton className="h-1 w-full rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="col-span-2 h-4 w-44 max-w-full" />
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

function DashboardSkeletonContent() {
  return (
    <div className="flex flex-col gap-10 lg:gap-12">
      <PageHeadingSkeleton />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(17rem,0.65fr)]">
        <Skeleton className="min-h-96 rounded-2xl" />
        <ActivityListSkeleton />
      </div>

      <div className="grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
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
      <div className="flex flex-col gap-8">
        <PageHeadingSkeleton />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <CourseCardSkeleton key={index} />
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
        <BreadcrumbSkeleton />

        <div>
          <Skeleton className="min-h-[28rem] rounded-3xl" />
          <Card className="relative z-10 mx-4 -mt-8 sm:mx-8 lg:mx-12">
            <CardContent className="grid grid-cols-2 p-0 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 px-4 py-4 sm:px-5 ${
                    index % 2 !== 0 ? "border-l" : ""
                  } ${index >= 2 ? "border-t lg:border-t-0" : ""} ${index > 0 ? "lg:border-l" : ""}`}
                >
                  <Skeleton className="size-9 shrink-0 rounded-xl" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-3 w-full max-w-24" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

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

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-full max-w-64" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Skeleton className="h-8 w-full rounded-lg" />
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex flex-col gap-3 border-b pb-4 last:border-0">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-full rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </LoadingRegion>
  );
}

export function LessonPageSkeleton() {
  return (
    <LoadingRegion label="Memuat materi course">
      <div className="flex flex-col gap-7">
        <BreadcrumbSkeleton />
        <div className="flex flex-col gap-3 border-b pb-6">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-11 w-xl max-w-full" />
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className={index === 8 ? "h-4 w-2/3" : "h-4 w-full"}
                />
              ))}
            </CardContent>
          </Card>
          <ActivityListSkeleton />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function ActivityPageSkeleton() {
  return (
    <LoadingRegion label="Memuat aktivitas pembelajaran">
      <div className="flex flex-col gap-7">
        <BreadcrumbSkeleton />
        <div className="flex max-w-3xl flex-col gap-3">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          <Skeleton className="h-11 w-xl max-w-full" />
          <Skeleton className="h-5 w-2xl max-w-full" />
        </div>
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
  if (pathname.startsWith("/courses/")) return <CourseDetailPageSkeleton />;
  if (pathname.startsWith("/lessons/")) return <LessonPageSkeleton />;
  return <ActivityPageSkeleton />;
}

export function StudentAppShellSkeleton() {
  return (
    <LoadingRegion label="Memuat ruang belajar siswa">
      <div className="flex min-h-svh w-full bg-background">
        <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
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
          <header className="flex h-16 items-center justify-between border-b px-5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8" />
              <div className="hidden flex-col gap-1.5 sm:flex">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="size-9 rounded-full" />
          </header>
          <main className="flex-1 px-5 py-8 sm:px-6 md:py-10 lg:px-10 lg:py-12">
            <div className="mx-auto w-full max-w-7xl">
              <DashboardSkeletonContent />
            </div>
          </main>
        </div>
      </div>
    </LoadingRegion>
  );
}
