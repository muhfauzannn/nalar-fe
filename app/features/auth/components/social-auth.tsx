import { Button } from "~/components/ui/button";

/**
 * "Continue with Google" button + an "atau" divider. Presentational only; the
 * button is inert here (static UI). Lucide ships no brand marks, so the Google
 * "G" is a small inline SVG.
 */
export function SocialAuth({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-6">
      <Button type="button" variant="outline" size="lg" className="w-full">
        <GoogleIcon data-icon="inline-start" />
        {label}
      </Button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        atau
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

function GoogleIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.88-3c-1.08.72-2.45 1.16-4.06 1.16-3.12 0-5.77-2.11-6.71-4.94H1.28v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.31A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.58.38-2.31V6.6H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.58 1.79l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.28 6.6l4.01 3.09C6.23 6.86 8.88 4.75 12 4.75Z"
      />
    </svg>
  );
}
