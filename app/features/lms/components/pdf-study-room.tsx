import { useState } from "react";
import {
  AudioLines,
  CircleAlert,
  Eraser,
  Mic,
  MicOff,
  MousePointer2,
  PhoneOff,
  Square,
  Sparkles,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Spinner } from "~/components/ui/spinner";
import { MathText } from "~/components/math-text";
import { cn } from "~/lib/utils";
import { usePdfTutor } from "../hooks/use-pdf-tutor";
import type { PdfViewContext } from "../lib/pdf-tutor";
import type { LessonData } from "../types";
import { PdfReader } from "./pdf-reader";

type Resource = LessonData["resources"][number];
export function PdfStudyRoom({ resources }: { resources: Resource[] }) {
  const files = resources.filter((resource) => resource.file);
  const [resourceId, setResourceId] = useState(files[0]?.id ?? "");
  const active = files.find((file) => file.id === resourceId) ?? files[0];
  if (!active) return null;
  return (
    <section
      className="overflow-hidden rounded-2xl border bg-card shadow-sm"
      aria-label="Ruang belajar PDF dengan TutorAI"
      id="pdf-study-room"
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-semibold">
              Belajar bersama NALAR
            </h2>
            <p className="text-xs text-muted-foreground">
              Baca, tanyakan, pahami.
            </p>
          </div>
        </div>
        {files.length > 1 ? (
          <Select
            items={files.map((file) => ({ value: file.id, label: file.title }))}
            value={active.id}
            onValueChange={(value) => {
              if (value) setResourceId(value);
            }}
          >
            <SelectTrigger
              className="w-full sm:w-64"
              aria-label="Pilih PDF pembelajaran"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {files.map((file) => (
                  <SelectItem key={file.id} value={file.id}>
                    {file.title}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className="max-w-full truncate">
            {active.title}
          </Badge>
        )}
      </header>
      <PdfTutorDocument key={active.id} resource={active} />
    </section>
  );
}

function PdfTutorDocument({ resource }: { resource: Resource }) {
  const [context, setContext] = useState<PdfViewContext | null>(null);
  const tutor = usePdfTutor(resource.id, context);
  const labels = {
    idle: "Mulai saat kamu siap",
    connecting: "Menyambungkan tutor…",
    listening: "NALAR mendengarkan",
    thinking: "Memahami pertanyaanmu",
    speaking: "NALAR sedang menjelaskan",
    paused: "Mikrofon dijeda",
    error: "Tutor belum tersambung",
  };
  return (
    <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b bg-card px-3 py-3 lg:hidden"
        aria-label="Kontrol tutor suara"
      >
        <p role="status" className="text-xs font-medium">
          {labels[tutor.status]}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {!tutor.connected ? (
            <Button
              size="sm"
              disabled={!context || tutor.status === "connecting"}
              onClick={() => void tutor.start()}
            >
              <Mic data-icon="inline-start" />
              {tutor.status === "connecting"
                ? "Menyambungkan…"
                : tutor.status === "error"
                  ? "Coba sambungkan lagi"
                  : "Mulai percakapan"}
            </Button>
          ) : (
            <>
              <Button
                size="icon-sm"
                variant="secondary"
                aria-label={
                  tutor.listening ? "Jeda mikrofon" : "Lanjutkan mikrofon"
                }
                onClick={() => void tutor.toggleMicrophone()}
              >
                {tutor.listening ? <MicOff /> : <Mic />}
              </Button>
              <Button
                size="icon-sm"
                variant="outline"
                aria-label="Hentikan penjelasan"
                onClick={tutor.stopExplanation}
              >
                <Square />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Akhiri sesi"
                onClick={() => void tutor.disconnect()}
              >
                <PhoneOff />
              </Button>
            </>
          )}
          {tutor.status === "connecting" ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void tutor.disconnect()}
            >
              Batalkan
            </Button>
          ) : null}
        </div>
      </div>
      <PdfReader
        resourceId={resource.id}
        title={resource.title}
        guidance={tutor.guidance}
        onContext={setContext}
      />
      <aside
        className="flex min-w-0 flex-col gap-5 border-t p-5 lg:border-t-0 lg:border-l"
        aria-label="Tutor suara PDF"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AudioLines className="size-4" aria-hidden="true" /> Tutor suara
          </div>
          <Badge variant={tutor.connected ? "mint" : "outline"}>
            {tutor.connected ? "Tersambung" : "Belum mulai"}
          </Badge>
        </div>
        <div className="hidden flex-col items-center gap-4 py-3 lg:flex">
          <div
            className={cn(
              "relative flex size-20 items-center justify-center rounded-full bg-secondary text-secondary-foreground",
              tutor.status === "speaking" && "ring-4 ring-secondary/30",
            )}
          >
            {tutor.status === "connecting" ? (
              <Spinner className="size-7" />
            ) : (
              <AudioLines className="size-8" aria-hidden="true" />
            )}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-current opacity-30 motion-safe:transition-transform motion-safe:duration-150"
              style={{ transform: `scale(${1 + tutor.level * 0.15})` }}
            />
          </div>
          <p role="status" className="text-center text-sm font-medium">
            {labels[tutor.status]}
          </p>
          <p className="text-center text-xs/relaxed text-muted-foreground">
            Tanyakan bagian yang membingungkan. NALAR dapat menunjuk dan membuat
            ilustrasi saat menjelaskan.
          </p>
        </div>
        {tutor.error ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>Tutor mengalami kendala</AlertTitle>
            <AlertDescription>{tutor.error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="hidden flex-col gap-2 lg:flex">
          {!tutor.connected ? (
            <Button
              disabled={!context || tutor.status === "connecting"}
              onClick={() => void tutor.start()}
            >
              {tutor.status === "connecting" ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Mic data-icon="inline-start" />
              )}
              {tutor.status === "connecting"
                ? "Menyambungkan…"
                : tutor.status === "error"
                  ? "Coba sambungkan lagi"
                  : "Mulai percakapan"}
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <Button
                variant={tutor.listening ? "secondary" : "default"}
                onClick={() => void tutor.toggleMicrophone()}
              >
                {tutor.listening ? (
                  <MicOff data-icon="inline-start" />
                ) : (
                  <Mic data-icon="inline-start" />
                )}
                {tutor.listening ? "Jeda mikrofon" : "Lanjutkan mikrofon"}
              </Button>
              <Button variant="outline" onClick={tutor.stopExplanation}>
                <Square data-icon="inline-start" /> Hentikan penjelasan
              </Button>
              <Button variant="ghost" onClick={() => void tutor.disconnect()}>
                <PhoneOff data-icon="inline-start" /> Akhiri sesi
              </Button>
            </div>
          )}
          {tutor.status === "connecting" ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void tutor.disconnect()}
            >
              Batalkan
            </Button>
          ) : null}
        </div>
        <Separator />
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium">
              Halaman {context?.page ?? "…"}
            </p>
            <Button
              variant="ghost"
              size="xs"
              disabled={!tutor.guidance}
              onClick={tutor.stopExplanation}
            >
              <Eraser data-icon="inline-start" /> Bersihkan
            </Button>
          </div>
          {context?.selection ? (
            <p className="line-clamp-3 rounded-lg bg-muted p-3 text-xs/relaxed">
              “{context.selection.text}”
            </p>
          ) : (
            <p className="flex items-start gap-2 text-xs/relaxed text-muted-foreground">
              <MousePointer2
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              Pilih teks atau ketuk bagian gambar untuk memperjelas maksud
              “bagian ini”.
            </p>
          )}
          {context && !context.blocks.length ? (
            <Alert>
              <AlertTitle>Halaman berupa gambar</AlertTitle>
              <AlertDescription>
                Tutor menggunakan tampilan halaman. Ketuk bagian yang ingin
                ditanyakan; teks kecil mungkin perlu diperjelas.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
        {tutor.inputTranscript || tutor.outputTranscript ? (
          <div
            className="flex max-h-48 flex-col gap-3 overflow-y-auto"
            aria-label="Transkrip percakapan saat ini"
          >
            {tutor.inputTranscript ? (
              <div>
                <p className="mb-1 text-[10px] font-medium text-muted-foreground">
                  KAMU
                </p>
                <p className="text-xs/relaxed">{tutor.inputTranscript}</p>
              </div>
            ) : null}
            {tutor.outputTranscript ? (
              <div>
                <p className="mb-1 text-[10px] font-medium text-muted-foreground">
                  NALAR
                </p>
                <div className="text-xs/relaxed">
                  <MathText>{tutor.outputTranscript}</MathText>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <p className="mt-auto text-[11px]/relaxed text-muted-foreground">
          Saat sesi aktif, suara dan halaman yang dibuka dikirim ke layanan AI.
          Percakapan sesi ini tidak disimpan. Kamu bisa menyela tutor atau
          menghentikannya kapan saja.
        </p>
      </aside>
    </div>
  );
}
