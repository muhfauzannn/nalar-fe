import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";

function GoogleIcon() {
  return (
    <svg
      viewBox="0 0 18 18"
      aria-hidden="true"
      focusable="false"
      data-icon="inline-start"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.702-1.567 2.684-3.874 2.684-6.614Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.909-2.258c-.806.54-1.836.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.955v2.332A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.963 10.706A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.167.281-1.706V4.962H.955A9 9 0 0 0 0 9c0 1.45.347 2.824.955 4.038l3.008-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.322 0 2.508.454 3.441 1.346l2.581-2.582C13.464.892 11.427 0 9 0A9 9 0 0 0 .955 4.962l3.008 2.332C4.672 5.165 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  label,
  disabled,
  isLoading,
}: {
  label: string;
  disabled: boolean;
  isLoading: boolean;
}) {
  return (
    <Button
      type="submit"
      name="intent"
      value="google"
      variant="outline"
      size="lg"
      className="w-full"
      disabled={disabled}
    >
      {isLoading ? <Spinner data-icon="inline-start" /> : <GoogleIcon />}
      {isLoading ? "Menghubungkan" : label}
    </Button>
  );
}
