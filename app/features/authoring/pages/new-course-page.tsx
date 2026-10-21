import { Form, Link, useNavigation } from "react-router";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { ActionError } from "../components/action-feedback";
import { NativeSelect } from "../components/native-select";
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
      <header className="flex flex-col gap-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          Buat course
        </h1>
        <p className="leading-relaxed text-muted-foreground text-pretty">
          Course dimulai sebagai draf. Isi materinya dulu; siswa baru bisa bergabung setelah course
          kamu terbitkan.
        </p>
      </header>

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
                <option value="" disabled>
                  Pilih mata pelajaran
                </option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="description">Deskripsi (opsional)</FieldLabel>
              <Textarea id="description" name="description" rows={4} maxLength={2000} />
              <FieldDescription>Tampil di kartu course milik siswa.</FieldDescription>
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
