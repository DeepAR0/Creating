/* Kabartma yüzeyleri için küçük, bağımsız görüntü araçları. Hepsi
   dikdörtgen alanlarla (w × h) çalışır ve tarayıcıda tek iş parçacığında
   koşar; ağır adımlar arasında `yieldFrame` ile nefes alınır. */

export type Field = Float32Array;
export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function makeCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** DOM'a konabilen (CSS/`toBlob` için) kanvas. */
export function domCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function context2d(canvas: AnyCanvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as Ctx2D | null;
  if (!ctx) throw new Error('2D canvas unavailable');
  return ctx;
}

/** Uzun hesaplar arasında ana iş parçacığını kısa süre serbest bırakır. */
export function yieldFrame(signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const done = () => (signal?.aborted ? reject(new DOMException('Aborted', 'AbortError')) : resolve());
    if (typeof requestAnimationFrame === 'function' && !document.hidden) requestAnimationFrame(() => done());
    else setTimeout(done, 0);
  });
}

export function hash(text: string) {
  let h = 2166136261;
  for (const char of text) {
    h ^= char.codePointAt(0)!;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function random(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

export const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Ayrılabilir kutu bulanıklığı; kenarlar kenetlenir. */
export function boxBlur(src: Field, w: number, h: number, radius: number): Field {
  const r = Math.max(0, Math.round(radius));
  if (r < 1) return src.slice();
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const span = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let x = -r; x <= r; x++) sum += src[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / span;
      sum += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / span;
      sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/** Üç kutu geçişi ≈ Gauss bulanıklığı (yarıçap piksel cinsinden). */
export function blur(src: Field, w: number, h: number, radius: number): Field {
  if (radius < 0.5) return src.slice();
  const r = Math.max(1, Math.round(radius / 1.7));
  return boxBlur(boxBlur(boxBlur(src, w, h, r), w, h, r), w, h, r);
}

/** Yumuşak değer gürültüsü, [-0.5, 0.5]. `cellsX × cellsY` ızgara. */
export function valueNoise(
  w: number,
  h: number,
  cellsX: number,
  cellsY: number,
  rnd: () => number,
): Field {
  const gw = cellsX + 1;
  const grid = new Float32Array(gw * (cellsY + 1));
  for (let i = 0; i < grid.length; i++) grid[i] = rnd();
  const out = new Float32Array(w * h);
  const fxs = new Float32Array(w);
  const x0s = new Int32Array(w);
  for (let x = 0; x < w; x++) {
    const gx = (x / w) * cellsX;
    const x0 = Math.min(cellsX - 1, Math.floor(gx));
    x0s[x] = x0;
    const t = gx - x0;
    fxs[x] = t * t * (3 - 2 * t);
  }
  for (let y = 0; y < h; y++) {
    const gy = (y / h) * cellsY;
    const y0 = Math.min(cellsY - 1, Math.floor(gy));
    const ty = gy - y0;
    const fy = ty * ty * (3 - 2 * ty);
    const r0 = y0 * gw;
    const r1 = r0 + gw;
    for (let x = 0; x < w; x++) {
      const x0 = x0s[x];
      const fx = fxs[x];
      const top = grid[r0 + x0] + (grid[r0 + x0 + 1] - grid[r0 + x0]) * fx;
      const bottom = grid[r1 + x0] + (grid[r1 + x0 + 1] - grid[r1 + x0]) * fx;
      out[y * w + x] = top + (bottom - top) * fy - 0.5;
    }
  }
  return out;
}

/** Birkaç oktavlık gürültü toplamı, yaklaşık [-0.5, 0.5]. */
export function fbm(
  w: number,
  h: number,
  cellsX: number,
  cellsY: number,
  octaves: number,
  rnd: () => number,
): Field {
  const out = new Float32Array(w * h);
  let amp = 0.5;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    const layer = valueNoise(w, h, cellsX << o, cellsY << o, rnd);
    for (let i = 0; i < out.length; i++) out[i] += layer[i] * amp;
    norm += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

/** Yükseklikten OpenGL normal haritası (yeşil = yukarı). */
export function normalsFromHeight(height: Field, w: number, h: number, strength: number) {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const up = Math.max(0, y - 1) * w;
    const down = Math.min(h - 1, y + 1) * w;
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const l = height[row + Math.max(0, x - 1)];
      const r = height[row + Math.min(w - 1, x + 1)];
      const t = height[up + x];
      const b = height[down + x];
      const nx = (l - r) * strength;
      const ny = (b - t) * strength;
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const o = (row + x) * 4;
      out[o] = (nx * inv * 0.5 + 0.5) * 255;
      out[o + 1] = (ny * inv * 0.5 + 0.5) * 255;
      out[o + 2] = (inv * 0.5 + 0.5) * 255;
      out[o + 3] = 255;
    }
  }
  return out;
}

/** Kanvasın bir kanalını [0, 1] alanına çevirir. */
export function fieldFromCanvas(canvas: AnyCanvas, channel: 0 | 1 | 2 | 3 = 3): Field {
  const { width: w, height: h } = canvas;
  const data = context2d(canvas).getImageData(0, 0, w, h).data;
  const out = new Float32Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + channel] / 255;
  return out;
}

/** Kanvasa çizim yapıp alfa kanalını alan olarak döndürür. */
export function drawField(w: number, h: number, paint: (ctx: Ctx2D) => void): Field {
  const canvas = makeCanvas(w, h);
  const ctx = context2d(canvas);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  paint(ctx);
  return fieldFromCanvas(canvas, 3);
}

/** Alanları RGBA kanvasa paketler (sayı verilirse sabit kanal). */
export function packCanvas(
  w: number,
  h: number,
  channels: [Field | number, Field | number, Field | number, (Field | number)?],
  target?: AnyCanvas,
) {
  const canvas = target ?? makeCanvas(w, h);
  const ctx = context2d(canvas);
  const image = ctx.createImageData(w, h);
  const data = image.data;
  for (let c = 0; c < 4; c++) {
    const source = channels[c] ?? 1;
    const o = c;
    if (typeof source === 'number') {
      const v = Math.round(clamp01(source) * 255);
      for (let i = 0; i < w * h; i++) data[i * 4 + o] = v;
    } else {
      for (let i = 0; i < w * h; i++) data[i * 4 + o] = source[i] * 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export function rgbaCanvas(w: number, h: number, pixels: Uint8ClampedArray, target?: AnyCanvas) {
  const canvas = target ?? makeCanvas(w, h);
  context2d(canvas).putImageData(new ImageData(pixels as Uint8ClampedArray<ArrayBuffer>, w, h), 0, 0);
  return canvas;
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? [...clean].map((c) => c + c).join('') : clean;
  const v = parseInt(full.slice(0, 6), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

/** Görüntüyü yükler (aynı köken). */
export function loadImage(src: string, signal?: AbortSignal) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.crossOrigin = 'anonymous';
    const abort = () => {
      image.src = '';
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', abort, { once: true });
    image.onload = () => {
      signal?.removeEventListener('abort', abort);
      resolve(image);
    };
    image.onerror = () => {
      signal?.removeEventListener('abort', abort);
      reject(new Error(`Image failed: ${src}`));
    };
    image.src = src;
  });
}

/** Kabartmanın kenarları: ışık oymaların sırtında ince çizgiler hâlinde
    dolaşsın diye eğim büyüklüğü (üst yüzdelikle normalize) + biraz yükseklik. */
export function ridgeField(height: Field, w: number, h: number, bodyShare = 0.18): Field {
  const grad = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      grad[i] = Math.hypot(height[i + 1] - height[i - 1], height[i + w] - height[i - w]);
    }
  }
  // Üst yüzdeliği kaba bir histogramla bul.
  const bins = new Uint32Array(256);
  let max = 1e-6;
  for (let i = 0; i < grad.length; i++) if (grad[i] > max) max = grad[i];
  for (let i = 0; i < grad.length; i++) bins[Math.min(255, Math.floor((grad[i] / max) * 255))]++;
  let count = 0;
  let cut = 255;
  const target = grad.length * 0.04;
  for (let b = 255; b > 0; b--) {
    count += bins[b];
    if (count > target) {
      cut = b;
      break;
    }
  }
  const norm = Math.max(1e-6, (cut / 255) * max);
  const out = new Float32Array(w * h);
  for (let i = 0; i < out.length; i++) {
    const edge = Math.min(1, grad[i] / norm);
    out[i] = Math.min(1, Math.pow(edge, 0.85) * (1 - bodyShare) + height[i] * bodyShare);
  }
  return out;
}
