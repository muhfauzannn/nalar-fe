import { CircleAlert } from "lucide-react";
import { useEffect, useRef, type RefObject } from "react";
import { useFetcher } from "react-router";

import { Alert, AlertDescription } from "~/components/ui/alert";
import type { ActionResult } from "../types";

// One fetcher per small form keeps each form's pending/error state separate.
export function useAction() {
  const fetcher = useFetcher<ActionResult>();
  const failed = fetcher.data && !fetcher.data.ok ? fetcher.data : null;
  return {
    fetcher,
    pending: fetcher.state !== "idle",
    formData: fetcher.formData,
    error: failed?.error ?? null,
    code: failed?.code ?? null,
    submit: (values: Record<string, string>) =>
      fetcher.submit(values, { method: "post" }),
  };
}

export function ActionError({ error }: { error: string | null | undefined }) {
  if (!error) return null;
  return (
    <Alert variant="destructive" role="alert" className="enter-up">
      <CircleAlert />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}

// Clears an "add something" form once the server accepted it.
export function useResetOnSuccess(
  fetcher: ReturnType<typeof useFetcher<ActionResult>>,
  formRef: RefObject<HTMLFormElement | null>,
) {
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) formRef.current?.reset();
  }, [fetcher.state, fetcher.data, formRef]);
}

// Runs `callback` once a submission finished AND the server accepted it. Use it
// to close an inline form: closing on submit would hide the error of a rejected save.
export function useOnSuccess(
  fetcher: ReturnType<typeof useFetcher<ActionResult>>,
  callback: () => void,
) {
  const latest = useRef(callback);
  latest.current = callback;
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) latest.current();
  }, [fetcher.state, fetcher.data]);
}
