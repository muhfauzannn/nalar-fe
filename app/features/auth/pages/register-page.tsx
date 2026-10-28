import { Form } from "react-router";
import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { AuthLink } from "../components/auth-shell";
import { AuthFormPanel } from "../components/auth-form-panel";
import { GoogleAuthButton } from "../components/google-auth-button";
import { PasswordField } from "../components/password-field";
import type { AuthActionData, AuthSubmission } from "../types";

/**
 * Registration page for the `auth` feature. Submission is handled by the
 * route's browser-side action so Better Auth can set its session cookie.
 */
export function RegisterPage({
  actionData,
  submission,
}: {
  actionData?: AuthActionData;
  submission: AuthSubmission;
}) {
  const isSubmitting = submission !== null;
  const errors = actionData?.fieldErrors;

  return (
    <AuthFormPanel
      title="Buat akun"
      footer={
        <>
          Sudah punya akun? <AuthLink to="/login">Masuk</AuthLink>
        </>
      }
    >
      <FieldGroup>
        {actionData?.formError ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{actionData.formError}</AlertDescription>
          </Alert>
        ) : null}

        <Form method="post">
          <GoogleAuthButton
            label="Daftar dengan Google"
            disabled={isSubmitting}
            isLoading={submission === "google"}
          />
        </Form>

        <FieldSeparator>atau</FieldSeparator>

        <Form method="post" className="flex flex-col gap-5">
          <FieldGroup>
            <Field data-invalid={Boolean(errors?.name)}>
              <FieldLabel htmlFor="name">Nama lengkap</FieldLabel>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Nama kamu"
                required
                aria-invalid={Boolean(errors?.name)}
                disabled={isSubmitting}
              />
              <FieldError>{errors?.name}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors?.email)}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="nama@email.com"
                required
                aria-invalid={Boolean(errors?.email)}
                disabled={isSubmitting}
              />
              <FieldError>{errors?.email}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors?.password)}>
              <FieldLabel htmlFor="password">Kata sandi</FieldLabel>
              <PasswordField
                id="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                aria-invalid={Boolean(errors?.password)}
                disabled={isSubmitting}
              />
              <FieldDescription>Minimal 8 karakter.</FieldDescription>
              <FieldError>{errors?.password}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors?.confirmPassword)}>
              <FieldLabel htmlFor="confirm-password">
                Konfirmasi kata sandi
              </FieldLabel>
              <PasswordField
                id="confirm-password"
                name="confirmPassword"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                aria-invalid={Boolean(errors?.confirmPassword)}
                disabled={isSubmitting}
              />
              <FieldError>{errors?.confirmPassword}</FieldError>
            </Field>
          </FieldGroup>

          <Button
            type="submit"
            name="intent"
            value="email"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            {submission === "email" ? (
              <Spinner data-icon="inline-start" />
            ) : null}
            {submission === "email" ? "Memproses" : "Daftar"}
          </Button>
        </Form>
      </FieldGroup>
    </AuthFormPanel>
  );
}
