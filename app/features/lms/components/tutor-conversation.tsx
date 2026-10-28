import { useEffect, useRef, type ReactNode } from "react";
import {
  ArrowUp,
  AudioLines,
  CircleAlert,
  Mic,
  MicOff,
  RotateCw,
  Square,
  X,
} from "lucide-react";

import { MathText } from "~/components/math-text";
import { Bubble, BubbleContent } from "~/components/ui/bubble";
import { Button } from "~/components/ui/button";
import { Message, MessageContent } from "~/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "~/components/ui/message-scroller";
import { Spinner } from "~/components/ui/spinner";
import { cn } from "~/lib/utils";
import type { TutorThreadMessage } from "../types";

/*
 * One conversation for both tutors (quiz/assignment and PDF): a thread, a composer that is
 * always available, and a voice bar while the student talks. Typed and spoken turns land in
 * the same thread. Copy is limited to what a student needs to act.
 */

export type VoiceState = "connecting" | "listening" | "thinking" | "speaking" | "muted";

const voiceLabels: Record<VoiceState, string> = {
  connecting: "Menyambungkan…",
  listening: "Mendengarkan",
  thinking: "Berpikir…",
  speaking: "Menjelaskan",
  muted: "Mikrofon dijeda",
};

export function TutorThread({
  label,
  messages,
  liveQuestion,
  liveAnswer,
  thinking,
  empty,
  className,
}: {
  label: string;
  messages: TutorThreadMessage[];
  liveQuestion?: string;
  liveAnswer?: string;
  thinking?: boolean;
  empty: ReactNode;
  className?: string;
}) {
  const isEmpty = messages.length === 0 && !liveQuestion && !liveAnswer && !thinking;
  return (
    <div className={cn("min-h-0", className)} aria-label={label} role="log">
      {isEmpty ? (
        <div className="flex h-full items-center justify-center px-6 py-8 text-center text-sm text-muted-foreground text-balance">
          {empty}
        </div>
      ) : (
        <MessageScrollerProvider autoScroll>
          <MessageScroller>
            <MessageScrollerViewport>
              <MessageScrollerContent className="gap-5 px-4 py-4">
                {messages.map((message) => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor={message.author === "student"}
                  >
                    <Line author={message.author}>{message.content}</Line>
                  </MessageScrollerItem>
                ))}
                {liveQuestion ? (
                  <MessageScrollerItem scrollAnchor>
                    <Line author="student" live>
                      {liveQuestion}
                    </Line>
                  </MessageScrollerItem>
                ) : null}
                {liveAnswer ? (
                  <MessageScrollerItem>
                    <Line author="tutor">{liveAnswer}</Line>
                  </MessageScrollerItem>
                ) : thinking ? (
                  <MessageScrollerItem>
                    <p className="shimmer w-fit text-sm text-muted-foreground">Berpikir…</p>
                  </MessageScrollerItem>
                ) : null}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      )}
    </div>
  );
}

function Line({
  author,
  live,
  children,
}: {
  author: TutorThreadMessage["author"];
  live?: boolean;
  children: string;
}) {
  const student = author === "student";
  return (
    <Message align={student ? "end" : "start"} data-author={author}>
      <MessageContent>
        <Bubble align={student ? "end" : "start"} variant={student ? "secondary" : "ghost"}>
          <BubbleContent className={cn("text-sm/relaxed", live && "text-muted-foreground")}>
            <MathText>{children}</MathText>
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}

/** Error or reconnect notice, one line above the composer. */
export function TutorStatus({
  error,
  notice,
  onCancel,
}: {
  error: string | null;
  notice: string | null;
  onCancel?: () => void;
}) {
  if (notice) {
    return (
      <div className="flex items-center gap-2 px-1 pb-2 text-xs text-muted-foreground">
        <Spinner className="size-3.5" />
        <p data-testid="tutor-notice" className="min-w-0 flex-1">
          {notice}
        </p>
        {onCancel ? (
          <Button type="button" size="xs" variant="ghost" onClick={onCancel}>
            Batalkan
          </Button>
        ) : null}
      </div>
    );
  }
  if (!error) return null;
  return (
    <p role="alert" className="flex items-start gap-2 px-1 pb-2 text-xs/relaxed text-destructive">
      <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0">{error}</span>
    </p>
  );
}

/**
 * What the button at the end of the composer does when nothing is typed: start talking,
 * show that a connection is being made, or retry one that failed.
 */
export type VoiceStart =
  | { kind: "start"; disabled?: boolean; onStart: () => void }
  | { kind: "connecting" }
  | { kind: "retry"; onRetry: () => void }
  | { kind: "active" };

export function TutorComposer({
  value,
  onChange,
  onSend,
  canSend,
  placeholder,
  voice,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  canSend: boolean;
  placeholder: string;
  voice: VoiceStart;
  disabled?: boolean;
}) {
  const typed = value.trim().length > 0;
  const send = () => {
    if (typed && canSend) onSend();
  };
  return (
    <div className="flex items-end gap-1.5 rounded-3xl border bg-background p-1.5 pl-4 transition-[border-color,box-shadow] duration-[160ms] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
          event.preventDefault();
          send();
        }}
        rows={1}
        maxLength={2_000}
        disabled={disabled}
        placeholder={placeholder}
        aria-label="Pesan untuk tutor"
        className="field-sizing-content max-h-36 min-h-9 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed sm:text-sm"
      />
      {typed || voice.kind === "active" ? (
        <Button
          key="send"
          type="button"
          size="icon"
          className="enter-pop shrink-0"
          disabled={!typed || !canSend}
          aria-label="Kirim pesan"
          onClick={send}
        >
          <ArrowUp />
        </Button>
      ) : voice.kind === "connecting" ? (
        <Button
          key="connecting"
          type="button"
          size="icon"
          variant="secondary"
          className="shrink-0"
          disabled
          aria-label="Menyambungkan…"
        >
          <Spinner />
        </Button>
      ) : voice.kind === "retry" ? (
        <Button
          key="retry"
          type="button"
          size="icon"
          variant="secondary"
          className="enter-pop shrink-0"
          aria-label="Coba sambungkan lagi"
          onClick={voice.onRetry}
        >
          <RotateCw />
        </Button>
      ) : (
        <Button
          key="voice"
          type="button"
          size="icon"
          variant="secondary"
          className="enter-pop shrink-0"
          disabled={voice.disabled}
          aria-label="Mulai percakapan suara"
          onClick={voice.onStart}
        >
          <AudioLines />
        </Button>
      )}
    </div>
  );
}

/** Shown while the student is in a spoken conversation. */
export function VoiceBar({
  state,
  readLevel,
  listening,
  onToggleMicrophone,
  onStop,
  onEnd,
  endLabel,
}: {
  state: VoiceState;
  readLevel: () => number;
  listening: boolean;
  onToggleMicrophone: () => void;
  onStop?: () => void;
  onEnd: () => void;
  endLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 px-1 pb-2">
      <VoiceOrb state={state} readLevel={readLevel} />
      <p
        role="status"
        className={cn(
          "min-w-0 flex-1 truncate text-sm font-medium",
          state === "thinking" && "shimmer text-muted-foreground",
        )}
      >
        {voiceLabels[state]}
      </p>
      {onStop && (state === "thinking" || state === "speaking") ? (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Hentikan penjelasan"
          onClick={onStop}
        >
          <Square />
        </Button>
      ) : null}
      <Button
        type="button"
        size="icon-sm"
        variant={listening ? "secondary" : "outline"}
        aria-label={listening ? "Jeda mikrofon" : "Lanjutkan mikrofon"}
        aria-pressed={!listening}
        onClick={onToggleMicrophone}
      >
        {listening ? <Mic /> : <MicOff />}
      </Button>
      <Button type="button" size="icon-sm" variant="ghost" aria-label={endLabel} onClick={onEnd}>
        <X />
      </Button>
    </div>
  );
}

/**
 * The tutor's voice made visible. Its halo follows the real loudness of whoever is speaking
 * (microphone or tutor audio), read every frame and written straight to `transform`, so
 * nothing re-renders while it moves. Rises fast and settles slowly, like a VU meter.
 */
export function VoiceOrb({
  state,
  readLevel,
}: {
  state: VoiceState;
  readLevel: () => number;
}) {
  const halo = useRef<HTMLSpanElement>(null);
  const core = useRef<HTMLSpanElement>(null);
  const moving = state === "listening" || state === "speaking";

  useEffect(() => {
    const haloEl = halo.current;
    const coreEl = core.current;
    if (!haloEl || !coreEl) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let shown = 0;
    let frame = 0;
    const paint = () => {
      if (reduced) {
        // No growth for reduced motion: the halo only brightens.
        haloEl.style.opacity = String(0.25 + shown * 0.75);
      } else {
        haloEl.style.transform = `scale(${1 + shown * 0.55})`;
        coreEl.style.transform = `scale(${1 + shown * 0.08})`;
      }
    };
    if (!moving) {
      haloEl.style.transform = coreEl.style.transform = haloEl.style.opacity = "";
      return;
    }
    const tick = () => {
      const target = readLevel();
      shown += (target - shown) * (target > shown ? 0.45 : 0.12);
      paint();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [moving, readLevel]);

  return (
    <span aria-hidden="true" className="relative flex size-11 shrink-0 items-center justify-center">
      <span
        ref={halo}
        className={cn(
          "absolute inset-0 rounded-full bg-primary/20 transition-opacity duration-200",
          !moving && "opacity-0",
        )}
      />
      <span
        ref={core}
        className={cn(
          "relative flex size-9 items-center justify-center rounded-full transition-colors duration-200",
          state === "muted" ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        {state === "connecting" ? <Spinner className="size-4" /> : <AudioLines className="size-4" />}
      </span>
    </span>
  );
}
