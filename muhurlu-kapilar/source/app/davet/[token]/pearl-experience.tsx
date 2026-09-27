'use client';

import { useId, type CSSProperties } from 'react';
import { playTouch } from '@/lib/door-sounds';
import { storyTouchCopy, type StoryTouchProps } from './story-touch-copy';

/* Sedef yıldız (Sedef Kakma). Sekiz köşeli Selçuklu yıldızının sekiz
   parçası (sedef ve ceviz sırayla) dağınık durur; dokununca yerlerine
   uçar, çıtalar birleşir, sedefin üzerinden bir ışık geçer ve göbekte
   küçük bir yıldız açar. Hareket CSS geçişleriyle çalışır. */

const C = 140;
const R = 100;
const r = R * 0.765;
const point = (deg: number, radius: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(C + Math.cos(a) * radius).toFixed(2)} ${(C + Math.sin(a) * radius).toFixed(2)}`;
};
const PIECES = Array.from({ length: 8 }, (_, k) => {
  const deg = -90 + k * 45;
  const out = 44 + (k % 3) * 12;
  const a = (deg * Math.PI) / 180;
  return {
    d: `M${C} ${C}L${point(deg - 22.5, r)}L${point(deg, R)}L${point(deg + 22.5, r)}Z`,
    dx: Math.cos(a) * out,
    dy: Math.sin(a) * out,
    rot: (k % 2 ? 1 : -1) * (18 + (k % 3) * 9),
    pearl: k % 2 === 0,
  };
});
const STAR = Array.from({ length: 16 }, (_, k) => point(-90 + k * 22.5, k % 2 ? r : R)).join('L');
const CORE = Array.from({ length: 16 }, (_, k) => point(-90 + k * 22.5, k % 2 ? 13 : 21)).join('L');

export function PearlStar({ expanded, onToggle, sounds = false, lang = 'tr' }: StoryTouchProps) {
  const id = useId().replaceAll(':', '');
  const text = storyTouchCopy[lang].pearl;
  return (
    <div className="pearl-star" data-expanded={expanded}>
      <button
        type="button"
        className="story-touch-button"
        onClick={() => {
          if (!expanded && sounds) playTouch('pearl');
          onToggle();
        }}
        aria-expanded={expanded}
        aria-controls="invitation-story-text"
        aria-label={expanded ? text.labelClose : text.labelOpen}
      >
        <svg viewBox="0 0 280 280" className="pearl-star-art" aria-hidden="true">
          <defs>
            <linearGradient id={`${id}-pearl`} x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#fbf8f1" />
              <stop offset=".32" stopColor="#efe4ee" />
              <stop offset=".58" stopColor="#e3f0ea" />
              <stop offset=".82" stopColor="#f6eadb" />
              <stop offset="1" stopColor="#d4c9b8" />
            </linearGradient>
            <linearGradient id={`${id}-walnut`} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#7a4d2c" />
              <stop offset="1" stopColor="#3b2314" />
            </linearGradient>
            <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0">
              <stop stopColor="#fff" stopOpacity="0" />
              <stop offset=".5" stopColor="#fff" stopOpacity=".75" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <clipPath id={`${id}-clip`}>
              <path d={`M${STAR}Z`} />
            </clipPath>
          </defs>
          <g className="pearl-star-dots">
            {Array.from({ length: 24 }, (_, i) => {
              const a = (i / 24) * Math.PI * 2;
              return <circle key={i} cx={C + Math.cos(a) * 122} cy={C + Math.sin(a) * 122} r="2.1" />;
            })}
          </g>
          {PIECES.map((p, k) => (
            <path
              key={k}
              className="pearl-piece"
              d={p.d}
              fill={`url(#${id}-${p.pearl ? 'pearl' : 'walnut'})`}
              style={
                {
                  '--dx': `${p.dx}px`,
                  '--dy': `${p.dy}px`,
                  '--rot': `${p.rot}deg`,
                  '--i': k,
                } as CSSProperties
              }
            />
          ))}
          <path className="pearl-star-lath" d={`M${STAR}Z`} />
          <g clipPath={`url(#${id}-clip)`}>
            <rect className="pearl-star-sheen" x="-60" y="20" width="90" height="240" fill={`url(#${id}-sheen)`} />
          </g>
          <path className="pearl-star-core" d={`M${CORE}Z`} fill={`url(#${id}-pearl)`} />
          <circle className="pearl-star-core" cx={C} cy={C} r="4" fill="#7c5a36" />
        </svg>
        <small>{expanded ? text.kickerOpen : text.kicker}</small>
        <span>{expanded ? text.lineOpen : text.line}</span>
      </button>
    </div>
  );
}
