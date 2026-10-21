import { KeyRound } from "lucide-react";
import { Form, Link, useNavigation, useSearchParams } from "react-router";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { ActionError } from "../components/action-feedback";
import type { ActionResult } from "../types";

export function JoinCoursePage({ result }: { result?: ActionResult }) {
  const [params] = useSearchParams();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";
  const code = params.get("code") ?? "";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          Gabung ke course
        </h1>
        <p className="leading-relaxed text-muted-foreground text-pretty">
          Masukkan kode kelas yang dibagikan pengajarmu. Kamu langsung terdaftar sebagai siswa.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4" aria-hidden="true" />
            Kode kelas
          </CardTitle>
          <CardDescription>Huruf besar atau kecil dan tanda hubung tidak masalah.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="flex flex-col gap-5">
            {result && !result.ok ? <ActionError error={result.error} /> : null}
            <Field>
              <FieldLabel htmlFor="code">Kode kelas</FieldLabel>
              <Input
                key={code}
                id="code"
                name="code"
                defaultValue={code}
                placeholder="ABCD-EFGH"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                required
                className="font-mono tracking-widest uppercase"
              />
              <FieldDescription>Contoh: K7M2-QX9P</FieldDescription>
            </Field>
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? <Spinner data-icon="inline-start" /> : null}
              {submitting ? "Memeriksa" : "Gabung"}
            </Button>
          </Form>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Ingin mengajar sendiri?{" "}
        <Link to="/manage/courses/new" className="font-medium text-foreground underline underline-offset-4">
          Buat course
        </Link>
      </p>
    </div>
  );
}
