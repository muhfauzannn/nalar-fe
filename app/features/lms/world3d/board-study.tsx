import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "~/lib/utils";
import { PdfReader } from "../components/pdf-reader";
import { PdfTutorNotes } from "../components/pdf-tutor-notes";
import {
  TutorComposer,
  TutorStatus,
  TutorThread,
  VoiceBar,
  type VoiceStart,
} from "../components/tutor-conversation";
import { usePdfTutor } from "../hooks/use-pdf-tutor";
import type { PdfViewContext } from "../lib/pdf-tutor";
import type { LessonData } from "../types";
import { spiritMoodFor, voiceStateFor } from "./board-tutor";
import { useWorldOverlay } from "./mode";
import { spirit, useSpiritOpen } from "./spirit-store";
import { BubbleHeader, bubbleClass, bubbleTall } from "./spirit-tutor";

// The PDF on the classroom board, read by the tutor spirit: the same tutor as the
// lesson page's study room (it sees the open page, points at it and writes on it),
// but spoken to through the spirit's bubble instead of a panel beside the reader.
// The reader and the conversation share one tutor, so the hook lives here and the
// bubble is drawn from here, into the overlay layer, while the student has it open.

type Resource = LessonData["resources"][number];
type PdfTutor = ReturnType<typeof usePdfTutor>;

export function BoardStudy({ resource }: { resource: Resource }) {
  const [context, setContext] = useState<PdfViewContext | null>(null);
  const tutor = usePdfTutor(resource.id, context);
  const open = useSpiritOpen();
  const overlay = useWorldOverlay();
  const { status, disconnect, readLevel } = tutor;

  // The spirit acts out what the tutor is doing.
  useEffect(() => {
    spirit.setMood(spiritMoodFor(status), readLevel);
  }, [status, readLevel]);
  useEffect(() => () => spirit.setMood("idle"), []);

  // Closing the bubble hangs up: no microphone or Live session stays open behind it.
  useEffect(() => {
    if (!open && status !== "idle") void disconnect();
  }, [open, status, disconnect]);

  return (
    <>
      <PdfReader
        resourceId={resource.id}
        title={resource.title}
        fitContainer
        guidance={tutor.guidance}
        revealedSteps={tutor.revealedSteps}
        cursorCue={tutor.cursorCue}
        pointerVisible={tutor.pointerVisible}
        onPresentationTiming={tutor.onPresentationTiming}
        onContext={setContext}
      />
      {open && overlay
        ? createPortal(
            <div className="contents text-[#18153a] [color-scheme:light]">
              <PdfBubble tutor={tutor} context={context} />
            </div>,
            overlay,
          )
        : null}
    </>
  );
}

function PdfBubble({ tutor, context }: { tutor: PdfTutor; context: PdfViewContext | null }) {
  const [draft, setDraft] = useState("");
  const connecting = tutor.status === "connecting";
  const voiceStart: VoiceStart = tutor.voice
    ? { kind: "active" }
    : connecting
      ? { kind: "connecting" }
      : tutor.status === "error"
        ? { kind: "retry", onRetry: () => void tutor.retry() }
        : { kind: "start", disabled: !context, onStart: () => void tutor.startVoice() };

  return (
    // On a phone the bubble sits at the bottom, so the top of the page, where the tutor points, stays in view.
    <section
      aria-label="Tutor AI"
      className={cn(bubbleClass, bubbleTall, "max-sm:top-auto max-sm:bottom-2 max-sm:h-[min(21rem,48%)]")}
    >
      <BubbleHeader label={`Membaca halaman ${context?.page ?? "…"}`}>
        {tutor.guidance || tutor.cursorCue ? (
          <button
            type="button"
            onClick={tutor.stopExplanation}
            className="rounded-full px-2.5 py-1 text-xs font-semibold text-[#5e5e72] transition-transform duration-150 hover:bg-[#efebfb] active:scale-[0.94]"
          >
            Bersihkan
          </button>
        ) : null}
      </BubbleHeader>
      <PdfTutorNotes guidance={tutor.guidance} revealedSteps={tutor.revealedSteps} />
      <TutorThread
        className="flex-1"
        label="Transkrip percakapan saat ini"
        messages={tutor.messages}
        liveQuestion={tutor.inputTranscript}
        liveAnswer={tutor.outputTranscript}
        thinking={tutor.status === "thinking"}
        empty={
          <>
            Aku membaca halaman yang terbuka di papan.
            <br />
            Tanya lewat teks atau suara. Pilih teks di PDF untuk menunjuk bagiannya.
          </>
        }
      />
      <div className="border-t border-[#ebe6fb] p-3">
        {tutor.voice ? (
          <VoiceBar
            state={voiceStateFor(tutor.status)}
            readLevel={tutor.readLevel}
            listening={tutor.listening}
            onToggleMicrophone={() => void tutor.toggleMicrophone()}
            onStop={tutor.stopExplanation}
            onEnd={() => void tutor.endVoice()}
            endLabel="Matikan suara"
          />
        ) : null}
        <TutorStatus error={tutor.error} notice={tutor.notice} onCancel={() => void tutor.disconnect()} />
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
    </section>
  );
}
