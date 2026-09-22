import type { ReactNode } from "react";

export function Panel({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-gradient-to-r from-court/70 via-court/40 to-white px-4 py-3">
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}
