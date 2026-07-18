import { redirect, useNavigation } from "react-router";

import type { Route } from "./+types/_auth.login";
import {
  continueWithGoogle,
  LoginPage,
  loginWithEmail,
} from "~/features/auth";
import { siteConfig } from "~/config";

export function meta(_: Route.MetaArgs) {
  return [{ title: `Masuk · ${siteConfig.name}` }];
}

export function loader({ request }: Route.LoaderArgs) {
  return { hasOAuthError: new URL(request.url).searchParams.has("error") };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const result =
    formData.get("intent") === "google"
      ? await continueWithGoogle("/login")
      : await loginWithEmail(formData);

  return result.ok ? redirect(result.redirectTo ?? "/") : result;
}

// Nested under the `_auth` layout → renders only the form column; the shared
// illustration chrome persists across the /login ↔ /register switch.
export default function LoginRoute({
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
      ? { formError: "Login Google gagal atau dibatalkan. Coba lagi." }
      : undefined);

  return (
    <LoginPage
      actionData={visibleActionData}
      submission={submission}
    />
  );
}
