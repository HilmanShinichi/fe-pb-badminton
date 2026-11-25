import type { ReactNode } from "react";
import { useTheme } from "../../../theme";

export function PageHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  const { theme } = useTheme();
  const isModern = theme === "modern";
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className={`font-bold tracking-tight text-ink ${isModern ? "text-2xl" : "text-xl"}`}>{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-ink-soft">{sub}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}
