import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import { AuthLink } from "../components/auth-shell";
import { AuthFormPanel } from "../components/auth-form-panel";
import { PasswordField } from "../components/password-field";
import { SocialAuth } from "../components/social-auth";

/**
 * Registration page for the `auth` feature. Renders only the form column — the
 * shared illustration chrome is owned by the `_auth` layout. Static UI only:
 * the form does not submit anywhere yet (`preventDefault`); wire a route
 * `action` later.
 */
export function RegisterPage() {
  return (
    <AuthFormPanel
      title="Buat akun"
      subtitle="Mulai perjalanan belajarmu."
      footer={
        <>
          Sudah punya akun? <AuthLink to="/login">Masuk</AuthLink>
        </>
      }
    >
      <SocialAuth label="Daftar dengan Google" />

      <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nama lengkap</Label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Nama kamu"
          />
        </div>

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
          <Label htmlFor="password">Kata sandi</Label>
          <PasswordField id="password" autoComplete="new-password" />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-password">Konfirmasi kata sandi</Label>
          <PasswordField id="confirm-password" autoComplete="new-password" />
        </div>

        <Label htmlFor="terms" className="mt-1 items-start">
          <Checkbox id="terms" name="terms" className="mt-0.5" />
          <span className="text-muted-foreground">
            Saya setuju dengan{" "}
            <AuthLink to="/terms">Syarat &amp; Ketentuan</AuthLink> dan{" "}
            <AuthLink to="/privacy">Kebijakan Privasi</AuthLink>.
          </span>
        </Label>

        <Button type="submit" size="lg" className="mt-2 w-full">
          Daftar
        </Button>
      </form>
    </AuthFormPanel>
  );
}
