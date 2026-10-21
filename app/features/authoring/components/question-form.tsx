import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import type { ManagedQuestion, QuestionDraft } from "../types";
import { ActionError, useAction, useOnSuccess } from "./action-feedback";
import { NativeSelect } from "./native-select";

type OptionDraft = { label: string; isCorrect: boolean };

const blankOptions = (): OptionDraft[] => [
  { label: "", isCorrect: true },
  { label: "", isCorrect: false },
];

// Mirrors the server's rules so most mistakes are caught before the request.
export function validateDraft(draft: QuestionDraft): string | null {
  if (!draft.prompt.trim()) return "Soal wajib diisi.";
  if (!(draft.points > 0 && draft.points <= 100)) return "Poin harus lebih dari 0 dan paling banyak 100.";
  if (draft.type === "multiple_choice") {
    const labels = draft.options.map((option) => option.label.trim());
    if (labels.some((label) => !label)) return "Semua opsi harus diisi (hapus opsi yang kosong).";
    if (new Set(labels.map((label) => label.toLocaleLowerCase("id-ID"))).size !== labels.length) {
      return "Teks opsi tidak boleh sama.";
    }
    if (draft.options.length < 2) return "Pilihan ganda butuh minimal 2 opsi.";
    if (draft.options.filter((option) => option.isCorrect).length !== 1) {
      return "Pilih tepat satu jawaban yang benar.";
    }
    return null;
  }
  if (draft.acceptedAnswers.every((answer) => !answer.trim())) {
    return "Isi minimal satu jawaban yang diterima.";
  }
  return null;
}

export function QuestionForm({
  quizId,
  question,
  onDone,
}: {
  quizId: string;
  question?: ManagedQuestion;
  onDone: () => void;
}) {
  const { fetcher, pending, error } = useAction();
  const [type, setType] = useState<QuestionDraft["type"]>(question?.type ?? "multiple_choice");
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [explanation, setExplanation] = useState(question?.explanation ?? "");
  const [points, setPoints] = useState(String(question?.points ?? 1));
  const [options, setOptions] = useState<OptionDraft[]>(
    question && question.options.length > 0
      ? question.options.map((option) => ({ label: option.label, isCorrect: option.isCorrect }))
      : blankOptions(),
  );
  const [answers, setAnswers] = useState<string[]>(
    question?.acceptedAnswers && question.acceptedAnswers.length > 0 ? question.acceptedAnswers : [""],
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const idPrefix = question ? `question-${question.id}` : "new-question";

  // Close once the server accepted the change (not on submit: a rejection must stay visible).
  useOnSuccess(fetcher, onDone);

  function buildDraft(): QuestionDraft {
    const common = { prompt: prompt.trim(), explanation: explanation.trim(), points: Number(points) };
    return type === "multiple_choice"
      ? {
          type,
          ...common,
          options: options.map((option) => ({ label: option.label.trim(), isCorrect: option.isCorrect })),
        }
      : { type, ...common, acceptedAnswers: answers.map((answer) => answer.trim()).filter(Boolean) };
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const draft = buildDraft();
    const problem = validateDraft(draft);
    setLocalError(problem);
    if (problem) return;
    fetcher.submit(
      {
        intent: question ? "question-update" : "question-create",
        quizId,
        ...(question ? { questionId: question.id } : {}),
        payload: JSON.stringify(draft),
      },
      { method: "post" },
    );
  }

  function setCorrect(index: number) {
    setOptions((current) => current.map((option, i) => ({ ...option, isCorrect: i === index })));
  }

  function removeOption(index: number) {
    setOptions((current) => {
      const next = current.filter((_, i) => i !== index);
      // keep exactly one correct answer
      if (next.length > 0 && !next.some((option) => option.isCorrect)) {
        next[0] = { ...next[0]!, isCorrect: true };
      }
      return next;
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <ActionError error={localError ?? error} />

      <div className="grid gap-4 sm:grid-cols-[14rem_8rem]">
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-type`}>Jenis soal</FieldLabel>
          <NativeSelect
            id={`${idPrefix}-type`}
            value={type}
            onChange={(event) => setType(event.target.value as QuestionDraft["type"])}
          >
            <option value="multiple_choice">Pilihan ganda</option>
            <option value="short_answer">Isian singkat</option>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-points`}>Poin</FieldLabel>
          <Input
            id={`${idPrefix}-points`}
            type="number"
            min={0.5}
            max={100}
            step={0.5}
            value={points}
            onChange={(event) => setPoints(event.target.value)}
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-prompt`}>Soal</FieldLabel>
        <Textarea
          id={`${idPrefix}-prompt`}
          rows={3}
          maxLength={3000}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
        <FieldDescription>Rumus: \( x^2 \) di dalam baris atau \[ x^2 \] sebagai blok.</FieldDescription>
      </Field>

      {type === "multiple_choice" ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium">Opsi jawaban</legend>
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="radio"
                name={`${idPrefix}-correct`}
                checked={option.isCorrect}
                onChange={() => setCorrect(index)}
                aria-label={`Jadikan opsi ${index + 1} jawaban benar`}
                className="size-4 shrink-0 accent-primary"
              />
              <Input
                aria-label={`Teks opsi ${index + 1}`}
                value={option.label}
                maxLength={300}
                placeholder={`Opsi ${index + 1}`}
                onChange={(event) =>
                  setOptions((current) =>
                    current.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Hapus opsi ${index + 1}`}
                disabled={options.length <= 2}
                onClick={() => removeOption(index)}
              >
                <X />
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Titik di kiri menandai jawaban yang benar.</p>
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={options.length >= 8}
              onClick={() => setOptions((current) => [...current, { label: "", isCorrect: false }])}
            >
              <Plus /> Tambah opsi
            </Button>
          </div>
        </fieldset>
      ) : (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium">Jawaban yang diterima</legend>
          {answers.map((answer, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                aria-label={`Jawaban diterima ${index + 1}`}
                value={answer}
                maxLength={200}
                placeholder={index === 0 ? "mis. Jakarta" : "Variasi lain yang juga benar"}
                onChange={(event) =>
                  setAnswers((current) => current.map((item, i) => (i === index ? event.target.value : item)))
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Hapus jawaban ${index + 1}`}
                disabled={answers.length <= 1}
                onClick={() => setAnswers((current) => current.filter((_, i) => i !== index))}
              >
                <X />
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Huruf besar/kecil dan spasi ganda diabaikan saat menilai.
            </p>
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={answers.length >= 20}
              onClick={() => setAnswers((current) => [...current, ""])}
            >
              <Plus /> Tambah jawaban
            </Button>
          </div>
        </fieldset>
      )}

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-explanation`}>Pembahasan (opsional)</FieldLabel>
        <Textarea
          id={`${idPrefix}-explanation`}
          rows={2}
          maxLength={3000}
          value={explanation}
          onChange={(event) => setExplanation(event.target.value)}
        />
        <FieldDescription>Baru terlihat oleh siswa setelah mereka mengumpulkan kuis.</FieldDescription>
      </Field>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          Batal
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {question ? "Simpan soal" : "Tambah soal"}
        </Button>
      </div>
    </form>
  );
}
