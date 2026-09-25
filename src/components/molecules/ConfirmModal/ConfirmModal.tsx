import { useEffect, type ReactNode } from "react";
import { useI18n } from "../../../i18n";
import { Btn } from "../../atoms/Button";

export function ConfirmModal({
  title,
  body,
  confirmLabel,
  cancelLabel,
  busy,
  busyLabel,
  confirmVariant = "danger",
  onConfirm,
  onCancel,
}: {
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  busyLabel?: string;
  confirmVariant?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { isId } = useI18n();
  const cLabel = confirmLabel ?? (isId ? "Ya, hapus" : "Yes, delete");
  const cancelText = cancelLabel ?? (isId ? "Batal" : "No, keep it");
  const deletingText = busyLabel ?? (isId ? "Menghapus…" : "Deleting…");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-ink/50" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-xl border border-line bg-white p-4 shadow-card">
        <h2 className="text-base font-bold">{title}</h2>
        <div className="mt-2 text-sm text-ink-soft">{body}</div>
        <div className="mt-4 flex justify-end gap-2">
          <Btn variant="plain" disabled={busy} onClick={onCancel}>
            {cancelText}
          </Btn>
          <Btn variant={confirmVariant} disabled={busy} onClick={onConfirm}>
            {busy ? deletingText : cLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}
