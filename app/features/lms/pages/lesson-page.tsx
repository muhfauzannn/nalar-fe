import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Download,
  ExternalLink,
  File,
  FileText,
  Link2,
  RotateCcw,
} from "lucide-react";
import { Form, Link } from "react-router";

import { PageHeader } from "~/components/layout/page-header";
import { MathText } from "~/components/math-text";
import { formatFileSize, studentResourceFileUrl } from "~/lib/files";
import { Badge } from "~/components/ui/badge";
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
import { PdfStudyRoom } from "../components/pdf-study-room";

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
        // Once per visit, short: the page settles in, then stays still while you read.
        gsap.from("[data-lesson-reveal]", {
          y: 8,
          opacity: 0,
          duration: 0.24,
          ease: "power3.out",
          stagger: 0.04,
          clearProps: "transform,opacity",
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
          <PageHeader
            crumbs={[
              { label: "Course saya", to: "/courses" },
              { label: loaderData.courseName, to: `/courses/${loaderData.courseId}` },
            ]}
            eyebrow={
              <Badge variant="outline" className="max-w-full truncate">
                {loaderData.moduleTitle}
              </Badge>
            }
            title={loaderData.title}
            description="Baca dengan tenang, gunakan resource bila diperlukan, lalu tandai materi saat selesai."
            meta={
              completed && (
                <span className="flex items-center gap-1.5 text-brand-mint-foreground">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Sudah selesai
                </span>
              )
            }
          />
        </div>

        {loaderData.resources.some((resource) => resource.file) ? (
          <PdfStudyRoom resources={loaderData.resources} />
        ) : null}

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
                        <MathText>{block}</MathText>
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

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {loaderData.resources.map((resource) => (
                <article
                  key={resource.id}
                  className="flex min-w-0 flex-col justify-between rounded-2xl border bg-card p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                      {resource.type === "text" ? (
                        <FileText className="size-5" aria-hidden="true" />
                      ) : resource.file ? (
                        <File className="size-5" aria-hidden="true" />
                      ) : (
                        <Link2 className="size-5" aria-hidden="true" />
                      )}
                    </span>
                    <div>
                      <h3 className="font-heading text-lg font-semibold text-balance">
                        {resource.title}
                      </h3>
                      {resource.file && (
                        <p className="mt-1 break-all text-xs text-muted-foreground">
                          {resource.file.name} · {formatFileSize(resource.file.size)}
                        </p>
                      )}
                      {resource.content && (
                        <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm/relaxed text-muted-foreground">
                          <MathText>{resource.content}</MathText>
                        </p>
                      )}
                    </div>
                  </div>

                  {resource.file ? (
                    <div className="mt-6 flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        render={
                          <a
                            href={studentResourceFileUrl(resource.id)}
                            target="_blank"
                            rel="noreferrer"
                          />
                        }
                      >
                        Buka PDF
                        <ExternalLink data-icon="inline-end" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Unduh ${resource.file.name}`}
                        render={<a href={studentResourceFileUrl(resource.id, true)} />}
                      >
                        <Download />
                      </Button>
                    </div>
                  ) : resource.url ? (
                    <Button
                      variant="outline"
                      className="mt-6 w-full"
                      render={<a href={resource.url} target="_blank" rel="noreferrer" />}
                    >
                      Buka resource
                      <ExternalLink data-icon="inline-end" />
                    </Button>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
