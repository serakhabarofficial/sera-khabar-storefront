import { Fragment, type ReactNode } from "react";

const BANGLA_DIGITS = "০১২৩৪৫৬৭৮৯";

export function toBanglaDigits(value: number | string) {
  return String(value).replace(/\d/g, (digit) => BANGLA_DIGITS[Number(digit)]);
}

// The approved homepage sets every digit in Atma, even inside Bangla text.
// Wraps each run of digits (Latin or Bangla) in <span class="num">, converted to Bangla.
export function withAtmaDigits(text: string): ReactNode {
  return text.split(/([0-9০-৯][0-9০-৯,]*)/).map((part, index) =>
    index % 2 === 1 ? (
      <span key={index} className="num">
        {toBanglaDigits(part)}
      </span>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

export function BanglaNumber({ value }: { value: number | string }) {
  return <span className="num">{toBanglaDigits(value)}</span>;
}
