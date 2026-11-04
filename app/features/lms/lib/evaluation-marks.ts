export const MARKS = [
  { id: "benar", label: "Benar" },
  { id: "kurang", label: "Kurang" },
  { id: "perlu dicek", label: "Perlu dicek" },
] as const;

export type Mark = (typeof MARKS)[number]["id"];
/** What the student said about one tutor reply, by the reply's message id. */
export type Marks = Record<string, { mark: Mark; reason: string }>;

const MAX_QUOTE_CHARS = 160;
export const MIN_REASON_CHARS = 10;

/**
 * Pos 3 is still stored as one text, so teachers and the Index read it as before. The server's
 * `evaluationProse` drops the quote lines and the mark before it counts anything: only the
 * student's reasons earn points. Change this format together with that function.
 */
export function composeEvaluation(replies: Array<{ id: string; content: string }>, marks: Marks) {
  return replies
    .flatMap((reply) => {
      const marked = marks[reply.id];
      if (!marked) return [];
      const quote = reply.content.replace(/\s+/g, " ").trim();
      const short = quote.length > MAX_QUOTE_CHARS ? `${quote.slice(0, MAX_QUOTE_CHARS).trimEnd()}…` : quote;
      return [`> NALAR: ${short}\nPenilaianku (${marked.mark}): ${marked.reason.trim()}`];
    })
    .join("\n\n");
}

export function marksReady(marks: Marks) {
  const all = Object.values(marks);
  return all.length > 0 && all.every((item) => item.reason.trim().length >= MIN_REASON_CHARS);
}

export function readMarks(saved: string | undefined): Marks {
  try {
    const parsed: unknown = JSON.parse(saved ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Marks) : {};
  } catch {
    return {};
  }
}
