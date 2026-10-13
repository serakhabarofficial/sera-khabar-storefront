import { createElement } from "react";

type SkewRevealProps = {
  as?: "h1" | "h2" | "span" | "b";
  className?: string;
  children: string;
  enabled?: boolean;
  delay?: number;
};

// Native text and whitespace stay accessible; split words, never Bangla characters.
// Words rest visibly in CSS until the page-entrance lifecycle starts the effect.
export default function SkewReveal({ as = "span", className, children, enabled = true, delay = 0 }: SkewRevealProps) {
  if (!enabled) return createElement(as, { className }, children);
  return createElement(as, { className, "data-skew-reveal": "", "data-skew-delay": delay || undefined },
    children.split(/(\s+)/).map((part, index) => /^\s*$/.test(part)
      ? part
      : createElement("span", { key: index, "data-skew-word": "" }, part)),
  );
}
