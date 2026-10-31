import { redirect, useNavigation } from "react-router";

import type { Route } from "./+types/_auth.register";
import {
  continueWithGoogle,
  RegisterPage,
  registerWithEmail,
} from "~/features/auth";
import { postAuthPath, safeNextPath, siteConfig } from "~/config";

export function meta(_: Route.MetaArgs) {
  return [{ title: `Daftar · ${siteConfig.name}` }];
}

export function loader({ request }: Route.LoaderArgs) {
  return { hasOAuthError: new URL(request.url).searchParams.has("error") };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const next = safeNextPath(new URL(request.url).searchParams.get("next"));
  const result =
    formData.get("intent") === "google"
      ? await continueWithGoogle("/register", next)
      : await registerWithEmail(formData);

  return result.ok ? redirect(result.redirectTo ?? next ?? postAuthPath) : result;
}

// Nested under the `_auth` layout → renders only the form column; the shared
// illustration chrome persists across the /login ↔ /register switch.
export default function RegisterRoute({
  actionData,
  loaderData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const submission =
    navigation.state !== "submitting"
      ? null
      : navigation.formData?.get("intent") === "google"
        ? "google"
        : "email";
  const visibleActionData =
    actionData ??
    (loaderData.hasOAuthError
      ? { formError: "Pendaftaran Google gagal atau dibatalkan. Coba lagi." }
      : undefined);

  return (
    <RegisterPage
      actionData={visibleActionData}
      submission={submission}
    />
  );
}
