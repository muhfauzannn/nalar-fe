import { Form, Link, useNavigation } from "react-router";

import { PageHeader } from "~/components/layout/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";
import { Textarea } from "~/components/ui/textarea";
import { ActionError } from "../components/action-feedback";
import type { ActionResult, Subject } from "../types";

export function NewCoursePage({
  subjects,
  result,
}: {
  subjects: Subject[];
  result?: ActionResult;
}) {
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <PageHeader
        crumbs={[{ label: "Kelola course", to: "/manage" }]}
        title="Buat course"
        description="Course dimulai sebagai draf."
      />

      <Card>
        <CardContent>
          <Form method="post" className="flex flex-col gap-5">
            {result && !result.ok ? <ActionError error={result.error} /> : null}
            <Field>
              <FieldLabel htmlFor="name">Nama course</FieldLabel>
              <Input id="name" name="name" required maxLength={120} placeholder="mis. Fisika Kelas XI" />
            </Field>
            <Field>
              <FieldLabel htmlFor="subjectId">Mata pelajaran</FieldLabel>
              <NativeSelect id="subjectId" name="subjectId" required defaultValue="">
                <NativeSelectOption value="" disabled>
                  Pilih mata pelajaran
                </NativeSelectOption>
                {subjects.map((subject) => (
                  <NativeSelectOption key={subject.id} value={subject.id}>
                    {subject.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="description">Deskripsi (opsional)</FieldLabel>
              <Textarea id="description" name="description" rows={4} maxLength={2000} />
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" render={<Link to="/manage" />}>
                Batal
              </Button>
              <Button type="submit" loading={submitting}>
                {submitting ? "Membuat" : "Buat course"}
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
