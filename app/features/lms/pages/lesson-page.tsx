import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  Link2,
  RotateCcw,
} from "lucide-react";
import { Form, Link } from "react-router";

import { MathText } from "~/components/math-text";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { Separator } from "~/components/ui/separator";
import type { LessonData } from "../types";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function LessonPage({ data: loaderData }: { data: LessonData }) {
  const scope = useRef<HTMLDivElement>(null);
  const completed = loaderData.progressStatus === "completed";
  const contentBlocks = loaderData.content
    ?.trim()
    .split(/\n{2,}/)
    .filter(Boolean);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-lesson-reveal]", {
          y: 14,
          opacity: 0,
          duration: 0.38,
          ease: "power2.out",
          stagger: 0.06,
          clearProps: "transform,opacity",
        });

        const words = gsap.utils.toArray<HTMLElement>("[data-lesson-word]");
        if (words.length > 0) {
          gsap.fromTo(
            words,
            { opacity: 0.22 },
            {
              opacity: 1,
              stagger: 0.018,
              ease: "none",
              scrollTrigger: {
                trigger: "[data-lesson-reading]",
                start: "clamp(top 78%)",
                end: "clamp(bottom 45%)",
                scrub: 0.35,
              },
            },
          );
        }

        gsap.to("[data-lesson-marquee]", {
          xPercent: -50,
          duration: 24,
          ease: "none",
          repeat: -1,
        });
      });

      media.add(
        "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
        () => {
          const readingGrid = scope.current?.querySelector<HTMLElement>(
            "[data-reading-grid]",
          );
          const readingRail = scope.current?.querySelector<HTMLElement>(
            "[data-lesson-rail]",
          );

          if (
            readingGrid &&
            readingRail &&
            readingGrid.scrollHeight > window.innerHeight
          ) {
            ScrollTrigger.create({
              trigger: readingGrid,
              start: "top 96px",
              end: "bottom bottom-=48",
              pin: readingRail,
              pinSpacing: false,
            });
          }
        },
      );

      return () => media.revert();
    },
    { scope },
  );

  return (
    <div ref={scope} className="w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-10 lg:gap-14">
        <div data-lesson-reveal>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={<Link to={`/courses/${loaderData.courseId}`} />}
                >
                  {loaderData.courseName}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{loaderData.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <header
          data-lesson-reveal
          className="group relative isolate grid min-h-[24rem] overflow-hidden rounded-3xl bg-primary px-6 py-9 text-primary-foreground sm:px-9 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)] lg:items-center lg:px-12 lg:py-12"
        >
          <div
            aria-hidden="true"
            className="absolute -top-28 -left-24 size-72 rounded-full bg-secondary/10"
          />
          <div className="relative flex max-w-5xl flex-col items-start gap-5 pb-24 lg:pb-10">
            <p className="text-sm font-medium text-primary-foreground/60">
              {loaderData.courseName} / {loaderData.moduleTitle}
            </p>
            <h1 className="max-w-5xl font-heading text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
              {loaderData.title}
            </h1>
            <p className="max-w-2xl text-sm/relaxed text-primary-foreground/70 sm:text-base/relaxed">
              Baca dengan tenang, gunakan resource bila diperlukan, lalu tandai
              materi saat selesai.
            </p>
          </div>

          <div className="relative flex items-center justify-center lg:justify-end">
            <img
              src="/illustration/chalkboard.svg"
              width={1254}
              height={1254}
              alt=""
              aria-hidden="true"
              className="pointer-events-none aspect-square w-full max-w-60 select-none object-contain transition-transform duration-700 ease-out group-hover:scale-105 sm:max-w-72 lg:max-w-80"
            />
          </div>

          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 overflow-hidden border-t border-primary-foreground/10 py-3"
          >
            <div
              data-lesson-marquee
              className="flex w-max items-center text-xs font-medium tracking-[0.18em] text-primary-foreground/25 uppercase"
            >
              {Array.from({ length: 2 }).map((_, groupIndex) => (
                <div key={groupIndex} className="flex shrink-0 items-center gap-10 pr-10">
                  <span>Pahami konsep</span>
                  <span>Catat inti materi</span>
                  <span>Gunakan resource</span>
                  <span>Selesaikan lesson</span>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div
          data-reading-grid
          className="grid grid-flow-dense items-start gap-8 lg:grid-cols-12 lg:gap-10"
        >
          <article
            data-lesson-reading
            data-lesson-reveal
            className="min-w-0 lg:col-span-8"
            aria-labelledby="lesson-content-title"
          >
            <Card>
              <CardHeader>
                <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <BookOpen className="size-5" aria-hidden="true" />
                </div>
                <CardTitle id="lesson-content-title" className="text-xl">
                  Materi pembelajaran
                </CardTitle>
                <CardDescription>
                  Fokus pada satu gagasan di setiap paragraf.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contentBlocks && contentBlocks.length > 0 ? (
                  <div className="flex flex-col gap-7 text-base/8 text-foreground/90">
                    {contentBlocks.map((block, blockIndex) => (
                      <p key={`${blockIndex}-${block.slice(0, 24)}`} className="whitespace-pre-wrap">
                        <MathText animateWords>{block}</MathText>
                      </p>
                    ))}
                  </div>
                ) : (
                  <Empty className="border border-dashed py-10">
                    <EmptyMedia variant="icon">
                      <BookOpen />
                    </EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle>Konten teks belum tersedia</EmptyTitle>
                      <EmptyDescription>
                        Gunakan resource pendukung jika sudah dipublikasikan.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </CardContent>
            </Card>
          </article>

          <aside
            data-lesson-rail
            data-lesson-reveal
            className="min-w-0 lg:col-span-4"
            aria-label="Aksi lesson"
          >
            <Card>
              <CardHeader>
                <CardTitle>Progres materi</CardTitle>
                <CardDescription>
                  Status ini masuk ke progres course.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex items-center gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-mint-soft text-brand-mint-foreground">
                    {completed ? (
                      <CheckCircle2 className="size-6" aria-hidden="true" />
                    ) : (
                      <BookOpen className="size-6" aria-hidden="true" />
                    )}
                  </span>
                  <div>
                    <p className="font-heading text-xl font-semibold">
                      {completed ? "Selesai" : "Sedang dipelajari"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {completed ? "Tercatat pada progres course" : "Belum ditandai selesai"}
                    </p>
                  </div>
                </div>
                <Separator />
                <Form method="post">
                  <input
                    type="hidden"
                    name="status"
                    value={completed ? "in_progress" : "completed"}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    variant={completed ? "outline" : "default"}
                  >
                    {completed ? (
                      <RotateCcw data-icon="inline-start" />
                    ) : (
                      <CheckCircle2 data-icon="inline-start" />
                    )}
                    {completed ? "Buka kembali" : "Tandai selesai"}
                  </Button>
                </Form>
              </CardContent>
              <CardFooter>
                <Button
                  variant="ghost"
                  className="w-full"
                  render={<Link to={`/courses/${loaderData.courseId}`} />}
                >
                  <ArrowLeft data-icon="inline-start" />
                  Kembali ke course
                </Button>
              </CardFooter>
            </Card>
          </aside>
        </div>

        {loaderData.resources.length > 0 && (
          <section
            data-lesson-reveal
            className="flex flex-col gap-5"
            aria-labelledby="lesson-resources-title"
          >
            <div className="flex flex-col gap-1">
              <h2
                id="lesson-resources-title"
                className="font-heading text-2xl font-semibold tracking-tight"
              >
                Resource pendukung
              </h2>
              <p className="text-sm text-muted-foreground">
                Buka bahan tambahan tanpa meninggalkan alur materi.
              </p>
            </div>

            <div className="flex min-h-64 gap-3 overflow-x-auto pb-2 lg:h-72 lg:overflow-visible">
              {loaderData.resources.map((resource) => (
                <article
                  key={resource.id}
                  className="group flex min-w-64 flex-1 flex-col justify-between overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-[flex,transform] duration-700 ease-out hover:-translate-y-1 lg:min-w-0 lg:hover:flex-[1.45]"
                >
                  <div className="flex flex-col gap-4">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground transition-transform duration-700 ease-out group-hover:scale-105">
                      {resource.type === "text" ? (
                        <FileText className="size-5" aria-hidden="true" />
                      ) : (
                        <Link2 className="size-5" aria-hidden="true" />
                      )}
                    </span>
                    <div>
                      <h3 className="font-heading text-lg font-semibold text-balance">
                        {resource.title}
                      </h3>
                      {resource.content && (
                        <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm/relaxed text-muted-foreground">
                          <MathText>{resource.content}</MathText>
                        </p>
                      )}
                    </div>
                  </div>

                  {resource.url && (
                    <Button
                      variant="outline"
                      className="mt-6 w-full"
                      render={<a href={resource.url} target="_blank" rel="noreferrer" />}
                    >
                      Buka resource
                      <ExternalLink data-icon="inline-end" />
                    </Button>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
