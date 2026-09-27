'use client';

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { playTouch } from '@/lib/door-sounds';
import { storyTouchCopy, type StoryTouchProps } from './story-touch-copy';

/* Buğulu not (Kış Bahçesi). Küçük bir camın ardında sıcak ışıklar ve el
   yazısıyla bir not durur; cam buğuludur. Konuk parmağıyla siler; camın
   yarısına yakını açılınca buğu kendiliğinden çekilir. Dokunmayı seçen
   konuk için ikinci dokunuşta cam kendiliğinden silinir. */

const notes = {
  tr: 'Bu kış, en sıcak sofrada sizi bekliyoruz.',
  en: 'This winter, a place at our warmest table is waiting for you.',
  de: 'Diesen Winter wartet ein Platz an unserem wärmsten Tisch auf Sie.',
};

function paintFog(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(226,231,235,0.86)');
  g.addColorStop(1, 'rgba(214,220,226,0.94)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Buğu lekeleri ve damlacıklar.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 40; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const rr = (0.08 + rnd() * 0.18) * w;
    const blot = ctx.createRadialGradient(x, y, 0, x, y, rr);
    blot.addColorStop(0, 'rgba(255,255,255,0.12)');
    blot.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = blot;
    ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  for (let i = 0; i < 260; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const rr = (0.6 + rnd() * rnd() * 3.2) * (w / 300);
    ctx.fillStyle = 'rgba(120,130,140,0.22)';
    ctx.beginPath();
    ctx.arc(x, y + rr * 0.3, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(x - rr * 0.3, y - rr * 0.3, rr * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function FrostNote({ active, expanded, onToggle, sounds = false, lang = 'tr' }: StoryTouchProps) {
  const text = storyTouchCopy[lang].frost;
  const canvas = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(0);
  const taps = useRef(0);
  const opened = useRef(expanded);
  const auto = useRef(0);
  const props = useRef({ expanded, onToggle, sounds });
  props.current = { expanded, onToggle, sounds };

  // Kanvası CSS boyutuna ve piksel oranına göre hazırlar; kapanınca buğu geri gelir.
  useEffect(() => {
    const el = canvas.current;
    if (!el || !active) return;
    const fit = () => {
      const rect = el.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      el.width = Math.max(1, Math.round(rect.width * dpr));
      el.height = Math.max(1, Math.round(rect.height * dpr));
      if (!props.current.expanded) paintFog(el);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [active]);

  useEffect(() => {
    opened.current = expanded;
    const el = canvas.current;
    if (el && !expanded) {
      cancelAnimationFrame(auto.current);
      taps.current = 0;
      paintFog(el);
    }
  }, [expanded]);

  useEffect(() => () => cancelAnimationFrame(auto.current), []);

  function wipe(x: number, y: number) {
    const el = canvas.current;
    const ctx = el?.getContext('2d', { willReadFrequently: true });
    if (!el || !ctx) return;
    const radius = el.width * 0.075;
    ctx.globalCompositeOperation = 'destination-out';
    const stamp = (px: number, py: number) => {
      const g = ctx.createRadialGradient(px, py, 0, px, py, radius);
      g.addColorStop(0, 'rgba(0,0,0,0.9)');
      g.addColorStop(0.6, 'rgba(0,0,0,0.6)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    };
    const from = last.current;
    if (from) {
      const steps = Math.max(1, Math.ceil(Math.hypot(x - from.x, y - from.y) / (radius * 0.35)));
      for (let i = 1; i <= steps; i++) stamp(from.x + ((x - from.x) * i) / steps, from.y + ((y - from.y) * i) / steps);
    } else stamp(x, y);
    last.current = { x, y };
  }

  function cleared() {
    const el = canvas.current;
    const ctx = el?.getContext('2d', { willReadFrequently: true });
    if (!el || !ctx) return 0;
    const data = ctx.getImageData(0, 0, el.width, el.height).data;
    let open = 0;
    let total = 0;
    for (let i = 3; i < data.length; i += 4 * 97) {
      total++;
      if (data[i] < 90) open++;
    }
    return total ? open / total : 0;
  }

  function reveal() {
    if (opened.current) return;
    opened.current = true;
    if (props.current.sounds) playTouch('winter');
    props.current.onToggle();
  }

  function autoWipe() {
    const el = canvas.current;
    if (!el) return reveal();
    const begin = performance.now();
    last.current = null;
    const step = (now: number) => {
      const t = Math.min(1, (now - begin) / 900);
      const x = el.width * (0.12 + 0.76 * (0.5 + 0.5 * Math.sin(t * Math.PI * 4 - Math.PI / 2)));
      const y = el.height * (0.2 + t * 0.62);
      wipe(x, y);
      if (t < 1) auto.current = requestAnimationFrame(step);
      else {
        last.current = null;
        reveal();
      }
    };
    auto.current = requestAnimationFrame(step);
  }

  const toLocal = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * el.width,
      y: ((event.clientY - rect.top) / rect.height) * el.height,
    };
  };

  return (
    <div className="frost-note" data-expanded={expanded}>
      <div className="frost-note-card">
        <div className="frost-note-under">
          <p>{notes[lang]}</p>
        </div>
        <canvas
          ref={canvas}
          className="frost-note-fog"
          aria-hidden="true"
          onPointerDown={(event) => {
            if (opened.current) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            moved.current = 0;
            last.current = null;
            const p = toLocal(event);
            wipe(p.x, p.y);
          }}
          onPointerMove={(event) => {
            if (!last.current || opened.current) return;
            const p = toLocal(event);
            moved.current += Math.hypot(p.x - last.current.x, p.y - last.current.y);
            wipe(p.x, p.y);
          }}
          onPointerUp={() => {
            last.current = null;
            if (opened.current) return;
            if (cleared() > 0.42) reveal();
            else if (moved.current < 6 && ++taps.current >= 2) autoWipe();
          }}
          onPointerCancel={() => {
            last.current = null;
          }}
        />
      </div>
      <button
        type="button"
        className="story-touch-button"
        onClick={() => {
          if (expanded) props.current.onToggle();
          else autoWipe();
        }}
        aria-expanded={expanded}
        aria-controls="invitation-story-text"
        aria-label={expanded ? text.labelClose : text.labelOpen}
      >
        <small>{expanded ? text.kickerOpen : text.kicker}</small>
        <span>{expanded ? text.lineOpen : text.line}</span>
      </button>
    </div>
  );
}
