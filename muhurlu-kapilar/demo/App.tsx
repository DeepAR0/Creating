import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { SealedDoor } from '@/app/davet/[token]/sealed-door';
import { doorConfig, type DoorTheme } from '@/lib/door-themes';
import { doorCopy } from '@/lib/door-copy';
import {
  EMBLEM_IDS,
  WAX_IDS,
  defaultAppearance,
  type EmblemId,
  type InvitationAppearance,
  type Lang,
  type WaxId,
} from '@/lib/invitation-appearance';
import { themeRegistry } from '@/lib/theme-registry';
import { emblemLabels, waxTones } from '@/lib/wax-seal';
import { Invitation } from '../example/davetiye/Invitation';

/* Önizleme uygulaması: koleksiyon, deneyim (kapı → davetiye) ve atölye.
   Ayarlar adres çubuğunda durur; bağlantıyı paylaşan aynı kapıyı görür. */

export const THEMES: DoorTheme[] = ['rolyef', 'kakma', 'kisbahcesi', 'pera'];

export type Settings = {
  theme: DoorTheme;
  name1: string;
  name2: string;
  guest: string;
  date: string;
  lang: Lang;
  wax: WaxId;
  emblem: EmblemId;
  seal: InvitationAppearance['seal'];
  opening: InvitationAppearance['opening'];
  palette: InvitationAppearance['palette'];
  sounds: boolean;
};

const defaults: Settings = {
  theme: 'rolyef',
  name1: 'Selin',
  name2: 'Arda',
  guest: 'Sevgili dostumuz',
  date: '12 · 06 · 2027',
  lang: 'tr',
  wax: 'tema',
  emblem: 'monogram',
  seal: 'round',
  opening: 'cinematic',
  palette: 'original',
  sounds: true,
};

const keys: Record<keyof Settings, string> = {
  theme: 'tema',
  name1: 'ad1',
  name2: 'ad2',
  guest: 'konuk',
  date: 'tarih',
  lang: 'dil',
  wax: 'mum',
  emblem: 'amblem',
  seal: 'muhur',
  opening: 'acilis',
  palette: 'isik',
  sounds: 'ses',
};

function readSettings(): Settings {
  const q = new URLSearchParams(location.search);
  const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T) =>
    value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
  return {
    theme: pick(q.get(keys.theme), THEMES, defaults.theme),
    name1: q.get(keys.name1)?.slice(0, 24) || defaults.name1,
    name2: q.get(keys.name2)?.slice(0, 24) || defaults.name2,
    guest: q.get(keys.guest)?.slice(0, 40) || defaults.guest,
    date: q.get(keys.date)?.slice(0, 20) ?? defaults.date,
    lang: pick(q.get(keys.lang), ['tr', 'en', 'de'] as const, defaults.lang),
    wax: pick(q.get(keys.wax), WAX_IDS, defaults.wax),
    emblem: pick(q.get(keys.emblem), EMBLEM_IDS, defaults.emblem),
    seal: pick(q.get(keys.seal), ['round', 'diamond', 'letters'] as const, defaults.seal),
    opening: pick(q.get(keys.opening), ['cinematic', 'gentle'] as const, defaults.opening),
    palette: pick(q.get(keys.palette), ['original', 'warm', 'cool'] as const, defaults.palette),
    sounds: q.get(keys.sounds) !== '0',
  };
}

function writeSettings(s: Settings, view: 'galeri' | 'kapi') {
  const q = new URLSearchParams();
  if (view === 'kapi')
    (Object.keys(keys) as (keyof Settings)[]).forEach((k) => {
      const value = s[k];
      if (value !== defaults[k] || k === 'theme') q.set(keys[k], typeof value === 'boolean' ? (value ? '1' : '0') : value);
    });
  const query = q.toString();
  const url = `${location.pathname}${query ? `?${query}` : ''}`;
  history.replaceState(null, '', url);
}

const ritualNames: Record<string, string> = {
  tap: 'Mühre dokunma',
  hold: 'Basılı tutma',
  knock: 'Tokmakla çalma',
  ribbon: 'Kurdele çekme',
  key: 'Anahtar çevirme',
  wipe: 'Buğu silme',
  slide: 'Kanat çekme',
};

function Gallery({ onOpen }: { onOpen: (theme: DoorTheme) => void }) {
  return (
    <main className="galeri">
      <header className="galeri-head">
        <p className="galeri-kicker">DİJİTAL DAVETİYE · KAPI KOLEKSİYONU</p>
        <h1>Mühürlü Kapılar</h1>
        <p>
          Dört kapı, dört ritüel. Her kapı çiftin harfleriyle işlenir, konuğun dokunuşuyla açılır ve ardındaki davetiye aynı
          malzemeyle devam eder.
        </p>
      </header>
      <ul className="galeri-list">
        {THEMES.map((id) => {
          const def = themeRegistry[id];
          const door = doorConfig(id);
          return (
            <li key={id}>
              <button type="button" className="galeri-card" data-theme={id} onClick={() => onOpen(id)}>
                <span className="galeri-cover" style={{ backgroundImage: `url('${door.art}')` }} aria-hidden="true" />
                <span className="galeri-body">
                  <small>{def.tag}</small>
                  <strong>{def.name}</strong>
                  <span className="galeri-material">{def.material}</span>
                  <span className="galeri-copy">{def.openingCopy}</span>
                  <span className="galeri-meta">
                    <em>{ritualNames[door.ritual]}</em>
                    {def.isNew && <b>YENİ</b>}
                    {door.procedural && <i>Harfler kapıya işlenir</i>}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <footer className="galeri-foot">
        <p>En iyi deneyim için telefonda açın: dokunun, çevirin, silin, çekin. Sesi açmayı unutmayın.</p>
      </footer>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="atolye-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Workshop({
  settings,
  onChange,
  onReplay,
  onClose,
}: {
  settings: Settings;
  onChange: (next: Partial<Settings>) => void;
  onReplay: () => void;
  onClose: () => void;
}) {
  return (
    <div className="atolye" role="dialog" aria-modal="true" aria-label="Atölye">
      <div className="atolye-sheet">
        <div className="atolye-head">
          <strong>Atölye</strong>
          <button type="button" className="atolye-close" onClick={onClose} aria-label="Atölyeyi kapat">
            ×
          </button>
        </div>
        <div className="atolye-grid">
          <Field label="Kapı">
            <select value={settings.theme} onChange={(e) => onChange({ theme: e.target.value as DoorTheme })}>
              {THEMES.map((t) => (
                <option key={t} value={t}>
                  {themeRegistry[t].name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Dil">
            <select value={settings.lang} onChange={(e) => onChange({ lang: e.target.value as Lang })}>
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </Field>
          <Field label="1. isim">
            <input value={settings.name1} maxLength={24} onChange={(e) => onChange({ name1: e.target.value })} />
          </Field>
          <Field label="2. isim">
            <input value={settings.name2} maxLength={24} onChange={(e) => onChange({ name2: e.target.value })} />
          </Field>
          <Field label="Konuk">
            <input value={settings.guest} maxLength={40} onChange={(e) => onChange({ guest: e.target.value })} />
          </Field>
          <Field label="Kapıdaki tarih">
            <input value={settings.date} maxLength={20} onChange={(e) => onChange({ date: e.target.value })} />
          </Field>
          <Field label="Balmumu">
            <select value={settings.wax} onChange={(e) => onChange({ wax: e.target.value as WaxId })}>
              {WAX_IDS.map((w) => (
                <option key={w} value={w}>
                  {w === 'tema' ? 'Tasarımın kendi rengi' : waxTones[w].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amblem">
            <select value={settings.emblem} onChange={(e) => onChange({ emblem: e.target.value as EmblemId })}>
              {EMBLEM_IDS.map((e) => (
                <option key={e} value={e}>
                  {emblemLabels[e]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mühür biçimi">
            <select value={settings.seal} onChange={(e) => onChange({ seal: e.target.value as Settings['seal'] })}>
              <option value="round">Yuvarlak</option>
              <option value="diamond">Baklava</option>
              <option value="letters">Yalnızca harfler</option>
            </select>
          </Field>
          <Field label="Açılış">
            <select value={settings.opening} onChange={(e) => onChange({ opening: e.target.value as Settings['opening'] })}>
              <option value="cinematic">Sinematik</option>
              <option value="gentle">Sakin</option>
            </select>
          </Field>
          <Field label="Işık">
            <select value={settings.palette} onChange={(e) => onChange({ palette: e.target.value as Settings['palette'] })}>
              <option value="original">Özgün</option>
              <option value="warm">Sıcak</option>
              <option value="cool">Serin</option>
            </select>
          </Field>
          <Field label="Sesler">
            <select value={settings.sounds ? '1' : '0'} onChange={(e) => onChange({ sounds: e.target.value === '1' })}>
              <option value="1">Açık</option>
              <option value="0">Kapalı</option>
            </select>
          </Field>
        </div>
        <p className="atolye-hint">
          Mühür (renk, amblem, biçim) kapıda canlı değişir. Kapı, dil ve açılış ayarları kapıyı yeniden kurar.
        </p>
        <button type="button" className="atolye-replay" onClick={onReplay}>
          Kapıyı yeniden kapat ve oynat
        </button>
      </div>
    </div>
  );
}

function Experience({
  settings,
  onBack,
  onChange,
}: {
  settings: Settings;
  onBack: () => void;
  onChange: (next: Partial<Settings>) => void;
}) {
  const reduced = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const [opened, setOpened] = useState(reduced);
  const [doorOn, setDoorOn] = useState(!reduced);
  const [run, setRun] = useState(0);
  const [workshop, setWorkshop] = useState(false);
  const appearance: InvitationAppearance = {
    ...defaultAppearance,
    wax: settings.wax,
    emblem: settings.emblem,
    seal: settings.seal,
    opening: settings.opening,
    palette: settings.palette,
    sounds: settings.sounds,
    languages: [settings.lang],
  };

  useEffect(() => {
    document.documentElement.classList.toggle('kapi-kilitli', !opened);
    return () => document.documentElement.classList.remove('kapi-kilitli');
  }, [opened]);
  // Kapı açıldıktan sonra sahne kaldırılır: GPU belleği boşalır.
  useEffect(() => {
    if (!opened || !doorOn) return;
    const id = window.setTimeout(() => setDoorOn(false), 900);
    return () => window.clearTimeout(id);
  }, [opened, doorOn]);

  function replay() {
    setWorkshop(false);
    window.scrollTo(0, 0);
    setOpened(reduced);
    setDoorOn(!reduced);
    setRun((r) => r + 1);
  }

  const doorKey = `${run}|${settings.theme}|${settings.lang}|${settings.opening}|${settings.palette}`;
  return (
    <>
      <Invitation
        key={`${run}|${settings.theme}|${settings.lang}`}
        theme={settings.theme}
        lang={settings.lang}
        name1={settings.name1}
        name2={settings.name2}
        guest={settings.guest}
        appearance={appearance}
        active={opened}
        paused={workshop}
        sounds={settings.sounds}
      />
      {doorOn && (
        <SealedDoor
          key={doorKey}
          theme={settings.theme}
          name1={settings.name1}
          name2={settings.name2}
          guest={settings.guest}
          date={settings.date || undefined}
          lang={settings.lang}
          appearance={appearance}
          open={opened}
          paused={workshop}
          onStart={() => undefined}
          onComplete={() => setOpened(true)}
          copy={doorCopy(settings.lang)}
          onEngine={(scene) => {
            (window as unknown as { __door: unknown }).__door = scene;
          }}
        />
      )}
      <nav className="demo-bar" aria-label="Önizleme">
        <button type="button" onClick={onBack} aria-label="Koleksiyona dön">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <button type="button" onClick={() => setWorkshop(true)} aria-label="Atölyeyi aç">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="10" cy="17" r="2" />
          </svg>
        </button>
        <button type="button" onClick={replay} aria-label="Kapıyı yeniden oynat">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12a7 7 0 1 0 2.2-5.1M5 4v4h4" />
          </svg>
        </button>
      </nav>
      {workshop && (
        <Workshop settings={settings} onChange={onChange} onReplay={replay} onClose={() => setWorkshop(false)} />
      )}
    </>
  );
}

export function App() {
  const [settings, setSettings] = useState(readSettings);
  const [view, setView] = useState<'galeri' | 'kapi'>(() =>
    new URLSearchParams(location.search).has(keys.theme) ? 'kapi' : 'galeri',
  );
  useEffect(() => writeSettings(settings, view), [settings, view]);
  useEffect(() => {
    document.documentElement.lang = settings.lang;
    document.documentElement.dataset.theme = view === 'kapi' ? settings.theme : 'galeri';
  }, [settings.lang, settings.theme, view]);
  if (view === 'galeri')
    return (
      <Gallery
        onOpen={(theme) => {
          setSettings((s) => ({ ...s, theme }));
          setView('kapi');
          window.scrollTo(0, 0);
        }}
      />
    );
  return (
    <Experience
      settings={settings}
      onBack={() => setView('galeri')}
      onChange={(next) => setSettings((s) => ({ ...s, ...next }))}
    />
  );
}
