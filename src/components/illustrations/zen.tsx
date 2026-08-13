/**
 * The Sahadhyāna illustration language — hand-crafted SVG motifs.
 * Minimal, soft, slightly playful. Used sparingly across screens.
 */

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
};

export function LotusMark({ size = 44, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g transform="translate(50 58)">
        <path d="M0-34 C 11-18, 11-5, 0 12 C -11-5, -11-18, 0-34 Z" fill="#7fa06f" />
        <path d="M0-34 C 11-18, 11-5, 0 12 C -11-5, -11-18, 0-34 Z" fill="#a5bc98" transform="rotate(38)" />
        <path d="M0-34 C 11-18, 11-5, 0 12 C -11-5, -11-18, 0-34 Z" fill="#a5bc98" transform="rotate(-38)" />
        <path d="M0-34 C 11-18, 11-5, 0 12 C -11-5, -11-18, 0-34 Z" fill="#c9d7c0" transform="rotate(74)" />
        <path d="M0-34 C 11-18, 11-5, 0 12 C -11-5, -11-18, 0-34 Z" fill="#c9d7c0" transform="rotate(-74)" />
        <ellipse cx="0" cy="20" rx="38" ry="6" fill="#e4ebdf" />
        <circle cx="0" cy="-14" r="4" fill="#e2a8b6" />
      </g>
    </svg>
  );
}

export function SunMoon({ size = 64, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="38" cy="42" r="20" fill="#eedaa8" />
      <path d="M62 30 a18 18 0 1 0 8 32 a14 14 0 1 1 -8-32" fill="#99c5d5" />
      <g {...stroke} stroke="#d6ab4e" strokeWidth={4}>
        <path d="M38 12 v-6" /><path d="M38 72 v6" /><path d="M8 42 h-6" /><path d="M68 42 h6" opacity="0" />
      </g>
    </svg>
  );
}

export function CloudDrift({ size = 90, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 120 72" className={className} aria-hidden="true">
      <path
        d="M24 54 a14 14 0 0 1 4-27 a18 18 0 0 1 34-6 a15 15 0 0 1 24 8 a12 12 0 0 1 10 12 a11 11 0 0 1 -8 13 z"
        fill="#e4eff3"
      />
      <path d="M30 62 h60" {...stroke} stroke="#c5dfe8" />
    </svg>
  );
}

export function MountainRiver({ size = 110, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 140 86" className={className} aria-hidden="true">
      <path d="M8 66 L44 20 L66 52 L84 30 L132 66 Z" fill="#c9d7c0" />
      <path d="M44 20 L56 36 L48 36 Z" fill="#fbf8f1" />
      <path d="M84 30 L94 44 L86 44 Z" fill="#fbf8f1" />
      <path d="M4 74 q 18 -8 34 0 t 34 0 t 34 0 t 30 0" {...stroke} stroke="#99c5d5" />
    </svg>
  );
}

export function SittingFigure({ size = 80, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="26" r="10" fill="#d6ab4e" />
      <path d="M50 38 q -16 6 -18 24 q -12 2 -18 10 q 16 8 36 8 t 36-8 q -6-8 -18-10 q -2-18 -18-24" fill="#a5bc98" />
      <ellipse cx="50" cy="84" rx="34" ry="5" fill="#ece2cf" />
    </svg>
  );
}

export function BirdsCalm({ size = 70, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size * 0.5} viewBox="0 0 100 50" className={className} aria-hidden="true">
      <path d="M12 26 q 8 -10 16 0 q 8 -10 16 0" {...stroke} stroke="#5c5344" strokeWidth={3.5} />
      <path d="M56 14 q 6 -8 12 0 q 6 -8 12 0" {...stroke} stroke="#8a7f6c" strokeWidth={3} />
    </svg>
  );
}

export function LeafPair({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" className={className} aria-hidden="true">
      <path d="M30 52 V26" {...stroke} stroke="#5f8352" />
      <path d="M30 34 q -16 -2 -20 -18 q 18 -2 20 18" fill="#a5bc98" />
      <path d="M30 26 q 16 -2 20 -18 q -18 -2 -20 18" fill="#7fa06f" />
    </svg>
  );
}
