'use client';
import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { haptic, playTick, squeak, unlockSounds } from '@/lib/door-sounds';
import type { DoorAnchors, DoorScene } from './three-door-scene';

/* Yeni açılış ritüelleri: anahtar, buğulu cam ve sürgülü kanatlar.
   Her biri hem dokunmatik hareketle hem tek dokunuşla hem de klavyeyle
   (Enter/Boşluk) tamamlanabilir; hiçbir konuk bir harekette takılmaz. */

type RitualProps = {
  engine: RefObject<DoorScene | null>;
  disabled: boolean;
  label: string;
  /** Ritüel tamamlandı: mühür kırılsın, kapı açılsın. */
  onReveal: () => void;
  /** İpucu metni için ilerleme (0–1). */
  onProgress: (value: number) => void;
  /** O an ses çalınabilir mi (çift ve konuk tercihi). */
  sounds: () => boolean;
};

function animate(from: number, to: number, ms: number, step: (v: number) => void, done?: () => void) {
  const begin = performance.now();
  let frame = 0;
  const tick = (now: number) => {
    const t = Math.min(1, (now - begin) / ms);
    const eased = 1 - (1 - t) ** 3;
    step(from + (to - from) * eased);
    if (t < 1) frame = requestAnimationFrame(tick);
    else done?.();
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

/* Anahtar: halkayı tutup deliğin çevresinde çeyrek tur çevirin. */
export function KeyRitual({
  anchors,
  ...props
}: RitualProps & { anchors: NonNullable<DoorAnchors['key']> }) {
  const { engine, disabled, label, onReveal, onProgress, sounds } = props;
  const drag = useRef<{ angle: number; moved: number; id: number } | null>(null);
  const progress = useRef(0);
  const ticks = useRef(0);
  const stop = useRef<() => void>(undefined);
  const root = useRef<HTMLButtonElement>(null);
  const done = useRef(false);

  useEffect(() => () => stop.current?.(), []);

  function set(value: number) {
    const p = Math.min(1, Math.max(0, value));
    progress.current = p;
    engine.current?.turnKey(p);
    onProgress(p);
    // Her 15 derecede bir kilit dili tık eder.
    const step = Math.floor(p * 6);
    if (step !== ticks.current) {
      ticks.current = step;
      if (step > 0) {
        haptic(6);
        if (sounds()) playTick(0.55 + step * 0.08);
      }
    }
    if (p >= 0.92 && !done.current) {
      done.current = true;
      onReveal();
    }
  }

  function turnAll() {
    if (done.current) return;
    stop.current?.();
    stop.current = animate(progress.current, 1, 520, set);
  }

  function pivot() {
    const host = root.current?.parentElement?.getBoundingClientRect();
    if (!host) return { x: 0, y: 0 };
    return { x: host.left + (anchors.x / 100) * host.width, y: host.top + (anchors.y / 100) * host.height };
  }

  const dx = anchors.tipX - anchors.x;
  const dy = anchors.tipY - anchors.y;
  const style = {
    left: `${anchors.x}%`,
    top: `${anchors.y}%`,
    width: anchors.size * 2.3,
    height: anchors.size * 2.3,
    '--key-reach': `${Math.hypot(dx, dy)}%`,
  } as CSSProperties;

  return (
    <button
      ref={root}
      type="button"
      className="sealed-hit sealed-hit-key"
      style={style}
      aria-label={label}
      disabled={disabled}
      onPointerDown={(event) => {
        if (done.current) return;
        unlockSounds();
        event.currentTarget.setPointerCapture(event.pointerId);
        stop.current?.();
        const c = pivot();
        drag.current = { angle: Math.atan2(event.clientY - c.y, event.clientX - c.x), moved: 0, id: event.pointerId };
      }}
      onPointerMove={(event) => {
        const d = drag.current;
        if (!d || d.id !== event.pointerId) return;
        const c = pivot();
        const angle = Math.atan2(event.clientY - c.y, event.clientX - c.x);
        let delta = angle - d.angle;
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;
        d.angle = angle;
        d.moved += Math.abs(delta);
        // Ekranda saat yönünün tersi (y aşağı) = açının azalması.
        set(progress.current - delta / (Math.PI / 2));
      }}
      onPointerUp={() => {
        const d = drag.current;
        drag.current = null;
        if (!d || done.current) return;
        // Çevirmeden dokunmak da anahtarı çevirir.
        if (d.moved < 0.12) turnAll();
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          turnAll();
        }
      }}
    >
      <svg className="sealed-key-cue" viewBox="-50 -50 100 100" aria-hidden="true">
        <path d="M -8 38 A 39 39 0 0 0 38 8" pathLength={1} />
        <path d="M 30 4 L 38 8 L 42 -1" />
      </svg>
    </button>
  );
}

/* Sürgülü kanatlar: iki yana çekin (tek parmak ya da iki parmakla açın). */
export function SlideRitual(props: RitualProps) {
  const { engine, disabled, label, onReveal, onProgress, sounds } = props;
  const pointers = useRef(new Map<number, number>());
  const start = useRef<{ x: number; spread: number; moved: number } | null>(null);
  const progress = useRef(0);
  const stop = useRef<() => void>(undefined);
  const done = useRef(false);
  const root = useRef<HTMLButtonElement>(null);

  useEffect(() => () => stop.current?.(), []);

  function set(value: number) {
    const p = Math.min(1, Math.max(0, value));
    progress.current = p;
    engine.current?.strain(p);
    onProgress(p);
    if (sounds()) squeak(p > 0.02 ? 0.18 + p * 0.5 : 0, 'wood');
  }

  function release() {
    if (done.current) return;
    if (progress.current >= 0.55) {
      done.current = true;
      squeak(0, 'wood');
      haptic([10, 30, 14]);
      onReveal();
      return;
    }
    stop.current = animate(progress.current, 0, 320, set, () => squeak(0, 'wood'));
  }

  function slideAll() {
    if (done.current) return;
    stop.current?.();
    stop.current = animate(progress.current, 1, 420, set, () => release());
  }

  const span = () => (root.current?.getBoundingClientRect().width ?? 360) * 0.32;
  const spread = () => {
    const xs = [...pointers.current.values()];
    return xs.length > 1 ? Math.abs(xs[0] - xs[1]) : 0;
  };

  return (
    <button
      ref={root}
      type="button"
      className="sealed-hit sealed-hit-slide"
      aria-label={label}
      disabled={disabled}
      onPointerDown={(event) => {
        if (done.current) return;
        unlockSounds();
        event.currentTarget.setPointerCapture(event.pointerId);
        stop.current?.();
        pointers.current.set(event.pointerId, event.clientX);
        start.current = { x: event.clientX, spread: spread(), moved: 0 };
      }}
      onPointerMove={(event) => {
        if (!pointers.current.has(event.pointerId) || !start.current) return;
        pointers.current.set(event.pointerId, event.clientX);
        const s = start.current;
        const pull = pointers.current.size > 1 ? spread() - s.spread : Math.abs(event.clientX - s.x) * 1.25;
        s.moved = Math.max(s.moved, Math.abs(pull));
        set(pull / span());
      }}
      onPointerUp={(event) => {
        pointers.current.delete(event.pointerId);
        if (pointers.current.size) return;
        const moved = start.current?.moved ?? 0;
        start.current = null;
        if (moved < 6) slideAll();
        else release();
      }}
      onPointerCancel={(event) => {
        pointers.current.delete(event.pointerId);
        if (!pointers.current.size) {
          start.current = null;
          release();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          slideAll();
        }
      }}
    >
      <span className="sealed-slide-cue" aria-hidden="true">
        <i />
        <i />
      </span>
    </button>
  );
}

/* Buğulu cam: parmağınızla silin; ışıklar göründükçe kapı hazırlanır. */
export function WipeRitual(props: RitualProps & { threshold?: number }) {
  const { engine, disabled, label, onReveal, onProgress, sounds, threshold = 0.2 } = props;
  const last = useRef<{ x: number; y: number; t: number; moved: number } | null>(null);
  const done = useRef(false);
  const busy = useRef(false);
  const taps = useRef(0);

  function check(p: number) {
    onProgress(Math.min(1, p / threshold));
    if (p >= threshold && !done.current) {
      done.current = true;
      squeak(0, 'glass');
      haptic([8, 24, 12]);
      onReveal();
    }
  }

  async function auto() {
    if (done.current || busy.current || !engine.current) return;
    busy.current = true;
    await engine.current.autoWipe();
    busy.current = false;
    if (!done.current) {
      done.current = true;
      onReveal();
    }
  }

  return (
    <button
      type="button"
      className="sealed-hit sealed-hit-wipe"
      aria-label={label}
      disabled={disabled}
      onPointerDown={(event) => {
        if (done.current) return;
        unlockSounds();
        event.currentTarget.setPointerCapture(event.pointerId);
        last.current = { x: event.clientX, y: event.clientY, t: performance.now(), moved: 0 };
        check(engine.current?.wipeAt(event.clientX, event.clientY) ?? 0);
      }}
      onPointerMove={(event) => {
        const l = last.current;
        if (!l || done.current) return;
        const now = performance.now();
        const step = Math.hypot(event.clientX - l.x, event.clientY - l.y);
        const speed = step / Math.max(8, now - l.t);
        last.current = { x: event.clientX, y: event.clientY, t: now, moved: l.moved + step };
        if (sounds()) squeak(Math.min(1, speed * 0.9), 'glass');
        check(engine.current?.wipeAt(event.clientX, event.clientY) ?? 0);
      }}
      onPointerUp={() => {
        const moved = last.current?.moved ?? 0;
        last.current = null;
        squeak(0, 'glass');
        engine.current?.wipeEnd();
        // Silmek yerine dokunan konuk için: ikinci dokunuşta cam kendiliğinden silinir.
        if (moved < 8 && ++taps.current >= 2) void auto();
      }}
      onPointerCancel={() => {
        last.current = null;
        squeak(0, 'glass');
        engine.current?.wipeEnd();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          void auto();
        }
      }}
    >
      <span className="sealed-wipe-cue" aria-hidden="true" />
    </button>
  );
}
