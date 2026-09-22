import { useI18n } from "../../../i18n";

export function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { isId } = useI18n();
  return (
    <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
      {message}{" "}
      <button type="button" className="font-semibold underline" onClick={onRetry}>
        {isId ? "Coba lagi" : "Retry"}
      </button>
    </div>
  );
}
