import { authClient } from "~/lib/auth-client";
import { env } from "~/config/env";
import { postAuthPath } from "~/config/navigation";

import type { AuthActionResult, AuthFieldErrors } from "../types";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readPassword(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function validateEmail(email: string): string | undefined {
  if (!email) return "Email wajib diisi.";
  if (!/^\S+@\S+\.\S+$/.test(email)) return "Masukkan email yang valid.";
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password) return "Kata sandi wajib diisi.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Gunakan minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Gunakan maksimal ${MAX_PASSWORD_LENGTH} karakter.`;
  }
  return undefined;
}

function hasErrors(fieldErrors: AuthFieldErrors): boolean {
  return Object.values(fieldErrors).some(Boolean);
}

export async function continueWithGoogle(
  errorPath: "/login" | "/register",
): Promise<AuthActionResult> {
  try {
    const callbackURL = new URL(postAuthPath, env.appUrl).toString();
    const errorCallbackURL = new URL(errorPath, env.appUrl).toString();
    const { data, error } = await authClient.signIn.social({
      provider: "google",
      callbackURL,
      errorCallbackURL,
      newUserCallbackURL: callbackURL,
      disableRedirect: true,
    });

    if (error || !data?.url) {
      return {
        ok: false,
        formError: "Login Google belum dapat dimulai. Coba lagi.",
      };
    }

    return { ok: true, redirectTo: data.url };
  } catch {
    return {
      ok: false,
      formError: "Layanan autentikasi belum dapat dihubungi. Coba lagi.",
    };
  }
}

export async function loginWithEmail(
  formData: FormData,
): Promise<AuthActionResult> {
  const email = readField(formData, "email").toLowerCase();
  const password = readPassword(formData, "password");
  const rememberMe = formData.get("remember") === "on";
  const fieldErrors: AuthFieldErrors = {
    email: validateEmail(email),
    password: validatePassword(password),
  };

  if (hasErrors(fieldErrors)) {
    return { ok: false, fieldErrors };
  }

  try {
    const { error } = await authClient.signIn.email({
      email,
      password,
      rememberMe,
    });

    if (error) {
      return {
        ok: false,
        formError: "Email atau kata sandi tidak sesuai.",
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      formError: "Layanan autentikasi belum dapat dihubungi. Coba lagi.",
    };
  }
}

export async function registerWithEmail(
  formData: FormData,
): Promise<AuthActionResult> {
  const name = readField(formData, "name");
  const email = readField(formData, "email").toLowerCase();
  const password = readPassword(formData, "password");
  const confirmPassword = readPassword(formData, "confirmPassword");
  const fieldErrors: AuthFieldErrors = {
    name: name ? undefined : "Nama lengkap wajib diisi.",
    email: validateEmail(email),
    password: validatePassword(password),
    confirmPassword: !confirmPassword
      ? "Konfirmasi kata sandi wajib diisi."
      : password === confirmPassword
        ? undefined
        : "Konfirmasi kata sandi tidak sama.",
  };

  if (hasErrors(fieldErrors)) {
    return { ok: false, fieldErrors };
  }

  try {
    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
    });

    if (error) {
      return {
        ok: false,
        formError: "Akun belum dapat dibuat. Periksa data lalu coba lagi.",
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      formError: "Layanan autentikasi belum dapat dihubungi. Coba lagi.",
    };
  }
}
