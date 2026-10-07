export const FEATURE_PERMS = [
  "dashboard",
  "mabar",
  "matchmaker",
  "periods",
  "players",
  "inventory",
  "finance",
  "reports",
  "simulator",
] as const;

export type FeaturePerm = (typeof FEATURE_PERMS)[number];

// Route order for landing after login and for denied-route fallback.
// no-shows shares the reports permission.
const ORDER: Array<{ perm: string; to: string }> = [
  { perm: "dashboard", to: "/dashboard" },
  { perm: "mabar", to: "/mabar" },
  { perm: "matchmaker", to: "/match-maker" },
  { perm: "periods", to: "/periods" },
  { perm: "players", to: "/players" },
  { perm: "inventory", to: "/inventory" },
  { perm: "finance", to: "/finance" },
  { perm: "reports", to: "/reports" },
  { perm: "simulator", to: "/simulator" },
];

export function canAccess(perms: string[] | undefined, isSuperadmin: boolean | undefined, perm: string): boolean {
  if (isSuperadmin) return true;
  return (perms ?? []).includes(perm);
}

export function homeFor(perms: string[] | undefined, isSuperadmin: boolean | undefined): string {
  if (isSuperadmin) return "/dashboard";
  for (const o of ORDER) {
    if ((perms ?? []).includes(o.perm)) return o.to;
  }
  return "/no-access";
}
