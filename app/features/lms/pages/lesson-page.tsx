import { CheckCircle2, ExternalLink, FileText, Link2 } from "lucide-react";
import { Form, Link } from "react-router";

import { Badge } from "~/components/ui/badge";
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
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import type { LessonData } from "../types";

export function LessonPage({ data: loaderData }: { data: LessonData }) {
  const completed = loaderData.progressStatus === "completed";
  return (
    <div className="flex flex-col gap-7">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to={`/courses/${loaderData.courseId}`} />}>
              {loaderData.courseName}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{loaderData.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="flex flex-col gap-3 border-b pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="lavender">{loaderData.moduleTitle}</Badge>
          <Badge variant={completed ? "mint" : "outline"}>
            {completed ? "Selesai" : "Belum selesai"}
          </Badge>
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          {loaderData.title}
        </h1>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="min-w-0">
          <Card>
            <CardHeader>
              <CardTitle>Materi pembelajaran</CardTitle>
              <CardDescription>Baca materi sampai tuntas sebelum menandai selesai.</CardDescription>
            </CardHeader>
            <CardContent>
              {loaderData.content ? (
                <div className="whitespace-pre-wrap text-base leading-8 text-foreground/90">
                  {loaderData.content}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  Lesson ini tidak memiliki konten teks.
                </p>
              )}
            </CardContent>
          </Card>
        </article>

        <aside className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Progres materi</CardTitle>
              <CardDescription>Status ini ikut dihitung pada progres course.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form method="post">
                <input type="hidden" name="status" value={completed ? "in_progress" : "completed"} />
                <Button
                  type="submit"
                  className="w-full"
                  variant={completed ? "outline" : "default"}
                >
                  <CheckCircle2 data-icon="inline-start" />
                  {completed ? "Tandai belum selesai" : "Tandai selesai"}
                </Button>
              </Form>
            </CardContent>
          </Card>

          {loaderData.resources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Resource</CardTitle>
                <CardDescription>Bahan pendukung lesson.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {loaderData.resources.map((resource) => (
                  <div key={resource.id} className="flex flex-col gap-2 rounded-lg border p-3">
                    <p className="flex items-center gap-2 font-medium">
                      {resource.type === "text" ? (
                        <FileText className="size-4" />
                      ) : (
                        <Link2 className="size-4" />
                      )}
                      {resource.title}
                    </p>
                    {resource.content && (
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {resource.content}
                      </p>
                    )}
                    {resource.url && (
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <a href={resource.url} target="_blank" rel="noreferrer" />
                        }
                      >
                        Buka resource
                        <ExternalLink data-icon="inline-end" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
