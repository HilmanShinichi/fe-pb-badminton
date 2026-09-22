import type { ReactNode } from "react";

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-sm text-ink-soft">{text}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
