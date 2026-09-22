import { useI18n } from "../../../i18n";

export function Loading({ text }: { text?: string }) {
  const { isId } = useI18n();
  const displayText = text ?? (isId ? "Memuat…" : "Loading…");
  return (
    <p role="status" className="py-6 text-center text-sm text-ink-soft">
      {displayText}
    </p>
  );
}
