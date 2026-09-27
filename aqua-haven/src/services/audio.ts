// Tüm sesler WebAudio ile anlık sentezlenir (lisans gerektiren ses dosyası yok).

export type Sfx =
  | 'plop'
  | 'eat'
  | 'bubble'
  | 'coin'
  | 'sell'
  | 'click'
  | 'open'
  | 'levelUp'
  | 'success'
  | 'error'
  | 'splash'
  | 'suck'
  | 'wipe'
  | 'heart'
  | 'pearl'
  | 'lucky';

const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
const CHORDS = [
  [261.63, 329.63, 392.0, 493.88], // Cmaj7
  [220.0, 261.63, 329.63, 392.0], // Am7
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
  [196.0, 246.94, 293.66, 329.63], // G6
];

class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxGain!: GainNode;
  private musicGain!: GainNode;
  private ambGain!: GainNode;
  private reverb!: ConvolverNode;
  private reverbGain!: GainNode;
  private noiseBuf!: AudioBuffer;
  private musicTimer: number | null = null;
  private nextBeat = 0;
  private beat = 0;
  private lastPlayed: Record<string, number> = {};
  private ambSrc: AudioBufferSourceNode | null = null;
  musicOn = true;
  sfxOn = true;

  /** İlk kullanıcı dokunuşunda çağrılır (iOS gereği) */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.build();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => undefined);
    this.applyToggles();
  }

  private build() {
    const c = this.ctx!;
    this.master = c.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(c.destination);
    this.sfxGain = c.createGain();
    this.sfxGain.connect(this.master);
    this.musicGain = c.createGain();
    this.musicGain.gain.value = 0.55;
    this.musicGain.connect(this.master);
    this.ambGain = c.createGain();
    this.ambGain.gain.value = 0.0;
    this.ambGain.connect(this.master);
    // yankı
    this.reverb = c.createConvolver();
    const len = c.sampleRate * 2.6;
    const ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    this.reverb.buffer = ir;
    this.reverbGain = c.createGain();
    this.reverbGain.gain.value = 0.35;
    this.reverb.connect(this.reverbGain);
    this.reverbGain.connect(this.master);
    // gürültü
    this.noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < nd.length; i++) {
      const w = Math.random() * 2 - 1;
      nd[i] = w;
      last = (last + 0.02 * w) / 1.02;
    }
    void last;
  }

  applyToggles() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sfxGain.gain.setTargetAtTime(this.sfxOn ? 1 : 0, t, 0.05);
    this.ambGain.gain.setTargetAtTime(this.sfxOn ? 0.05 : 0, t, 0.5);
    if (this.musicOn) this.startMusic();
    else this.stopMusic();
    if (this.sfxOn) this.startAmbience();
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    this.applyToggles();
  }

  setSfx(on: boolean) {
    this.sfxOn = on;
    this.applyToggles();
  }

  suspend() {
    this.ctx?.suspend().catch(() => undefined);
  }

  resume() {
    this.ctx?.resume().catch(() => undefined);
  }

  // ------------------------------------------------------------ yapı taşları

  private tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; to?: number; delay?: number; rev?: number; attack?: number } = {}) {
    const c = this.ctx!;
    const t0 = c.currentTime + (opts.delay ?? 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = opts.type ?? 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
    const peak = opts.gain ?? 0.15;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (opts.attack ?? 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.sfxGain);
    if (opts.rev) {
      const s = c.createGain();
      s.gain.value = opts.rev;
      g.connect(s);
      s.connect(this.reverb);
    }
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, opts: { gain?: number; type?: BiquadFilterType; f0?: number; f1?: number; q?: number; delay?: number } = {}) {
    const c = this.ctx!;
    const t0 = c.currentTime + (opts.delay ?? 0);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.frequency.setValueAtTime(opts.f0 ?? 1000, t0);
    if (opts.f1) f.frequency.exponentialRampToValueAtTime(opts.f1, t0 + dur);
    f.Q.value = opts.q ?? 1;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.1, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + dur + 0.05);
  }

  play(name: Sfx) {
    if (!this.ctx || !this.sfxOn || this.ctx.state !== 'running') return;
    const now = performance.now();
    const minGap: Partial<Record<Sfx, number>> = { eat: 70, wipe: 90, bubble: 60, suck: 90, click: 30, coin: 50 };
    if (now - (this.lastPlayed[name] ?? 0) < (minGap[name] ?? 20)) return;
    this.lastPlayed[name] = now;
    const r = 0.9 + Math.random() * 0.2;
    switch (name) {
      case 'plop':
        this.tone(900 * r, 0.12, { to: 280, gain: 0.16 });
        this.noise(0.05, { type: 'highpass', f0: 2500, gain: 0.04 });
        break;
      case 'eat':
        this.tone(1100 * r, 0.06, { to: 1700 * r, gain: 0.06 });
        break;
      case 'bubble':
        this.tone(500 * r, 0.07, { to: 1400 * r, gain: 0.07 });
        break;
      case 'coin':
        this.tone(1318.5, 0.07, { type: 'triangle', gain: 0.12 });
        this.tone(1975.5, 0.18, { type: 'triangle', gain: 0.12, delay: 0.06, rev: 0.3 });
        break;
      case 'sell':
        this.tone(1046.5, 0.07, { type: 'triangle', gain: 0.12 });
        this.tone(1318.5, 0.07, { type: 'triangle', gain: 0.12, delay: 0.06 });
        this.tone(1975.5, 0.3, { type: 'triangle', gain: 0.14, delay: 0.12, rev: 0.4 });
        break;
      case 'click':
        this.tone(1800, 0.025, { gain: 0.05 });
        break;
      case 'open':
        this.noise(0.22, { type: 'bandpass', f0: 400, f1: 1400, q: 2, gain: 0.05 });
        break;
      case 'levelUp':
        [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => {
          this.tone(f, 0.35, { type: 'triangle', gain: 0.12, delay: i * 0.09, rev: 0.5 });
          this.tone(f * 2, 0.25, { gain: 0.04, delay: i * 0.09 });
        });
        [1046.5, 1318.51, 1567.98].forEach((f) => this.tone(f, 1.2, { gain: 0.05, delay: 0.5, rev: 0.6, attack: 0.05 }));
        break;
      case 'success':
        [1046.5, 1318.51, 1567.98].forEach((f, i) => this.tone(f, 0.5, { gain: 0.09, delay: i * 0.05, rev: 0.4 }));
        break;
      case 'error':
        this.tone(180, 0.14, { type: 'square', gain: 0.05 });
        break;
      case 'splash':
        this.noise(0.3, { type: 'lowpass', f0: 1400, f1: 300, gain: 0.12 });
        this.tone(600, 0.08, { to: 1500, gain: 0.05, delay: 0.1 });
        this.tone(450, 0.08, { to: 1200, gain: 0.04, delay: 0.18 });
        break;
      case 'suck':
        this.noise(0.16, { type: 'bandpass', f0: 300, f1: 1600, q: 3, gain: 0.07 });
        break;
      case 'wipe':
        this.noise(0.06, { type: 'highpass', f0: 3200, gain: 0.03 });
        break;
      case 'heart':
        this.tone(1567.98, 0.5, { gain: 0.07, rev: 0.5 });
        break;
      case 'pearl':
        this.tone(2093, 0.6, { gain: 0.07, rev: 0.5 });
        this.tone(2637, 0.6, { gain: 0.05, delay: 0.08, rev: 0.5 });
        break;
      case 'lucky':
        for (let i = 0; i < 5; i++) this.tone(PENTA[Math.floor(Math.random() * PENTA.length)] * 2, 0.2, { gain: 0.05, delay: i * 0.05, rev: 0.4 });
        break;
    }
  }

  // ------------------------------------------------------------ ortam

  private startAmbience() {
    if (!this.ctx || this.ambSrc) return;
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    src.connect(lp);
    lp.connect(this.ambGain);
    src.start();
    this.ambSrc = src;
  }

  // ------------------------------------------------------------ müzik

  private startMusic() {
    if (!this.ctx || this.musicTimer !== null) return;
    this.nextBeat = this.ctx.currentTime + 0.2;
    this.musicTimer = window.setInterval(() => this.schedule(), 200);
  }

  private stopMusic() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private schedule() {
    const c = this.ctx;
    if (!c || c.state !== 'running') return;
    const beatLen = 60 / 64;
    while (this.nextBeat < c.currentTime + 0.6) {
      const t = this.nextBeat;
      const bar = Math.floor(this.beat / 4) % CHORDS.length;
      if (this.beat % 4 === 0) this.pad(CHORDS[bar], t, beatLen * 4);
      if (Math.random() < 0.55) this.bell(PENTA[Math.floor(Math.random() * PENTA.length)], t + (Math.random() < 0.3 ? beatLen / 2 : 0));
      if (Math.random() < 0.08) this.bell(PENTA[Math.floor(Math.random() * 3)] * 2, t + beatLen * 0.75, 0.02);
      this.nextBeat += beatLen;
      this.beat++;
    }
  }

  private pad(freqs: number[], t0: number, dur: number) {
    const c = this.ctx!;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1100;
    lp.connect(this.musicGain);
    const send = c.createGain();
    send.gain.value = 0.4;
    lp.connect(send);
    send.connect(this.reverb);
    for (const f of freqs) {
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f / 2;
      o.detune.value = (Math.random() - 0.5) * 8;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.028, t0 + 1.2);
      g.gain.setValueAtTime(0.028, t0 + dur - 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur + 1.5);
      o.connect(g);
      g.connect(lp);
      o.start(t0);
      o.stop(t0 + dur + 1.6);
    }
  }

  private bell(f: number, t0: number, gain = 0.035) {
    const c = this.ctx!;
    const o = c.createOscillator();
    const o2 = c.createOscillator();
    o.type = 'sine';
    o2.type = 'sine';
    o.frequency.value = f;
    o2.frequency.value = f * 2.01;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
    const g2 = c.createGain();
    g2.gain.value = 0.25;
    o.connect(g);
    o2.connect(g2);
    g2.connect(g);
    g.connect(this.musicGain);
    const send = c.createGain();
    send.gain.value = 0.6;
    g.connect(send);
    send.connect(this.reverb);
    o.start(t0);
    o2.start(t0);
    o.stop(t0 + 1.7);
    o2.stop(t0 + 1.7);
  }
}

export const audio = new AudioEngine();
