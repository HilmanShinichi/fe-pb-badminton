export function IconCrown3D({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <img
      src="/assets/crown-3d.png"
      alt="Mahkota 3D"
      className={`${className} object-contain select-none pointer-events-none drop-shadow-md`}
    />
  );
}

export function IconMedalSilver3D({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <img
      src="/assets/medal-silver-3d.png"
      alt="Medali Perak 3D"
      className={`${className} object-contain select-none pointer-events-none drop-shadow-sm`}
    />
  );
}

export function IconMedalBronze3D({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <img
      src="/assets/medal-bronze-3d.png"
      alt="Medali Perunggu 3D"
      className={`${className} object-contain select-none pointer-events-none drop-shadow-sm`}
    />
  );
}

export function getPlayerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
