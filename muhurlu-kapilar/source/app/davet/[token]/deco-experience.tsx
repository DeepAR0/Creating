'use client';

import { useId, useRef } from 'react';
import { playTouch } from '@/lib/door-sounds';
import { storyTouchCopy, type StoryTouchProps } from './story-touch-copy';

/* Kadeh (Pera Deco). İki şampanya kadehi ayrı durur; dokununca birbirine
   eğilir ve tokuşur: temas noktasında pirinç bir ışıltı, kadehlerde
   yükselen kabarcıklar. Hareket CSS geçişleriyle çalışır. */

function Coupe({ id, side }: { id: string; side: 'left' | 'right' }) {
  return (
    <g className={`deco-coupe is-${side}`}>
      <path className="deco-coupe-liquid" d="M-33 -46 Q0 -20 33 -46 Q20 -30 0 -28 Q-20 -30 -33 -46Z" fill={`url(#${id}-gold)`} />
      <path className="deco-coupe-glass" d="M-38 -52 Q0 -14 38 -52 M-38 -52 L38 -52 M0 -26 L0 22 M-20 26 Q0 18 20 26 Q0 31 -20 26Z" />
      <g className="deco-coupe-bubbles">
        {[-16, -6, 5, 14, -10, 9].map((x, i) => (
          <circle key={i} cx={x} cy={-33 - (i % 3) * 3} r={0.9 + (i % 3) * 0.4} style={{ animationDelay: `${i * 0.23}s` }} />
        ))}
      </g>
    </g>
  );
}

export function ChampagneToast({ expanded, onToggle, sounds = false, lang = 'tr' }: StoryTouchProps) {
  const id = useId().replaceAll(':', '');
  const text = storyTouchCopy[lang].deco;
  const timer = useRef(0);
  return (
    <div className="deco-toast" data-expanded={expanded}>
      <button
        type="button"
        className="story-touch-button"
        onClick={() => {
          window.clearTimeout(timer.current);
          // Tokuşma, kadehler birbirine değdiği an duyulur.
          if (!expanded && sounds) timer.current = window.setTimeout(() => playTouch('deco'), 520);
          onToggle();
        }}
        aria-expanded={expanded}
        aria-controls="invitation-story-text"
        aria-label={expanded ? text.labelClose : text.labelOpen}
      >
        <svg viewBox="0 0 280 190" className="deco-toast-art" aria-hidden="true">
          <defs>
            <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#f6dc98" />
              <stop offset="1" stopColor="#c9983f" />
            </linearGradient>
          </defs>
          <g className="deco-toast-rays">
            {Array.from({ length: 9 }, (_, i) => {
              const a = (-90 + (i - 4) * 18) * (Math.PI / 180);
              return (
                <line
                  key={i}
                  x1={140 + Math.cos(a) * 14}
                  y1={80 + Math.sin(a) * 14}
                  x2={140 + Math.cos(a) * (i % 2 ? 26 : 36)}
                  y2={80 + Math.sin(a) * (i % 2 ? 26 : 36)}
                />
              );
            })}
          </g>
          <g transform="translate(84 132)">
            <Coupe id={id} side="left" />
          </g>
          <g transform="translate(196 132)">
            <Coupe id={id} side="right" />
          </g>
          <path className="deco-toast-base" d="M52 172H228M72 178H208" />
        </svg>
        <small>{expanded ? text.kickerOpen : text.kicker}</small>
        <span>{expanded ? text.lineOpen : text.line}</span>
      </button>
    </div>
  );
}
