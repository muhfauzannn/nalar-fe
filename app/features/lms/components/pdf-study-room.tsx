import { useState } from "react";
import { Eraser } from "lucide-react";
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
import { cn } from "~/lib/utils";
import { usePdfTutor } from "../hooks/use-pdf-tutor";
import type { PdfViewContext } from "../lib/pdf-tutor";
import type { LessonData } from "../types";
import { PdfReader } from "./pdf-reader";
import {
  TutorComposer,
  TutorStatus,
  TutorThread,
  VoiceBar,
  type VoiceStart,
  type VoiceState,
} from "./tutor-conversation";

type Resource = LessonData["resources"][number];
export function PdfStudyRoom({ resources }: { resources: Resource[] }) {
  const files = resources.filter((resource) => resource.file);
  const [resourceId, setResourceId] = useState(files[0]?.id ?? "");
  const active = files.find((file) => file.id === resourceId) ?? files[0];
  if (!active) return null;
  return (
    <section
      className="rounded-2xl border bg-card shadow-sm"
      aria-label="Ruang belajar PDF dengan TutorAI"
      id="pdf-study-room"
    >
      {files.length > 1 ? (
        <header className="border-b p-3">
          <Select
            items={files.map((file) => ({ value: file.id, label: file.title }))}
            value={active.id}
            onValueChange={(value) => {
              if (value) setResourceId(value);
            }}
          >
            <SelectTrigger className="w-full sm:w-72" aria-label="Pilih PDF pembelajaran">
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
        </header>
      ) : null}
      <PdfTutorDocument key={active.id} resource={active} />
    </section>
  );
}

function PdfTutorDocument({ resource }: { resource: Resource }) {
  const [context, setContext] = useState<PdfViewContext | null>(null);
  const [draft, setDraft] = useState("");
  const tutor = usePdfTutor(resource.id, context);
  const connecting = tutor.status === "connecting";
  const hasThread =
    tutor.messages.length > 0 || !!tutor.inputTranscript || !!tutor.outputTranscript;

  const voiceState: VoiceState =
    tutor.status === "connecting"
      ? "connecting"
      : tutor.status === "speaking"
        ? "speaking"
        : tutor.status === "thinking"
          ? "thinking"
          : tutor.status === "listening"
            ? "listening"
            : "muted";
  const voiceStart: VoiceStart = tutor.voice
    ? { kind: "active" }
    : connecting
      ? { kind: "connecting" }
      : tutor.status === "error"
        ? { kind: "retry", onRetry: () => void tutor.retry() }
        : { kind: "start", disabled: !context, onStart: () => void tutor.startVoice() };

  return (
    // Below lg the composer sticks to the bottom of the screen while the PDF is read; on
    // wide screens it closes the tutor column beside the reader.
    <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[minmax(0,1fr)_auto]">
      <div className="min-w-0 lg:row-span-2">
        <PdfReader
          resourceId={resource.id}
          title={resource.title}
          guidance={tutor.guidance}
          cursorCue={tutor.cursorCue}
          pointerVisible={tutor.pointerVisible}
          onPresentationTiming={tutor.onPresentationTiming}
          onContext={setContext}
        />
      </div>
      <aside className="relative min-w-0 border-t lg:border-t-0 lg:border-l" aria-label="Tutor PDF">
        <div className="flex flex-col lg:absolute lg:inset-0">
          <div className="flex min-h-11 items-center gap-2 border-b px-4 py-1.5 text-xs">
            <span className="font-medium">Halaman {context?.page ?? "…"}</span>
            {context && !context.blocks.length ? (
              <Badge variant="outline">Halaman berupa gambar</Badge>
            ) : null}
            <span className="flex-1" />
            {tutor.guidance || tutor.cursorCue ? (
              <Button type="button" variant="ghost" size="xs" onClick={tutor.stopExplanation}>
                <Eraser data-icon="inline-start" /> Bersihkan
              </Button>
            ) : null}
            {tutor.connected ? (
              <Button type="button" variant="ghost" size="xs" onClick={() => void tutor.disconnect()}>
                Akhiri sesi
              </Button>
            ) : null}
          </div>
          <TutorThread
            className={cn(hasThread && "h-80", "lg:h-auto lg:flex-1")}
            label="Transkrip percakapan saat ini"
            messages={tutor.messages}
            liveQuestion={tutor.inputTranscript}
            liveAnswer={tutor.outputTranscript}
            thinking={tutor.status === "thinking"}
            empty={
              <>
                Tanya lewat teks atau suara. Pilih teks di PDF untuk menunjuk bagiannya.
                <br />
                Halaman yang terbuka ikut dikirim ke AI.
              </>
            }
          />
        </div>
      </aside>
      <div className="sticky bottom-0 z-10 rounded-b-2xl border-t bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:col-start-2 lg:rounded-bl-none lg:border-l">
        {tutor.voice ? (
          <VoiceBar
            state={voiceState}
            readLevel={tutor.readLevel}
            listening={tutor.listening}
            onToggleMicrophone={() => void tutor.toggleMicrophone()}
            onStop={tutor.stopExplanation}
            onEnd={() => void tutor.endVoice()}
            endLabel="Matikan suara"
          />
        ) : null}
        <TutorStatus
          error={tutor.error}
          notice={tutor.notice}
          onCancel={() => void tutor.disconnect()}
        />
        <TutorComposer
          value={draft}
          onChange={setDraft}
          onSend={() => {
            if (tutor.send(draft)) setDraft("");
          }}
          canSend={!!context && !connecting}
          placeholder="Tanya tentang halaman ini…"
          voice={voiceStart}
        />
      </div>
    </div>
  );
}
