'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { WaxSeal } from '@/components/wax-seal';
import { doorThemes, type DoorConfig, type DoorRitual, type DoorTheme } from '@/lib/door-themes';
import { doorCopy, type SealedDoorCopy } from '@/lib/door-copy';
import type { InvitationAppearance, Lang } from '@/lib/invitation-appearance';
import { resolveWax } from '@/lib/wax-seal';
import { initials as coupleInitials } from '@/lib/ornament';
import {
  haptic,
  playCrack,
  playKnock,
  playOpenFor,
  playUnlock,
  unlockSounds,
} from '@/lib/door-sounds';
import { KeyRitual, SlideRitual, WipeRitual } from './door-rituals';
import type { DoorAnchors, DoorScene } from './three-door-scene';

export type { SealedDoorCopy };

/** Geriye uyum: eski içe aktarmalar Türkçe metni bekler. */
export const sealedDoorCopy: SealedDoorCopy = doorCopy('tr');

type Phase = 'loading' | 'ready' | 'opening';

/** 3B kapı bu sürede hazır olmazsa konuk CSS kapıyla devam eder. */
const LOAD_TIMEOUT_MS = 9000;
const SOUND_KEY = 'evet:kapi-sesi';

function storedSound() {
  try {
    return localStorage.getItem(SOUND_KEY) !== '0';
  } catch {
    return true;
  }
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" />
      {on ? (
        <>
          <path d="M15.2 9.2a4 4 0 0 1 0 5.6" />
          <path d="M17.6 6.8a7.4 7.4 0 0 1 0 10.4" />
        </>
      ) : (
        <path d="M16 9.5l5 5m0-5l-5 5" />
      )}
    </svg>
  );
}

export function SealedDoor({
  theme,
  name1,
  name2,
  guest,
  coverText,
  appearance,
  open,
  paused,
  onStart,
  onComplete,
  copy,
  date,
  lang,
  onEngine,
}: {
  theme: DoorTheme;
  name1: string;
  name2: string;
  guest: string;
  coverText?: string;
  appearance: InvitationAppearance;
  open: boolean;
  paused: boolean;
  onStart: () => void;
  onComplete: () => void;
  copy?: SealedDoorCopy;
  /** Çizimli kapılara işlenen kısa tarih ("12 · 06 · 2027"). */
  date?: string;
  /** Arayüz dili; verilmezse davetiyenin ilk dili. */
  lang?: Lang;
  /** Atölye ve önizleme için sahneye erişim. */
  onEngine?: (scene: DoorScene | null) => void;
}) {
  const door: DoorConfig = doorThemes[theme];
  const language = lang ?? appearance.languages[0] ?? 'tr';
  const text = copy ?? doorCopy(language);
  const initials = coupleInitials(name1, name2);
  const seed = `${name1}|${name2}`;
  const wax = resolveWax(appearance.wax, theme);
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<DoorScene | null>(null);
  const loader = useRef<AbortController | null>(null);
  const started = useRef(false);
  const [phase, setPhase] = useState<Phase>('loading');
  /** WebGL kurulamadıysa, süre aştıysa ya da hareket azaltıldıysa: CSS kapı. */
  const [fallback, setFallback] = useState(false);
  const [anchors, setAnchors] = useState<DoorAnchors | null>(null);
  const [knocks, setKnocks] = useState(0);
  const [holding, setHolding] = useState(0);
  const [broken, setBroken] = useState(false);
  const [progress, setProgress] = useState(0);
  const [guestSound, setGuestSound] = useState(true);
  useEffect(() => setGuestSound(storedSound()), []);
  /* Yükleme uzarsa mühre dokunmak CSS kapıyla açar; ilk anlarda ise
     konuğu 3B deneyimden erkenden koparmamak için bekletir. */
  const [impatient, setImpatient] = useState(false);
  const sounds = appearance.sounds && guestSound;
  const props = useRef({ paused, onStart, onComplete, sounds, onEngine });
  useEffect(() => {
    props.current = { paused, onStart, onComplete, sounds, onEngine };
  }, [paused, onStart, onComplete, sounds, onEngine]);
  const sealSpec = {
    initials,
    emblem: appearance.emblem,
    shape: appearance.seal,
    seed,
  };
  const sealKey = `${initials}|${appearance.emblem}|${appearance.seal}|${appearance.wax}`;
  // Sahne yalnızca tasarım değişince kurulur; mühür yerinde güncellenir.
  const latest = useRef({ door, sealSpec, wax, date, appearance });
  useEffect(() => {
    latest.current = { door, sealSpec, wax, date, appearance };
  });

  function toFallback() {
    loader.current?.abort();
    engine.current?.dispose();
    engine.current = null;
    props.current.onEngine?.(null);
    setFallback(true);
    setPhase((current) => (current === 'loading' ? 'ready' : current));
  }

  useEffect(() => {
    const controller = new AbortController();
    loader.current = controller;
    started.current = false;
    setPhase('loading');
    setFallback(false);
    setBroken(false);
    setKnocks(0);
    setProgress(0);
    const fail = (error?: unknown) => {
      if (controller.signal.aborted) return;
      // Konuk bir şey fark etmez (CSS kapı açılır); geliştirici nedenini görsün.
      if (error) console.warn('[mühürlü kapı] 3B kapı kurulamadı, CSS yedeğine geçildi:', error);
      toFallback();
      if (started.current) props.current.onComplete();
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      queueMicrotask(() => {
        if (!controller.signal.aborted) toFallback();
      });
      return () => controller.abort();
    }
    const timeout = window.setTimeout(() => {
      if (!engine.current && !controller.signal.aborted) toFallback();
    }, LOAD_TIMEOUT_MS);
    // Kapı yüzeyi (resim ya da çizim), 3B motor inerken paralel hazırlanır.
    const fonts = import('@/lib/wax-seal').then(({ ensureSealFont }) => ensureSealFont());
    const surface = fonts
      .then(() => import('@/lib/door-engine/surface'))
      .then(({ buildSurface, surfaceSize }) => {
        if (controller.signal.aborted || !host.current) throw new DOMException('Aborted', 'AbortError');
        const { door, sealSpec, date } = latest.current;
        return buildSurface(
          door,
          { initials: sealSpec.initials, date, seed: sealSpec.seed },
          surfaceSize(host.current.getBoundingClientRect()),
          controller.signal,
        );
      });
    surface.catch(() => undefined);
    void Promise.all([import('./three-door-scene'), fonts])
      .then(async ([{ createDoorScene }]) => {
        if (controller.signal.aborted || !host.current) return;
        const { door, sealSpec, wax, date, appearance } = latest.current;
        const scene = await createDoorScene({
          host: host.current,
          door,
          seal: sealSpec,
          wax,
          signal: controller.signal,
          surface,
          personal: { initials: sealSpec.initials, date, seed: sealSpec.seed },
          mode: appearance.opening,
          palette: appearance.palette,
          onComplete: () => props.current.onComplete(),
          onFail: fail,
          onLayout: setAnchors,
          onCue: (cue) => {
            const on = props.current.sounds;
            if (cue === 'crack') {
              haptic([14, 30, 10]);
              if (on) playCrack();
            } else if (cue === 'unlock') {
              haptic([8, 40, 16]);
              if (on) playUnlock();
            } else if (on) playOpenFor(door.soundscape, door.motion);
          },
        });
        if (controller.signal.aborted) {
          scene.dispose();
          return;
        }
        window.clearTimeout(timeout);
        engine.current = scene;
        props.current.onEngine?.(scene);
        scene.pause(props.current.paused);
        setPhase((current) => (current === 'loading' ? 'ready' : current));
      })
      .catch(fail);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
      engine.current?.dispose();
      engine.current = null;
      props.current.onEngine?.(null);
    };
    // Tasarım ya da açılış biçimi değişince sahne yeniden kurulur.
  }, [theme, appearance.opening, appearance.palette, date]);
  useEffect(() => {
    if (phase === 'loading' || !sealKey) return;
    engine.current?.setSeal(latest.current.sealSpec, latest.current.wax);
  }, [sealKey, phase]);
  useEffect(() => {
    if (phase !== 'loading') return;
    setImpatient(false);
    const id = window.setTimeout(() => setImpatient(true), 2500);
    return () => window.clearTimeout(id);
  }, [phase]);
  useEffect(() => engine.current?.pause(paused), [paused]);
  useEffect(() => {
    if (open) engine.current?.open(true);
  }, [open]);

  function reveal(instant = false) {
    if (started.current && !instant) return;
    started.current = true;
    unlockSounds();
    props.current.onStart();
    // Hâlâ yükleniyorsa bekletme: CSS kapıyla hemen aç.
    const css = fallback || !engine.current;
    setPhase('opening');
    if (engine.current && !css) {
      setBroken(true);
      engine.current.open(instant);
      if (instant) props.current.onComplete();
      return;
    }
    if (!fallback) toFallback();
    // Kanatlar önce kapalı çizilsin, sonra açılsın: geçiş görünür kalır.
    requestAnimationFrame(() => requestAnimationFrame(() => setBroken(true)));
    if (instant || props.current.paused) {
      props.current.onComplete();
    } else {
      if (props.current.sounds) playCrack();
      haptic([14, 30, 10]);
      window.setTimeout(() => {
        if (props.current.sounds) playOpenFor(door.soundscape, door.motion);
      }, 500);
      window.setTimeout(() => props.current.onComplete(), 2500);
    }
  }

  function knock() {
    if (started.current) return;
    unlockSounds();
    const next = knocks + 1;
    setKnocks(next);
    const impact = () => {
      haptic(12);
      if (props.current.sounds) playKnock();
    };
    if (engine.current) engine.current.knock(impact);
    else impact();
    if (next >= 2) window.setTimeout(() => reveal(), 520);
  }

  /* Kurdele: aşağı çekildikçe gerilir; yeterince çekilince çözülür. */
  const drag = useRef<{ y: number; id: number } | null>(null);
  const [pull, setPull] = useState(0);
  function releaseRibbon(progress: number) {
    drag.current = null;
    if (progress > 0.5) {
      setPull(1);
      engine.current?.pull(1);
      reveal();
      return;
    }
    const from = progress;
    const begin = performance.now();
    const back = (now: number) => {
      const t = Math.min(1, (now - begin) / 260);
      const value = from * (1 - t) ** 2;
      setPull(value);
      engine.current?.pull(value);
      if (t < 1) requestAnimationFrame(back);
    };
    requestAnimationFrame(back);
  }

  /* Basılı tutma: 1 saniyede dolan halka. */
  const holdFrame = useRef(0);
  function startHold() {
    if (started.current) return;
    unlockSounds();
    const begin = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - begin) / 1000);
      setHolding(progress);
      engine.current?.hold(progress);
      if (progress >= 1) {
        haptic(20);
        reveal();
        return;
      }
      holdFrame.current = requestAnimationFrame(step);
    };
    holdFrame.current = requestAnimationFrame(step);
  }
  function stopHold() {
    cancelAnimationFrame(holdFrame.current);
    if (started.current) return;
    setHolding(0);
    engine.current?.hold(0);
  }
  useEffect(() => () => cancelAnimationFrame(holdFrame.current), []);

  function toggleSound() {
    const next = !guestSound;
    setGuestSound(next);
    if (next) unlockSounds();
    try {
      localStorage.setItem(SOUND_KEY, next ? '1' : '0');
    } catch {
      // Gizli sekme: tercih yalnızca bu oturumda kalır.
    }
  }

  const seal = anchors?.seal ?? { x: 50, y: door.y * 100, size: 96 };
  const loading = phase === 'loading';
  // Yüklenirken ve yedek kapıda karmaşık ritüeller yerine mühre dokunmak yeter.
  const ritual: DoorRitual =
    (fallback || loading) && door.ritual !== 'hold' ? 'tap' : door.ritual;
  const progressHint =
    ritual === 'knock' && knocks === 1
      ? text.knockAgain
      : (ritual === 'key' || ritual === 'wipe' || ritual === 'slide') && progress > 0.12
        ? text.progress[ritual]
        : undefined;
  const hint = loading
    ? text.loading
    : phase === 'opening'
      ? text.opening
      : (progressHint ?? text.hints[ritual]);
  const vars = {
    '--door-art': `url('${door.art}')`,
    '--door-bg-size': door.fit === 'cover' ? 'cover' : '100% 100%',
    '--door-light': door.light,
    '--seal-x': `${seal.x}%`,
    '--seal-y': `${seal.y}%`,
    '--seal-px': `${seal.size}px`,
  } as CSSProperties;
  const ritualProps = {
    engine,
    disabled: phase !== 'ready',
    label: text.actions[ritual],
    onReveal: () => reveal(),
    onProgress: setProgress,
    sounds: () => props.current.sounds,
  };

  return (
    <>
      <div
        className="door3d-world"
        style={vars}
        data-open={open}
        data-fallback={fallback}
        data-loading={loading}
        data-atmosphere={door.atmosphere}
        data-motion={door.motion ?? 'swing'}
        aria-hidden="true"
      >
        <div ref={host} className="door3d-canvas" />
        {fallback && (
          <div className="sealed-fallback" data-open={broken} data-motion={door.motion ?? 'swing'}>
            <i className="sealed-fallback-leaf is-left" />
            <i className="sealed-fallback-leaf is-right" />
          </div>
        )}
        {(fallback || loading) && (
          <WaxSeal
            className="sealed-fallback-seal"
            initials={initials}
            seed={seed}
            theme={theme}
            wax={appearance.wax}
            emblem={appearance.emblem}
            shape={appearance.seal}
            size={Math.round(seal.size)}
            broken={broken}
          />
        )}
        {door.atmosphere === 'snow' && !open && <span className="door3d-snow" />}
      </div>
      {!open && (
        <section
          className="sealed-door"
          style={vars}
          data-theme={theme}
          data-tone={door.tone}
          data-ritual={ritual}
          data-state={phase}
          aria-label={text.doorLabel(door.name)}
        >
          {ritual === 'wipe' && anchors && !fallback && (
            <WipeRitual {...ritualProps} />
          )}
          {ritual === 'slide' && !fallback && <SlideRitual {...ritualProps} />}
          <div className="sealed-door-plaque">
            <small>{text.greeting}</small>
            <p>{guest}</p>
          </div>
          {ritual === 'tap' && (
            <button
              type="button"
              className="sealed-hit sealed-hit-seal"
              aria-label={text.sealLabel}
              disabled={phase === 'opening' || (loading && !impatient)}
              onClick={() => reveal()}
            >
              <span className="sealed-halo" aria-hidden="true" />
            </button>
          )}
          {ritual === 'hold' && (
            <button
              type="button"
              className="sealed-hit sealed-hit-seal is-hold"
              aria-label={text.sealLabel}
              disabled={phase === 'opening'}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                startHold();
              }}
              onPointerUp={stopHold}
              onPointerCancel={stopHold}
              onContextMenu={(event) => event.preventDefault()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  reveal();
                }
              }}
            >
              <svg className="sealed-hold-ring" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="46" pathLength={1} />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  pathLength={1}
                  style={{ strokeDashoffset: 1 - holding }}
                />
              </svg>
            </button>
          )}
          {ritual === 'knock' && anchors?.knocker && (
            <button
              type="button"
              className="sealed-hit sealed-hit-knocker"
              style={{
                left: `${anchors.knocker.x}%`,
                top: `${anchors.knocker.y}%`,
                width: anchors.knocker.size,
                height: anchors.knocker.size,
              }}
              aria-label={text.knockLabel(Math.min(knocks + 1, 2), 2)}
              disabled={phase === 'opening'}
              onClick={knock}
            >
              <span className="sealed-halo" aria-hidden="true" />
            </button>
          )}
          {ritual === 'ribbon' && anchors?.ribbon && (
            <button
              type="button"
              className="sealed-hit sealed-hit-ribbon"
              style={
                {
                  left: `${anchors.ribbon.x}%`,
                  top: `${anchors.ribbon.y}%`,
                  width: anchors.ribbon.width,
                  height: anchors.ribbon.height,
                  '--pull': pull,
                } as CSSProperties
              }
              aria-label={text.actions.ribbon}
              disabled={phase === 'opening'}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                drag.current = { y: event.clientY, id: event.pointerId };
              }}
              onPointerMove={(event) => {
                if (!drag.current) return;
                const progress = Math.min(1, Math.max(0, (event.clientY - drag.current.y) / 120));
                setPull(progress);
                engine.current?.pull(progress);
              }}
              onPointerUp={(event) => {
                if (!drag.current) return;
                const moved = event.clientY - drag.current.y;
                // Sürüklemeden dokunmak da kurdeleyi çözer.
                releaseRibbon(Math.abs(moved) < 6 ? 1 : pull);
              }}
              onPointerCancel={() => releaseRibbon(0)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  releaseRibbon(1);
                }
              }}
            >
              <span className="sealed-pull-cue" aria-hidden="true" />
            </button>
          )}
          {ritual === 'key' && anchors?.key && !fallback && (
            <KeyRitual {...ritualProps} anchors={anchors.key} />
          )}
          <div className="sealed-door-caption">
            <h2>{coverText || door.captions?.[language] || door.caption}</h2>
            <span aria-live="polite">{hint}</span>
          </div>
          {appearance.sounds && (
            <button
              type="button"
              className="sealed-door-sound"
              aria-pressed={guestSound}
              aria-label={guestSound ? text.soundOff : text.soundOn}
              onClick={toggleSound}
            >
              <SoundIcon on={guestSound} />
            </button>
          )}
          <button type="button" className="sealed-door-skip" onClick={() => reveal(true)}>
            {text.skip}
          </button>
        </section>
      )}
    </>
  );
}
