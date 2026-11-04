import { FlaskConical } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { composeEvaluation, MARKS, MIN_REASON_CHARS, readMarks, type Mark, type Marks } from "../lib/evaluation-marks";
import { readActivityDraft, writeActivityDraft } from "../lib/activity-drafts";

type Message = { id: string; author: "student" | "tutor"; content: string };

// Pos 3 for a student who talked to the tutor: they judge its replies one by one and say why.
// `children` gets what the form will store; `draftKey` keeps the marks across a trip to the lab.
export function EvaluationMarks({
  messages,
  draftKey,
  lab,
  children,
}: {
  messages: Message[];
  draftKey: string;
  lab?: { href: string; title: string };
  children: (state: { content: string; marks: Marks }) => React.ReactNode;
}) {
  const [marks, setMarks] = useState(() => readMarks(readActivityDraft(draftKey)));
  const replies = messages.filter((message) => message.author === "tutor");
  const change = (next: Marks) => {
    setMarks(next);
    writeActivityDraft(draftKey, JSON.stringify(next));
  };
  const pick = (id: string, mark: Mark) => {
    const { [id]: current, ...rest } = marks;
    change(current?.mark === mark ? rest : { ...rest, [id]: { mark, reason: current?.reason ?? "" } });
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-medium">Tandai balasan NALAR, lalu tulis alasanmu</p>
        <p className="mt-1 text-sm/relaxed text-muted-foreground">Tidak semua perlu ditandai. Pilih balasan yang memengaruhi jawabanmu.</p>
      </div>
      {lab && (
        <Link to={lab.href} className="flex items-center gap-3 rounded-2xl bg-brand-lavender-soft/60 p-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring">
          <FlaskConical className="size-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0">
            Uji di lab: {lab.title}
            <span className="block text-xs font-normal text-muted-foreground">Tanda dan alasanmu tetap tersimpan. Hasil lab tidak dinilai.</span>
          </span>
        </Link>
      )}
      <ol className="flex flex-col gap-4">
        {replies.map((reply, index) => {
          const marked = marks[reply.id];
          const asked = messages[messages.indexOf(reply) - 1];
          return (
            <li key={reply.id} className="flex flex-col gap-3 rounded-2xl border p-4">
              {asked?.author === "student" && (
                <div data-author="student" className="text-sm/relaxed text-muted-foreground">
                  <p className="text-xs font-medium">Kamu</p>
                  <p className="break-words whitespace-pre-wrap">{asked.content}</p>
                </div>
              )}
              <div data-author="tutor" className="max-h-64 overflow-y-auto text-sm/relaxed">
                <p className="text-xs font-medium text-muted-foreground">NALAR</p>
                <p className="break-words whitespace-pre-wrap">{reply.content}</p>
              </div>
              <div role="group" aria-label={`Tanda untuk balasan ${index + 1}`} className="flex flex-wrap gap-2">
                {MARKS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={marked?.mark === option.id}
                    onClick={() => pick(reply.id, option.id)}
                    className={cn(
                      "min-h-10 rounded-full border px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring",
                      marked?.mark === option.id ? "border-brand-mint bg-brand-mint text-brand-mint-ink" : "bg-background hover:bg-muted",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {marked && (
                <Textarea
                  aria-label={`Alasan untuk balasan ${index + 1}`}
                  required
                  minLength={MIN_REASON_CHARS}
                  rows={3}
                  value={marked.reason}
                  onChange={(event) => change({ ...marks, [reply.id]: { ...marked, reason: event.currentTarget.value } })}
                  placeholder={marked.mark === "benar" ? "Dari mana kamu tahu ini benar?" : marked.mark === "kurang" ? "Apa yang kurang atau keliru?" : "Apa yang perlu dicek, dan bagaimana caranya?"}
                  className="bg-background text-base leading-relaxed"
                />
              )}
            </li>
          );
        })}
      </ol>
      {children({ content: composeEvaluation(replies, marks), marks })}
    </div>
  );
}
