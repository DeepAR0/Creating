import type { JSX } from 'preact';

// Hafif SVG ikon seti (tümü 24x24)
type P = { size?: number; class?: string; style?: JSX.CSSProperties };

function S(props: P & { children: JSX.Element | JSX.Element[] }) {
  const s = props.size ?? 22;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" class={props.class} style={props.style} aria-hidden="true">
      {props.children}
    </svg>
  );
}

export const Coin = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="10" fill="#f5b82e" />
    <circle cx="12" cy="12" r="7.6" fill="#ffd862" stroke="#d99a16" stroke-width="1.2" />
    <path d="M12 7.5v9M9.6 9.6c.4-1 1.3-1.5 2.4-1.5 1.4 0 2.3.7 2.3 1.7 0 2.4-4.8 1.3-4.8 3.9 0 1 1 1.8 2.5 1.8 1.2 0 2.1-.5 2.5-1.5" stroke="#b77a0b" stroke-width="1.5" fill="none" stroke-linecap="round" />
  </S>
);

export const Pearl = (p: P) => (
  <S {...p}>
    <defs>
      <radialGradient id="pg" cx="38%" cy="32%" r="70%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="55%" stop-color="#f1e9ff" />
        <stop offset="100%" stop-color="#b9a4e8" />
      </radialGradient>
    </defs>
    <circle cx="12" cy="12" r="9.5" fill="url(#pg)" stroke="#a28bdc" stroke-width="0.8" />
    <ellipse cx="9" cy="8.5" rx="2.6" ry="1.6" fill="#fff" opacity="0.9" />
  </S>
);

export const Star = (p: P) => (
  <S {...p}>
    <path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="#7ee0ff" stroke="#2aa7d6" stroke-width="1" stroke-linejoin="round" />
  </S>
);

const stroke = { fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' as const, 'stroke-linejoin': 'round' as const };

export const Hand = (p: P) => (
  <S {...p}>
    <path {...stroke} d="M8 12V5.5a1.5 1.5 0 013 0V11m0-4.5a1.5 1.5 0 013 0V11m0-3a1.5 1.5 0 013 0v6.5c0 3.6-2.6 6.5-6 6.5-2.4 0-4-1-5.3-3L3.6 14c-.6-1 .6-2.3 1.7-1.6L8 14.5" />
  </S>
);

export const Food = (p: P) => (
  <S {...p}>
    <path d="M6 7h12l-1.4 12.2a2 2 0 01-2 1.8H9.4a2 2 0 01-2-1.8z" fill="#f59e0b" stroke="#b45309" stroke-width="1.3" />
    <rect x="5" y="4" width="14" height="3.4" rx="1.2" fill="#ef4444" stroke="#b91c1c" stroke-width="1.2" />
    <circle cx="10" cy="12" r="1.2" fill="#fde68a" />
    <circle cx="13.5" cy="14.5" r="1.2" fill="#fde68a" />
    <circle cx="11" cy="17" r="1" fill="#fde68a" />
  </S>
);

export const Sponge = (p: P) => (
  <S {...p}>
    <rect x="3" y="7" width="18" height="7" rx="2" fill="#facc15" stroke="#a16207" stroke-width="1.2" />
    <rect x="3" y="13" width="18" height="4" rx="1.5" fill="#22c55e" stroke="#15803d" stroke-width="1.2" />
    <circle cx="8" cy="10" r="0.9" fill="#a16207" />
    <circle cx="12" cy="9.5" r="0.9" fill="#a16207" />
    <circle cx="16" cy="10.5" r="0.9" fill="#a16207" />
  </S>
);

export const Vacuum = (p: P) => (
  <S {...p}>
    <path d="M9 2v11" stroke="#bae6fd" stroke-width="3.5" stroke-linecap="round" />
    <path d="M6.5 13h5l1.5 8h-8z" fill="#7dd3fc" stroke="#0369a1" stroke-width="1.2" stroke-linejoin="round" />
    <path d="M15 18c1.5-1 3-1 4.5 0M16 21c1-.6 2-.6 3 0" stroke="#a16207" stroke-width="1.4" fill="none" stroke-linecap="round" />
  </S>
);

export const Castle = (p: P) => (
  <S {...p}>
    <path d="M4 21V10h3V7h2v3h2V5h2v5h2V7h2v3h3v11z" fill="#94a3b8" stroke="#475569" stroke-width="1.2" stroke-linejoin="round" />
    <path d="M10 21v-4a2 2 0 014 0v4z" fill="#1e293b" />
    <path d="M12 2l2 3h-4z" fill="#ef4444" />
  </S>
);

export const Bag = (p: P) => (
  <S {...p}>
    <path d="M5 8h14l-1 13H6z" fill="#fb7185" stroke="#be123c" stroke-width="1.3" stroke-linejoin="round" />
    <path d="M9 8V6.5a3 3 0 016 0V8" fill="none" stroke="#be123c" stroke-width="1.6" stroke-linecap="round" />
    <path d="M8.5 13.5c1.2 1 2.4 1 3.5 0 1.1 1 2.3 1 3.5 0" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" />
  </S>
);

export const FishI = (p: P) => (
  <S {...p}>
    <path d="M3 12c3-5 9-6.5 13-3l3.5-3v12L16 15c-4 3.5-10 2-13-3z" fill="#fb923c" stroke="#c2410c" stroke-width="1.2" stroke-linejoin="round" />
    <circle cx="7.5" cy="11" r="1.2" fill="#1f2937" />
  </S>
);

export const Heart = (p: P) => (
  <S {...p}>
    <path d="M12 20s-7.5-4.6-9.2-9.2C1.6 7.5 3.8 4.5 7 4.5c2 0 3.5 1.2 5 3 1.5-1.8 3-3 5-3 3.2 0 5.4 3 4.2 6.3C19.5 15.4 12 20 12 20z" fill="#f472b6" stroke="#be185d" stroke-width="1.2" />
  </S>
);

export const Scroll = (p: P) => (
  <S {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2.5" fill="#fef3c7" stroke="#b45309" stroke-width="1.3" />
    <path d="M8.5 8h7M8.5 12h7M8.5 16h4.5" stroke="#b45309" stroke-width="1.5" stroke-linecap="round" />
  </S>
);

export const Tank = (p: P) => (
  <S {...p}>
    <rect x="3" y="6" width="18" height="12" rx="1.5" fill="#38bdf8" stroke="#0c4a6e" stroke-width="1.3" />
    <path d="M3 9h18" stroke="#e0f2fe" stroke-width="1.2" />
    <path d="M5 18c1-3 2-4 3-4s2 1 3 4M13 18c.7-2 1.5-3 2.5-3s1.8 1 2.5 3" fill="#16a34a" />
    <rect x="2" y="4" width="20" height="2.4" rx="1" fill="#1e293b" />
  </S>
);

export const Book = (p: P) => (
  <S {...p}>
    <path d="M4 5.5A2.5 2.5 0 016.5 3H20v16H6.5A2.5 2.5 0 004 21.5z" fill="#34d399" stroke="#047857" stroke-width="1.3" stroke-linejoin="round" />
    <path d="M4 21.5A2.5 2.5 0 016.5 19H20" fill="none" stroke="#047857" stroke-width="1.3" />
    <path d="M9 8h7M9 11h5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" />
  </S>
);

export const Gear = (p: P) => (
  <S {...p}>
    <path {...stroke} d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
    <path {...stroke} d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" />
  </S>
);

export const Close = (p: P) => (
  <S {...p}>
    <path {...stroke} d="M6 6l12 12M18 6L6 18" />
  </S>
);

export const Plus = (p: P) => (
  <S {...p}>
    <path {...stroke} stroke-width={3} d="M12 5v14M5 12h14" />
  </S>
);

export const Drop = (p: P) => (
  <S {...p}>
    <path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z" fill="#38bdf8" stroke="#0369a1" stroke-width="1.2" />
    <path d="M9.5 14.5a2.5 2.5 0 002.5 2.5" stroke="#e0f2fe" stroke-width="1.4" fill="none" stroke-linecap="round" />
  </S>
);

export const Bubbles = (p: P) => (
  <S {...p}>
    <circle cx="9" cy="15" r="5" fill="#bae6fd" stroke="#0284c7" stroke-width="1.2" />
    <circle cx="16.5" cy="8" r="3.5" fill="#bae6fd" stroke="#0284c7" stroke-width="1.2" />
    <circle cx="17.5" cy="16.5" r="2" fill="#bae6fd" stroke="#0284c7" stroke-width="1.2" />
    <circle cx="7.5" cy="13.5" r="1.3" fill="#fff" />
  </S>
);

export const Thermo = (p: P) => (
  <S {...p}>
    <path d="M10 4a2 2 0 014 0v9.3a4 4 0 11-4 0z" fill="#fff" stroke="#b91c1c" stroke-width="1.3" />
    <path d="M12 9v7" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" />
    <circle cx="12" cy="17" r="2.2" fill="#ef4444" />
  </S>
);

export const Leaf = (p: P) => (
  <S {...p}>
    <path d="M4 20c0-9 6-15 16-16-1 10-7 16-16 16z" fill="#65a30d" stroke="#3f6212" stroke-width="1.2" />
    <path d="M4 20c4-5 8-9 12-12" stroke="#d9f99d" stroke-width="1.3" fill="none" stroke-linecap="round" />
  </S>
);

export const Bulb = (p: P) => (
  <S {...p}>
    <path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0012 3z" fill="#fde047" stroke="#a16207" stroke-width="1.3" stroke-linejoin="round" />
  </S>
);

export const Lock = (p: P) => (
  <S {...p}>
    <rect x="5" y="10" width="14" height="11" rx="2" fill="#64748b" stroke="#334155" stroke-width="1.2" />
    <path d="M8 10V7a4 4 0 018 0v3" fill="none" stroke="#334155" stroke-width="2" />
  </S>
);

export const Play = (p: P) => (
  <S {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="3" fill="#7c3aed" stroke="#4c1d95" stroke-width="1.2" />
    <path d="M10 9l5 3-5 3z" fill="#fff" />
  </S>
);

export const Gift = (p: P) => (
  <S {...p}>
    <rect x="3.5" y="9" width="17" height="12" rx="1.5" fill="#f43f5e" stroke="#9f1239" stroke-width="1.2" />
    <rect x="2.5" y="7" width="19" height="4" rx="1" fill="#fb7185" stroke="#9f1239" stroke-width="1.2" />
    <path d="M12 7v14" stroke="#fde047" stroke-width="2.4" />
    <path d="M12 7c-2-4-6-3-4.5-.5C8.4 8 12 7 12 7zm0 0c2-4 6-3 4.5-.5C15.6 8 12 7 12 7z" fill="#fde047" stroke="#a16207" stroke-width="1" />
  </S>
);

export const Crown = (p: P) => (
  <S {...p}>
    <path d="M3 18l1.5-10 4.5 4 3-6 3 6 4.5-4L21 18z" fill="#fbbf24" stroke="#92400e" stroke-width="1.2" stroke-linejoin="round" />
    <rect x="3" y="18" width="18" height="3" rx="1" fill="#f59e0b" stroke="#92400e" stroke-width="1.2" />
  </S>
);

export const Egg = (p: P) => (
  <S {...p}>
    <path d="M12 2.5c3.8 0 7 6.5 7 11a7 7 0 01-14 0c0-4.5 3.2-11 7-11z" fill="#fef9c3" stroke="#a16207" stroke-width="1.2" />
    <circle cx="9" cy="12" r="1.4" fill="#f472b6" />
    <circle cx="14.5" cy="9.5" r="1.1" fill="#60a5fa" />
    <circle cx="13.5" cy="15.5" r="1.5" fill="#34d399" />
  </S>
);

export const Pill = (p: P) => (
  <S {...p}>
    <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-35 12 12)" fill="#f87171" stroke="#991b1b" stroke-width="1.2" />
    <path d="M9.3 16.2l5.3-7.6" stroke="#fff" stroke-width="1.6" />
  </S>
);

export const Flip = (p: P) => (
  <S {...p}>
    <path {...stroke} d="M12 3v18M8 7l-4 5 4 5zM16 7l4 5-4 5z" />
  </S>
);

export const Box = (p: P) => (
  <S {...p}>
    <path d="M3 8l9-4.5L21 8v9l-9 4.5L3 17z" fill="#d6a86b" stroke="#7c4a14" stroke-width="1.2" stroke-linejoin="round" />
    <path d="M3 8l9 4.5L21 8M12 12.5V21" fill="none" stroke="#7c4a14" stroke-width="1.2" />
  </S>
);

export const Scissors = (p: P) => (
  <S {...p}>
    <circle cx="6.5" cy="17.5" r="2.8" fill="none" stroke="currentColor" stroke-width="2" />
    <circle cx="17.5" cy="17.5" r="2.8" fill="none" stroke="currentColor" stroke-width="2" />
    <path {...stroke} d="M8.5 15.5L18 4M15.5 15.5L6 4" />
  </S>
);

export const Check = (p: P) => (
  <S {...p}>
    <path {...stroke} stroke-width={3} d="M5 12.5l4.5 4.5L19 7" />
  </S>
);

export const Cross = (p: P) => (
  <S {...p}>
    <path {...stroke} stroke-width={3} d="M7 7l10 10M17 7L7 17" />
  </S>
);

export const Sparkle = (p: P) => (
  <S {...p}>
    <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" fill="#fde047" stroke="#ca8a04" stroke-width="1" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" fill="#fde047" />
  </S>
);

export const StarFav = (p: P & { on?: boolean }) => (
  <S {...p}>
    <path d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3L2.8 9.5l6.4-.9z" fill={p.on ? '#fbbf24' : 'none'} stroke={p.on ? '#b45309' : 'currentColor'} stroke-width="1.6" stroke-linejoin="round" />
  </S>
);

export const Arrow = (p: P & { dir?: 'left' | 'right' }) => (
  <S {...p}>
    <path {...stroke} stroke-width={2.6} d={p.dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
  </S>
);

export const Moon = (p: P) => (
  <S {...p}>
    <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" fill="#c7d2fe" stroke="#4338ca" stroke-width="1.2" />
  </S>
);

export const Camera = (p: P) => (
  <S {...p}>
    <path d="M4 8.5A2.5 2.5 0 016.5 6h1.6l1.3-2h5.2l1.3 2h1.6A2.5 2.5 0 0120 8.5v8a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 16.5z" fill="#94a3b8" stroke="#334155" stroke-width="1.2" />
    <circle cx="12" cy="12.4" r="4" fill="#1e293b" stroke="#e2e8f0" stroke-width="1.4" />
    <circle cx="10.8" cy="11.2" r="1.1" fill="#7dd3fc" />
    <circle cx="17.2" cy="8.8" r="0.8" fill="#fde047" />
  </S>
);

export const Trophy = (p: P) => (
  <S {...p}>
    <path d="M7 4h10v4.5a5 5 0 01-10 0z" fill="#fbbf24" stroke="#b45309" stroke-width="1.2" />
    <path d="M7 5.5H4.5a3 3 0 003 3.6M17 5.5h2.5a3 3 0 01-3 3.6" fill="none" stroke="#b45309" stroke-width="1.3" />
    <path d="M10.5 13.2h3l.6 3.3h-4.2z" fill="#f59e0b" />
    <rect x="8" y="16.5" width="8" height="3" rx="1" fill="#92400e" />
  </S>
);
