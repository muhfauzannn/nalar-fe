import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useAiTutorLive } from "../hooks/use-ai-tutor-live";
import type { AiTutorMode, AiTutorTarget } from "../types";
import {
  TutorComposer,
  TutorStatus,
  TutorThread,
  VoiceBar,
  type VoiceStart,
  type VoiceState,
} from "./tutor-conversation";

const tutorModeItems: Array<{ label: string; value: AiTutorMode }> = [
  { label: "Petunjuk", value: "hint" },
  { label: "Umpan balik", value: "feedback" },
];

export function AiTutorPanel({ target }: { target: AiTutorTarget }) {
  const [draft, setDraft] = useState("");
  const tutor = useAiTutorLive(target);
  const connected = tutor.status === "ready" || tutor.status === "responding";
  const voiceOn = tutor.channel === "voice" && (connected || tutor.status === "connecting");

  async function send() {
    if (!connected) await tutor.connect();
    if (await tutor.sendText(draft)) setDraft("");
  }

  const voiceState: VoiceState =
    tutor.status === "connecting"
      ? "connecting"
      : tutor.isTutorSpeaking
        ? "speaking"
        : tutor.status === "responding"
          ? "thinking"
          : tutor.isListening
            ? "listening"
            : "muted";
  const voiceStart: VoiceStart = voiceOn
    ? { kind: "active" }
    : tutor.status === "connecting"
      ? { kind: "connecting" }
      : tutor.status === "error"
        ? { kind: "retry", onRetry: () => void tutor.connect() }
        : { kind: "start", onStart: () => void tutor.startVoice() };

  return (
    <section
      className="flex h-[30rem] min-w-0 flex-col overflow-hidden rounded-2xl border bg-card xl:h-[min(38rem,calc(100dvh-8rem))]"
      aria-label="Tutor AI"
    >
      <header className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <h2 className="font-heading text-sm font-semibold">Tutor</h2>
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
      </header>

      <TutorThread
        className="flex-1"
        label="Percakapan dengan tutor"
        messages={tutor.messages.filter((message) => message.author !== "system")}
        liveQuestion={tutor.inputTranscript}
        liveAnswer={tutor.outputTranscript}
        thinking={tutor.status === "responding"}
        empty={
          <>
            Tanya lewat teks atau suara.
            <br />
            Percakapan disimpan sebagai catatan belajar.
          </>
        }
      />

      <div className="border-t p-3">
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
        <TutorStatus
          error={tutor.error}
          notice={tutor.notice}
          onCancel={() => void tutor.disconnect()}
        />
        <TutorComposer
          value={draft}
          onChange={setDraft}
          onSend={() => void send()}
          canSend={tutor.status !== "responding" && tutor.status !== "connecting"}
          placeholder="Tanya tentang soal ini…"
          voice={voiceStart}
        />
      </div>
    </section>
  );
}
