import { useState } from "react";

function formatGrouped(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Math.trunc(n).toLocaleString("id-ID");
}

function formatDigits(digits: string): string {
  const d = digits.replace(/^0+(?=\d)/, "");
  if (d === "") return "";
  return Number(d).toLocaleString("id-ID");
}

// MoneyInput formats live while typing (90000 → 90.000). The DOM value and
// cursor are updated synchronously inside onChange, so fast typing can never
// race a re-render and scramble digits.
export function MoneyInput({
  id,
  value,
  onChange,
  min = 0,
}: {
  id?: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
}) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState("");

  function cursorAfter(formatted: string, digitCount: number): number {
    let seen = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) seen++;
      if (seen === digitCount) return i + 1;
    }
    return formatted.length;
  }

  return (
    <input
      id={id}
      className="w-full tabular-nums"
      inputMode="numeric"
      autoComplete="off"
      value={focused ? text : formatGrouped(value)}
      onFocus={() => {
        setText(value ? formatGrouped(value) : "");
        setFocused(true);
      }}
      onChange={(e) => {
        const el = e.target;
        const raw = el.value;
        const cursor = el.selectionStart ?? raw.length;
        const prevDigits = text.replace(/[^0-9]/g, "");
        let digits = raw.replace(/[^0-9]/g, "");
        let digitCursor = raw.slice(0, cursor).replace(/[^0-9]/g, "").length;
        if (digits === prevDigits && raw.length < text.length) {
          // Backspace landed on a separator: delete the digit before it.
          digits = digits.slice(0, Math.max(0, digitCursor - 1)) + digits.slice(digitCursor);
          digitCursor = Math.max(0, digitCursor - 1);
        }
        digits = digits.replace(/^0+(?=\d)/, "");
        const formatted = formatDigits(digits);
        el.value = formatted;
        try {
          const pos = cursorAfter(formatted, Math.min(digitCursor, digits.length));
          el.setSelectionRange(pos, pos);
        } catch {
          /* ignore */
        }
        setText(formatted);
        onChange(Math.max(min, Number(digits) || 0));
      }}
      onBlur={() => setFocused(false)}
    />
  );
}
