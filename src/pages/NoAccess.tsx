import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { homeFor } from "../permissions";

export function NoAccessPage() {
  const { auth, logout } = useAuth();
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-md p-8 text-center">
      <p className="text-4xl" aria-hidden>
        🔒
      </p>
      <h1 className="mt-3 text-lg font-black text-ink">{t("usersAdmin.noAccessTitle")}</h1>
      <p className="mt-1 text-sm text-ink-soft">{t("usersAdmin.noAccessBody", { name: auth?.username ?? "" })}</p>
      <div className="mt-5 flex items-center justify-center gap-2">
        <Link
          to={homeFor(auth?.permissions ?? [], auth?.isSuperadmin ?? false)}
          className="rounded-xl bg-pine px-4 py-2 text-sm font-bold text-white hover:brightness-110"
        >
          {t("usersAdmin.noAccessHome")}
        </Link>
        <button
          type="button"
          onClick={logout}
          className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold text-ink hover:bg-court/60"
        >
          {t("nav.logout")}
        </button>
      </div>
    </div>
  );
}
