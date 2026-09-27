'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { StoryTouch } from '../../source/app/davet/[token]/story-touch';
import type { DoorTheme } from '../../source/lib/door-themes';
import type { InvitationAppearance, Lang } from '../../source/lib/invitation-appearance';
import { initials as coupleInitials } from '../../source/lib/ornament';
import { invitationContent, type InvitationEvent } from './content';

/* Kapının ardında açılan örnek davetiye. Bölümler görünüm ayarındaki
   `sections` bayraklarına uyar; renkler ve yazılar tema değişkenleriyle
   (davetiye.css) kapının malzemesini sürdürür. */

type Props = {
  theme: DoorTheme;
  lang: Lang;
  name1: string;
  name2: string;
  guest: string;
  appearance: InvitationAppearance;
  /** Kapı açıldı: hikâye dokunuşu ve geri sayım çalışsın. */
  active: boolean;
  paused?: boolean;
  sounds?: boolean;
};

const pad = (n: number) => String(n).padStart(2, '0');

function Countdown({ target, lang }: { target: string; lang: Lang }) {
  const c = invitationContent[lang];
  // Sunucuda saat yok: sayaç yalnızca tarayıcıda başlar (hydration uyuşmazlığı olmaz).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (now === null) return <div className="davetiye-countdown" aria-hidden="true" />;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) {
    const sameDay = diff > -24 * 3600 * 1000;
    return <p className="davetiye-countdown-done">{sameDay ? c.countdownToday : c.countdownAfter}</p>;
  }
  const s = Math.floor(diff / 1000);
  const values = [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
  return (
    <div className="davetiye-countdown" role="timer" aria-label={c.countdownTitle}>
      <small>{c.countdownTitle}</small>
      <ol>
        {values.map((v, i) => (
          <li key={i}>
            <strong>{i === 0 ? v : pad(v)}</strong>
            <span>{c.units[i]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Temaya göre küçük süs: Fildişi halka, Sedef yıldız, Kış kemer, Pera baklava. */
function Monogram({ theme, initials }: { theme: DoorTheme; initials: string }) {
  const [a = '', b = ''] = Array.from(initials);
  const frame =
    theme === 'kakma' ? (
      <path d="M50 6 61 24 82 18 76 39 94 50 76 61 82 82 61 76 50 94 39 76 18 82 24 61 6 50 24 39 18 18 39 24Z" />
    ) : theme === 'kisbahcesi' ? (
      <path d="M14 88V50a36 36 0 0 1 72 0v38M22 88V52a28 28 0 0 1 56 0v36M50 16v8M24 30l6 5M76 30l-6 5" />
    ) : theme === 'pera' ? (
      <path d="M50 4 90 50 50 96 10 50Z M50 14 81 50 50 86 19 50Z" />
    ) : (
      <>
        <circle cx="50" cy="50" r="42" />
        <circle cx="50" cy="50" r="36" strokeDasharray="0.5 4.2" strokeLinecap="round" strokeWidth="2.4" />
      </>
    );
  return (
    <svg className="davetiye-monogram" viewBox="0 0 100 100" aria-hidden="true">
      <g className="davetiye-monogram-frame">{frame}</g>
      <text x="50" y="57" textAnchor="middle">
        {a}
        <tspan className="davetiye-monogram-amp">&amp;</tspan>
        {b}
      </text>
    </svg>
  );
}

function icsDate(iso: string, addMinutes = 0) {
  const d = new Date(new Date(iso).getTime() + addMinutes * 60000);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function downloadCalendar(event: InvitationEvent, title: string) {
  const escape = (v: string) => v.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EVET//Muhurlu Kapilar//TR',
    'BEGIN:VEVENT',
    `UID:${icsDate(event.start)}-${Math.random().toString(36).slice(2)}@evet`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(event.start)}`,
    `DTEND:${icsDate(event.start, event.minutes)}`,
    `SUMMARY:${escape(`${title} · ${event.title}`)}`,
    `LOCATION:${escape(`${event.place}, ${event.address}`)}`,
    `DESCRIPTION:${escape(event.note ?? '')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'davet.ics';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function Gift({ lang }: { lang: Lang }) {
  const g = invitationContent[lang].gift;
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(g.iban.replaceAll(' ', ''));
    } catch {
      const area = document.createElement('textarea');
      area.value = g.iban.replaceAll(' ', '');
      document.body.append(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }
  return (
    <>
      <p className="davetiye-lead">{g.text}</p>
      <div className="davetiye-card davetiye-iban">
        <code>{g.iban}</code>
        <span>{g.holder}</span>
        <button type="button" className="davetiye-button" onClick={copy} aria-live="polite">
          {copied ? g.copied : g.copy}
        </button>
      </div>
    </>
  );
}

type Answer = { name: string; attending: 'yes' | 'no'; guests: number; meal: number; message: string };

function Rsvp({ lang, guest, storageKey }: { lang: Lang; guest: string; storageKey: string }) {
  const r = invitationContent[lang].rsvp;
  const id = useId();
  const [answer, setAnswer] = useState<Answer>({ name: guest, attending: 'yes', guests: 1, meal: 0, message: '' });
  const [sent, setSent] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setAnswer(JSON.parse(saved) as Answer);
        setSent(true);
      }
    } catch {
      // Kayıt yoksa boş formla başlanır.
    }
  }, [storageKey]);
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      localStorage.setItem(storageKey, JSON.stringify(answer));
    } catch {
      // Örnek sayfa: gerçek uygulamada yanıt sunucuya gider.
    }
    setSent(true);
  }
  if (sent)
    return (
      <div className="davetiye-card davetiye-thanks" role="status">
        <p>{answer.attending === 'yes' ? r.thanksYes : r.thanksNo}</p>
        <button type="button" className="davetiye-link" onClick={() => setSent(false)}>
          {r.edit}
        </button>
      </div>
    );
  return (
    <form className="davetiye-card davetiye-rsvp" onSubmit={submit}>
      <p className="davetiye-lead">{r.intro}</p>
      <label htmlFor={`${id}-name`}>{r.name}</label>
      <input
        id={`${id}-name`}
        required
        autoComplete="name"
        value={answer.name}
        onChange={(e) => setAnswer({ ...answer, name: e.target.value })}
      />
      <fieldset>
        <legend>{r.attending}</legend>
        {(['yes', 'no'] as const).map((value) => (
          <label key={value} className="davetiye-choice">
            <input
              type="radio"
              name={`${id}-attending`}
              checked={answer.attending === value}
              onChange={() => setAnswer({ ...answer, attending: value })}
            />
            <span>{value === 'yes' ? r.yes : r.no}</span>
          </label>
        ))}
      </fieldset>
      {answer.attending === 'yes' && (
        <div className="davetiye-row">
          <div>
            <label htmlFor={`${id}-guests`}>{r.guests}</label>
            <select
              id={`${id}-guests`}
              value={answer.guests}
              onChange={(e) => setAnswer({ ...answer, guests: Number(e.target.value) })}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-meal`}>{r.meal}</label>
            <select
              id={`${id}-meal`}
              value={answer.meal}
              onChange={(e) => setAnswer({ ...answer, meal: Number(e.target.value) })}
            >
              {r.meals.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      <label htmlFor={`${id}-message`}>{r.message}</label>
      <textarea
        id={`${id}-message`}
        rows={3}
        placeholder={r.messageHint}
        value={answer.message}
        onChange={(e) => setAnswer({ ...answer, message: e.target.value })}
      />
      <button type="submit" className="davetiye-button is-primary">
        {r.send}
      </button>
    </form>
  );
}

export function Invitation({ theme, lang, name1, name2, guest, appearance, active, paused = false, sounds = false }: Props) {
  const c = invitationContent[lang];
  const [storyOpen, setStoryOpen] = useState(false);
  const show = appearance.sections;
  const initials = coupleInitials(name1, name2);
  const mapUrl = (e: InvitationEvent) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.place}, ${e.address}`)}`;
  return (
    <main className="davetiye" data-theme={theme} data-active={active} lang={lang}>
      <header className="davetiye-hero">
        <div className="davetiye-hero-inner">
          <p className="davetiye-kicker">{c.kicker}</p>
          <Monogram theme={theme} initials={initials} />
          <h1>
            <span>{name1}</span>
            <em>&amp;</em>
            <span>{name2}</span>
          </h1>
          <p className="davetiye-date">{c.dateLine}</p>
          <p className="davetiye-place">{c.placeLine}</p>
          <p className="davetiye-intro">{c.intro}</p>
          <Countdown target={c.events[0].start} lang={lang} />
        </div>
        <a className="davetiye-scroll" href="#hikaye">
          <span>{c.scrollHint}</span>
        </a>
      </header>

      {show.story && (
        <section id="hikaye" className="davetiye-section">
          <h2>{c.sections.story}</h2>
          <StoryTouch
            theme={theme}
            active={active}
            paused={paused}
            expanded={storyOpen}
            onToggle={() => setStoryOpen((v) => !v)}
            sounds={sounds}
            lang={lang}
          />
          <div id="invitation-story-text" className="davetiye-story" hidden={!storyOpen}>
            {c.story.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <ol className="davetiye-milestones">
              {c.milestones.map((m) => (
                <li key={m.year}>
                  <strong>{m.year}</strong>
                  <span>{m.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {show.event && (
        <section className="davetiye-section">
          <h2>{c.sections.event}</h2>
          <div className="davetiye-events">
            {c.events.map((e) => (
              <article key={e.title} className="davetiye-card davetiye-event">
                <p className="davetiye-time">{e.time}</p>
                <h3>{e.title}</h3>
                <p className="davetiye-venue">{e.place}</p>
                <p className="davetiye-address">{e.address}</p>
                {e.note && <p className="davetiye-note">{e.note}</p>}
                <div className="davetiye-actions">
                  <a className="davetiye-button" href={mapUrl(e)} target="_blank" rel="noreferrer">
                    {c.directions}
                  </a>
                  <button type="button" className="davetiye-button" onClick={() => downloadCalendar(e, c.calendarTitle)}>
                    {c.addToCalendar}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {show.program && (
        <section className="davetiye-section">
          <h2>{c.sections.program}</h2>
          <ol className="davetiye-program">
            {c.program.map((p) => (
              <li key={p.time + p.title}>
                <time>{p.time}</time>
                <div>
                  <strong>{p.title}</strong>
                  <span>{p.note}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {show.menu && (
        <section className="davetiye-section">
          <h2>{c.sections.menu}</h2>
          <dl className="davetiye-menu">
            {c.menu.map((m) => (
              <div key={m.course}>
                <dt>{m.course}</dt>
                <dd>{m.dish}</dd>
              </div>
            ))}
          </dl>
          <p className="davetiye-note">{c.menuNote}</p>
        </section>
      )}

      {show.gift && (
        <section className="davetiye-section">
          <h2>{c.sections.gift}</h2>
          <Gift lang={lang} />
        </section>
      )}

      {show.rsvp && (
        <section className="davetiye-section" id="katilim">
          <h2>{c.sections.rsvp}</h2>
          <Rsvp lang={lang} guest={guest} storageKey={`evet:lcv:${theme}`} />
        </section>
      )}

      <footer className="davetiye-footer">
        <p className="davetiye-hashtag">{c.hashtag}</p>
        <p>{c.hashtagLine}</p>
        <p className="davetiye-signature">{c.footer}</p>
      </footer>
    </main>
  );
}
