'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { WaxSeal } from '@/components/wax-seal';
import {
  doorThemes,
  ritualCopy,
  type DoorConfig,
  type DoorRitual,
  type DoorTheme,
} from '@/lib/door-themes';
import type { InvitationAppearance } from '@/lib/invitation-appearance';
import { resolveWax } from '@/lib/wax-seal';
import { initials as coupleInitials } from '@/lib/ornament';
import {
  haptic,
  playCrack,
  playKnock,
  playOpen,
  unlockSounds,
} from '@/lib/door-sounds';
import type { DoorAnchors, DoorScene } from './three-door-scene';

export type SealedDoorCopy = {
  greeting: string;
  hints: Record<DoorRitual, string>;
  knockAgain: string;
  opening: string;
  loading: string;
  skip: string;
  sealLabel: string;
};

export const sealedDoorCopy: SealedDoorCopy = {
  greeting: 'SİZE ÖZEL BİR DAVET',
  hints: {
    tap: ritualCopy.tap.hint,
    knock: ritualCopy.knock.hint,
    ribbon: ritualCopy.ribbon.hint,
    hold: ritualCopy.hold.hint,
  },
  knockAgain: ritualCopy.knock.progress!,
  opening: 'HİKÂYEMİZ AÇILIYOR…',
  loading: 'DAVETİNİZ HAZIRLANIYOR…',
  skip: 'Doğrudan davetiyeye geç',
  sealLabel: 'Mührü kırın, kapıyı açın',
};

type State = 'loading' | 'ready' | 'opening' | 'fallback';

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
  copy = sealedDoorCopy,
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
}) {
  const door: DoorConfig = doorThemes[theme];
  const initials = coupleInitials(name1, name2);
  const wax = resolveWax(appearance.wax, theme);
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<DoorScene | null>(null);
  const started = useRef(false);
  const [state, setState] = useState<State>('loading');
  const [anchors, setAnchors] = useState<DoorAnchors | null>(null);
  const [knocks, setKnocks] = useState(0);
  const [holding, setHolding] = useState(0);
  const [broken, setBroken] = useState(false);
  const props = useRef({
    paused,
    onStart,
    onComplete,
    sounds: appearance.sounds,
  });
  useEffect(() => {
    props.current = { paused, onStart, onComplete, sounds: appearance.sounds };
  }, [paused, onStart, onComplete, appearance.sounds]);
  const sealSpec = {
    initials,
    emblem: appearance.emblem,
    shape: appearance.seal,
    seed: `${name1}|${name2}`,
  };
  const sealKey = `${initials}|${appearance.emblem}|${appearance.seal}|${appearance.wax}`;
  // Sahne yalnızca tasarım değişince kurulur; mühür yerinde güncellenir.
  const latest = useRef({ door, sealSpec, wax });
  useEffect(() => {
    latest.current = { door, sealSpec, wax };
  });

  useEffect(() => {
    const controller = new AbortController();
    const fail = () => {
      if (controller.signal.aborted) return;
      engine.current?.dispose();
      engine.current = null;
      setState('fallback');
      if (started.current) props.current.onComplete();
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      queueMicrotask(() => {
        if (!controller.signal.aborted) setState('fallback');
      });
      return () => controller.abort();
    }
    void import('@/lib/wax-seal')
      .then(({ ensureSealFont }) => ensureSealFont())
      .then(() => import('./three-door-scene'))
      .then(async ({ createDoorScene }) => {
        if (controller.signal.aborted || !host.current) return;
        const scene = await createDoorScene({
          host: host.current,
          door: latest.current.door,
          seal: latest.current.sealSpec,
          wax: latest.current.wax,
          signal: controller.signal,
          onComplete: () => props.current.onComplete(),
          onFail: fail,
          onLayout: setAnchors,
          onCue: (cue) => {
            if (cue === 'crack') {
              haptic([14, 30, 10]);
              if (props.current.sounds) playCrack();
            } else if (props.current.sounds) playOpen();
          },
        });
        if (controller.signal.aborted) {
          scene.dispose();
          return;
        }
        engine.current = scene;
        scene.pause(props.current.paused);
        setState('ready');
      })
      .catch(fail);
    return () => {
      controller.abort();
      engine.current?.dispose();
      engine.current = null;
    };
  }, [theme]);
  useEffect(() => {
    if (state !== 'ready' || !sealKey) return;
    engine.current?.setSeal(latest.current.sealSpec, latest.current.wax);
  }, [sealKey, state]);
  useEffect(() => engine.current?.pause(paused), [paused]);
  useEffect(() => {
    if (open) engine.current?.open(true);
  }, [open]);

  function reveal(instant = false) {
    if (started.current && !instant) return;
    started.current = true;
    unlockSounds();
    props.current.onStart();
    setBroken(true);
    setState('opening');
    if (engine.current) {
      engine.current.open(instant);
      if (instant) props.current.onComplete();
    } else if (instant || props.current.paused) {
      props.current.onComplete();
    } else {
      if (props.current.sounds) playCrack();
      haptic([14, 30, 10]);
      window.setTimeout(() => {
        if (props.current.sounds) playOpen();
      }, 500);
      window.setTimeout(() => props.current.onComplete(), 2300);
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

  const seal = anchors?.seal ?? { x: 50, y: door.y * 100, size: 96 };
  const hint =
    state === 'loading'
      ? copy.loading
      : state === 'opening'
        ? copy.opening
        : door.ritual === 'knock' && knocks === 1
          ? copy.knockAgain
          : copy.hints[door.ritual];
  const vars = {
    '--door-art': `url('${door.art}')`,
    '--door-bg-size': door.fit === 'cover' ? 'cover' : '100% 100%',
    '--door-light': door.light,
    '--seal-x': `${seal.x}%`,
    '--seal-y': `${seal.y}%`,
    '--seal-px': `${seal.size}px`,
  } as CSSProperties;
  const fallback = state === 'fallback';
  const ritual: DoorRitual = fallback ? 'tap' : door.ritual;

  return (
    <>
      <div
        className="door3d-world"
        style={vars}
        data-open={open}
        data-fallback={fallback}
        data-loading={state === 'loading'}
        aria-hidden="true"
      >
        <div ref={host} className="door3d-canvas" />
        {fallback && (
          <div className="sealed-fallback" data-open={broken}>
            <i className="sealed-fallback-leaf is-left" />
            <i className="sealed-fallback-leaf is-right" />
          </div>
        )}
        {(fallback || state === 'loading') && (
          <WaxSeal
            className="sealed-fallback-seal"
            initials={initials}
            theme={theme}
            wax={appearance.wax}
            emblem={appearance.emblem}
            shape={appearance.seal}
            size={Math.round(seal.size)}
            broken={broken}
          />
        )}
      </div>
      {!open && (
        <section
          className="sealed-door"
          style={vars}
          data-theme={theme}
          data-tone={door.tone}
          data-ritual={ritual}
          data-state={state}
          aria-label={`${door.name} — mühürlü davetiye kapısı`}
        >
          <div className="sealed-door-plaque">
            <small>{copy.greeting}</small>
            <p>{guest}</p>
          </div>
          {ritual === 'tap' && (
            <button
              type="button"
              className="sealed-hit sealed-hit-seal"
              aria-label={copy.sealLabel}
              disabled={state === 'loading' || state === 'opening'}
              onClick={() => reveal()}
            >
              <span className="sealed-halo" aria-hidden="true" />
            </button>
          )}
          {ritual === 'hold' && (
            <button
              type="button"
              className="sealed-hit sealed-hit-seal is-hold"
              aria-label={copy.sealLabel}
              disabled={state === 'loading' || state === 'opening'}
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
              <svg
                className="sealed-hold-ring"
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
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
              aria-label={`Kapıyı çalın (${Math.min(knocks + 1, 2)}/2)`}
              disabled={state === 'opening'}
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
              aria-label="Kurdeleyi çözün, kapıyı açın"
              disabled={state === 'opening'}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                drag.current = { y: event.clientY, id: event.pointerId };
              }}
              onPointerMove={(event) => {
                if (!drag.current) return;
                const progress = Math.min(
                  1,
                  Math.max(0, (event.clientY - drag.current.y) / 120),
                );
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
          <div className="sealed-door-caption">
            <h2>{coverText || door.caption}</h2>
            <span aria-live="polite">{hint}</span>
          </div>
          <button
            type="button"
            className="sealed-door-skip"
            onClick={() => reveal(true)}
          >
            {copy.skip}
          </button>
        </section>
      )}
    </>
  );
}
