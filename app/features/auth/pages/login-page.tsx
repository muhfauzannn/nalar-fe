import { Form } from "react-router";
import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Field,
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
 * Login page for the `auth` feature. Submission is handled by the route's
 * browser-side action so Better Auth can set its cross-origin session cookie.
 */
export function LoginPage({
  actionData,
  submission,
}: {
  actionData?: AuthActionData;
  submission: AuthSubmission;
}) {
  const isSubmitting = submission !== null;
  const emailError = actionData?.fieldErrors?.email;
  const passwordError = actionData?.fieldErrors?.password;

  return (
    <AuthFormPanel
      title="Selamat datang kembali"
      subtitle="Masuk untuk melanjutkan."
      footer={
        <>
          Belum punya akun? <AuthLink to="/register">Daftar</AuthLink>
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
            label="Lanjutkan dengan Google"
            disabled={isSubmitting}
            isLoading={submission === "google"}
          />
        </Form>

        <FieldSeparator>atau</FieldSeparator>

        <Form method="post" className="flex flex-col gap-5">
          <FieldGroup>
            <Field data-invalid={Boolean(emailError)}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="nama@email.com"
                required
                aria-invalid={Boolean(emailError)}
                disabled={isSubmitting}
              />
              <FieldError>{emailError}</FieldError>
            </Field>

            <Field data-invalid={Boolean(passwordError)}>
              <FieldLabel htmlFor="password">Kata sandi</FieldLabel>
              <PasswordField
                id="password"
                autoComplete="current-password"
                required
                minLength={8}
                maxLength={128}
                aria-invalid={Boolean(passwordError)}
                disabled={isSubmitting}
              />
              <FieldError>{passwordError}</FieldError>
            </Field>
          </FieldGroup>

          <Field orientation="horizontal">
            <Checkbox id="remember" name="remember" disabled={isSubmitting} />
            <FieldLabel htmlFor="remember" className="text-muted-foreground">
              Ingat saya
            </FieldLabel>
          </Field>

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
            {submission === "email" ? "Memproses" : "Masuk"}
          </Button>
        </Form>
      </FieldGroup>
    </AuthFormPanel>
  );
}
