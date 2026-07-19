import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  AudioLines,
  CircleAlert,
  Lightbulb,
  MessageCircleQuestion,
  Mic,
  PhoneOff,
  Send,
  ShieldCheck,
} from "lucide-react";

import { MathText } from "~/components/math-text";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Bubble, BubbleContent } from "~/components/ui/bubble";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldTitle,
} from "~/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "~/components/ui/input-group";
import { Marker, MarkerContent, MarkerIcon } from "~/components/ui/marker";
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "~/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "~/components/ui/message-scroller";
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
import { cn } from "~/lib/utils";
import { useAiTutorLive } from "../hooks/use-ai-tutor-live";
import type { AiTutorMode, AiTutorTarget } from "../types";

const tutorModeItems: Array<{ label: string; value: AiTutorMode }> = [
  { label: "Petunjuk", value: "hint" },
  { label: "Umpan balik", value: "feedback" },
];

gsap.registerPlugin(useGSAP);

export function AiTutorPanel({ target }: { target: AiTutorTarget }) {
  const [draft, setDraft] = useState("");
  const tutor = useAiTutorLive(target);
  const connected = tutor.status === "ready" || tutor.status === "responding";
  const busy = tutor.status === "connecting" || tutor.status === "responding";

  async function handleVoiceAction() {
    if (tutor.isListening) {
      await tutor.toggleListening();
      return;
    }

    await tutor.setChannel("voice");
    if (!connected) await tutor.connect();
    await tutor.toggleListening();
  }

  async function handleSend() {
    if (!draft.trim()) return;
    await tutor.setChannel("chat");
    if (!connected) await tutor.connect();
    const sent = await tutor.sendText(draft);
    if (sent) setDraft("");
  }

  const liveTitle = tutor.isUserSpeaking
    ? "Kamu sedang berbicara"
    : tutor.isTutorSpeaking
      ? "NALAR sedang menjawab"
      : tutor.status === "responding"
        ? "NALAR menyiapkan petunjuk"
        : tutor.isListening
          ? "NALAR sedang mendengarkan"
          : connected
            ? "Mikrofon dijeda"
            : "Mulai saat kamu siap";
  const liveTranscript = tutor.isTutorSpeaking
    ? tutor.outputTranscript || "Respons suara sedang diputar…"
    : tutor.isUserSpeaking || tutor.inputTranscript
      ? tutor.inputTranscript || "Mendengarkan ucapanmu…"
      : tutor.status === "responding"
        ? "Memeriksa konteks dan guardrail sebelum merespons…"
        : tutor.isListening
          ? "Ucapkan bagian yang membingungkan atau ceritakan cara berpikirmu."
          : "Ketuk lingkaran suara untuk meminta petunjuk tanpa meninggalkan soal.";

  return (
    <section className="flex min-w-0 flex-col" aria-label="NALAR AI Tutor">
      <header className="flex items-start justify-between gap-4 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <AudioLines className="size-4" aria-hidden="true" />
            <span>Tutor suara</span>
          </div>
          <h2 className="mt-1 font-heading text-xl font-semibold tracking-tight">
            NALAR AI
          </h2>
        </div>
        <Badge variant="outline">
          <ShieldCheck data-icon="inline-start" />
          Aman belajar
        </Badge>
      </header>

      <Separator />

      <div className="flex flex-col items-center gap-5 py-6">
        {tutor.error && (
          <Alert variant="destructive" className="w-full">
            <CircleAlert />
            <AlertTitle>AI Tutor mengalami kendala</AlertTitle>
            <AlertDescription>{tutor.error}</AlertDescription>
          </Alert>
        )}

        <div className="flex w-full flex-col items-center gap-4">
          <VoiceOrb
            level={tutor.inputLevel}
            listening={tutor.isListening}
            tutorSpeaking={tutor.isTutorSpeaking}
            connecting={tutor.status === "connecting"}
            onClick={() => void handleVoiceAction()}
          />

          <div
            className="flex max-w-sm flex-col items-center gap-2 text-center"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="font-heading text-lg font-semibold text-balance">
              {liveTitle}
            </p>
            <Badge variant={connected ? "mint" : "outline"}>
              {connected ? "Tersambung" : "Belum tersambung"}
            </Badge>
            <p className="min-h-12 text-sm/relaxed text-muted-foreground text-pretty">
              <MathText>{liveTranscript}</MathText>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <p className="text-xs text-muted-foreground">
              {tutor.isListening
                ? "Ketuk lingkaran untuk menjeda"
                : "Ketuk lingkaran untuk berbicara"}
            </p>
            {connected && (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => void tutor.disconnect()}
              >
                <PhoneOff data-icon="inline-start" />
                Akhiri
              </Button>
            )}
          </div>
        </div>

        <Field orientation="horizontal" className="w-full">
          <FieldContent>
            <FieldTitle>Mode bantuan</FieldTitle>
            <FieldDescription>Atur sebelum mulai bicara.</FieldDescription>
          </FieldContent>
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
        </Field>
      </div>

      <Separator />

      <Accordion multiple className="w-full">
        <AccordionItem value="transcript">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex min-w-0 items-center gap-2">
              <MessageCircleQuestion aria-hidden="true" />
              <span>Transkrip percakapan</span>
              {(tutor.inputTranscript || tutor.outputTranscript) && (
                <Badge variant="mint">Live</Badge>
              )}
              {tutor.messages.length > 0 && (
                <Badge variant="outline">{tutor.messages.length}</Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                Ucapanmu dan respons NALAR muncul di sini.
              </p>
              <div className="h-80 min-h-0">
                <Transcript tutor={tutor} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="text-chat">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex min-w-0 items-center gap-2">
              <MessageCircleQuestion aria-hidden="true" />
              <span>Tulis pesan</span>
              <Badge variant="lavender">Alternatif</Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <InputGroup>
              <InputGroupTextarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder={
                  tutor.isListening
                    ? "Jeda mikrofon untuk menulis pesan"
                    : "Tulis bagian yang membingungkan…"
                }
                rows={2}
                maxLength={2_000}
                disabled={busy || tutor.isListening}
                aria-label="Pesan untuk AI Tutor"
              />
              <InputGroupAddon align="block-end" className="justify-between">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lightbulb /> Shift + Enter untuk baris baru
                </span>
                <InputGroupButton
                  type="button"
                  size="icon-sm"
                  variant="default"
                  disabled={!draft.trim() || busy || tutor.isListening}
                  aria-label="Kirim pesan"
                  onClick={() => void handleSend()}
                >
                  {busy ? <Spinner /> : <Send />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <p className="pt-4 text-center text-xs text-muted-foreground">
        Audio tidak disimpan. Transkrip digunakan sebagai rekam belajar.
      </p>
    </section>
  );
}

function Transcript({ tutor }: { tutor: ReturnType<typeof useAiTutorLive> }) {
  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller>
        <MessageScrollerViewport>
          <MessageScrollerContent className="px-1 py-3">
            <Marker variant="separator">
              <MarkerIcon>
                <ShieldCheck />
              </MarkerIcon>
              <MarkerContent>Guardrail pembelajaran aktif</MarkerContent>
            </Marker>

            {tutor.messages.length === 0 &&
              !tutor.inputTranscript &&
              !tutor.outputTranscript && (
                <MessageScrollerItem>
                  <Message>
                    <MessageContent>
                      <MessageHeader>NALAR</MessageHeader>
                      <Bubble variant="ghost">
                        <BubbleContent>
                          Ceritakan cara berpikirmu. Aku akan membantu dengan
                          petunjuk.
                        </BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              )}

            {tutor.messages.map((message) => (
              <MessageScrollerItem
                key={message.clientEventId}
                messageId={message.clientEventId}
                scrollAnchor={message.author === "student"}
              >
                <Message align={message.author === "student" ? "end" : "start"}>
                  <MessageContent>
                    <MessageHeader>
                      {message.author === "student" ? "Kamu" : "NALAR"}
                      {message.wasRedirected
                        ? " · diarahkan sebagai petunjuk"
                        : ""}
                    </MessageHeader>
                    <Bubble
                      align={message.author === "student" ? "end" : "start"}
                      variant={
                        message.author === "student" ? "secondary" : "ghost"
                      }
                    >
                      <BubbleContent>
                        <MathText>{message.content}</MathText>
                      </BubbleContent>
                    </Bubble>
                    <MessageFooter>
                      {formatTranscriptTime(message.createdAt)}
                    </MessageFooter>
                  </MessageContent>
                </Message>
              </MessageScrollerItem>
            ))}

            {tutor.inputTranscript && (
              <MessageScrollerItem scrollAnchor>
                <Message align="end">
                  <MessageContent>
                    <MessageHeader>
                      <span className="flex items-center gap-1">
                        <Mic aria-hidden="true" /> Kamu sedang berbicara
                      </span>
                    </MessageHeader>
                    <Bubble align="end" variant="secondary">
                      <BubbleContent>
                        <MathText>{tutor.inputTranscript}</MathText>
                      </BubbleContent>
                    </Bubble>
                  </MessageContent>
                </Message>
              </MessageScrollerItem>
            )}

            {tutor.outputTranscript && (
              <MessageScrollerItem scrollAnchor>
                <Message>
                  <MessageContent>
                    <MessageHeader>
                      <span className="shimmer">NALAR sedang menjawab</span>
                    </MessageHeader>
                    <Bubble variant="ghost">
                      <BubbleContent>
                        <MathText>{tutor.outputTranscript}</MathText>
                      </BubbleContent>
                    </Bubble>
                  </MessageContent>
                </Message>
              </MessageScrollerItem>
            )}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

type OrbMotionControls = {
  outerScale: ReturnType<typeof gsap.quickTo>;
  outerOpacity: ReturnType<typeof gsap.quickTo>;
  innerScale: ReturnType<typeof gsap.quickTo>;
  innerOpacity: ReturnType<typeof gsap.quickTo>;
  bars: Array<ReturnType<typeof gsap.quickTo>>;
  reducedMotion: boolean;
};

const voiceBarWeights = [0.38, 0.62, 0.86, 1, 0.82, 0.58, 0.34];

function VoiceOrb({
  level,
  listening,
  tutorSpeaking,
  connecting,
  onClick,
}: {
  level: number;
  listening: boolean;
  tutorSpeaking: boolean;
  connecting: boolean;
  onClick: () => void;
}) {
  const orb = useRef<HTMLDivElement>(null);
  const outerRing = useRef<HTMLSpanElement>(null);
  const innerRing = useRef<HTMLSpanElement>(null);
  const controls = useRef<OrbMotionControls | null>(null);

  useGSAP(
    () => {
      if (!outerRing.current || !innerRing.current) return;
      const bars = gsap.utils.toArray<HTMLElement>("[data-voice-bar]");
      const media = gsap.matchMedia();

      media.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reducedMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const reducedMotion = Boolean(context.conditions?.reducedMotion);
          const duration = reducedMotion ? 0 : 0.18;
          gsap.set(bars, { scaleY: 0.18, transformOrigin: "center center" });
          controls.current = {
            outerScale: gsap.quickTo(outerRing.current, "scale", {
              duration,
              ease: "power2.out",
            }),
            outerOpacity: gsap.quickTo(outerRing.current, "opacity", {
              duration,
              ease: "power1.out",
            }),
            innerScale: gsap.quickTo(innerRing.current, "scale", {
              duration,
              ease: "power2.out",
            }),
            innerOpacity: gsap.quickTo(innerRing.current, "opacity", {
              duration,
              ease: "power1.out",
            }),
            bars: bars.map((bar) =>
              gsap.quickTo(bar, "scaleY", {
                duration: reducedMotion ? 0 : 0.12,
                ease: "power2.out",
              }),
            ),
            reducedMotion,
          };
        },
      );

      return () => {
        controls.current = null;
        media.revert();
      };
    },
    { scope: orb },
  );

  useEffect(() => {
    const motion = controls.current;
    if (!motion) return;
    const normalizedLevel =
      listening && !motion.reducedMotion
        ? gsap.utils.clamp(0, 1, level * 1.8)
        : 0;
    const speakingEnergy = motion.reducedMotion
      ? 0
      : tutorSpeaking
        ? 0.55
        : normalizedLevel;

    motion.outerScale(1 + speakingEnergy * 0.18);
    motion.outerOpacity(listening || tutorSpeaking ? 0.95 : 0.4);
    motion.innerScale(1 + speakingEnergy * 0.11);
    motion.innerOpacity(listening || tutorSpeaking ? 1 : 0.6);

    if (tutorSpeaking && !motion.reducedMotion) return;
    motion.bars.forEach((scaleBar, index) => {
      const weight = voiceBarWeights[index] ?? 0.5;
      scaleBar(0.18 + normalizedLevel * weight * 0.95);
    });
  }, [level, listening, tutorSpeaking]);

  useGSAP(
    () => {
      if (!tutorSpeaking) return;
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const bars = gsap.utils.toArray<HTMLElement>("[data-voice-bar]");
        const timeline = gsap
          .timeline({ repeat: -1, yoyo: true })
          .to(bars, {
            scaleY: (index) => 0.35 + voiceBarWeights[index] * 0.8,
            duration: 0.36,
            ease: "sine.inOut",
            stagger: { each: 0.045, from: "center" },
          });
        return () => timeline.kill();
      });
      return () => media.revert();
    },
    {
      scope: orb,
      dependencies: [tutorSpeaking],
      revertOnUpdate: true,
    },
  );

  return (
    <div ref={orb} className="relative isolate flex size-44 items-center justify-center">
      <span
        ref={outerRing}
        aria-hidden="true"
        className={cn(
          "absolute size-40 rounded-full border border-primary/15 opacity-40 will-change-transform",
          (listening || tutorSpeaking) && "bg-primary/5",
        )}
      />
      <span
        ref={innerRing}
        aria-hidden="true"
        className={cn(
          "absolute size-32 rounded-full border border-primary/20 opacity-60 will-change-transform",
          listening && "bg-primary/5",
          tutorSpeaking && "bg-primary/10",
        )}
      />
      <Button
        type="button"
        variant={listening ? "default" : "secondary"}
        className="relative size-28 rounded-full p-0 shadow-sm transition-transform duration-200 active:scale-95"
        disabled={connecting}
        aria-label={listening ? "Jeda mikrofon" : "Mulai percakapan suara"}
        aria-pressed={listening}
        onClick={onClick}
      >
        <span
          className={cn(
            "flex h-10 items-center justify-center gap-1",
            connecting && "invisible",
          )}
          aria-hidden="true"
        >
          {voiceBarWeights.map((_, index) => (
            <span
              key={index}
              data-voice-bar
              className="h-9 w-1 origin-center rounded-full bg-current opacity-85 will-change-transform"
            />
          ))}
        </span>
        {connecting && <Spinner className="absolute" />}
      </Button>
    </div>
  );
}

function formatTranscriptTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
