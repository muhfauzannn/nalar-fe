import katex from "katex";

import { cn } from "~/lib/utils";

type MathTextProps = {
  children: string;
  className?: string;
  animateWords?: boolean;
};

type TextPart = { type: "text"; value: string };
type MathPart = { type: "math"; value: string; display: boolean };
type MathTextPart = TextPart | MathPart;

function parseMathText(value: string): MathTextPart[] {
  // Gemini commonly alternates between TeX delimiters (\(...\), \[...\])
  // and Markdown-style math delimiters ($...$, $$...$$).
  const pattern =
    /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|\$\$([\s\S]*?)\$\$|(?<!\\)\$(?!\s)([^$\n]*?\S)(?<!\\)\$/g;
  const parts: MathTextPart[] = [];
  let cursor = 0;
  let match = pattern.exec(value);

  while (match) {
    if (match.index > cursor) {
      parts.push({ type: "text", value: value.slice(cursor, match.index) });
    }
    parts.push({
      type: "math",
      value: match[1] ?? match[2] ?? match[3] ?? match[4] ?? "",
      display: match[1] !== undefined || match[3] !== undefined,
    });
    cursor = match.index + match[0].length;
    match = pattern.exec(value);
  }

  if (cursor < value.length) {
    parts.push({ type: "text", value: value.slice(cursor) });
  }
  return parts.length > 0 ? parts : [{ type: "text", value }];
}

function AnimatedText({ value }: { value: string }) {
  return value.split(/(\s+)/).map((token, index) =>
    token.trim() ? (
      <span key={`${index}-${token}`} data-lesson-word>
        {token}
      </span>
    ) : (
      token
    ),
  );
}

export function MathText({
  children,
  className,
  animateWords = false,
}: MathTextProps) {
  return (
    <span
      className={cn(
        "max-w-full whitespace-pre-wrap [&_.katex-display]:my-3 [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden",
        className,
      )}
    >
      {parseMathText(children).map((part, index) =>
        part.type === "text" ? (
          <span key={`text-${index}`}>
            {animateWords ? <AnimatedText value={part.value} /> : part.value}
          </span>
        ) : (
          <span
            key={`math-${index}`}
            className={cn(part.display && "block max-w-full")}
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(part.value, {
                displayMode: part.display,
                throwOnError: false,
                strict: false,
                trust: false,
                output: "htmlAndMathml",
              }),
            }}
          />
        ),
      )}
    </span>
  );
}
