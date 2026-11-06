import { Sparkles, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useLabPointer } from "~/features/labs/pointer";
import { cn } from "~/lib/utils";
import type { TutorSource } from "../components/tutor-host";
import {
  TutorComposer,
  TutorStatus,
  TutorThread,
  VoiceBar,
  type VoiceStart,
  type VoiceState,
} from "../components/tutor-conversation";
import { useAiTutorLive } from "../hooks/use-ai-tutor-live";
import type { AiTutorMode } from "../types";
import type { ClassroomFocus } from "./classroom-focus";
import { spirit, useSpiritOpen } from "./spirit-store";
import { SpiritCorner } from "./tutor-spirit";

// The classroom's AI tutor: the spirit in the room (or in the corner at a
// station) and, when called, a bubble with the conversation. It talks about
// whatever the current station hands it (tutor-host.tsx): the lab and its
// settings, the quiz question, or the assignment's guided questioning.

const tutorModeItems: Array<{ label: string; value: AiTutorMode }> = [
  { label: "Petunjuk", value: "hint" },
  { label: "Umpan balik", value: "feedback" },
];

// The conversation bubble under the spirit, shared by every tutor that talks from it.
export const bubbleClass =
  "spirit-bubble pointer-events-auto absolute right-2 top-[6.25rem] z-30 flex w-[min(23rem,calc(100%-1rem))] flex-col overflow-hidden rounded-[22px] border border-[#d9d0fb] bg-[linear-gradient(180deg,#fdfcff,#f5f2ff)] text-[#18153a] shadow-[0_18px_44px_rgba(94,74,196,.28)] sm:right-4";
export const bubbleTall = "h-[min(30rem,calc(100%-7.5rem))]";
// While the tutor points at a part of a lab the bubble folds down to its latest line and the
// composer, so the part it points at (often on the right, under the bubble) stays in view.
const bubbleCompact = "h-[min(13.5rem,calc(100%-7.5rem))]";
// Under 768px the bubble docks to the bottom of the screen, full width, instead of floating at the top
// right; the station above it makes room (board-clearance.ts). `bubbleDockTall` is the height of a bubble
// that holds a conversation (the hint bubble keeps the height of its text).
export const bubbleDock = "max-md:top-auto max-md:bottom-2 max-md:left-2 max-md:right-2 sm:max-md:right-2 max-md:w-auto";
export const bubbleDockTall = "max-md:h-[min(21rem,48%)]";

/**
 * `boardTutor`: the board is showing a PDF. Its tutor (board-study.tsx) holds the
 * conversation and the reader's pointer together, so it draws the bubble itself.
 */
export function SpiritTutor({
  source,
  focus,
  boardTutor = false,
}: {
  source: TutorSource | null;
  focus: ClassroomFocus | null;
  boardTutor?: boolean;
}) {
  const open = useSpiritOpen();
  const pointed = useLabPointer();
  const pointing = Boolean(source?.labParts && pointed);
  // Leaving the classroom closes the conversation; the spirit waits for the next visit.
  useEffect(() => () => spirit.setOpen(false), []);
  return (
    <>
      {focus && <SpiritCorner open={open} />}
      {open && !boardTutor && (
        <section
          ref={spirit.setBubble}
          aria-label="Tutor AI"
          className={cn(
            bubbleClass,
            bubbleDock,
            source && (pointing ? bubbleCompact : bubbleTall),
            source && bubbleDockTall,
            source && "transition-[height] duration-200 motion-reduce:transition-none",
          )}
        >
          {source ? <SpiritChat key={source.key} source={source} /> : <SpiritHint focus={focus} />}
        </section>
      )}
    </>
  );
}

export function BubbleHeader({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <header className="flex items-center gap-2 border-b border-[#ebe6fb] px-3 py-2.5">
      <Sparkles className="size-4 shrink-0 text-[#7c6ad8]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-bold leading-tight">Tutor</h2>
        <p className="truncate text-[11.5px] text-[#5e5e72]">{label}</p>
      </div>
      {children}
      <button
        type="button"
        onClick={() => spirit.setOpen(false)}
        aria-label="Tutup tutor"
        className="grid size-8 shrink-0 place-items-center rounded-full text-[#5e5e72] transition-transform duration-150 hover:bg-[#efebfb] active:scale-[0.94]"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </header>
  );
}

function SpiritChat({ source }: { source: TutorSource }) {
  const [draft, setDraft] = useState("");
  const tutor = useAiTutorLive(source.target, source.liveContext, source.labParts);
  const connected = tutor.status === "ready" || tutor.status === "responding";
  const voiceOn = tutor.channel === "voice" && (connected || tutor.status === "connecting");

  // The spirit acts out what the tutor is doing.
  useEffect(() => {
    spirit.setMood(
      tutor.isTutorSpeaking ? "speaking" : tutor.status === "responding" || tutor.status === "connecting" ? "thinking" : tutor.isListening ? "listening" : "idle",
      tutor.readLevel,
    );
  }, [tutor.isTutorSpeaking, tutor.status, tutor.isListening, tutor.readLevel]);
  useEffect(() => () => spirit.setMood("idle"), []);

  async function send() {
    if (!connected) await tutor.connect();
    if (await tutor.sendText(draft)) setDraft("");
  }

  const voiceState: VoiceState =
    tutor.status === "connecting" ? "connecting" : tutor.isTutorSpeaking ? "speaking" : tutor.status === "responding" ? "thinking" : tutor.isListening ? "listening" : "muted";
  const voiceStart: VoiceStart = voiceOn
    ? { kind: "active" }
    : tutor.status === "connecting"
      ? { kind: "connecting" }
      : tutor.status === "error"
        ? { kind: "retry", onRetry: () => void tutor.connect() }
        : { kind: "start", onStart: () => void tutor.startVoice() };

  return (
    <>
      <BubbleHeader label={`Melihat: ${source.label}`}>
        <Select
          items={tutorModeItems}
          value={tutor.mode}
          onValueChange={(value) => void tutor.setMode(value as AiTutorMode)}
          disabled={tutor.isListening || tutor.status === "responding"}
        >
          <SelectTrigger size="sm" aria-label="Mode bantuan tutor">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectGroup>
              {tutorModeItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </BubbleHeader>
      <TutorThread
        className="flex-1"
        label="Percakapan dengan tutor"
        messages={tutor.messages.filter((message) => message.author !== "system")}
        liveQuestion={tutor.inputTranscript}
        liveAnswer={tutor.outputTranscript}
        thinking={tutor.status === "responding"}
        empty={
          <>
            Aku sedang melihat {source.label.toLowerCase()}.
            <br />
            Tanya lewat teks atau suara.
          </>
        }
      />
      <div className="border-t border-[#ebe6fb] p-3">
        {voiceOn ? (
          <VoiceBar
            state={voiceState}
            readLevel={tutor.readLevel}
            listening={tutor.isListening}
            onToggleMicrophone={() => void tutor.toggleListening()}
            onEnd={tutor.endVoice}
            endLabel="Matikan suara"
          />
        ) : null}
        <TutorStatus error={tutor.error} notice={tutor.notice} onCancel={() => void tutor.disconnect()} />
        <TutorComposer
          value={draft}
          onChange={setDraft}
          onSend={() => void send()}
          canSend={tutor.status !== "responding" && tutor.status !== "connecting"}
          placeholder="Tanya tutor…"
          voice={voiceStart}
        />
      </div>
    </>
  );
}

/** No station has handed the tutor anything yet: say where it can help. */
function SpiritHint({ focus }: { focus: ClassroomFocus | null }) {
  const text =
    focus === "papan"
      ? "Materi di papan ini berupa teks, jadi aku belum bisa membacanya. Panggil aku di lab, kuis, dan tugas."
      : focus === "kuis"
        ? "Mulai kuisnya dulu. Aku menemani setiap soal, tanpa membocorkan jawaban."
        : focus === "tugas"
          ? "Aku membantu di tahap Pertanyaan terbimbing. Kerjakan upaya mandirimu dulu, lalu panggil aku."
          : focus === "lab"
            ? "Pilih percobaan dulu. Aku melihat misi dan pengaturanmu, lalu memberi petunjuk."
            : "Halo! Aku ikut ke mana pun kamu belajar di kelas ini. Datangi meja lab, kuis, atau buku tugas, lalu panggil aku.";
  return (
    <>
      <BubbleHeader label="Menunggumu di stasiun" />
      <p className={cn("m-4 rounded-2xl bg-white p-4 text-sm leading-relaxed ring-1 ring-[#ebe6fb]")}>{text}</p>
    </>
  );
}
