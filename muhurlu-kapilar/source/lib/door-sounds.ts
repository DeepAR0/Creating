/* Açılış ritüelinin kısa sesleri. Dosya indirilmez; Web Audio ile
   sentezlenir ve yalnızca konuğun kendi dokunuşundan sonra çalar.
   Hepsi alçak seslidir; tercih kapalıysa hiç çalışmaz. */

let context: AudioContext | null = null;

function audio() {
  if (typeof window === 'undefined') return null;
  if (!context) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

function noiseBuffer(ctx: AudioContext, seconds: number) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Ahşaba vurulan pirinç tokmak: kısa bir gövde tokluğu ve metal tınısı. */
export function playKnock() {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0.34;
  out.connect(ctx.destination);
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
  const out = ctx.createGain();
  out.gain.value = 0.28;
  out.connect(ctx.destination);
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

/** Kanatların açılışı: yumuşak bir hava akışı ve çok hafif bir tını. */
export function playOpen() {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0.16;
  out.connect(ctx.destination);
  const air = ctx.createBufferSource();
  air.buffer = noiseBuffer(ctx, 2.6);
  const low = ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.setValueAtTime(260, now);
  low.frequency.linearRampToValueAtTime(900, now + 1.2);
  low.frequency.linearRampToValueAtTime(300, now + 2.5);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.7, now + 0.7);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
  air.connect(low).connect(gain).connect(out);
  air.start(now);
  for (const [freq, delay] of [
    [659.25, 0.5],
    [987.77, 0.72],
  ]) {
    const bell = ctx.createOscillator();
    bell.type = 'sine';
    bell.frequency.value = freq;
    const bellGain = ctx.createGain();
    bellGain.gain.setValueAtTime(0.0001, now + delay);
    bellGain.gain.exponentialRampToValueAtTime(0.09, now + delay + 0.03);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 1.8);
    bell.connect(bellGain).connect(out);
    bell.start(now + delay);
    bell.stop(now + delay + 1.9);
  }
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
