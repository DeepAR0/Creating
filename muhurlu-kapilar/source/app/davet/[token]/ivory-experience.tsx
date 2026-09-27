'use client';

import { useEffect, useId, useRef } from 'react';
import type { gsap as GSAP } from 'gsap';
import { playTouch } from '@/lib/door-sounds';
import { storyTouchCopy, type StoryTouchProps } from './story-touch-copy';

type Context = ReturnType<typeof GSAP.context>;
type Timeline = ReturnType<typeof GSAP.timeline>;

/* Fildişi zambak. Kaydırdıkça sap çizilir ve çiçek yükselir; dokununca
   dış taç yapraklar açılır, iç yapraklar kabarır, başçıklar uzar ve
   altın polen savrulur. Aynı düğme hikâye metnini açıp kapatır. */

const POLLEN = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2 + (i % 3) * 0.21;
  const reach = 58 + ((i * 37) % 48);
  return { dx: Math.cos(angle) * reach, dy: Math.sin(angle) * reach - 18, r: 1.1 + (i % 4) * 0.35 };
});

export function IvoryBloom({ active, paused, expanded, onToggle, sounds = false, lang = 'tr' }: StoryTouchProps) {
  const root = useRef<HTMLDivElement>(null);
  const id = useId().replaceAll(':', '');
  const text = storyTouchCopy[lang].ivory;
  const first = useRef(true);

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
        /* Durağan çizim ve hikâye düğmesi yine çalışır. */
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
    let timeline: Timeline | undefined;
    const initial = first.current;
    first.current = false;
    void import('gsap')
      .then(({ gsap }) => {
        const el = root.current;
        if (cancelled || !el) return;
        const quiet = paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches || initial;
        const d = (value: number) => (quiet ? 0 : value);
        const petals = el.querySelectorAll('.ivory-petal');
        const inner = el.querySelectorAll('.ivory-petal-inner');
        const stamens = el.querySelectorAll('.ivory-stamen');
        const pollen = el.querySelectorAll<SVGCircleElement>('.ivory-pollen circle');
        timeline = gsap.timeline();
        timeline
          .to(
            petals,
            {
              rotation: (i: number) => (expanded ? (i - 2.5) * 27 : (i - 2.5) * 9),
              svgOrigin: '140 139',
              duration: d(1.15),
              stagger: d(0.055),
              ease: 'back.out(1.15)',
              overwrite: true,
            },
            0,
          )
          .to(
            inner,
            {
              rotation: (i: number) => (expanded ? (i - 1) * 21 : (i - 1) * 7),
              scale: expanded ? 1.1 : 0.88,
              svgOrigin: '140 139',
              duration: d(1.2),
              stagger: d(0.07),
              ease: 'back.out(1.3)',
              overwrite: true,
            },
            d(0.12),
          )
          .to(
            stamens,
            {
              scale: expanded ? 1 : 0.15,
              opacity: expanded ? 1 : 0,
              svgOrigin: '140 139',
              duration: d(0.8),
              stagger: d(0.04),
              ease: 'power2.out',
              overwrite: true,
            },
            d(0.35),
          )
          .to(
            el.querySelector('.ivory-bloom-ring'),
            {
              scale: expanded ? 1.35 : 0.7,
              opacity: expanded ? 0.6 : 0,
              transformOrigin: '50% 50%',
              duration: d(1.25),
              ease: 'power2.out',
              overwrite: true,
            },
            0,
          );
        if (expanded && !quiet) {
          // Polen: merkezden savrulup ışıkta söner.
          timeline.fromTo(
            pollen,
            { attr: { cx: 140, cy: 139 }, opacity: 0 },
            {
              attr: { cx: (i: number) => 140 + POLLEN[i].dx, cy: (i: number) => 139 + POLLEN[i].dy },
              opacity: 1,
              duration: 1.1,
              stagger: 0.025,
              ease: 'power3.out',
            },
            0.45,
          ).to(pollen, { opacity: 0, duration: 0.9, stagger: 0.02 }, 1.35);
        } else gsap.set(pollen, { opacity: 0 });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      timeline?.kill();
    };
  }, [active, expanded, paused]);

  return (
    <div className="ivory-bloom" ref={root} data-expanded={expanded}>
      <button
        type="button"
        className="ivory-bloom-button"
        onClick={() => {
          if (!expanded && sounds) playTouch('ivory');
          onToggle();
        }}
        aria-expanded={expanded}
        aria-controls="invitation-story-text"
        aria-label={expanded ? text.labelClose : text.labelOpen}
      >
        <svg viewBox="0 0 280 275" className="ivory-bloom-art" aria-hidden="true">
          <defs>
            <linearGradient id={`${id}-petal`} x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#fffef8" />
              <stop offset=".55" stopColor="#eee0c8" />
              <stop offset="1" stopColor="#bb9463" />
            </linearGradient>
            <linearGradient id={`${id}-inner`} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#fffdf4" />
              <stop offset=".7" stopColor="#f3e5c9" />
              <stop offset="1" stopColor="#d6b27a" />
            </linearGradient>
            <radialGradient id={`${id}-heart`}>
              <stop stopColor="#fff3c9" />
              <stop offset="1" stopColor="#a67b43" />
            </radialGradient>
          </defs>
          <g fill="none" stroke="#987245" strokeWidth="1.1" strokeLinecap="round">
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
              <g key={i} className="ivory-petal" transform={`rotate(${(i - 2.5) * 9} 140 139)`}>
                <path
                  d="M140 139C94 117 112 70 140 39C168 70 186 117 140 139Z"
                  fill={`url(#${id}-petal)`}
                  stroke="#ac8659"
                  strokeWidth=".7"
                />
                <path d="M140 132C133 104 143 79 140 49" fill="none" stroke="#fffef1" strokeWidth="1.4" />
              </g>
            ))}
            {Array.from({ length: 3 }, (_, i) => (
              <g
                key={i}
                className="ivory-petal-inner"
                transform={`rotate(${(i - 1) * 7} 140 139) scale(0.88)`}
                style={{ transformOrigin: '140px 139px' }}
              >
                <path
                  d="M140 139C118 124 124 90 140 70C156 90 162 124 140 139Z"
                  fill={`url(#${id}-inner)`}
                  stroke="#b99467"
                  strokeWidth=".6"
                />
                <path d="M140 133C136 114 142 97 140 80" fill="none" stroke="#fffdf2" strokeWidth="1" />
              </g>
            ))}
            {Array.from({ length: 6 }, (_, i) => {
              const a = (-90 + (i - 2.5) * 16) * (Math.PI / 180);
              const x = 140 + Math.cos(a) * 44;
              const y = 139 + Math.sin(a) * 44;
              return (
                <g key={i} className="ivory-stamen" opacity="0" style={{ transformOrigin: '140px 139px' }}>
                  <path d={`M140 139Q${(140 + x) / 2 + (i - 2.5) * 2} ${(139 + y) / 2} ${x} ${y}`} fill="none" stroke="#b8904f" strokeWidth=".9" />
                  <ellipse cx={x} cy={y} rx="3.2" ry="1.7" fill="#b27c34" transform={`rotate(${(i - 2.5) * 16} ${x} ${y})`} />
                </g>
              );
            })}
            <g className="ivory-pollen">
              {POLLEN.map((p, i) => (
                <circle key={i} cx="140" cy="139" r={p.r} fill="#f1cf7e" opacity="0" />
              ))}
            </g>
            <circle cx="140" cy="139" r="8" fill={`url(#${id}-heart)`} stroke="#f9e9bc" strokeWidth="2" />
            <circle cx="138" cy="136" r="2" fill="#fff7d7" />
          </g>
        </svg>
        <small>{expanded ? text.kickerOpen : text.kicker}</small>
        <span>{expanded ? text.lineOpen : text.line}</span>
      </button>
    </div>
  );
}
