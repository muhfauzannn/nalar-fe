import { Form, Link, useNavigation, useSearchParams } from "react-router";

import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { ActionError } from "../components/action-feedback";
import type { ActionResult } from "../types";

export function JoinCoursePage({ result }: { result?: ActionResult }) {
  const [params] = useSearchParams();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";
  const code = params.get("code") ?? "";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
      <PageHeader
        crumbs={[{ label: "Course saya", to: "/courses" }]}
        title="Gabung ke course"
        description="Masukkan kode dari pengajarmu."
      />

      <Card>
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
                placeholder="K7M2-QX9P"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                required
                className="font-mono tracking-widest uppercase"
              />
            </Field>
            <Button type="submit" size="lg" loading={submitting}>
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
