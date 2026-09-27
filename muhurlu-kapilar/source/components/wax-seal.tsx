'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Theme } from '@/lib/theme-registry';
import type {
  EmblemId,
  InvitationAppearance,
  WaxId,
} from '@/lib/invitation-appearance';
import {
  buildSealMaps,
  crackGlowCanvas,
  ensureSealFont,
  paintSeal,
  resolveWax,
  type SealPart,
} from '@/lib/wax-seal';

type Props = {
  initials: string;
  /** 3B kapıdaki mühürle aynı kenar için çiftin tohumu. */
  seed?: string;
  theme: Theme;
  wax?: WaxId;
  emblem?: EmblemId;
  shape?: InvitationAppearance['seal'];
  /** CSS piksel çapı. */
  size?: number;
  /** Kırılınca iki yarı ayrılır; yarılar ebeveynin dönüşüyle birlikte gider. */
  broken?: boolean;
  className?: string;
  style?: CSSProperties;
  label?: string;
};

function draw(target: HTMLCanvasElement | null, source: CanvasImageSource) {
  if (!target) return;
  const ctx = target.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, target.width, target.height);
  ctx.drawImage(source, 0, 0, target.width, target.height);
}

/** Yazılımla ışıklandırılmış 2D balmumu mühür. */
export function WaxSeal({
  initials,
  seed,
  theme,
  wax = 'tema',
  emblem = 'monogram',
  shape = 'round',
  size = 96,
  broken = false,
  className = '',
  style,
  label,
}: Props) {
  const whole = useRef<HTMLCanvasElement>(null);
  const left = useRef<HTMLCanvasElement>(null);
  const right = useRef<HTMLCanvasElement>(null);
  const glow = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const resolution = 384;
  useEffect(() => {
    let cancelled = false;
    void ensureSealFont().then(() => {
      if (cancelled) return;
      const maps = buildSealMaps(
        { initials, emblem, shape, seed: seed ?? initials },
        resolution,
      );
      const tone = resolveWax(wax, theme);
      const parts: [HTMLCanvasElement | null, SealPart][] = [
        [whole.current, 'whole'],
        [left.current, 'left'],
        [right.current, 'right'],
      ];
      for (const [canvas, part] of parts)
        if (canvas) draw(canvas, paintSeal(maps, tone, part));
      if (glow.current) draw(glow.current, crackGlowCanvas(maps));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [initials, seed, emblem, shape, wax, theme]);
  return (
    <span
      className={`wax-seal ${className}`}
      data-broken={broken || undefined}
      data-ready={ready || undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ '--seal-size': `${size}px`, ...style } as CSSProperties}
    >
      <canvas
        ref={whole}
        className="wax-seal-whole"
        width={resolution}
        height={resolution}
      />
      <canvas
        ref={left}
        className="wax-seal-half is-left"
        width={resolution}
        height={resolution}
      />
      <canvas
        ref={right}
        className="wax-seal-half is-right"
        width={resolution}
        height={resolution}
      />
      <canvas
        ref={glow}
        className="wax-seal-glow"
        width={resolution}
        height={resolution}
      />
    </span>
  );
}
