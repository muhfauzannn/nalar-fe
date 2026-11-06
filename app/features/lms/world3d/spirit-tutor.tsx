import { ChevronDown, ChevronUp, Sparkles, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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
import { spirit, useSpiritExpanded, useSpiritOpen } from "./spirit-store";
import { SpiritCorner } from "./tutor-spirit";

// The classroom's AI tutor: the spirit in the room (or in the corner at a
// station) and, when called, a bubble with the conversation. It talks about
// whatever the current station hands it (tutor-host.tsx): the lab and its
// settings, the quiz question, or the assignment's guided questioning.

const tutorModeItems: Array<{ label: string; value: AiTutorMode }> = [
  { label: "Petunjuk", value: "hint" },
  { label: "Umpan balik", value: "feedback" },
];

// The conversation dock, shared by every tutor that talks from the spirit. It floats over the bottom of
// the screen like a chat bar and moves nothing under it: a solid-ish base (title row, composer) with the
// thread above it, see-through and fading out toward the top, so the page behind shows through. Slim by
// default, with a small window onto the thread; expanding it makes that window taller.
export const dockClass =
  "spirit-bubble pointer-events-none absolute inset-x-2 bottom-3 z-30 mx-auto flex w-auto max-w-[40rem] flex-col text-[#18153a]";
// The thread has no panel of its own: each line carries its own backing (see TutorThread `floating`), so only the
// text is opaque and the page shows through everywhere else. The window fades out over its top fifth (older
// lines), not over the lines being read, which sit at its bottom. Its empty space does not catch the pointer, so
// the page under it can still be selected and clicked. It tucks 1.5rem behind the base (-mb-6 / pb-6).
const threadFade =
  "pointer-events-none -mb-6 shrink-0 pb-6 [&_[data-slot=message-scroller-item]]:pointer-events-auto [&_button]:pointer-events-auto [mask-image:linear-gradient(to_top,black_78%,transparent)] [-webkit-mask-image:linear-gradient(to_top,black_78%,transparent)]";
/** The slim window onto the thread, and the tall one: the same thread, just more of it. */
export const threadSlim = cn(threadFade, "h-[min(12rem,27dvh)]");
export const threadFull = cn(threadFade, "h-[min(26rem,62dvh)]");

/** The dock's base: the tutor's controls and the composer, a little see-through over the page. */
export function DockBase({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-auto relative z-10 overflow-hidden rounded-[22px] border border-[#d9d0fb] bg-[rgba(253,252,255,.92)] shadow-[0_18px_44px_rgba(94,74,196,.28)] backdrop-blur-md">
      {children}
    </div>
  );
}

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
  // Leaving the classroom closes the conversation; the spirit waits for the next visit.
  useEffect(() => () => spirit.setOpen(false), []);
  return (
    <>
      {focus && <SpiritCorner open={open} />}
      {open && !boardTutor && (
        <section aria-label="Tutor AI" className={dockClass}>
          {source ? <SpiritChat key={source.key} source={source} /> : <SpiritHint focus={focus} />}
        </section>
      )}
    </>
  );
}

/** `expandable`: the dock has a thread that can be shown whole (the waiting hint has none). */
export function BubbleHeader({ label, children, expandable = true }: { label: string; children?: ReactNode; expandable?: boolean }) {
  const expanded = useSpiritExpanded();
  return (
    <header className="flex items-center gap-1.5 px-3 pt-2">
      <Sparkles className="size-4 shrink-0 text-[#7c6ad8]" aria-hidden="true" />
      <p className="min-w-0 flex-1 truncate">
        <span className="text-sm font-bold">Tutor</span>
        <span className="text-[11.5px] text-[#5e5e72]"> · {label}</span>
      </p>
      {children}
      {expandable ? (
        <button
          type="button"
          onClick={() => spirit.setExpanded(!expanded)}
          aria-label={expanded ? "Ciutkan percakapan" : "Perluas percakapan"}
          aria-expanded={expanded}
          className="grid size-8 shrink-0 place-items-center rounded-full text-[#5e5e72] transition-transform duration-150 hover:bg-[#efebfb] active:scale-[0.94]"
        >
          {expanded ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronUp className="size-4" aria-hidden="true" />}
        </button>
      ) : null}
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
  const expanded = useSpiritExpanded();
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
      <TutorThread
        className={expanded ? threadFull : threadSlim}
        hideWhenEmpty={!expanded}
        dense={!expanded}
        floating
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
      <DockBase>
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
      <div className="p-2 pt-1">
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
      </DockBase>
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
    <DockBase>
      <BubbleHeader label="Menunggumu di stasiun" expandable={false} />
      <p className="mx-3 mb-3 mt-2 rounded-2xl bg-white/80 p-3 text-sm leading-relaxed ring-1 ring-[#ebe6fb]">{text}</p>
    </DockBase>
  );
}
