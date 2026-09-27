'use client';

import { useEffect, useId, useRef } from 'react';
import type { gsap as GSAP } from 'gsap';

type Context = ReturnType<typeof GSAP.context>;
type Tween = ReturnType<typeof GSAP.to>;


export function IvoryBloom({
  active,
  paused,
  expanded,
  onToggle,
}: {
  active: boolean;
  paused: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const id = useId().replaceAll(':', '');

  useEffect(() => {
    if (!active || paused || !root.current) return;
    let cancelled = false;
    let context: Context | undefined;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) return;
    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
      .then(([{ gsap }, { ScrollTrigger }]) => {
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);
        context = gsap.context(() => {
          gsap.fromTo(
            '.ivory-stem',
            { strokeDashoffset: 1 },
            {
              strokeDashoffset: 0,
              ease: 'none',
              scrollTrigger: {
                trigger: root.current,
                start: 'top 95%',
                end: 'center 52%',
                scrub: 0.5,
              },
            },
          );
          gsap.fromTo(
            '.ivory-bloom-flower',
            { y: 20, opacity: 0.45 },
            {
              y: 0,
              opacity: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: root.current,
                start: 'top 95%',
                end: 'center 55%',
                scrub: 0.5,
              },
            },
          );
        }, root.current!);
      })
      .catch(() => {
        /* Static illustration and the story button remain usable. */
      });
    const reduce = () => {
      if (media.matches) context?.revert();
    };
    media.addEventListener('change', reduce);
    return () => {
      cancelled = true;
      context?.revert();
      media.removeEventListener('change', reduce);
    };
  }, [active, paused]);

  useEffect(() => {
    if (!active || !root.current) return;
    let cancelled = false;
    let petals: Tween | undefined;
    let ring: Tween | undefined;
    void import('gsap')
      .then(({ gsap }) => {
        if (cancelled || !root.current) return;
        const quiet =
          paused ||
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        petals = gsap.to(root.current.querySelectorAll('.ivory-petal'), {
          rotation: (i: number) => (expanded ? (i - 2.5) * 27 : (i - 2.5) * 9),
          svgOrigin: '140 139',
          duration: quiet ? 0 : 1.15,
          stagger: quiet ? 0 : 0.055,
          ease: 'back.out(1.15)',
          overwrite: true,
        });
        ring = gsap.to(root.current.querySelector('.ivory-bloom-ring'), {
          scale: expanded ? 1.35 : 0.7,
          opacity: expanded ? 0.6 : 0,
          transformOrigin: '50% 50%',
          duration: quiet ? 0 : 1.25,
          ease: 'power2.out',
          overwrite: true,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      petals?.kill();
      ring?.kill();
    };
  }, [active, expanded, paused]);

  return (
    <div className="ivory-bloom" ref={root} data-expanded={expanded}>
      <button
        type="button"
        className="ivory-bloom-button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls="invitation-story-text"
        aria-label={
          expanded
            ? 'Zambağı kapat, hikâyeyi gizle'
            : 'Zambağı aç, hikâyemizi oku'
        }
      >
        <svg
          viewBox="0 0 280 275"
          className="ivory-bloom-art"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`${id}-petal`} x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#fffef8" />
              <stop offset=".55" stopColor="#eee0c8" />
              <stop offset="1" stopColor="#bb9463" />
            </linearGradient>
          </defs>
          <g
            fill="none"
            stroke="#987245"
            strokeWidth="1.1"
            strokeLinecap="round"
          >
            <path
              className="ivory-stem"
              pathLength="1"
              strokeDasharray="1"
              d="M140 251C133 219 158 202 140 139M143 227C117 226 91 213 83 187C113 185 134 201 143 227M146 208C171 208 191 190 197 164C169 169 150 184 146 208"
            />
            <path
              className="ivory-stem"
              pathLength="1"
              strokeDasharray="1"
              d="M140 239C163 248 185 239 193 221M139 233C117 244 95 237 88 224"
            />
          </g>
          <g className="ivory-bloom-flower">
            <circle
              className="ivory-bloom-ring"
              cx="140"
              cy="139"
              r="65"
              fill="none"
              stroke="#b78b50"
              strokeWidth=".6"
              opacity="0"
            />
            {Array.from({ length: 6 }, (_, i) => (
              <g
                key={i}
                className="ivory-petal"
                transform={`rotate(${(i - 2.5) * 9} 140 139)`}
              >
                <path
                  d="M140 139C94 117 112 70 140 39C168 70 186 117 140 139Z"
                  fill={`url(#${id}-petal)`}
                  stroke="#ac8659"
                  strokeWidth=".7"
                />
                <path
                  d="M140 132C133 104 143 79 140 49"
                  fill="none"
                  stroke="#fffef1"
                  strokeWidth="1.4"
                />
              </g>
            ))}
            <circle
              cx="140"
              cy="139"
              r="8"
              fill="#a67b43"
              stroke="#f9e9bc"
              strokeWidth="2"
            />
            <circle cx="138" cy="136" r="2" fill="#fff7d7" />
          </g>
        </svg>
        <small>
          {expanded ? 'BİRLİKTE AÇAN BİR HİKÂYE' : 'ZAMBAĞA DOKUNUN'}
        </small>
        <span>
          {expanded ? 'Hikâyemiz sizinle.' : 'Hikâyemiz çiçek açsın.'}
        </span>
      </button>
    </div>
  );
}
