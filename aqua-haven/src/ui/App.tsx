import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { ui, useUI, setUI, toast, act, openPanel, closePanel, ask, getGame, getScene, getWorld, refresh, errText, type PanelId } from './store';
import * as I from './icons';
import { t, tx, getLang, setLang, type TKey } from '../i18n';
import { fmt, fmtTime, msUntilMidnight } from '../game/util';
import { SPECIES, getSpecies } from '../data/species';
import { PLANTS, getPlant } from '../data/plants';
import { DECOR, getDecor } from '../data/decor';
import { EQUIPMENT, getEquip } from '../data/equipment';
import { FOODS, ITEMS, EGG_ODDS, getFood } from '../data/foods';
import { COSMETICS, TANK_TYPES, getTankType, getTier } from '../data/tanks';
import { ACHIEVEMENTS } from '../data/progression';
import { PRODUCTS, PRODUCT_IDS, FREE_PEARLS_PER_AD, STARTER_PACK } from '../config/monetization';
import { APP } from '../config/app';
import * as A from '../game/actions';
import { activeTank, capacityUsed, findFish, isVip, tierDef } from '../game/state';
import { computeEnv, tempRange } from '../game/sim/env';
import { moodFor, timeToAdult, trait } from '../game/sim/fish';
import { beautyScore, growPearlCost, pearlCoinRate, quickCleanCost, sellValue, tipCap, tipCapMinutes, tipRatePerMin, waterChangeCost } from '../game/sim/economy';
import { breederSpeciesIn, checkBreeding, clutchProgress } from '../game/sim/breeding';
import { achievementStatus, bonusReward, claimAchievement, claimBonus, claimQuest, claimableCount, rerollQuest, todaysLoginReward } from '../game/sim/quests';
import { QUEST_TEMPLATES } from '../data/progression';
import { xpToNext, BAL } from '../game/balance';
import type { EquipSlot, FishState, SpeciesDef, TankState } from '../game/types';
import { speciesThumb, plantThumb, decorThumb } from '../render/thumbs';
import { ads } from '../services/ads';
import { iap } from '../services/iap';
import { audio } from '../services/audio';
import { haptic, setHapticsEnabled } from '../services/haptics';
import { requestNotifications } from '../services/notify';
import { openUrl } from '../services/platform';
import { clearSave } from '../game/save';
import { stageOf } from '../render/fishSprites';
import { Tutorial } from './Tutorial';

// ------------------------------------------------------------------ küçük bileşenler

const Price = ({ coins, pearls }: { coins?: number; pearls?: number }) =>
  pearls ? (
    <span class="row" style={{ gap: '3px' }}><I.Pearl size={16} /><span class="num">{fmt(pearls)}</span></span>
  ) : (
    <span class="row" style={{ gap: '3px' }}><I.Coin size={16} /><span class="num">{fmt(coins ?? 0)}</span></span>
  );

const Bar = ({ v, c }: { v: number; c: string }) => (
  <div class="bar"><i style={{ width: `${Math.max(0, Math.min(100, v))}%`, background: c }} /></div>
);

const barColor = (v: number) => (v > 66 ? '#34d399' : v > 33 ? '#fbbf24' : '#fb7185');

function Modal(p: { title: string; onClose?: () => void; small?: boolean; tabs?: [string, string][]; tab?: string; onTab?: (k: string) => void; children: ComponentChildren }) {
  return (
    <div class="scrim" onPointerDown={(e) => e.target === e.currentTarget && p.onClose?.()}>
      <div class={`modal ${p.small ? 'small' : ''}`}>
        <div class="mhead">
          <h2>{p.title}</h2>
          {p.onClose && <button class="iconbtn" onClick={p.onClose}><I.Close size={20} /></button>}
        </div>
        {p.tabs && (
          <div class="tabs">
            {p.tabs.map(([k, label]) => (
              <button class={`tab ${p.tab === k ? 'on' : ''}`} onClick={() => { audio.play('click'); p.onTab?.(k); }}>{label}</button>
            ))}
          </div>
        )}
        <div class="mbody">{p.children}</div>
      </div>
    </div>
  );
}

const Toggle = ({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) => (
  <button class={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />
);

function traitBadges(sp: SpeciesDef) {
  const special = ['xpAura', 'xpBoost', 'fastGrow', 'golden', 'lucky', 'healer'];
  return (
    <div class="traits">
      {sp.traits.map((tr) => {
        const v = tr.v !== undefined ? Math.round(tr.v * 100) : 0;
        return (
          <span class={`trait ${special.includes(tr.id) ? 'special' : ''}`} title={t(`tr.${tr.id}.d` as TKey, { v, n: sp.school ?? 3 })}>
            {t(`tr.${tr.id}` as TKey)}{['xpAura', 'xpBoost', 'fastGrow', 'golden'].includes(tr.id) ? ` +${v}%` : ''}
          </span>
        );
      })}
      {sp.breed && <span class="trait special">💕 {t('shop.breeds')}</span>}
    </div>
  );
}

async function watchAd(placement: string): Promise<boolean> {
  if (!ads.available(placement)) {
    toast(t('err.adFail'), 'bad');
    return false;
  }
  const ok = await ads.showRewarded(placement);
  if (!ok) toast(t('err.adFail'), 'bad');
  refresh();
  return ok;
}

// ------------------------------------------------------------------ üst çubuk

function TopBar() {
  useUI(4);
  const g = getGame();
  const s = g.state;
  const tank = activeTank(s);
  const env = computeEnv(tank);
  const need = xpToNext(s.player.level);
  const q = Math.round(100 - tank.pollution);
  return (
    <div class="top">
      <div class="lvl" onClick={() => openPanel('quests', 'ach')}>
        <div class="badge num">{s.player.level}</div>
        <div>
          <div class="muted" style={{ fontSize: '10px' }}>{t('c.level', { n: s.player.level })}</div>
          <div class="xpbar"><i style={{ width: `${(s.player.xp / need) * 100}%` }} /></div>
        </div>
      </div>
      {s.tanks.length > 1 && (
        <button class="chip" onClick={() => { A.switchTank(g, (s.active + 1) % s.tanks.length); setUI({ selectedFish: null }); }}>
          <I.Tank size={18} /> {tank.type === 'fresh' ? t('tank.fresh') : t('tank.marine')} ⇄
        </button>
      )}
      <div class="stats" onClick={() => openPanel('tank')}>
        <span class={`chip ${q < 50 ? 'bad' : q < 70 ? 'warn' : ''}`}><I.Drop size={16} />{q}%</span>
        <span class={`chip ${tank.oxygen < 35 ? 'bad' : ''}`}><I.Bubbles size={16} />{Math.round(tank.oxygen)}%</span>
        <span class="chip"><I.Thermo size={16} />{tank.temp.toFixed(1)}°</span>
        {env.avgAlgae > 0.15 && <span class={`chip ${env.avgAlgae > 0.4 ? 'warn' : ''}`}><I.Leaf size={16} />{Math.round(env.avgAlgae * 100)}%</span>}
        {!tank.light && <span class="chip"><I.Moon size={16} /></span>}
      </div>
      <div class="money">
        <span class="chip" onClick={() => openPanel('store')}><I.Coin size={20} /><span class="num">{fmt(s.player.coins)}</span></span>
        <span class="chip" onClick={() => openPanel('store')}><I.Pearl size={20} /><span class="num">{fmt(s.player.pearls)}</span><span class="plus"><I.Plus size={12} /></span></span>
      </div>
      <button class="iconbtn" onClick={() => openPanel('settings')}><I.Gear size={20} /></button>
    </div>
  );
}

// ------------------------------------------------------------------ araç ve menü sütunları

function Tools() {
  useUI(2);
  const g = getGame();
  const s = g.state;
  const tool = ui.tool;
  const set = (tl: typeof tool) => {
    audio.unlock();
    audio.play('click');
    haptic.select();
    setUI({ tool: tl, foodOpen: tl === 'feed' && tool === 'feed' ? !ui.foodOpen : false, decorSel: null, selectedFish: tl === 'hand' ? ui.selectedFish : null });
  };
  const foodLeft = s.inv.food[s.selectedFood] ?? 0;
  const items: [typeof tool, preact.JSX.Element, TKey][] = [
    ['hand', <I.Hand size={22} />, 'tool.hand'],
    ['feed', <I.Food size={22} />, 'tool.feed'],
    ['sponge', <I.Sponge size={22} />, 'tool.sponge'],
    ['vacuum', <I.Vacuum size={22} />, 'tool.vacuum'],
    ['decor', <I.Castle size={22} />, 'tool.decor'],
  ];
  return (
    <>
      <div class="col left">
        {items.map(([k, icon, label]) => (
          <button class={`tbtn ${tool === k ? 'on' : ''}`} data-tut={`tool-${k}`} onClick={() => set(k)}>
            {icon}
            {t(label)}
            {k === 'feed' && <span class="cnt num">{foodLeft}</span>}
          </button>
        ))}
      </div>
      {ui.foodOpen && tool === 'feed' && (
        <div class="foodpick">
          {FOODS.filter((f) => (s.inv.food[f.id] ?? 0) > 0).map((f) => (
            <button class={s.selectedFood === f.id ? 'on' : ''} onClick={() => { A.selectFood(g, f.id); setUI({ foodOpen: false }); }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: f.color }} /> {tx(f.name)} <b class="num">{s.inv.food[f.id]}</b>
            </button>
          ))}
          <button onClick={() => openPanel('shop', 'care')}><I.Plus size={14} /> {t('menu.shop')}</button>
        </div>
      )}
    </>
  );
}

function Menus() {
  useUI(1);
  const s = getGame().state;
  const badge = claimableCount(s);
  const breeding = s.tanks.reduce((n, tk) => n + tk.clutches.length, 0);
  const items: [PanelId, preact.JSX.Element, TKey, number][] = [
    ['shop', <I.Bag size={22} />, 'menu.shop', 0],
    ['fish', <I.FishI size={22} />, 'menu.fish', 0],
    ['breed', <I.Heart size={22} />, 'menu.breed', breeding],
    ['quests', <I.Scroll size={22} />, 'menu.quests', badge],
    ['tank', <I.Tank size={22} />, 'menu.tank', 0],
    ['guide', <I.Book size={22} />, 'menu.guide', 0],
  ];
  return (
    <div class="col right">
      {items.map(([k, icon, label, n]) => (
        <button class="tbtn" data-tut={`menu-${k}`} onClick={() => openPanel(k)}>
          {icon}
          {t(label)}
          {n > 0 && <span class="dot num">{n}</span>}
        </button>
      ))}
    </div>
  );
}

function TipJar() {
  useUI(2);
  const g = getGame();
  const tank = g.tank;
  const amount = Math.floor(tank.tips);
  if (amount < 1) return null;
  const full = tank.tips >= tipCap(g.state, tank) * 0.98;
  const collect = async (double: boolean) => {
    if (double && !(await watchAd('doubleTips'))) return;
    const r = act(A.collectTips(g, tank, double), 'sell');
    if (r.ok) toast(t('ev.tips', { c: fmt(r.value ?? 0) }), 'good');
  };
  return (
    <div class="row" style={{ position: 'absolute', bottom: 'calc(8px + var(--sab))', right: 'calc(70px + var(--sar))' }}>
      {amount >= 30 && ads.available('doubleTips') && <button class="btn purple" onClick={() => collect(true)}><I.Play size={16} /> x2</button>}
      <button class={`tipjar ${full ? 'full' : ''}`} style={{ position: 'static' }} onClick={() => collect(false)}>
        <I.Coin size={20} /> <span class="num">{fmt(amount)}</span> <span style={{ fontSize: '11px' }}>{t('hud.visitors')}</span>
      </button>
    </div>
  );
}

function Hint() {
  useUI();
  const g = getGame();
  const key: Partial<Record<typeof ui.tool, TKey>> = { feed: 'hint.feed', sponge: 'hint.sponge', vacuum: 'hint.vacuum', decor: 'hint.decor' };
  const k = key[ui.tool];
  if (ui.tool === 'decor') return <div class="hint" style={{ bottom: 'calc(84px + var(--sab))' }}>{t(k!)}</div>;
  if (!k) return getScene().cam.canPan && g.state.playTime < 600 ? <div class="hint">{t('hint.pan')}</div> : null;
  return <div class="hint">{t(k)}</div>;
}

function DecorTray() {
  const g = getGame();
  const s = g.state;
  const items = [
    ...Object.entries(s.inv.decor).filter(([id, n]) => n > 0 && (getDecor(id).water === 'both' || getDecor(id).water === g.tank.type)).map(([id, n]) => ({ id, n, kind: 'decor' as const })),
    ...Object.entries(s.inv.plants).filter(([id, n]) => n > 0 && getPlant(id).water === g.tank.type).map(([id, n]) => ({ id, n, kind: 'plant' as const })),
  ];
  const place = (it: (typeof items)[number]) => {
    const scene = getScene();
    const w = getWorld().geom;
    const [x0, x1] = scene.cam.visibleX();
    const x = Math.min(w.W - 3, Math.max(3, (Math.max(0, x0) + Math.min(w.W, x1)) / 2 + (Math.random() - 0.5) * 6));
    const r = it.kind === 'decor' ? A.placeDecor(g, it.id, x, 0.55) : A.placePlant(g, it.id, x, 0.4);
    if (act(r, 'splash').ok) setUI({ decorSel: r.value ?? null });
  };
  if (!items.length) {
    return (
      <div class="decorbar tray">
        <span class="muted">{t('hint.decorEmpty')}</span>
        <button class="btn blue" onClick={() => openPanel('shop', 'decor')}><I.Bag size={16} /> {t('menu.shop')}</button>
      </div>
    );
  }
  return (
    <div class="decorbar tray">
      {items.map((it) => (
        <button class="trayitem" onClick={() => place(it)}>
          <img src={it.kind === 'decor' ? decorThumb(it.id) : plantThumb(it.id)} />
          <span class="num">×{it.n}</span>
        </button>
      ))}
    </div>
  );
}

function DecorBar() {
  useUI();
  const g = getGame();
  const id = ui.decorSel;
  if (ui.tool !== 'decor') return null;
  if (!id) return <DecorTray />;
  return (
    <div class="decorbar">
      <button class="btn blue" onClick={() => act(A.flipItem(g, id))}><I.Flip size={16} /> {t('c.flip')}</button>
      <button class="btn ghost" onClick={() => { act(A.storeItem(g, id)); setUI({ decorSel: null }); }}><I.Box size={16} /> {t('c.store')}</button>
      <button class="btn ghost" onClick={() => setUI({ decorSel: null })}><I.Check size={16} /></button>
    </div>
  );
}

// ------------------------------------------------------------------ balık kartı

function FishCard() {
  useUI(3);
  const g = getGame();
  const id = ui.selectedFish;
  const found = id ? findFish(g.state, id) : null;
  const [renaming, setRenaming] = useState(false);
  if (!found) return null;
  const { fish: f, tank } = found;
  const sp = getSpecies(f.sp);
  const env = computeEnv(tank);
  const mood = moodFor(f, sp, tank, env);
  const stage = stageOf(f.g);
  const value = sellValue(g.state, f);
  const tta = timeToAdult(f, sp, tank);
  const agent = getWorld().agents.get(f.id);
  const side = agent && getScene().cam.sx(agent.x) < getScene().cam.vw / 2 ? 'r' : 'l';
  const variant = f.var ? sp.variants?.find((v) => v.id === f.var) : undefined;
  const other = g.state.tanks.find((x) => x.id !== tank.id);
  return (
    <div class={`fishcard ${side}`}>
      <div class="row">
        <img src={speciesThumb(f.sp, f.sex, f.var, stage)} style={{ width: '76px', height: '50px', objectFit: 'contain' }} />
        <div class="grow" style={{ flex: 1, minWidth: 0 }}>
          {renaming ? (
            <input
              autoFocus
              maxLength={16}
              defaultValue={f.name}
              style={{ width: '100%', fontSize: '15px', borderRadius: '8px', border: '0', padding: '4px' }}
              onBlur={(e) => { A.renameFish(g, f.id, (e.target as HTMLInputElement).value); setRenaming(false); }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          ) : (
            <h3 onClick={() => setRenaming(true)}>{f.name} {f.sex === 'M' ? '♂' : '♀'}</h3>
          )}
          <div class="muted">{tx(sp.name)}{variant ? ` · ${tx(variant.name)}` : ''} · {t(`stage.${stage}` as TKey)}</div>
        </div>
        <button class="iconbtn" onClick={() => { A.toggleFavorite(g, f.id); refresh(); }}><I.StarFav size={20} on={!!f.fav} /></button>
        <button class="iconbtn" onClick={() => setUI({ selectedFish: null })}><I.Close size={18} /></button>
      </div>
      <div class="stat"><span>{t('fish.growth')}</span><Bar v={f.g * 100} c="#22d3ee" /><b class="num">{Math.floor(f.g * 100)}%</b></div>
      <div class="muted">{f.g >= 1 ? t('fish.adult') : Number.isFinite(tta) ? t('fish.adultIn', { t: fmtTime(tta, getLang()) }) : t('fish.notGrowing')}</div>
      <div class="stat"><span>{t('fish.food')}</span><Bar v={f.food} c={barColor(f.food)} /></div>
      <div class="stat"><span>{t('fish.hp')}</span><Bar v={f.hp} c={barColor(f.hp)} /></div>
      <div class="stat"><span>{t('fish.joy')}</span><Bar v={f.joy} c={barColor(f.joy)} /></div>
      <div class="traits">
        {mood.reasons.filter((r) => Math.abs(r.d) >= 5).sort((a, b) => a.d - b.d).slice(0, 5).map((r) => (
          <span class="trait" style={{ color: r.d > 0 ? '#86efac' : '#fda4af' }}>{r.d > 0 ? '▲' : '▼'} {t(`mood.${r.k}` as TKey)}</span>
        ))}
      </div>
      {f.sick ? <div class="no">💊 {t('fish.sick')}</div> : null}
      {f.bred && <div class="muted">🏠 {t('fish.bred')}</div>}
      {(f.cd ?? 0) > 0 && <div class="muted">💤 {t('fish.cooldown')} ({fmtTime(f.cd ?? 0, getLang())})</div>}
      {traitBadges(sp)}
      <div class="muted" style={{ fontStyle: 'italic' }}>{tx(sp.fact)}</div>
      <div class="row wrap">
        <button class="btn gold" onClick={async () => {
          if (f.g < 1 && !(await ask(`${t('c.sell')}: ${f.name} (${t(`stage.${stage}` as TKey)}) → ${fmt(value)}?`))) return;
          const r = act(A.sellFish(g, f.id), 'sell');
          if (r.ok) { toast(t('ev.sold', { c: fmt(r.value ?? 0) }), 'good'); setUI({ selectedFish: null }); ads.noteSell(); ads.maybeInterstitial(); }
        }}><I.Coin size={16} /> {t('fish.sellFor', { c: fmt(value) })}</button>
        {f.sick ? <button class="btn red" onClick={() => { const r = act(A.medicate(g, tank), 'success'); if (r.ok) toast(t('tank.medicated', { n: r.value ?? 0 }), 'good'); }}><I.Pill size={16} /> {t('fish.medicine')}</button> : null}
        {f.g < 1 && (
          <>
            <button class="btn purple" onClick={() => act(A.useElixir(g, f.id), 'success')}>🧪 {t('fish.elixir')} {(g.state.inv.items.elixir ?? 0) > 0 ? `(${g.state.inv.items.elixir})` : <Price pearls={5} />}</button>
            <button class="btn blue" onClick={() => act(A.growInstant(g, f.id), 'levelUp')}>⚡ {t('fish.growNow')} <Price pearls={growPearlCost((1 - f.g) * sp.growTime)} /></button>
            {ads.available('boostGrowth') && <button class="btn purple" onClick={async () => { if (await watchAd('boostGrowth')) act(A.adGrowthBoost(g, f.id), 'success'); }}><I.Play size={16} /> {t('fish.boostAd')}</button>}
          </>
        )}
        {other && other.type === tank.type && <button class="btn ghost" onClick={() => { act(A.moveFish(g, f.id, other.id)); setUI({ selectedFish: null }); }}>{t('fish.move')}</button>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ mağaza

function ShopPanel() {
  useUI(2);
  const g = getGame();
  const s = g.state;
  const tank = g.tank;
  const marine = tank.type === 'marine';
  const tab = ui.panelTab || 'fish';
  const lvl = s.player.level;
  const [sexes, setSexes] = useState<Record<string, 'M' | 'F'>>({});
  const tabs: [string, string][] = [
    ['fish', t('shop.fish')],
    ['creatures', t('shop.creatures')],
    ['plants', marine ? t('shop.corals') : t('shop.plants')],
    ['decor', t('shop.decor')],
    ['equipment', t('shop.equipment')],
    ['care', t('shop.care')],
    ['looks', t('shop.looks')],
  ];
  const lockedCard = (level: number) => level > lvl;
  const buySp = (sp: SpeciesDef) => {
    const r = act(A.buySpecies(g, sp.id, sexes[sp.id] ?? 'M'), 'splash');
    if (r.ok && r.value) toast(t('shop.added', { name: r.value.name }), 'good');
  };
  const place = (kind: 'decor' | 'plant', id: string) => {
    const g2 = getWorld().geom;
    const x = 4 + Math.random() * (g2.W - 8);
    const z = 0.2 + Math.random() * 0.7;
    const r = kind === 'decor' ? A.placeDecor(g, id, x, z) : A.placePlant(g, id, x, z);
    if (r.ok) {
      toast(t('shop.placeNow'), 'good');
      closePanel();
      setUI({ tool: 'decor', decorSel: r.value ?? null });
    }
  };
  let body: preact.JSX.Element;
  if (tab === 'fish' || tab === 'creatures') {
    const list = SPECIES.filter((sp) => sp.water === tank.type && !sp.exclusive && (tab === 'fish' ? sp.kind === 'fish' : sp.kind !== 'fish')).sort((a, b) => a.level - b.level || a.price - b.price);
    body = (
      <div class="grid">
        {list.map((sp) => (
          <div class={`card ${lockedCard(sp.level) ? 'locked' : ''}`}>
            <span class={`rar ${sp.rarity}`}>{t(`rar.${sp.rarity}` as TKey)}</span>
            {s.daily.hot.includes(sp.id) && <span class="rar legendary" style={{ left: 'auto', right: '6px' }}>{t('c.hot')}</span>}
            <div class="thumb"><img src={speciesThumb(sp.id, sexes[sp.id] ?? 'M')} /></div>
            <h3>{tx(sp.name)}</h3>
            <div class="sub">{sp.temp[0]}–{sp.temp[1]}°C · {t('shop.grows')} {fmtTime(sp.growTime, getLang())} · {t('shop.space')} {sp.bioload}</div>
            <div class="sub">{t('shop.sells')}: <Price coins={sp.sell} />{sp.minTier ? ` · ${t('shop.minTier', { n: sp.minTier + 1 })}` : ''}</div>
            {traitBadges(sp)}
            {lockedCard(sp.level) ? (
              <div class="muted"><I.Lock size={14} /> {t('c.unlockAt', { n: sp.level })}</div>
            ) : (
              <div class="row">
                {sp.breed && (
                  <button class="btn ghost" style={{ padding: '6px 8px' }} onClick={() => setSexes({ ...sexes, [sp.id]: (sexes[sp.id] ?? 'M') === 'M' ? 'F' : 'M' })}>
                    {(sexes[sp.id] ?? 'M') === 'M' ? '♂' : '♀'}
                  </button>
                )}
                <button class="btn" style={{ flex: 1 }} onClick={() => buySp(sp)}><Price coins={sp.price} pearls={sp.pearls} /></button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  } else if (tab === 'plants') {
    const list = PLANTS.filter((p) => p.water === tank.type).sort((a, b) => a.level - b.level);
    body = (
      <div class="grid">
        {list.map((p) => (
          <div class={`card ${lockedCard(p.level) ? 'locked' : ''}`}>
            <span class={`rar ${p.rarity}`}>{t(`rar.${p.rarity}` as TKey)}</span>
            <div class="thumb"><img src={plantThumb(p.id)} /></div>
            <h3>{tx(p.name)}</h3>
            <div class="sub">{tx(p.fact)}</div>
            <div class="sub">{t('shop.light', { n: p.light })} · {t('shop.beauty')} {p.beauty} · {t('shop.trim')} <Price coins={p.trim} /></div>
            {p.sites.length > 0 && <div class="traits"><span class="trait special">🥚 {p.sites.map((x) => t(`site.${x}` as TKey)).join(', ')}</span></div>}
            {lockedCard(p.level) ? <div class="muted"><I.Lock size={14} /> {t('c.unlockAt', { n: p.level })}</div> : (
              <div class="row">
                <button class="btn" style={{ flex: 1 }} onClick={() => { if (act(A.buyPlant(g, p.id), 'coin').ok) place('plant', p.id); }}><Price coins={p.price} pearls={p.pearls} /></button>
                {(s.inv.plants[p.id] ?? 0) > 0 && <button class="btn blue" onClick={() => place('plant', p.id)}>{t('c.place')} ({s.inv.plants[p.id]})</button>}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  } else if (tab === 'decor') {
    const list = DECOR.filter((d) => (d.water === 'both' || d.water === tank.type) && (!d.exclusive || (s.inv.decor[d.id] ?? 0) > 0)).sort((a, b) => a.level - b.level);
    body = (
      <div class="grid">
        {list.map((d) => (
          <div class={`card ${lockedCard(d.level) ? 'locked' : ''}`}>
            <span class={`rar ${d.rarity}`}>{t(`rar.${d.rarity}` as TKey)}</span>
            <div class="thumb"><img src={decorThumb(d.id)} /></div>
            <h3>{tx(d.name)}</h3>
            <div class="sub">{tx(d.desc)}</div>
            <div class="sub">{t('shop.beauty')} {d.beauty}{d.hide ? ` · ${t('shop.hide')}` : ''}{d.sites?.length ? ` · 🥚 ${d.sites.map((x) => t(`site.${x}` as TKey)).join(', ')}` : ''}</div>
            {lockedCard(d.level) ? <div class="muted"><I.Lock size={14} /> {t('c.unlockAt', { n: d.level })}</div> : (
              <div class="row">
                {!d.exclusive && <button class="btn" style={{ flex: 1 }} onClick={() => { if (act(A.buyDecor(g, d.id), 'coin').ok) place('decor', d.id); }}><Price coins={d.price} pearls={d.pearls} /></button>}
                {(s.inv.decor[d.id] ?? 0) > 0 && <button class="btn blue" onClick={() => place('decor', d.id)}>{t('c.place')} ({s.inv.decor[d.id]})</button>}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  } else if (tab === 'equipment') {
    body = <EquipmentList tank={tank} />;
  } else if (tab === 'care') {
    body = (
      <div class="grid">
        {FOODS.filter((f) => f.water === 'both' || f.water === tank.type).map((f) => (
          <div class={`card ${lockedCard(f.level) ? 'locked' : ''}`}>
            <div class="thumb"><div style={{ width: '34px', height: '34px', borderRadius: '50%', background: f.color, boxShadow: 'inset -4px -4px 0 rgba(0,0,0,0.2)' }} /></div>
            <h3>{tx(f.name)}</h3>
            <div class="sub">{tx(f.desc)}</div>
            <div class="sub">{t('shop.packOf', { n: f.pack })} · {t('shop.inStock', { n: s.inv.food[f.id] ?? 0 })}</div>
            {lockedCard(f.level) ? <div class="muted"><I.Lock size={14} /> {t('c.unlockAt', { n: f.level })}</div> : <button class="btn" onClick={() => act(A.buyFood(g, f.id), 'coin')}><Price coins={f.price} pearls={f.pearls} /></button>}
          </div>
        ))}
        {ITEMS.map((it) => (
          <div class={`card ${lockedCard(it.level) ? 'locked' : ''}`}>
            <div class="thumb">{it.id === 'medicine' ? <I.Pill size={40} /> : it.id === 'elixir' ? <span style={{ fontSize: '34px' }}>🧪</span> : <I.Egg size={40} />}</div>
            <h3>{tx(it.name)}</h3>
            <div class="sub">{tx(it.desc)}</div>
            <div class="sub">{t('shop.inStock', { n: s.inv.items[it.id] ?? 0 })}</div>
            {it.id === 'mysteryEgg' && <div class="sub">{t('shop.oddsTitle')}: {Object.entries(EGG_ODDS).map(([r, p]) => `${t(`rar.${r}` as TKey)} ${(p * 100).toFixed(1)}%`).join(' · ')}</div>}
            {lockedCard(it.level) ? <div class="muted"><I.Lock size={14} /> {t('c.unlockAt', { n: it.level })}</div> : (
              <div class="row">
                <button class="btn" style={{ flex: 1 }} onClick={() => act(A.buyItem(g, it.id), 'coin')}><Price coins={it.price} pearls={it.pearls} /></button>
                {it.id === 'mysteryEgg' && (s.inv.items.mysteryEgg ?? 0) > 0 && (
                  <button class="btn purple" onClick={() => { const r = act(A.openMysteryEgg(g), 'levelUp'); if (r.ok && r.value) toast(t('inv.eggResult', { name: tx(getSpecies(r.value.sp).name) }), 'good'); }}>{t('c.open')}</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  } else {
    body = <LooksList tank={tank} />;
  }
  return (
    <Modal title={t('shop.title')} onClose={closePanel} tabs={tabs} tab={tab} onTab={(k) => setUI({ panelTab: k })}>
      {body}
    </Modal>
  );
}

function EquipmentList({ tank }: { tank: TankState }) {
  const g = getGame();
  const lvl = g.state.player.level;
  const slots: EquipSlot[] = ['filter', 'heater', 'chiller', 'air', 'light', 'uv', 'feeder', 'co2'];
  return (
    <div class="list">
      {slots.map((slot) => {
        const cur = tank.equip[slot] ?? 0;
        const next = EQUIPMENT.filter((e) => e.slot === slot && e.tier > cur).sort((a, b) => a.tier - b.tier)[0];
        const curDef = getEquip(slot, cur);
        return (
          <div class="item">
            <div class="grow">
              <b>{t(`slot.${slot}` as TKey)}</b> <span class="muted">· {curDef ? tx(curDef.name) : t('tank.notInstalled')}</span>
              {next && <div class="muted">→ {tx(next.name)}: {tx(next.desc)}</div>}
            </div>
            {next ? (
              next.level > lvl ? <span class="muted"><I.Lock size={14} /> {t('c.unlockAt', { n: next.level })}</span> : (
                <button class="btn" onClick={() => act(A.buyEquipment(g, slot, next.tier, tank), 'success')}>{cur ? t('c.upgrade') : t('c.install')} <Price coins={next.price} pearls={next.pearls} /></button>
              )
            ) : <span class="ok">{t('c.max')}</span>}
          </div>
        );
      })}
    </div>
  );
}

function LooksList({ tank }: { tank: TankState }) {
  const g = getGame();
  const s = g.state;
  return (
    <div class="list">
      {COSMETICS.filter((c) => c.water === 'both' || c.water === tank.type).map((c) => {
        const owned = !!s.owned[c.id];
        const inUse = tank.background === c.id || tank.substrate === c.id;
        return (
          <div class="item">
            <div class="grow"><b>{tx(c.name)}</b> <span class="muted">· {c.kind === 'background' ? t('tank.background') : t('tank.substrate')}</span></div>
            {inUse ? <span class="ok">{t('c.applied')}</span> : owned ? (
              <button class="btn blue" onClick={() => act(A.applyCosmetic(g, c.id, tank))}>{t('c.apply')}</button>
            ) : c.level > s.player.level ? <span class="muted"><I.Lock size={14} /> {t('c.unlockAt', { n: c.level })}</span> : (
              <button class="btn" onClick={() => { if (act(A.buyCosmetic(g, c.id), 'coin').ok) act(A.applyCosmetic(g, c.id, tank)); }}><Price coins={c.price} pearls={c.pearls} /></button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ tankım

function MyTankPanel() {
  useUI(2);
  const g = getGame();
  const s = g.state;
  const tank = g.tank;
  const tab = ui.panelTab || 'animals';
  const adults = tank.fish.filter((f) => f.g >= 1 && !f.fav);
  const total = adults.reduce((a, f) => a + sellValue(s, f), 0);
  return (
    <Modal title={`${t('inv.title')} · ${t('tank.capacity', { a: capacityUsed(tank), b: tierDef(tank).cap })}`} onClose={closePanel}
      tabs={[['animals', t('inv.animals')], ['storage', t('inv.storage')]]} tab={tab} onTab={(k) => setUI({ panelTab: k })}>
      {tab === 'animals' ? (
        <>
          {adults.length > 0 && (
            <button class="btn gold" style={{ marginBottom: '8px' }} onClick={async () => {
              if (!(await ask(t('inv.sellAdultsQ', { n: adults.length, c: fmt(total) })))) return;
              const r = act(A.sellAllAdults(g), 'sell');
              if (r.ok) { toast(t('ev.sold', { c: fmt(r.value?.total ?? 0) }), 'good'); for (let i = 0; i < adults.length; i++) ads.noteSell(); ads.maybeInterstitial(); }
            }}><I.Coin size={16} /> {t('inv.sellAdults')} ({fmt(total)})</button>
          )}
          {!tank.fish.length && <div class="muted">{t('inv.empty')}</div>}
          <div class="list">
            {tank.fish.slice().sort((a, b) => b.g - a.g).map((f: FishState) => {
              const sp = getSpecies(f.sp);
              return (
                <div class="item" onClick={() => { closePanel(); setUI({ tool: 'hand', selectedFish: f.id }); }}>
                  <img src={speciesThumb(f.sp, f.sex, f.var, stageOf(f.g))} />
                  <div class="grow">
                    <b>{f.fav ? '★ ' : ''}{f.name}</b> <span class="muted">{tx(sp.name)} · {t(`stage.${stageOf(f.g)}` as TKey)}{f.sick ? ' · 💊' : ''}</span>
                    <div class="row" style={{ gap: '4px' }}><Bar v={f.g * 100} c="#22d3ee" /><Bar v={f.food} c={barColor(f.food)} /><Bar v={f.joy} c={barColor(f.joy)} /></div>
                  </div>
                  <Price coins={sellValue(s, f)} />
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div class="list">
          {[...Object.entries(s.inv.decor).filter(([, n]) => n > 0).map(([id, n]) => ({ id, n, kind: 'decor' as const })),
            ...Object.entries(s.inv.plants).filter(([, n]) => n > 0).map(([id, n]) => ({ id, n, kind: 'plant' as const }))].map((it) => (
            <div class="item">
              <img src={it.kind === 'decor' ? decorThumb(it.id) : plantThumb(it.id)} />
              <div class="grow"><b>{tx(it.kind === 'decor' ? getDecor(it.id).name : getPlant(it.id).name)}</b> <span class="muted">x{it.n}</span></div>
              <button class="btn blue" onClick={() => {
                const w = getWorld().geom;
                const r = it.kind === 'decor' ? A.placeDecor(g, it.id, 4 + Math.random() * (w.W - 8), 0.5) : A.placePlant(g, it.id, 4 + Math.random() * (w.W - 8), 0.3);
                if (act(r).ok) { closePanel(); setUI({ tool: 'decor', decorSel: r.value ?? null }); }
              }}>{t('c.place')}</button>
            </div>
          ))}
          {Object.values(s.inv.decor).every((n) => !n) && Object.values(s.inv.plants).every((n) => !n) && <div class="muted">{t('inv.storageEmpty')}</div>}
        </div>
      )}
    </Modal>
  );
}

// ------------------------------------------------------------------ üreme

function BreedPanel() {
  useUI(2);
  const g = getGame();
  const tank = g.tank;
  const env = computeEnv(tank);
  const breeders = breederSpeciesIn(tank);
  const candidates = SPECIES.filter((sp) => sp.breed && sp.water === tank.type && !breeders.includes(sp));
  return (
    <Modal title={t('breed.title')} onClose={closePanel}>
      <div class="muted">{t('breed.intro')}</div>
      {tank.clutches.length > 0 && <div class="sec">{t('breed.active')}</div>}
      <div class="list">
        {tank.clutches.map((c) => {
          const sp = getSpecies(c.sp);
          return (
            <div class="item">
              <img src={speciesThumb(c.sp)} />
              <div class="grow">
                <b>{tx(sp.name)}</b> <span class="muted">· {c.stage === 'court' ? t('breed.court') : t('breed.eggs')}</span>
                <div class="row"><Bar v={clutchProgress(c) * 100} c="#f472b6" /><span class="muted">{c.paused ? (c.t <= 0 ? t('breed.noSpace') : t('breed.paused')) : t('breed.hatchIn', { t: fmtTime(c.t, getLang()) })}</span></div>
              </div>
              {(c.speedups ?? 0) < 2 && ads.available('speedBreed') && <button class="btn purple" onClick={async () => { if (await watchAd('speedBreed')) act(A.speedUpClutch(g, c.id, 'ad'), 'success'); }}><I.Play size={14} /> ½</button>}
              <button class="btn blue" onClick={() => act(A.speedUpClutch(g, c.id, 'pearls'), 'success')}>⚡ <Price pearls={A.clutchSpeedCost(g, c.id)} /></button>
            </div>
          );
        })}
      </div>
      <div class="sec">{t('breed.pairs')}</div>
      {!breeders.length && <div class="muted">{t('breed.none')}</div>}
      <div class="list">
        {breeders.map((sp) => {
          const chk = checkBreeding(tank, sp, env);
          const b = sp.breed!;
          const label = (k: string) =>
            k === 'happy' ? t('breed.c.happy', { n: b.minHappy }) : k === 'quality' ? t('breed.c.quality', { n: b.minQ }) : k === 'temp' ? t('breed.c.temp', { a: b.temp[0], b: b.temp[1] }) :
            k === 'site' ? t('breed.c.site', { s: b.needs.map((x) => t(`site.${x}` as TKey)).join(' / ') }) : t(`breed.c.${k}` as TKey);
          return (
            <div class="item" style={{ alignItems: 'flex-start' }}>
              <img src={speciesThumb(sp.id)} />
              <div class="grow">
                <b>{tx(sp.name)}</b> <span class="muted">· {t(`method.${b.method}` as TKey)} · {t('breed.brood', { a: b.brood[0], b: b.brood[1] })} · {t('breed.mutation', { n: Math.round(b.mutation * 100) })}</span>
                <div class="traits">{chk.items.map((i) => <span class="trait" style={{ color: i.ok ? '#86efac' : '#fda4af' }}>{i.ok ? '✓' : '✗'} {label(i.k)}</span>)}</div>
              </div>
              <button class="btn" disabled={!chk.ok} onClick={() => { if (act(A.breed(g, sp.id), 'heart').ok) toast(t('breed.started'), 'good'); }}>💕 {t('breed.start')}</button>
            </div>
          );
        })}
      </div>
      {candidates.length > 0 && (
        <>
          <div class="sec">{t('breed.candidates')}</div>
          <div class="traits">{candidates.map((sp) => <span class="trait">{tx(sp.name)} ({t('c.lv')} {sp.level})</span>)}</div>
        </>
      )}
    </Modal>
  );
}

// ------------------------------------------------------------------ görevler

function QuestsPanel() {
  useUI(1);
  const g = getGame();
  const s = g.state;
  const tab = ui.panelTab || 'daily';
  const lr = todaysLoginReward(s);
  const claimLogin = async (double: boolean) => {
    if (double && !(await watchAd('doubleQuest'))) return;
    const m = double ? 2 : 1;
    s.daily.loginClaimed = true;
    if (lr.kind === 'coins') g.addCoins(lr.amount * m);
    else if (lr.kind === 'pearls') g.addPearls(lr.amount * m);
    else if (lr.kind === 'food') s.inv.food[lr.id] = (s.inv.food[lr.id] ?? 0) + lr.amount * m;
    else if (lr.kind === 'items') for (const [k, v] of Object.entries(lr.items)) s.inv.items[k] = (s.inv.items[k] ?? 0) + v * m;
    else { s.inv.items.mysteryEgg = (s.inv.items.mysteryEgg ?? 0) + m; g.addPearls(lr.pearls * m); }
    audio.play('success');
    refresh();
  };
  const rewardText = (r: typeof lr) =>
    r.kind === 'coins' ? `${fmt(r.amount)} ${t('c.coins')}` : r.kind === 'pearls' ? `${r.amount} ${t('c.pearls')}` : r.kind === 'food' ? t('q.foodPack') : r.kind === 'items' ? t('q.items') : `${t('q.egg')} + ${r.pearls} ${t('c.pearls')}`;
  return (
    <Modal title={t('q.title')} onClose={closePanel} tabs={[['daily', t('q.daily')], ['login', t('q.login')], ['ach', t('q.ach')]]} tab={tab} onTab={(k) => setUI({ panelTab: k })}>
      {tab === 'daily' && (
        <div class="list">
          <div class="muted">{t('q.resetsIn', { t: fmtTime(msUntilMidnight() / 1000, getLang()) })}</div>
          {s.daily.quests.map((q) => {
            const tpl = QUEST_TEMPLATES.find((x) => x.kind === q.kind)!;
            const done = q.progress >= q.target;
            return (
              <div class="item">
                <div class="grow">
                  <b>{tx(tpl.text).replace('{n}', fmt(q.target))}</b>
                  <div class="row"><Bar v={(q.progress / q.target) * 100} c="#22d3ee" /><span class="muted num">{fmt(Math.floor(q.progress))}/{fmt(q.target)}</span></div>
                  <div class="row muted"><Price coins={q.coins} /> <I.Star size={14} /> {q.xp} {q.pearls ? <Price pearls={q.pearls} /> : null}</div>
                </div>
                {q.claimed ? <span class="ok">{t('c.claimed')}</span> : done ? (
                  <div class="row">
                    <button class="btn" onClick={() => { claimQuest(g, q.id); audio.play('success'); refresh(); }}>{t('c.claim')}</button>
                    {ads.available('doubleQuest') && <button class="btn purple" onClick={async () => { if (await watchAd('doubleQuest')) { claimQuest(g, q.id, true); audio.play('success'); refresh(); } }}><I.Play size={14} /> x2</button>}
                  </div>
                ) : ads.available('rerollQuest') ? (
                  <button class="btn ghost" onClick={async () => { if (await watchAd('rerollQuest')) { rerollQuest(g, q.id); refresh(); } }}><I.Play size={14} /> {t('q.reroll')}</button>
                ) : null}
              </div>
            );
          })}
          <div class="item">
            <I.Gift size={32} />
            <div class="grow"><b>{t('q.bonus')}</b><div class="muted">{t('q.bonusDesc')} · <Price coins={bonusReward(s).coins} /> <Price pearls={bonusReward(s).pearls} /></div></div>
            {s.daily.bonusClaimed ? <span class="ok">{t('c.claimed')}</span> : <button class="btn gold" disabled={!s.daily.quests.every((q) => q.claimed)} onClick={() => { if (claimBonus(g)) { audio.play('levelUp'); refresh(); } }}>{t('c.claim')}</button>}
          </div>
          {isVip(s) && (
            <div class="item">
              <I.Crown size={30} />
              <div class="grow"><b>{t('q.vip')}</b> <Price pearls={BAL.VIP_DAILY_PEARLS} /></div>
              {s.daily.vipClaimed ? <span class="ok">{t('c.claimed')}</span> : <button class="btn gold" onClick={() => { s.daily.vipClaimed = true; g.addPearls(BAL.VIP_DAILY_PEARLS); audio.play('success'); refresh(); }}>{t('c.claim')}</button>}
            </div>
          )}
        </div>
      )}
      {tab === 'login' && (
        <>
          <div class="muted">{t('q.loginDesc')}</div>
          <div class="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', marginTop: '8px' }}>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => {
              const today = d === s.daily.loginStreak;
              const past = d < s.daily.loginStreak || (today && s.daily.loginClaimed);
              return (
                <div class="card center" style={{ borderColor: today ? '#fbbf24' : undefined, opacity: past ? 0.6 : 1, padding: '6px 2px' }}>
                  <b style={{ fontSize: '12px' }}>{today ? t('q.today') : t('q.day', { n: d })}</b>
                  <div style={{ fontSize: '22px' }}>{d === 7 ? '🥚' : d === 3 || d === 6 ? '💎' : d === 2 ? '🍤' : d === 5 ? '💊' : '🪙'}</div>
                  {past && <span class="ok">✓</span>}
                </div>
              );
            })}
          </div>
          <div class="row" style={{ marginTop: '10px' }}>
            <b class="grow" style={{ flex: 1 }}>{rewardText(lr)}</b>
            {s.daily.loginClaimed ? <span class="ok">{t('c.claimed')}</span> : (
              <>
                <button class="btn gold" onClick={() => claimLogin(false)}>{t('c.claim')}</button>
                {ads.available('doubleQuest') && <button class="btn purple" onClick={() => claimLogin(true)}><I.Play size={14} /> x2</button>}
              </>
            )}
          </div>
        </>
      )}
      {tab === 'ach' && (
        <div class="list">
          {ACHIEVEMENTS.map((a) => {
            const st = achievementStatus(s, a);
            return (
              <div class="item">
                <div class="grow">
                  <b>{tx(a.text).replace('{n}', fmt(st.next))}</b> <span class="muted">({st.claimed}/{a.tiers.length})</span>
                  <div class="row"><Bar v={(st.value / st.next) * 100} c="#a78bfa" /><span class="muted num">{fmt(Math.min(st.value, st.next))}/{fmt(st.next)}</span></div>
                </div>
                {st.done ? <span class="ok">✓</span> : <button class="btn" disabled={!st.claimable} onClick={() => { if (claimAchievement(g, a.id)) { audio.play('success'); refresh(); } }}><Price pearls={st.pearls} /></button>}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ------------------------------------------------------------------ bakım

function CarePanel() {
  useUI(2);
  const g = getGame();
  const s = g.state;
  const tank = g.tank;
  const env = computeEnv(tank);
  const [minT, maxT] = tempRange(env);
  const tier = tierDef(tank);
  const type = getTankType(tank.type);
  const next = type.tiers[tank.tier + 1];
  const sick = tank.fish.filter((f) => f.sick).length;
  const marineType = TANK_TYPES.find((x) => x.id === 'marine')!;
  const hasMarine = s.tanks.some((x) => x.type === 'marine');
  return (
    <Modal title={`${t('tank.title')} · ${tx(tier.name)} (${t('tank.liters', { n: tier.liters })})`} onClose={closePanel}>
      <div class="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
        <div class="card">
          <div class="stat"><span>{t('tank.quality')}</span><Bar v={100 - tank.pollution} c={barColor(100 - tank.pollution)} /><b class="num">{Math.round(100 - tank.pollution)}%</b></div>
          <div class="stat"><span>{t('tank.oxygen')}</span><Bar v={tank.oxygen} c={barColor(tank.oxygen)} /><b class="num">{Math.round(tank.oxygen)}%</b></div>
          <div class="stat"><span>{t('tank.algae')}</span><Bar v={env.avgAlgae * 100} c="#65a30d" /><b class="num">{Math.round(env.avgAlgae * 100)}%</b></div>
          <div class="stat"><span>{t('tank.dirt')}</span><Bar v={tank.dirt} c="#a16207" /><b class="num">{Math.round(tank.dirt)}%</b></div>
          <div class="row"><span class="muted">{t('tank.beauty')}</span> <b class="num">{Math.round(beautyScore(tank, env))}</b> <span class="spacer" /> <span class="muted">{t('tank.income')}</span> <Price coins={Math.round(tipRatePerMin(s, tank, env))} /><span class="muted">{t('c.perMin')}</span></div>
        </div>
        <div class="card">
          <div class="row"><I.Thermo size={20} /><b>{t('tank.target')}</b><span class="spacer" /><b class="num">{tank.targetTemp.toFixed(1)}°C</b></div>
          {maxT <= minT ? <div class="muted">{t('tank.noHeater')}</div> : (
            <div class="row">
              <button class="btn ghost" onClick={() => { A.setTargetTemp(tank, tank.targetTemp - 0.5); refresh(); }}>−</button>
              <input type="range" min={minT} max={maxT} step={0.5} value={tank.targetTemp} style={{ flex: 1 }} onInput={(e) => { A.setTargetTemp(tank, +(e.target as HTMLInputElement).value); refresh(); }} />
              <button class="btn ghost" onClick={() => { A.setTargetTemp(tank, tank.targetTemp + 0.5); refresh(); }}>+</button>
            </div>
          )}
          <div class="row"><I.Bulb size={20} /><b>{t('tank.lights')}</b><span class="spacer" /><Toggle on={tank.light} onChange={() => { A.toggleLight(g, tank); refresh(); }} /></div>
        </div>
        <div class="card">
          <button class="btn blue" onClick={() => { if (act(A.waterChange(g, tank), 'splash').ok) toast(t('tank.changed'), 'good'); }}><I.Drop size={16} /> {t('tank.waterChange')} <Price coins={waterChangeCost(tank)} /></button>
          <div class="muted">{t('tank.waterChangeDesc')}</div>
          <div class="row">
            <button class="btn" style={{ flex: 1 }} onClick={() => { if (act(A.quickClean(g, tank), 'success').ok) toast(t('tank.cleaned'), 'good'); }}>✨ {t('tank.quickClean')} <Price coins={quickCleanCost(tank)} /></button>
            {ads.available('cleanTank') && <button class="btn purple" onClick={async () => { if (await watchAd('cleanTank')) { A.quickClean(g, tank, true); toast(t('tank.cleaned'), 'good'); } }}><I.Play size={14} /></button>}
          </div>
          {sick > 0 && <button class="btn red" onClick={() => { const r = act(A.medicate(g, tank), 'success'); if (r.ok) toast(t('tank.medicated', { n: r.value ?? 0 }), 'good'); }}><I.Pill size={16} /> {t('tank.medicine')} ({t('tank.sickN', { n: sick })})</button>}
        </div>
        <div class="card">
          <b>{t('tank.tank')}: {tx(tier.name)}</b>
          <div class="muted">{t('tank.capacity', { a: capacityUsed(tank), b: tier.cap })}</div>
          {next ? (
            <>
              <div class="muted">{t('tank.next', { name: `${tx(next.name)} · ${next.liters} L · ${t('shop.space')} ${next.cap}` })}</div>
              {next.level > s.player.level ? <span class="muted"><I.Lock size={14} /> {t('c.unlockAt', { n: next.level })}</span> : (
                <button class="btn gold" onClick={() => { if (act(A.upgradeTank(g, tank), 'levelUp').ok) { toast(t('ev.tankUp'), 'good'); closePanel(); } }}>{t('tank.upgrade')} <Price coins={next.price} /></button>
              )}
            </>
          ) : <span class="ok">{t('tank.maxed')}</span>}
          {!hasMarine && (
            <>
              <div class="muted" style={{ marginTop: '6px' }}>🪸 {t('tank.buyReefDesc')}</div>
              {marineType.level > s.player.level ? <span class="muted"><I.Lock size={14} /> {t('c.unlockAt', { n: marineType.level })}</span> : (
                <button class="btn purple" onClick={() => { if (act(A.buyMarineTank(g), 'levelUp').ok) { toast(t('ev.reef'), 'good'); closePanel(); } }}>{t('tank.buyReef')} <Price coins={marineType.price} /></button>
              )}
            </>
          )}
        </div>
      </div>
      <div class="sec">{t('tank.equipment')}</div>
      <EquipmentList tank={tank} />
      <div class="sec">{t('tank.look')}</div>
      <LooksList tank={tank} />
    </Modal>
  );
}

// ------------------------------------------------------------------ rehber

function GuidePanel() {
  const s = getGame().state;
  const [open, setOpen] = useState<string | null>(null);
  const found = SPECIES.filter((sp) => s.discovered[sp.id]).length;
  const sp = open ? getSpecies(open) : null;
  return (
    <Modal title={`${t('guide.title')} · ${t('guide.discovered', { a: found, b: SPECIES.length })}`} onClose={closePanel}>
      {sp ? (
        <div class="list">
          <button class="btn ghost" onClick={() => setOpen(null)}><I.Arrow dir="left" size={14} /> {t('c.back')}</button>
          <div class="row"><img src={speciesThumb(sp.id)} style={{ width: '140px' }} /><div><h3 style={{ margin: 0 }}>{tx(sp.name)}</h3><div class="muted" style={{ fontStyle: 'italic' }}>{sp.latin}</div><span class={`rar ${sp.rarity}`} style={{ position: 'static' }}>{t(`rar.${sp.rarity}` as TKey)}</span></div></div>
          <div>{tx(sp.fact)}</div>
          <div class="muted">{t('guide.diet')}: {t(`diet.${sp.diet}` as TKey)} · {t('guide.temper')}: {t(`temper.${sp.temper}` as TKey)} · {t('guide.zone')}: {t(`zone.${sp.zone}` as TKey)} · {sp.temp[0]}–{sp.temp[1]}°C · {t('guide.minQ')}: {sp.minQ}%</div>
          {traitBadges(sp)}
          {sp.variants && <div class="traits">{sp.variants.map((v) => <span class="trait">{s.discovered[`${sp.id}:${v.id}`] ? `✨ ${tx(v.name)} ×${v.mult}` : '???'}</span>)}</div>}
        </div>
      ) : (
        <div class="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
          {SPECIES.map((x) => {
            const known = !!s.discovered[x.id];
            return (
              <div class="card center" onClick={() => known && setOpen(x.id)} style={{ opacity: known ? 1 : 0.45 }}>
                <div class="thumb" style={{ filter: known ? 'none' : 'brightness(0)' }}><img src={speciesThumb(x.id)} /></div>
                <div style={{ fontSize: '12px', fontWeight: 800 }}>{known ? tx(x.name) : t('guide.unknown')}</div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ------------------------------------------------------------------ inci mağazası

function StorePanel() {
  useUI(1);
  const g = getGame();
  const s = g.state;
  const [busy, setBusy] = useState(false);
  const buy = async (id: string) => {
    if (busy) return;
    setBusy(true);
    const r = await iap.purchase(id);
    setBusy(false);
    if (r === 'ok') { toast(t('store.success'), 'good'); audio.play('levelUp'); haptic.success(); }
    else if (r === 'cancelled') toast(t('store.cancelled'));
    else if (r === 'unavailable') toast(t('store.unavailable'), 'bad');
    else toast(t('store.failed'), 'bad');
    refresh();
  };
  const packs = PRODUCTS.filter((p) => p.type === 'consumable');
  const rate = pearlCoinRate(s.player.level);
  return (
    <Modal title={t('store.title')} onClose={closePanel}>
      <div class="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
        {packs.map((p) => (
          <div class="card center">
            {p.tag && <span class={`rar ${p.tag === 'best' ? 'legendary' : 'epic'}`}>{p.tag === 'best' ? t('store.best') : t('store.popular')}</span>}
            <div class="thumb"><I.Pearl size={44} /></div>
            <b class="num" style={{ fontSize: '18px' }}>{fmt(Math.round((p.pearls ?? 0) * (1 + (p.bonusPct ?? 0) / 100)))}</b>
            <div class="muted">{tx(p.name)}{p.bonusPct ? ` · ${t('store.bonus', { n: p.bonusPct })}` : ''}</div>
            <button class="btn gold" disabled={busy} onClick={() => buy(p.id)}>{iap.price(p.id)}</button>
          </div>
        ))}
        <div class="card center">
          <div class="thumb"><I.Play size={44} /></div>
          <b>{t('store.freePearls')}</b>
          <div class="muted">{t('store.freePearlsDesc', { n: FREE_PEARLS_PER_AD, left: ads.remaining('freePearls') })}</div>
          <button class="btn purple" disabled={!ads.available('freePearls')} onClick={async () => { if (await watchAd('freePearls')) { g.addPearls(FREE_PEARLS_PER_AD); audio.play('pearl'); } }}><I.Play size={14} /> +{FREE_PEARLS_PER_AD}</button>
        </div>
      </div>
      <div class="sec">{t('offer.title')}</div>
      <div class="list">
        {!s.iap.starter && (
          <div class="item"><I.Gift size={34} /><div class="grow"><b>{t('store.starter')}</b><div class="muted">{t('store.starterDesc')}</div></div><button class="btn gold" disabled={busy} onClick={() => buy(PRODUCT_IDS.starter)}>{iap.price(PRODUCT_IDS.starter)}</button></div>
        )}
        <div class="item"><span style={{ fontSize: '28px' }}>🚫</span><div class="grow"><b>{t('store.removeAds')}</b><div class="muted">{t('store.removeAdsDesc')}</div></div>{s.iap.removeAds ? <span class="ok">{t('store.owned')}</span> : <button class="btn gold" disabled={busy} onClick={() => buy(PRODUCT_IDS.removeAds)}>{iap.price(PRODUCT_IDS.removeAds)}</button>}</div>
        <div class="item" style={{ alignItems: 'flex-start' }}><I.Crown size={34} /><div class="grow"><b>{t('store.vip')}</b><div class="muted">{t('store.vipPerks')}</div><div class="legal">{t('store.subLegal')}</div>
          <div class="links"><a onClick={() => openUrl(APP.termsUrl)}>{t('set.terms')}</a><a onClick={() => openUrl(APP.privacyUrl)}>{t('set.policy')}</a></div></div>
          {isVip(s) ? <span class="ok">{t('store.activeUntil', { d: new Date(s.iap.vipUntil).toLocaleDateString() })}</span> : <button class="btn purple" disabled={busy} onClick={() => buy(PRODUCT_IDS.vip)}>{t('store.perMonth', { p: iap.price(PRODUCT_IDS.vip) })}</button>}
        </div>
        <div class="item"><span style={{ fontSize: '28px' }}>🫙</span><div class="grow"><b>{t('store.tipCap')}</b><div class="muted">{t('hud.visitors')}: {Math.round(tipCapMinutes(s) / 60)} sa</div></div>
          {s.tipCapBonus >= 5 ? <span class="ok">{t('c.max')}</span> : <button class="btn" onClick={() => { if (g.spend(0, 20 + s.tipCapBonus * 10)) { s.tipCapBonus++; audio.play('success'); refresh(); } else toast(t('err.pearls'), 'bad'); }}><Price pearls={20 + s.tipCapBonus * 10} /></button>}
        </div>
        <div class="item"><I.Coin size={30} /><div class="grow"><b>{t('store.exchange')}</b><div class="muted">{t('store.exchangeDesc', { p: 10, c: fmt(Math.round(10 * rate)) })}</div></div><button class="btn" onClick={() => act(A.exchangePearls(g, 10), 'coin')}><Price pearls={10} /></button></div>
      </div>
      <div class="row" style={{ marginTop: '10px' }}>
        <button class="btn ghost" onClick={async () => { const ok = await iap.restore(); toast(ok ? t('set.restored') : t('store.unavailable'), ok ? 'good' : 'bad'); }}>{t('set.restore')}</button>
        <span class="muted">{STARTER_PACK.coins ? '' : ''}</span>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ ayarlar

function SettingsPanel() {
  useUI();
  const g = getGame();
  const st = g.state.settings;
  const set = (patch: Partial<typeof st>) => {
    Object.assign(st, patch);
    audio.setMusic(st.music);
    audio.setSfx(st.sfx);
    setHapticsEnabled(st.haptics);
    refresh();
  };
  return (
    <Modal title={t('set.title')} onClose={closePanel} small>
      <div class="list">
        <div class="item"><b class="grow">{t('set.music')}</b><Toggle on={st.music} onChange={(v) => set({ music: v })} /></div>
        <div class="item"><b class="grow">{t('set.sfx')}</b><Toggle on={st.sfx} onChange={(v) => set({ sfx: v })} /></div>
        <div class="item"><b class="grow">{t('set.haptics')}</b><Toggle on={st.haptics} onChange={(v) => set({ haptics: v })} /></div>
        <div class="item"><b class="grow">{t('set.notifications')}</b><Toggle on={st.notifications} onChange={async (v) => { set({ notifications: v ? await requestNotifications() || v : false }); }} /></div>
        <div class="item"><b class="grow">{t('set.language')}</b>
          {(['auto', 'tr', 'en'] as const).map((l) => <button class={`btn ${st.lang === l ? 'blue' : 'ghost'}`} onClick={() => { set({ lang: l }); setLang(g.lang()); refresh(); }}>{l === 'auto' ? t('set.auto') : l.toUpperCase()}</button>)}
        </div>
        <div class="item"><b class="grow">{t('set.graphics')}</b>
          {(['high', 'low'] as const).map((q) => <button class={`btn ${st.quality === q ? 'blue' : 'ghost'}`} onClick={() => { set({ quality: q }); getScene().quality = q; getScene().resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1); }}>{t(q === 'high' ? 'set.high' : 'set.low')}</button>)}
        </div>
        <button class="btn ghost" onClick={async () => { const ok = await iap.restore(); toast(ok ? t('set.restored') : t('store.unavailable'), ok ? 'good' : 'bad'); }}>{t('set.restore')}</button>
        {ads.privacyRequired && <button class="btn ghost" onClick={() => ads.showPrivacyOptions()}>{t('set.privacy')}</button>}
        <div class="links"><a onClick={() => openUrl(APP.privacyUrl)}>{t('set.policy')}</a><a onClick={() => openUrl(APP.termsUrl)}>{t('set.terms')}</a><a onClick={() => openUrl(`mailto:${APP.supportEmail}`)}>{t('set.support')}</a></div>
        <button class="btn red" onClick={async () => { if (await ask(t('set.resetQ'), t('set.reset'))) { await clearSave(); location.reload(); } }}>{t('set.reset')}</button>
        <div class="muted center">{t('set.version', { v: APP.version })}</div>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ katmanlar

function Overlays() {
  useUI();
  const g = getGame();
  const c = ui.confirm;
  const lv = ui.levelUp;
  const w = ui.welcome;
  const ad = ui.mockAd;
  const att = ui.att;
  const [count, setCount] = useState(0);
  if (ad) {
    return (
      <div class="scrim" style={{ background: 'rgba(0,0,0,0.9)' }}>
        <div class="adbox">
          <div><div class="muted">{t('ad.test')}</div><div class="big" style={{ color: '#c4b5fd' }}>{t('ad.label')}</div>
            <MockAdTimer kind={ad.kind} onDone={(ok) => { ui.mockAd = null; refresh(); ad.resolve(ok); }} />
          </div>
        </div>
      </div>
    );
  }
  if (att) {
    return (
      <Modal title={t('att.title')} small>
        <p>{t('att.body')}</p>
        <button class="btn blue" onClick={() => { ui.att = null; refresh(); att.resolve(); }}>{t('att.continue')}</button>
      </Modal>
    );
  }
  if (c) {
    return (
      <Modal title={t('c.confirm')} small onClose={() => { ui.confirm = null; refresh(); c.resolve(false); }}>
        <p>{c.text}</p>
        <div class="row"><span class="spacer" />
          <button class="btn ghost" onClick={() => { ui.confirm = null; refresh(); c.resolve(false); }}>{t('c.cancel')}</button>
          <button class="btn" onClick={() => { ui.confirm = null; refresh(); c.resolve(true); }}>{c.ok}</button>
        </div>
      </Modal>
    );
  }
  if (lv) {
    const unlocks = [
      ...SPECIES.filter((x) => x.level === lv.level && !x.exclusive).map((x) => ({ img: speciesThumb(x.id), name: tx(x.name) })),
      ...PLANTS.filter((x) => x.level === lv.level).map((x) => ({ img: plantThumb(x.id), name: tx(x.name) })),
      ...DECOR.filter((x) => x.level === lv.level && !x.exclusive).map((x) => ({ img: decorThumb(x.id), name: tx(x.name) })),
    ];
    return (
      <Modal title={t('lvl.up')} small>
        <div class="center">
          <div class="big">{t('c.level', { n: lv.level })}</div>
          <div class="row" style={{ justifyContent: 'center', margin: '6px 0' }}><Price coins={lv.coins} /> <Price pearls={lv.pearls} /></div>
          {unlocks.length > 0 && <><div class="sec">{t('lvl.unlocks')}</div><div class="row wrap" style={{ justifyContent: 'center' }}>{unlocks.slice(0, 6).map((u) => <div class="card" style={{ width: '104px' }}><img src={u.img} style={{ height: '46px', objectFit: 'contain' }} /><div style={{ fontSize: '11px' }}>{u.name}</div></div>)}</div></>}
          <button class="btn gold" style={{ marginTop: '10px' }} onClick={() => { ui.levelUp = null; refresh(); }}>{t('lvl.great')}</button>
        </div>
      </Modal>
    );
  }
  if (w) {
    const tips = Math.floor(g.tank.tips);
    return (
      <Modal title={t('wb.title')} small>
        <div class="list">
          <div>{t('wb.away', { t: fmtTime(w.seconds, getLang()) })}</div>
          {tips > 0 && <div><I.Coin size={16} /> {t('wb.tips', { c: fmt(tips) })}</div>}
          {w.grown > 0 && <div>🐟 {t('wb.grown', { n: w.grown })}</div>}
          {w.bred > 0 && <div>🐣 {t('wb.bred', { n: w.bred })}</div>}
          {w.hungry > 0 && <div class="no">🍤 {t('wb.hungry', { n: w.hungry })}</div>}
          {w.sick > 0 && <div class="no">💊 {t('wb.sick', { n: w.sick })}</div>}
          {w.dirty && <div class="no">💧 {t('wb.dirty')}</div>}
          {w.algae && <div class="no">🌿 {t('wb.algae')}</div>}
          <div class="row"><span class="spacer" />
            {tips > 0 && ads.available('doubleTips') && <button class="btn purple" onClick={async () => { if (await watchAd('doubleTips')) { A.collectTips(g, g.tank, true); ui.welcome = null; audio.play('sell'); refresh(); } }}><I.Play size={14} /> x2</button>}
            <button class="btn gold" onClick={() => { if (tips > 0) A.collectTips(g, g.tank); ui.welcome = null; audio.play('coin'); refresh(); }}>{tips > 0 ? t('c.collect') : t('c.ok')}</button>
          </div>
        </div>
      </Modal>
    );
  }
  void count;
  void setCount;
  return null;
}

function MockAdTimer({ kind, onDone }: { kind: 'rewarded' | 'interstitial'; onDone: (ok: boolean) => void }) {
  const [left, setLeft] = useState(kind === 'rewarded' ? 3 : 2);
  if (left > 0) setTimeout(() => setLeft(left - 1), 1000);
  return left > 0 ? <div class="muted">{t('ad.reward', { n: left })}</div> : <button class="btn" onClick={() => onDone(true)}>{t('c.close')}</button>;
}

function Toasts() {
  useUI();
  return <div class="toasts">{ui.toasts.map((x) => <div class={`toast ${x.kind}`}>{x.text}</div>)}</div>;
}

function Panel() {
  useUI();
  switch (ui.panel) {
    case 'shop': return <ShopPanel />;
    case 'fish': return <MyTankPanel />;
    case 'breed': return <BreedPanel />;
    case 'quests': return <QuestsPanel />;
    case 'tank': return <CarePanel />;
    case 'guide': return <GuidePanel />;
    case 'store': return <StorePanel />;
    case 'settings': return <SettingsPanel />;
    default: return null;
  }
}

export function App() {
  return (
    <>
      <TopBar />
      <Tools />
      <Menus />
      <TipJar />
      <Hint />
      <DecorBar />
      <FishCard />
      <Toasts />
      <Panel />
      <Tutorial />
      <Overlays />
      <div class="rotate">{t('hud.rotate')}</div>
    </>
  );
}

export { errText, getTier, getFood, trait };
