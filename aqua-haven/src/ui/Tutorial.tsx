import { useUI, ui, getGame, refresh, toast } from './store';
import { t, type TKey } from '../i18n';
import { audio } from '../services/audio';

// Adım adım öğretici. İlerleme GameState.tutorial.step içinde saklanır.
interface Step {
  text: TKey;
  target?: (tool: string) => string | null; // vurgulanacak düğme (data-tut)
  next?: boolean; // "İleri" düğmesi
  done?: () => boolean; // otomatik ilerleme koşulu
  enter?: () => void;
}

const REWARD = { coins: 100, pearls: 5 };

function steps(): Step[] {
  const g = getGame();
  const s = g.state;
  const flag = (k: string) => s.flags[`tut:${k}`] ?? 0;
  return [
    { text: 'tut.0', next: true },
    { text: 'tut.1', target: () => 'tool-feed', done: () => ui.tool === 'feed' },
    {
      text: 'tut.2',
      enter: () => (s.flags['tut:fed'] = s.stats.fed),
      done: () => s.stats.fed > flag('fed'),
    },
    { text: 'tut.3', next: true },
    {
      text: 'tut.4',
      target: (tool) => (tool === 'hand' ? null : 'tool-hand'),
      done: () => !!ui.selectedFish,
    },
    {
      text: 'tut.5',
      target: (tool) => (tool === 'sponge' ? null : 'tool-sponge'),
      enter: () => (s.flags['tut:wiped'] = s.stats.wiped),
      done: () => s.stats.wiped >= flag('wiped') + 0.3,
    },
    { text: 'tut.6', target: () => 'menu-shop', done: () => ui.panel === 'shop' },
    { text: 'tut.7', target: () => 'menu-quests', next: true },
  ];
}

function finish(skip: boolean) {
  const g = getGame();
  const s = g.state;
  s.tutorial.done = true;
  if (!skip) {
    g.addCoins(REWARD.coins);
    g.addPearls(REWARD.pearls);
    audio.play('levelUp');
    toast(`+${REWARD.coins} 🪙  +${REWARD.pearls} 💎`, 'good');
  }
  refresh();
}

function advance() {
  const s = getGame().state;
  const list = steps();
  s.tutorial.step++;
  if (s.tutorial.step >= list.length) finish(false);
  else {
    list[s.tutorial.step].enter?.();
    audio.play('success');
  }
  refresh();
}

export function Tutorial() {
  useUI(5);
  const s = getGame().state;
  if (s.tutorial.done) return null;
  const list = steps();
  const step = list[Math.min(s.tutorial.step, list.length - 1)];
  // Son adımda panel açıksa bekle
  if (s.tutorial.step === list.length - 1 && ui.panel) return null;
  if (step.done?.()) {
    setTimeout(advance, 0);
    return null;
  }
  const targetId = step.target?.(ui.tool) ?? null;
  const el = targetId ? (document.querySelector(`[data-tut="${targetId}"]`) as HTMLElement | null) : null;
  const r = el?.getBoundingClientRect();
  const vw = window.innerWidth;
  let bubble: { left?: number; right?: number; top?: number; bottom?: number };
  if (r) {
    const leftSide = r.left < vw / 2;
    bubble = leftSide
      ? { left: r.right + 14, top: Math.max(50, Math.min(window.innerHeight - 150, r.top - 10)) }
      : { right: vw - r.left + 14, top: Math.max(50, Math.min(window.innerHeight - 150, r.top - 10)) };
  } else {
    // hedef yoksa alta (ipucu satırının üstüne) koy: tankın ortası açık kalsın
    bubble = { left: vw / 2 - 150, bottom: 52 };
  }
  return (
    <>
      {r && <div class="pass tut-ring" style={{ left: `${r.left - 5}px`, top: `${r.top - 5}px`, width: `${r.width + 10}px`, height: `${r.height + 10}px` }} />}
      <div class="tut-bubble" style={{ left: bubble.left !== undefined ? `${bubble.left}px` : undefined, right: bubble.right !== undefined ? `${bubble.right}px` : undefined, top: bubble.top !== undefined ? `${bubble.top}px` : undefined, bottom: bubble.bottom !== undefined ? `calc(${bubble.bottom}px + var(--sab))` : undefined }}>
        <div>{t(step.text)}</div>
        <div class="row">
          <button class="skip" onClick={() => finish(true)}>{t('tut.skip')}</button>
          <span class="spacer" />
          <span style={{ fontSize: '11px', opacity: 0.7 }}>{s.tutorial.step + 1}/{list.length}</span>
          {step.next && <button class="btn gold" onClick={advance}>{s.tutorial.step === list.length - 1 ? t('c.done') : t('c.next')}</button>}
        </div>
      </div>
    </>
  );
}
