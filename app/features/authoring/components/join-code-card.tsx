import { Check, Copy, KeyRound, Link2, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { formatJoinCode, joinLink } from "../lib/form";
import type { PublicationStatus } from "../types";
import { ActionError, useAction } from "./action-feedback";
import { ConfirmAction } from "./confirm-action";
import { IconSwap } from "./icon-swap";

export function JoinCodeCard({
  joinCode,
  courseStatus,
}: {
  joinCode: string | null;
  courseStatus: PublicationStatus;
}) {
  const reset = useAction();
  const disable = useAction();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  async function copy(kind: "code" | "link") {
    if (!joinCode) return;
    const value = kind === "code" ? formatJoinCode(joinCode) : joinLink(window.location.origin, joinCode);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1_800);
    } catch {
      // Clipboard can be unavailable (insecure origin, denied permission); the code is on screen.
    }
  }

  const busy = reset.pending || disable.pending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4" aria-hidden="true" />
          Kode kelas
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {courseStatus !== "published" ? (
          <Alert>
            <AlertDescription>
              {courseStatus === "draft"
                ? "Course masih draf, jadi kode ini belum bisa dipakai. Terbitkan course agar siswa bisa bergabung."
                : "Course diarsipkan, jadi tidak menerima siswa baru."}
            </AlertDescription>
          </Alert>
        ) : null}
        <ActionError error={reset.error ?? disable.error} />

        {joinCode ? (
          <>
            {/* New code = new element: it pops in, so the change is noticed. */}
            <p
              key={joinCode}
              data-testid="join-code"
              className="enter-pop rounded-xl border bg-muted/40 px-4 py-3 text-center font-mono text-3xl font-semibold tracking-[0.3em] select-all"
            >
              {formatJoinCode(joinCode)}
            </p>
            <span role="status" className="sr-only">
              {copied ? "Tersalin ke papan klip" : ""}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => copy("code")}>
                <IconSwap done={copied === "code"} idle={<Copy />} finished={<Check />} />
                Salin kode
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => copy("link")}>
                <IconSwap done={copied === "link"} idle={<Link2 />} finished={<Check />} />
                Salin tautan
              </Button>
              <ConfirmAction
                label="Buat kode baru"
                icon={<RefreshCw />}
                title="Buat kode kelas baru?"
                description="Kode dan tautan lama berhenti berlaku. Siswa yang sudah bergabung tidak terpengaruh."
                confirmLabel="Buat kode baru"
                disabled={busy}
                onConfirm={() => reset.submit({ intent: "join-code-reset" })}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => disable.submit({ intent: "join-code-disable" })}
               loading={disable.pending}>
                Matikan kode
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-4">
            <p className="text-sm text-muted-foreground">
              Kode kelas dimatikan. Tidak ada yang bisa bergabung sampai kamu membuat kode baru.
            </p>
            <Button
              type="button"
              size="sm"
              loading={reset.pending}
              disabled={disable.pending}
              onClick={() => reset.submit({ intent: "join-code-reset" })}
            >
              <RefreshCw data-icon="inline-start" />
              Buat kode
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
