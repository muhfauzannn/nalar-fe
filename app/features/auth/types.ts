export type AuthFieldErrors = Partial<
  Record<"name" | "email" | "password" | "confirmPassword", string>
>;

export type AuthActionData = {
  formError?: string;
  fieldErrors?: AuthFieldErrors;
};

export type AuthActionResult =
  | { ok: true; redirectTo?: string }
  | ({ ok: false } & AuthActionData);

export type AuthSubmission = "email" | "google" | null;
