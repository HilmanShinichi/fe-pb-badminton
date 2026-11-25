import type { ReactNode } from "react";
import { useTheme } from "../../../theme";

export function Panel({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  const { theme } = useTheme();
  const isModern = theme === "modern";
  return (
    <section
      className={`overflow-hidden border border-line bg-white shadow-card ${
        isModern ? "rounded-[22px]" : "rounded-xl"
      }`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 ${
          isModern ? "bg-white py-3.5" : "bg-gradient-to-r from-court/70 via-court/40 to-white"
        }`}
      >
        <h2 className={`font-bold text-ink ${isModern ? "text-base" : "text-sm"}`}>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}
