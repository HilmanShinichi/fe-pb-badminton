import { useI18n } from "../../../i18n";

// GenderChip: L = male (sky), P = female (rose). Label translated.
export function GenderChip({ gender }: { gender: string }) {
  const { t } = useI18n();
  const isMale = gender.toUpperCase() === "L";
  return (
    <span
      title={isMale ? t("players.genderMale") : t("players.genderFemale")}
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-bold ${
        isMale
          ? "border-sky-300 bg-sky-100 text-sky-900"
          : "border-rose-300 bg-rose-100 text-rose-900"
      }`}
    >
      {isMale ? "♂" : "♀"} {gender.toUpperCase()}
    </span>
  );
}
