import { useCallback, useEffect, useRef, type ClipboardEvent, type FormEvent } from "react";

// Sinyal 1 of the AI Offloading Index (PRD §5.3): how a Stage 1 or Stage 4 text
// came about. Only counts are kept, never the keys or the text, and they ride
// along with the stage when it is completed. They survive a reload of the page
// through sessionStorage, keyed by submission and stage.
export const WRITING_RECORDER_VERSION = "web-v1";

export type WritingSignals = {
  activeSeconds: number;
  typedChars: number;
  deletedChars: number;
  pasteCount: number;
  pastedChars: number;
  largestPaste: number;
  longPauses: number;
  focusLosses: number;
  recorderVersion: string;
};

// Writing counts as active while the field has focus, the tab is visible and the
// last edit was this recent; a gap this long between two edits is a long pause.
const ACTIVE_WINDOW_MS = 30_000;
const LONG_PAUSE_MS = 30_000;
// Past this, the student most likely left and came back; that is not a pause.
const AWAY_MS = 30 * 60_000;

const empty = (): WritingSignals => ({
  activeSeconds: 0,
  typedChars: 0,
  deletedChars: 0,
  pasteCount: 0,
  pastedChars: 0,
  largestPaste: 0,
  longPauses: 0,
  focusLosses: 0,
  recorderVersion: WRITING_RECORDER_VERSION,
});

export const writingSignalsKey = (submissionId: string, stage: string) =>
  `nalar:writing:${submissionId}:${stage}`;

function load(key: string): WritingSignals {
  try {
    const stored = JSON.parse(sessionStorage.getItem(key) ?? "null");
    return stored && typeof stored === "object" ? { ...empty(), ...stored, recorderVersion: WRITING_RECORDER_VERSION } : empty();
  } catch {
    return empty();
  }
}

export function clearWritingSignals(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Storage can be blocked; nothing to clear then.
  }
}

export function useWritingSignals(key: string) {
  const counts = useRef<WritingSignals>(empty());
  const lastEdit = useRef(0);
  const focused = useRef(false);
  const length = useRef(0);

  const save = useCallback(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(counts.current));
    } catch {
      // Without storage the counts still travel with this page's submit.
    }
  }, [key]);

  useEffect(() => {
    counts.current = load(key);
    lastEdit.current = 0;
    // Count a second only while the student is actually writing.
    const timer = window.setInterval(() => {
      if (focused.current && document.visibilityState === "visible" && Date.now() - lastEdit.current < ACTIVE_WINDOW_MS) {
        counts.current.activeSeconds += 1;
        if (counts.current.activeSeconds % 10 === 0) save();
      }
    }, 1_000);
    const hidden = () => {
      if (document.visibilityState === "hidden" && focused.current) {
        counts.current.focusLosses += 1;
        save();
      }
    };
    document.addEventListener("visibilitychange", hidden);
    // No save here: every change is already stored, and saving on the way out
    // would bring back a stage's counts right after its submit cleared them.
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [key, save]);

  const edited = () => {
    const now = Date.now();
    const gap = now - lastEdit.current;
    if (lastEdit.current && gap >= LONG_PAUSE_MS && gap < AWAY_MS) counts.current.longPauses += 1;
    lastEdit.current = now;
  };

  const onInput = (event: FormEvent<HTMLTextAreaElement>) => {
    const value = event.currentTarget.value;
    const delta = value.length - length.current;
    length.current = value.length;
    const type = (event.nativeEvent as InputEvent).inputType ?? "";
    edited();
    // Pasted and dropped text is counted by onPaste, not as typing.
    if (type === "insertFromPaste" || type === "insertFromDrop") return save();
    if (delta > 0) counts.current.typedChars += delta;
    else counts.current.deletedChars += -delta;
    save();
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = event.clipboardData.getData("text").length;
    if (!pasted) return;
    counts.current.pasteCount += 1;
    counts.current.pastedChars += pasted;
    counts.current.largestPaste = Math.max(counts.current.largestPaste, pasted);
    save();
  };

  const onFocus = (event: FormEvent<HTMLTextAreaElement>) => {
    focused.current = true;
    length.current = event.currentTarget.value.length;
  };
  const onBlur = () => {
    focused.current = false;
    save();
  };

  return {
    bind: { onInput, onPaste, onFocus, onBlur },
    snapshot: () => JSON.stringify(counts.current),
  };
}
