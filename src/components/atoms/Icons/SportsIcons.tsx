interface IconProps {
  className?: string;
  title?: string;
}

/**
 * Modern geometric vector icon for a badminton shuttlecock.
 */
export function IconShuttlecock({ className = "h-4 w-4", title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={!title}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      {/* Feather skirt */}
      <path d="M5 6h14l-3.5 9h-7L5 6z" />
      {/* Cork base */}
      <path d="M8.5 15a3.5 3.5 0 0 0 7 0" />
      {/* Vertical quill ribs */}
      <line x1="9" y1="6" x2="10" y2="15" />
      <line x1="15" y1="6" x2="14" y2="15" />
      {/* Horizontal ribbon band */}
      <line x1="6.5" y1="10.5" x2="17.5" y2="10.5" />
    </svg>
  );
}

/**
 * Modern sports referee whistle icon.
 */
export function IconWhistle({ className = "h-4 w-4", title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={!title}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      {/* Whistle mouthpiece */}
      <path d="M11 7h8a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-4.5" />
      {/* Sound bulb/resonator */}
      <circle cx="8.5" cy="14.5" r="4.5" />
      {/* Lanyard ring */}
      <circle cx="3" cy="14.5" r="1.5" />
      {/* Air slot */}
      <line x1="14" y1="7" x2="14" y2="10" />
    </svg>
  );
}

/**
 * Modern badminton court layout icon.
 */
export function IconCourt({ className = "h-4 w-4", title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={!title}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      {/* Outer court boundary */}
      <rect x="3" y="4" width="18" height="16" rx="2" />
      {/* Net / center divider */}
      <line x1="12" y1="4" x2="12" y2="20" />
      {/* Short service lines */}
      <line x1="8" y1="4" x2="8" y2="20" />
      <line x1="16" y1="4" x2="16" y2="20" />
      {/* Center line (halves) */}
      <line x1="3" y1="12" x2="8" y2="12" />
      <line x1="16" y1="12" x2="21" y2="12" />
    </svg>
  );
}

/**
 * Modern users / player pool icon.
 */
export function IconUsers({ className = "h-4 w-4", title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={!title}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/**
 * Modern athletic match swords/duel icon.
 */
export function IconSwords({ className = "h-4 w-4", title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={!title}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
      <polyline points="9.5 17.5 21 6 21 3 18 3 6.5 14.5" />
      <line x1="11" y1="19" x2="5" y2="13" />
      <line x1="8" y1="16" x2="4" y2="20" />
      <line x1="5" y1="21" x2="3" y2="19" />
    </svg>
  );
}

/**
 * Modern athletic stopwatch icon.
 */
export function IconStopwatch({ className = "h-4 w-4", title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={!title}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      <circle cx="12" cy="14" r="8" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="14" x2="12" y2="10" />
      <line x1="12" y1="14" x2="15" y2="14" />
      <line x1="19" y1="5" x2="17.5" y2="6.5" />
    </svg>
  );
}

/**
 * Modern play icon for match status / played counts.
 */
export function IconPlay({ className = "h-4 w-4", title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      className={className}
      aria-hidden={!title}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  );
}

/**
 * Modern round rotate / sync icon.
 */
export function IconRotate({ className = "h-4 w-4", title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={!title}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

/**
 * Modern globe icon for public live match link.
 */
export function IconGlobe({ className = "h-4 w-4", title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={!title}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

/**
 * Modern clock icon for late arrivals.
 */
export function IconClock({ className = "h-4 w-4", title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={!title}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

/**
 * Modern checkmark icon.
 */
export function IconCheck({ className = "h-4 w-4", title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={!title}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/**
 * Modern AI spark / processor icon.
 */
export function IconSparkles({ className = "h-4 w-4", title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={!title}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}
