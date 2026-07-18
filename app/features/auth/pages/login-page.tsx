import { Link } from "react-router";

import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import { AuthLink } from "../components/auth-shell";
import { AuthFormPanel } from "../components/auth-form-panel";
import { PasswordField } from "../components/password-field";
import { SocialAuth } from "../components/social-auth";

/**
 * Login page for the `auth` feature. Renders only the form column — the shared
 * illustration chrome is owned by the `_auth` layout. Static UI only: the form
 * does not submit anywhere yet (`preventDefault`); wire a route `action` later.
 */
export function LoginPage() {
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
      <SocialAuth label="Lanjutkan dengan Google" />

      <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Kata sandi</Label>
            <Link
              to="/forgot-password"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Lupa kata sandi?
            </Link>
          </div>
          <PasswordField id="password" autoComplete="current-password" />
        </div>

        <Label htmlFor="remember" className="mt-1">
          <Checkbox id="remember" name="remember" />
          <span className="text-muted-foreground">Ingat saya</span>
        </Label>

        <Button type="submit" size="lg" className="mt-2 w-full">
          Masuk
        </Button>
      </form>
    </AuthFormPanel>
  );
}
