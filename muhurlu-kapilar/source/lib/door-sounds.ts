import type { DoorSoundscape } from './door-themes';

/* Açılış ritüelinin kısa sesleri. Dosya indirilmez; hepsi Web Audio ile
   sentezlenir ve yalnızca konuğun kendi dokunuşundan sonra çalar.
   Tümü alçak seslidir, ortak bir yumuşak sınırlayıcıdan geçer; tercih
   kapalıysa hiç çalışmaz.

   Her kapının kendi müziği var: Fildişi'nde arp, Sedef Kakma'da Hicaz
   makamında ud tınısı, Kış Bahçesi'nde müzik kutusu, Pera'da şampanya
   ve bir caz akoru. */

let context: AudioContext | null = null;
let master: GainNode | null = null;

function audio() {
  if (typeof window === 'undefined') return null;
  if (!context) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 12;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    master = context.createGain();
    master.gain.value = 1;
    master.connect(limiter).connect(context.destination);
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

function output(ctx: AudioContext, gain: number) {
  const out = ctx.createGain();
  out.gain.value = gain;
  out.connect(master ?? ctx.destination);
  return out;
}

const noiseCache = new Map<number, AudioBuffer>();
function noiseBuffer(ctx: AudioContext, seconds: number) {
  const key = Math.round(seconds * 100);
  const hit = noiseCache.get(key);
  if (hit && hit.sampleRate === ctx.sampleRate) return hit;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseCache.set(key, buffer);
  return buffer;
}

/** Ahşaba vurulan pirinç tokmak: kısa bir gövde tokluğu ve metal tınısı. */
export function playKnock() {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const out = output(ctx, 0.34);
  const body = ctx.createOscillator();
  body.type = 'sine';
  body.frequency.setValueAtTime(150, now);
  body.frequency.exponentialRampToValueAtTime(62, now + 0.16);
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(0.9, now);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
  body.connect(bodyGain).connect(out);
  body.start(now);
  body.stop(now + 0.26);
  const hit = ctx.createBufferSource();
  hit.buffer = noiseBuffer(ctx, 0.08);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1400;
  band.Q.value = 1.4;
  const hitGain = ctx.createGain();
  hitGain.gain.setValueAtTime(0.5, now);
  hitGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  hit.connect(band).connect(hitGain).connect(out);
  hit.start(now);
  const ring = ctx.createOscillator();
  ring.type = 'triangle';
  ring.frequency.value = 1760;
  const ringGain = ctx.createGain();
  ringGain.gain.setValueAtTime(0.05, now);
  ringGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.5);
  ring.connect(ringGain).connect(out);
  ring.start(now);
  ring.stop(now + 0.52);
}

/** Balmumunun çatlaması: birkaç kuru, kısa kırılma. */
export function playCrack() {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const out = output(ctx, 0.28);
  [0, 0.035, 0.07, 0.12].forEach((offset, i) => {
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer(ctx, 0.05);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800 + i * 600;
    const gain = ctx.createGain();
    const at = now + offset;
    gain.gain.setValueAtTime(i === 0 ? 0.9 : 0.45 / i, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.035);
    source.connect(filter).connect(gain).connect(out);
    source.start(at);
  });
}

/** Kanatların açılışında yumuşak hava akışı. */
function air(ctx: AudioContext, at: number, level = 0.16, length = 2.5) {
  const out = output(ctx, level);
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, length + 0.1);
  const low = ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.setValueAtTime(260, at);
  low.frequency.linearRampToValueAtTime(900, at + length * 0.48);
  low.frequency.linearRampToValueAtTime(300, at + length);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.7, at + 0.7);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  source.connect(low).connect(gain).connect(out);
  source.start(at);
}

function bell(ctx: AudioContext, out: AudioNode, freq: number, at: number, level: number, length: number) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(level, at + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + length + 0.05);
}

/** Kanatların açılışı: yumuşak bir hava akışı ve çok hafif bir tını. */
export function playOpen() {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  air(ctx, now);
  const out = output(ctx, 0.16);
  bell(ctx, out, 659.25, now + 0.5, 0.09, 1.8);
  bell(ctx, out, 987.77, now + 0.72, 0.09, 1.8);
}

/* Karplus–Strong telli çalgı: gürültüyle uyarılan kısa bir gecikme hattı.
   Arp (parlak) ve ud (koyu) aynı yöntemle, farklı parlaklıkla çalar. */
const pluckCache = new Map<string, { buffer: AudioBuffer; rate: number }>();
function pluckBuffer(ctx: AudioContext, freq: number, seconds: number, brightness: number) {
  const key = `${freq.toFixed(2)}|${seconds}|${brightness}|${ctx.sampleRate}`;
  const hit = pluckCache.get(key);
  if (hit) return hit;
  const sr = ctx.sampleRate;
  const period = sr / freq;
  const length = Math.max(2, Math.round(period));
  const n = Math.ceil(sr * seconds);
  const buffer = ctx.createBuffer(1, n, sr);
  const out = buffer.getChannelData(0);
  const line = new Float32Array(length);
  let smooth = 0;
  for (let i = 0; i < length; i++) {
    smooth += brightness * (Math.random() * 2 - 1 - smooth);
    line[i] = smooth;
  }
  // Tel boyunca kayıp: ~yarı sürede 60 dB söner.
  const decay = Math.pow(0.001, 1 / (freq * seconds * 0.9));
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const cur = line[idx];
    const next = line[idx + 1 === length ? 0 : idx + 1];
    line[idx] = decay * 0.5 * (cur + next);
    out[i] = cur;
    idx = idx + 1 === length ? 0 : idx + 1;
  }
  for (let i = 0; i < 64; i++) out[n - 1 - i] *= i / 64;
  const entry = { buffer, rate: length / period };
  pluckCache.set(key, entry);
  return entry;
}

function pluck(
  ctx: AudioContext,
  out: AudioNode,
  freq: number,
  at: number,
  options: { level: number; seconds?: number; brightness?: number; pan?: number; bend?: number },
) {
  const { buffer, rate } = pluckBuffer(ctx, freq, options.seconds ?? 1.8, options.brightness ?? 0.6);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.setValueAtTime(rate * (options.bend ?? 1), at);
  if (options.bend) source.playbackRate.exponentialRampToValueAtTime(rate, at + 0.09);
  const gain = ctx.createGain();
  gain.gain.value = options.level;
  let node: AudioNode = source.connect(gain);
  if (options.pan && ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = options.pan;
    node = node.connect(panner);
  }
  node.connect(out);
  source.start(at);
}

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** Fildişi: yukarı doğru açılan bir arp. */
function ivoryHarp(ctx: AudioContext, at: number) {
  const out = output(ctx, 0.2);
  const notes = [64, 68, 71, 75, 78, 80, 83]; // Emaj9 çevrimi
  notes.forEach((m, i) =>
    pluck(ctx, out, hz(m), at + i * 0.085, {
      level: 0.55 - i * 0.03,
      seconds: 2.4,
      brightness: 0.62,
      pan: -0.35 + (i / notes.length) * 0.7,
    }),
  );
  bell(ctx, out, hz(88), at + 0.75, 0.05, 2.2);
}

/** Sedef Kakma: Hicaz dizisinde ud tınısı, altta hafif bir dem. */
function pearlOud(ctx: AudioContext, at: number) {
  const out = output(ctx, 0.24);
  const hicaz = [62, 63, 66, 67, 69, 74]; // Re, Mi♭, Fa♯, Sol, La, Re
  hicaz.forEach((m, i) =>
    pluck(ctx, out, hz(m), at + i * 0.14, {
      level: 0.62,
      seconds: 1.9,
      brightness: 0.34,
      pan: (i % 2 ? 0.2 : -0.2),
      bend: 1.012,
    }),
  );
  const drone = ctx.createOscillator();
  drone.type = 'triangle';
  drone.frequency.value = hz(50);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.09, at + 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 2.6);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 500;
  drone.connect(lp).connect(g).connect(out);
  drone.start(at);
  drone.stop(at + 2.7);
}

/** Kış Bahçesi: müzik kutusu / çelesta çanları ve rüzgâr çanı. */
function winterCelesta(ctx: AudioContext, at: number) {
  const out = output(ctx, 0.16);
  const notes = [76, 83, 80, 88, 83, 91];
  notes.forEach((m, i) => {
    const f = hz(m);
    const t = at + i * 0.16;
    [
      [1, 0.5, 1.9],
      [2.01, 0.16, 0.9],
      [3.98, 0.08, 0.45],
      [5.93, 0.03, 0.25],
    ].forEach(([ratio, level, length]) => bell(ctx, out, f * ratio, t, level, length));
  });
  for (let i = 0; i < 5; i++) {
    const m = [88, 90, 93, 95, 97][Math.floor(Math.random() * 5)];
    bell(ctx, out, hz(m), at + 1.1 + i * 0.11 + Math.random() * 0.05, 0.05, 1.2);
  }
}

/** Pera: mantar patlar, köpük fısıldar, bir caz akoru yayılır. */
function decoToast(ctx: AudioContext, at: number, slide: boolean) {
  if (slide) {
    const out = output(ctx, 0.2);
    const rumble = ctx.createBufferSource();
    rumble.buffer = noiseBuffer(ctx, 1.4);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(160, at);
    lp.frequency.linearRampToValueAtTime(420, at + 0.7);
    lp.frequency.linearRampToValueAtTime(140, at + 1.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.8, at + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 1.3);
    rumble.connect(lp).connect(g).connect(out);
    rumble.start(at);
  }
  playCork(at + 0.12);
  const out = output(ctx, 0.13);
  const chord = [53, 57, 64, 67, 72]; // Fa maj9
  chord.forEach((m, i) => {
    const t = at + 0.42 + i * 0.035;
    const f = hz(m);
    const carrier = ctx.createOscillator();
    carrier.frequency.value = f;
    const mod = ctx.createOscillator();
    mod.frequency.value = f;
    const index = ctx.createGain();
    index.gain.setValueAtTime(f * 2.2, t);
    index.gain.exponentialRampToValueAtTime(f * 0.25, t + 0.7);
    mod.connect(index).connect(carrier.frequency);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.32, t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.1, t + 0.9);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 3);
    carrier.connect(env).connect(out);
    carrier.start(t);
    mod.start(t);
    carrier.stop(t + 3.1);
    mod.stop(t + 3.1);
  });
}

/** Şampanya mantarı ve ardından köpük. */
export function playCork(at?: number) {
  const ctx = audio();
  if (!ctx) return;
  const t = at ?? ctx.currentTime;
  const out = output(ctx, 0.3);
  const pop = ctx.createBufferSource();
  pop.buffer = noiseBuffer(ctx, 0.08);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 2.2;
  band.frequency.setValueAtTime(1100, t);
  band.frequency.exponentialRampToValueAtTime(320, t + 0.05);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  pop.connect(band).connect(g).connect(out);
  pop.start(t);
  const thump = ctx.createOscillator();
  thump.frequency.setValueAtTime(260, t);
  thump.frequency.exponentialRampToValueAtTime(110, t + 0.06);
  const tg = ctx.createGain();
  tg.gain.setValueAtTime(0.5, t);
  tg.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  thump.connect(tg).connect(out);
  thump.start(t);
  thump.stop(t + 0.1);
  // Köpük: seyrek, giderek azalan çıtırtılar.
  const seconds = 2.2;
  const fizz = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = fizz.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const life = 1 - i / data.length;
    if (Math.random() < 0.012 * life * life) data[i] = (Math.random() * 2 - 1) * life;
  }
  const source = ctx.createBufferSource();
  source.buffer = fizz;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 3500;
  const fg = ctx.createGain();
  fg.gain.value = 0.55;
  source.connect(hp).connect(fg).connect(out);
  source.start(t + 0.06);
}

/** Kapı açılışının sesi, kapının karakterine göre. */
export function playOpenFor(scape: DoorSoundscape = 'classic', motion: 'swing' | 'slide' = 'swing') {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  if (scape === 'classic') return playOpen();
  if (scape !== 'deco') air(ctx, now, 0.13);
  if (scape === 'ivory') ivoryHarp(ctx, now + 0.25);
  else if (scape === 'pearl') pearlOud(ctx, now + 0.2);
  else if (scape === 'winter') winterCelesta(ctx, now + 0.2);
  else decoToast(ctx, now, motion === 'slide');
}

/** Kilidin dili: kısa bir "tak" ve metal tınısı. */
export function playUnlock() {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const out = output(ctx, 0.3);
  [0, 0.075].forEach((offset, i) => {
    const t = now + offset;
    const hit = ctx.createBufferSource();
    hit.buffer = noiseBuffer(ctx, 0.06);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = i ? 900 : 2100;
    band.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(i ? 0.8 : 0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    hit.connect(band).connect(g).connect(out);
    hit.start(t);
  });
  const thunk = ctx.createOscillator();
  thunk.frequency.setValueAtTime(190, now + 0.075);
  thunk.frequency.exponentialRampToValueAtTime(85, now + 0.16);
  const tg = ctx.createGain();
  tg.gain.setValueAtTime(0.0001, now);
  tg.gain.setValueAtTime(0.6, now + 0.075);
  tg.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  thunk.connect(tg).connect(out);
  thunk.start(now);
  thunk.stop(now + 0.22);
  bell(ctx, out, 2350, now + 0.08, 0.04, 0.35);
}

/** Anahtar dönerken kilit mandalının tık sesi. */
export function playTick(pitch = 1) {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const out = output(ctx, 0.14);
  const hit = ctx.createBufferSource();
  hit.buffer = noiseBuffer(ctx, 0.02);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 3000 * pitch;
  band.Q.value = 4;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.9, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.018);
  hit.connect(band).connect(g).connect(out);
  hit.start(now);
}

/* Sürekli sesler: camda gıcırdayan parmak, zorlanan ahşap. Seviye 0 ise
   yumuşakça susar. */
type Voice = { gain: GainNode; tone: OscillatorNode; band: BiquadFilterNode; stopAt: number };
const voices: Partial<Record<'glass' | 'wood', Voice>> = {};

export function squeak(level: number, kind: 'glass' | 'wood') {
  const ctx = context;
  if (!ctx || (level <= 0 && !voices[kind])) return;
  const now = ctx.currentTime;
  let voice = voices[kind];
  if (!voice && level > 0) {
    const out = output(ctx, kind === 'glass' ? 0.06 : 0.09);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(ctx, 2);
    noise.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = kind === 'glass' ? 2400 : 420;
    band.Q.value = kind === 'glass' ? 9 : 2.5;
    const tone = ctx.createOscillator();
    tone.type = kind === 'glass' ? 'sine' : 'sawtooth';
    tone.frequency.value = kind === 'glass' ? 1250 : 92;
    const toneGain = ctx.createGain();
    toneGain.gain.value = kind === 'glass' ? 0.35 : 0.12;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    noise.connect(band).connect(gain);
    tone.connect(toneGain).connect(kind === 'glass' ? gain : band);
    gain.connect(out);
    noise.start(now);
    tone.start(now);
    const created: Voice = { gain, tone, band, stopAt: 0 };
    voice = created;
    voices[kind] = created;
    const watch = () => {
      if (voices[kind] !== created) return;
      if (created.stopAt && ctx.currentTime > created.stopAt) {
        noise.stop();
        tone.stop();
        delete voices[kind];
        return;
      }
      setTimeout(watch, 200);
    };
    setTimeout(watch, 200);
  }
  if (!voice) return;
  const l = Math.min(1, Math.max(0, level));
  voice.gain.gain.setTargetAtTime(l, now, 0.04);
  if (kind === 'glass') {
    voice.tone.frequency.setTargetAtTime(1050 + l * 900 + Math.random() * 60, now, 0.05);
    voice.band.frequency.setTargetAtTime(2100 + l * 1400, now, 0.05);
  } else {
    voice.tone.frequency.setTargetAtTime(78 + l * 40 + Math.random() * 8, now, 0.06);
  }
  voice.stopAt = l > 0 ? 0 : now + 0.6;
}

/** Android'de kısa titreşim; iOS desteklemez, sessizce geçer. */
export function haptic(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Desteklenmiyor.
  }
}

/** Ses bağlamını ilk dokunuşta açar (iOS kilidi). */
export function unlockSounds() {
  audio();
}
