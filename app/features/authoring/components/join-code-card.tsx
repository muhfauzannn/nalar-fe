import { Check, Copy, KeyRound, Link2, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Spinner } from "~/components/ui/spinner";
import { formatJoinCode, joinLink } from "../lib/form";
import type { PublicationStatus } from "../types";
import { ActionError, useAction } from "./action-feedback";
import { ConfirmAction } from "./confirm-action";

export function JoinCodeCard({
  joinCode,
  courseStatus,
  studentCount,
}: {
  joinCode: string | null;
  courseStatus: PublicationStatus;
  studentCount: number;
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
        <CardDescription>
          Bagikan kode atau tautan ini. Siapa pun yang memilikinya bisa bergabung sebagai siswa.
          {studentCount > 0 ? ` Saat ini ${studentCount} siswa terdaftar.` : ""}
        </CardDescription>
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
            <p
              data-testid="join-code"
              className="rounded-xl border bg-muted/40 px-4 py-3 text-center font-mono text-3xl font-semibold tracking-[0.3em] select-all"
            >
              {formatJoinCode(joinCode)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => copy("code")}>
                {copied === "code" ? <Check /> : <Copy />}
                {copied === "code" ? "Tersalin" : "Salin kode"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => copy("link")}>
                {copied === "link" ? <Check /> : <Link2 />}
                {copied === "link" ? "Tersalin" : "Salin tautan"}
              </Button>
              <ConfirmAction
                label="Buat kode baru"
                icon={<RefreshCw />}
                title="Buat kode kelas baru?"
                description="Kode lama langsung berhenti berlaku. Siswa yang sudah terdaftar tidak terpengaruh, tetapi tautan yang pernah kamu bagikan tidak bisa dipakai lagi."
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
              >
                {disable.pending ? <Spinner data-icon="inline-start" /> : null}
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
              disabled={busy}
              onClick={() => reset.submit({ intent: "join-code-reset" })}
            >
              {reset.pending ? <Spinner data-icon="inline-start" /> : <RefreshCw />}
              Buat kode
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
