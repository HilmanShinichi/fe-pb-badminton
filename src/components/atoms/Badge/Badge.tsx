import { useI18n } from "../../../i18n";
import { statusClass, statusLabel } from "../../../format";

export function Badge({ status }: { status: string }) {
  const { lang } = useI18n();
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide shadow-2xs ${statusClass(status)}`}>
      {statusLabel(status, lang)}
    </span>
  );
}
