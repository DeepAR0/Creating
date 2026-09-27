import type { Theme } from './theme-registry';
import type {
  EmblemId,
  InvitationAppearance,
  WaxId,
} from './invitation-appearance';

/* Balmumu mühür. Tek bir yükseklik haritası üretilir; 3D kapılar onu
   normal/yer değiştirme haritası olarak, 2D yüzeyler ise burada
   yazılımla ışıklandırılmış görüntü olarak kullanır. Böylece atölyede
   seçilen mühür, kapıda kırılan mühürle birebir aynıdır. */

export type WaxTone = {
  label: string;
  color: string;
  /** 0 mat balmumu, 1 metalik. */
  metal: number;
  gloss: number;
};

export const waxTones: Record<Exclude<WaxId, 'tema'>, WaxTone> = {
  bordo: { label: 'Bordo', color: '#6f1826', metal: 0, gloss: 0.62 },
  lacivert: { label: 'Lacivert', color: '#223160', metal: 0, gloss: 0.62 },
  zumrut: { label: 'Zümrüt', color: '#155a45', metal: 0, gloss: 0.6 },
  altin: { label: 'Altın', color: '#c29a4f', metal: 0.62, gloss: 0.78 },
  gumus: { label: 'Gümüş', color: '#b4b9be', metal: 0.62, gloss: 0.8 },
  gul: { label: 'Gül kurusu', color: '#b3636f', metal: 0, gloss: 0.58 },
  fildisi: { label: 'Fildişi', color: '#e6dac5', metal: 0.08, gloss: 0.55 },
  siyah: { label: 'Gece siyahı', color: '#211d20', metal: 0.05, gloss: 0.7 },
};

export const themeWax: Record<Theme, Exclude<WaxId, 'tema'>> = {
  kadife: 'altin',
  rolyef: 'altin',
  zumrut: 'altin',
  ayisigi: 'gumus',
  rosealtin: 'gul',
  kakma: 'bordo',
  kisbahcesi: 'zumrut',
  pera: 'altin',
  pudra: 'gul',
  gulmuhur: 'bordo',
  gulipek: 'gul',
  sedef: 'gumus',
  gecealtini: 'altin',
  gece: 'bordo',
  inci: 'fildisi',
  safak: 'bordo',
  cini: 'lacivert',
  botanik: 'zumrut',
  siyahinci: 'siyah',
};

export const emblemLabels: Record<EmblemId, string> = {
  monogram: 'Baş harfler',
  lale: 'Lale',
  zeytin: 'Zeytin dalı',
  halka: 'Yüzükler',
  yildiz: 'Selçuklu yıldızı',
};

export function resolveWax(wax: WaxId | undefined, theme: Theme): WaxTone {
  const id = !wax || wax === 'tema' ? themeWax[theme] : wax;
  return waxTones[id] ?? waxTones.bordo;
}

export type SealSpec = {
  initials: string;
  emblem: EmblemId;
  shape: InvitationAppearance['seal'];
  /** Aynı çift her yerde aynı mühür kenarını görsün. */
  seed?: string;
};

export type SealMaps = {
  size: number;
  height: Float32Array;
  alpha: Float32Array;
  normal: Uint8ClampedArray;
  ao: Float32Array;
  /** Çatlak çizgisinin her satırdaki x konumu (piksel). */
  crack: Float32Array;
};

function hash(text: string) {
  let h = 2166136261;
  for (const char of text) {
    h ^= char.codePointAt(0)!;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function random(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(size: number) {
  if (typeof OffscreenCanvas !== 'undefined')
    return new OffscreenCanvas(size, size);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

type Ctx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

function serifFamily() {
  if (typeof document === 'undefined') return 'Georgia, serif';
  const loaded = [...document.fonts].some(
    (font) =>
      font.family.replaceAll('"', '') === 'Cormorant Garamond' &&
      font.status === 'loaded',
  );
  return loaded
    ? '"Cormorant Garamond", Georgia, serif'
    : 'Georgia, "Times New Roman", serif';
}

/** Harfleri balmumu için hazırlar: "Selin", "Arda" -> ["S", "A"]. */
export function sealLetters(initials: string) {
  const letters = Array.from(initials.trim()).filter((c) => c.trim());
  return [letters[0] ?? '', letters[1] ?? ''];
}

/* Amblemler N×N kanvasın merkezine, damga yarıçapı `r` içine çizilir. */
function drawEmblem(
  ctx: Ctx,
  emblem: EmblemId,
  letters: string[],
  c: number,
  r: number,
) {
  const family = serifFamily();
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const [a, b] = letters;
  const pair = (y: number, size: number, gap: number, amp = true) => {
    ctx.font = `600 ${size}px ${family}`;
    ctx.fillText(a, c - gap, y);
    ctx.fillText(b, c + gap, y);
    if (amp) {
      ctx.font = `italic 500 ${size * 0.48}px ${family}`;
      ctx.fillText('&', c, y - size * 0.18);
    }
  };
  if (emblem === 'monogram') {
    const size = r * (b ? 0.92 : 1.2);
    if (b) pair(c + size * 0.33, size, r * 0.44);
    else {
      ctx.font = `600 ${size}px ${family}`;
      ctx.fillText(a, c, c + size * 0.33);
    }
  } else if (emblem === 'lale') {
    // Osmanlı lalesi: badem biçimli orta yaprak, iki yana kıvrılan sivri
    // yapraklar, ince sap ve iki saz yaprağı.
    ctx.translate(c, c);
    const s = r / 100;
    ctx.scale(s, s);
    ctx.fill(
      new Path2D(
        'M0 -74 C14 -58 20 -36 16 -10 C12 4 6 12 0 14 C-6 12 -12 4 -16 -10 C-20 -36 -14 -58 0 -74 Z',
      ),
    );
    ctx.fill(
      new Path2D(
        'M-8 12 C-26 6 -38 -8 -42 -30 C-44 -44 -40 -56 -46 -66 C-30 -58 -22 -44 -20 -30 C-18 -16 -12 -4 -4 4 Z',
      ),
    );
    ctx.fill(
      new Path2D(
        'M8 12 C26 6 38 -8 42 -30 C44 -44 40 -56 46 -66 C30 -58 22 -44 20 -30 C18 -16 12 -4 4 4 Z',
      ),
    );
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.bezierCurveTo(-3, 34, 3, 52, 0, 72);
    ctx.stroke();
    ctx.fill(
      new Path2D(
        'M-1 70 C-16 60 -30 50 -40 30 C-26 36 -12 46 -1 58 Z M1 70 C16 60 30 50 40 30 C26 36 12 46 1 58 Z',
      ),
    );
    ctx.font = `600 ${44}px ${family}`;
    ctx.fillText(a, -58, 26);
    ctx.fillText(b, 58, 26);
  } else if (emblem === 'zeytin') {
    ctx.translate(c, c);
    const s = r / 100;
    ctx.scale(s, s);
    ctx.lineWidth = 5;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(
        0,
        2,
        78,
        Math.PI / 2 + side * 0.3,
        Math.PI / 2 + side * 2.6,
        side < 0,
      );
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const t = Math.PI / 2 + side * (0.5 + i * 0.27);
        const x = Math.cos(t) * 78;
        const y = 2 + Math.sin(t) * 78;
        for (const out of [-1, 1]) {
          ctx.save();
          ctx.translate(x, y);
          // Yapraklar dal boyunca, uçlarına doğru yönelir.
          ctx.rotate(t + side * (Math.PI / 2) + out * 0.62);
          ctx.beginPath();
          ctx.ellipse(12, 0, 14, 5.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
    ctx.font = `600 ${64}px ${family}`;
    ctx.fillText(a, -24, 26);
    ctx.fillText(b, 24, 26);
    ctx.font = `italic 500 ${28}px ${family}`;
    ctx.fillText('&', 0, 6);
  } else if (emblem === 'halka') {
    ctx.translate(c, c);
    const s = r / 100;
    ctx.scale(s, s);
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(-17, -14, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(17, -14, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(17, -58);
    ctx.lineTo(25, -48);
    ctx.lineTo(17, -40);
    ctx.lineTo(9, -48);
    ctx.closePath();
    ctx.fill();
    ctx.font = `600 ${36}px ${family}`;
    ctx.fillText(`${a}${b ? ' · ' + b : ''}`, 0, 58);
  } else {
    // Selçuklu yıldızı: iç içe iki kare ve ortada harfler.
    ctx.translate(c, c);
    const s = r / 100;
    ctx.scale(s, s);
    ctx.lineWidth = 6;
    for (const turn of [0, Math.PI / 4]) {
      ctx.save();
      ctx.rotate(turn);
      ctx.strokeRect(-56, -56, 112, 112);
      ctx.restore();
    }
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `600 ${40}px ${family}`;
    ctx.fillText(`${a}${b}`, 0, 14);
  }
  ctx.restore();
}

function boxBlur(src: Float32Array, n: number, radius: number) {
  if (radius < 1) return src.slice();
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const w = radius * 2 + 1;
  for (let y = 0; y < n; y++) {
    let sum = 0;
    const row = y * n;
    for (let x = -radius; x <= radius; x++)
      sum += src[row + Math.min(n - 1, Math.max(0, x))];
    for (let x = 0; x < n; x++) {
      tmp[row + x] = sum / w;
      sum +=
        src[row + Math.min(n - 1, x + radius + 1)] -
        src[row + Math.max(0, x - radius)];
    }
  }
  for (let x = 0; x < n; x++) {
    let sum = 0;
    for (let y = -radius; y <= radius; y++)
      sum += tmp[Math.min(n - 1, Math.max(0, y)) * n + x];
    for (let y = 0; y < n; y++) {
      out[y * n + x] = sum / w;
      sum +=
        tmp[Math.min(n - 1, y + radius + 1) * n + x] -
        tmp[Math.max(0, y - radius) * n + x];
    }
  }
  return out;
}

function blur(src: Float32Array, n: number, radius: number) {
  const r = Math.max(1, Math.round(radius / 1.7));
  return boxBlur(boxBlur(boxBlur(src, n, r), n, r), n, r);
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function noiseField(n: number, cells: number, rnd: () => number) {
  const grid = Array.from({ length: (cells + 1) * (cells + 1) }, rnd);
  const out = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    const gy = (y / n) * cells;
    const y0 = Math.floor(gy);
    const fy = smooth(0, 1, gy - y0);
    for (let x = 0; x < n; x++) {
      const gx = (x / n) * cells;
      const x0 = Math.floor(gx);
      const fx = smooth(0, 1, gx - x0);
      const i = y0 * (cells + 1) + x0;
      const top = grid[i] * (1 - fx) + grid[i + 1] * fx;
      const bottom = grid[i + cells + 1] * (1 - fx) + grid[i + cells + 2] * fx;
      out[y * n + x] = top * (1 - fy) + bottom * fy - 0.5;
    }
  }
  return out;
}

const cache = new Map<string, SealMaps>();

export function buildSealMaps(spec: SealSpec, size = 384): SealMaps {
  const key = `${spec.initials}|${spec.emblem}|${spec.shape}|${spec.seed ?? ''}|${size}|${serifFamily()}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const n = size;
  const half = n / 2;
  const rnd = random(hash(spec.seed ?? spec.initials));
  const phases = Array.from({ length: 4 }, () => rnd() * Math.PI * 2);
  const drips = Array.from({ length: 3 }, () => ({
    at: rnd() * Math.PI * 2,
    amount: 0.035 + rnd() * 0.05,
    width: 0.12 + rnd() * 0.12,
  }));
  const baseR = 0.84;
  const stampR = 0.585;
  const letters = sealLetters(spec.initials);

  const canvas = makeCanvas(n);
  const ctx = canvas.getContext('2d') as Ctx;
  ctx.clearRect(0, 0, n, n);
  drawEmblem(
    ctx,
    spec.emblem,
    letters,
    half,
    half * stampR * (spec.shape === 'letters' ? 1.12 : 0.86),
  );
  const pixels = ctx.getImageData(0, 0, n, n).data;
  const emblem = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) emblem[i] = pixels[i * 4 + 3] / 255;
  const emblemSoft = blur(emblem, n, n / 190);
  const emblemWide = blur(emblem, n, n / 70);

  const fine = noiseField(n, 28, rnd);
  const broad = noiseField(n, 9, rnd);
  const height = new Float32Array(n * n);
  const alpha = new Float32Array(n * n);
  const px = 1.3 / half;
  for (let y = 0; y < n; y++) {
    const v = (y + 0.5 - half) / half;
    for (let x = 0; x < n; x++) {
      const u = (x + 0.5 - half) / half;
      const i = y * n + x;
      const rho = Math.hypot(u, v);
      const theta = Math.atan2(v, u);
      let radius =
        baseR *
        (1 +
          0.03 * Math.sin(3 * theta + phases[0]) +
          0.022 * Math.sin(5 * theta + phases[1]) +
          0.012 * Math.sin(9 * theta + phases[2]) +
          0.007 * Math.sin(15 * theta + phases[3]));
      for (const drip of drips) {
        let d = Math.abs(theta - drip.at);
        if (d > Math.PI) d = Math.PI * 2 - d;
        radius += drip.amount * Math.exp(-((d / drip.width) ** 2));
      }
      const edge = radius - rho;
      const mask = smooth(-px, px, edge);
      alpha[i] = mask;
      if (mask <= 0) continue;
      const e = Math.min(1, Math.max(0, edge / 0.11));
      let h = 0.34 * (1 - (1 - e) ** 3) + 0.05 * (1 - rho * rho);
      let inside = 1;
      if (spec.shape !== 'letters') {
        const s =
          spec.shape === 'diamond'
            ? (stampR * 1.12 - (Math.abs(u) + Math.abs(v))) / Math.SQRT2
            : stampR - rho;
        inside = smooth(0, 0.028, s);
        h -= 0.13 * inside;
        h += 0.075 * Math.exp(-(((s + 0.032) / 0.024) ** 2));
        if (spec.shape === 'round') {
          const ringR = stampR - 0.075;
          const count = 40;
          const k = Math.round((theta / (Math.PI * 2)) * count);
          const t = (k / count) * Math.PI * 2;
          const dist = Math.hypot(
            u - Math.cos(t) * ringR,
            v - Math.sin(t) * ringR,
          );
          h += 0.04 * smooth(0.022, 0.006, dist);
        } else {
          h += 0.035 * Math.exp(-(((s - 0.07) / 0.011) ** 2));
        }
      }
      h +=
        (0.052 * emblemSoft[i] + 0.03 * emblemWide[i] + 0.018 * emblem[i]) *
        (spec.shape === 'letters' ? 1 : inside);
      h += 0.009 * broad[i] + 0.0016 * fine[i];
      height[i] = h * mask;
    }
  }

  const ao = new Float32Array(n * n);
  const wide = blur(height, n, n / 32);
  for (let i = 0; i < n * n; i++)
    ao[i] = Math.min(1.08, Math.max(0.55, 1 + (height[i] - wide[i]) * 3.4));

  const normal = new Uint8ClampedArray(n * n * 4);
  const strength = n * 0.42;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const l = height[y * n + Math.max(0, x - 1)];
      const r = height[y * n + Math.min(n - 1, x + 1)];
      const t = height[Math.max(0, y - 1) * n + x];
      const b = height[Math.min(n - 1, y + 1) * n + x];
      const nx = (l - r) * strength;
      // Aşağı doğru yükselen yüzey yukarı bakar (OpenGL: yeşil = yukarı).
      const ny = (b - t) * strength;
      const len = Math.hypot(nx, ny, 1);
      normal[i * 4] = ((nx / len) * 0.5 + 0.5) * 255;
      // OpenGL normal haritası: yeşil kanal yukarıyı gösterir.
      normal[i * 4 + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      normal[i * 4 + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      normal[i * 4 + 3] = 255;
    }
  }

  const crack = new Float32Array(n);
  const steps = 9;
  const points = Array.from({ length: steps + 1 }, (_, k) => ({
    y: (k / steps) * n,
    x: half + (k === 0 || k === steps ? 0 : (rnd() - 0.5) * n * 0.085),
  }));
  for (let y = 0; y < n; y++) {
    const k = Math.min(steps - 1, Math.floor((y / n) * steps));
    const a = points[k];
    const b = points[k + 1];
    crack[y] = a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y);
  }

  const maps = { size: n, height, alpha, normal, ao, crack };
  cache.set(key, maps);
  if (cache.size > 24) cache.delete(cache.keys().next().value!);
  return maps;
}

function rgb(hex: string) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => c / 255);
}

export type SealPart = 'whole' | 'left' | 'right';

function partMask(
  maps: SealMaps,
  part: SealPart,
  x: number,
  y: number,
  gap = maps.size / 260,
) {
  if (part === 'whole') return 1;
  const edge = maps.crack[y] + (part === 'left' ? -gap : gap);
  const soft = maps.size / 400;
  return part === 'left'
    ? smooth(edge + soft, edge - soft, x)
    : smooth(edge - soft, edge + soft, x);
}

/** Ekranda kullanılacak ışıklandırılmış mühür (şeffaf zeminli). */
export function paintSeal(
  maps: SealMaps,
  tone: WaxTone,
  part: SealPart = 'whole',
  light: [number, number, number] = [-0.5, -0.62, 0.6],
  gap?: number,
) {
  const n = maps.size;
  const canvas = makeCanvas(n);
  const ctx = canvas.getContext('2d') as Ctx;
  const image = ctx.createImageData(n, n);
  const [cr, cg, cb] = rgb(tone.color);
  const ll = Math.hypot(...light);
  const L = light.map((c) => c / ll);
  const H = [L[0], L[1], L[2] + 1];
  const hl = Math.hypot(...H);
  H[0] /= hl;
  H[1] /= hl;
  H[2] /= hl;
  const shininess = tone.metal > 0.3 ? 26 : 46;
  const specTint = [
    1 - tone.metal + tone.metal * cr * 1.25,
    1 - tone.metal + tone.metal * cg * 1.25,
    1 - tone.metal + tone.metal * cb * 1.25,
  ];
  const diffuseAmount = 0.95 - tone.metal * 0.35;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const a = maps.alpha[i] * partMask(maps, part, x, y, gap);
      if (a <= 0) continue;
      const nx = maps.normal[i * 4] / 127.5 - 1;
      const ny = maps.normal[i * 4 + 1] / 127.5 - 1;
      const nz = maps.normal[i * 4 + 2] / 127.5 - 1;
      // Kanvas y ekseni aşağı; normal haritası yukarı.
      const ndl = nx * L[0] - ny * L[1] + nz * L[2];
      const wrap = Math.max(0, (ndl + 0.3) / 1.3);
      const ndh = Math.max(0, nx * H[0] - ny * H[1] + nz * H[2]);
      const spec =
        tone.gloss * ndh ** shininess * 1.15 + tone.gloss * 0.12 * ndh ** 6;
      const light = (0.3 + diffuseAmount * wrap) * maps.ao[i];
      const o = i * 4;
      image.data[o] = Math.min(255, (cr * light + specTint[0] * spec) * 255);
      image.data[o + 1] = Math.min(
        255,
        (cg * light + specTint[1] * spec) * 255,
      );
      image.data[o + 2] = Math.min(
        255,
        (cb * light + specTint[2] * spec) * 255,
      );
      image.data[o + 3] = a * 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** 3D kapı için ışıksız renk haritası (boşluk gölgesi işlenmiş). */
export function sealAlbedo(maps: SealMaps, tone: WaxTone) {
  const n = maps.size;
  const canvas = makeCanvas(n);
  const ctx = canvas.getContext('2d') as Ctx;
  const image = ctx.createImageData(n, n);
  const [cr, cg, cb] = rgb(tone.color);
  for (let i = 0; i < n * n; i++) {
    const shade = 0.72 + 0.28 * maps.ao[i];
    image.data[i * 4] = cr * shade * 255;
    image.data[i * 4 + 1] = cg * shade * 255;
    image.data[i * 4 + 2] = cb * shade * 255;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export function sealNormalCanvas(maps: SealMaps) {
  const canvas = makeCanvas(maps.size);
  const ctx = canvas.getContext('2d') as Ctx;
  ctx.putImageData(
    new ImageData(maps.normal.slice(), maps.size, maps.size),
    0,
    0,
  );
  return canvas;
}

export function sealHeightCanvas(maps: SealMaps) {
  const n = maps.size;
  const canvas = makeCanvas(n);
  const ctx = canvas.getContext('2d') as Ctx;
  const image = ctx.createImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    const v = Math.min(255, maps.height[i] * 520);
    image.data[i * 4] = v;
    image.data[i * 4 + 1] = v;
    image.data[i * 4 + 2] = v;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** Yarı maskeleri: beyaz = görünür. Gölge için bulanık sürüm istenebilir. */
export function sealMaskCanvas(maps: SealMaps, part: SealPart, spread = 0) {
  const n = maps.size;
  let values = new Float32Array(n * n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      values[y * n + x] = maps.alpha[y * n + x] * partMask(maps, part, x, y);
  if (spread) values = blur(values, n, spread);
  const canvas = makeCanvas(n);
  const ctx = canvas.getContext('2d') as Ctx;
  const image = ctx.createImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    const v = Math.min(255, values[i] * 255);
    image.data[i * 4] = v;
    image.data[i * 4 + 1] = v;
    image.data[i * 4 + 2] = v;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** Kırılma anında içeriden sızan ışık çizgisi (mührün sınırında kalır). */
export function crackGlowCanvas(maps: SealMaps) {
  const n = maps.size;
  const reach = blur(maps.alpha, n, n / 36);
  const canvas = makeCanvas(n);
  const ctx = canvas.getContext('2d') as Ctx;
  const image = ctx.createImageData(n, n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const d = Math.abs(x - maps.crack[y]);
      const core = Math.max(0, 1 - d / (n / 150));
      const halo = Math.exp(-((d / (n / 30)) ** 2)) * 0.55;
      const v = Math.min(1, core + halo) * Math.min(1, reach[i] * 1.6);
      image.data[i * 4] = v * 255;
      image.data[i * 4 + 1] = v * 255;
      image.data[i * 4 + 2] = v * 255;
      image.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** Mühür yazısını bekler; ağ yavaşsa en fazla `timeout` ms. Süre dolarsa
    mühür Georgia ile çizilir, kapı beklemez. */
export async function ensureSealFont(timeout = 1800) {
  if (typeof document === 'undefined') return;
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('600 64px "Cormorant Garamond"', 'SA&'),
        document.fonts.load('italic 500 32px "Cormorant Garamond"', '&'),
      ]),
      new Promise((resolve) => setTimeout(resolve, timeout)),
    ]);
  } catch {
    // Georgia ile devam edilir.
  }
}
