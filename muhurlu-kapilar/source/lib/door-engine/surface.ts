import type { DoorConfig, DoorPainterId } from '@/lib/door-themes';
import {
  type AnyCanvas,
  type Field,
  blur,
  context2d,
  loadImage,
  makeCanvas,
  normalsFromHeight,
  packCanvas,
  ridgeField,
  rgbaCanvas,
  yieldFrame,
} from './relief';

/* Kapı yüzeyi: kanatların üzerine gerilen tüm haritalar. Görsel kapılar
   (Fildişi Rölyef gibi) yüklenen resimden, çizimli kapılar (Sedef Kakma,
   Kış Bahçesi, Pera) tarayıcıda boyanan katmanlardan aynı biçime gelir. */

export type DoorPersonal = {
  /** "SA" gibi iki harf. */
  initials: string;
  /** Kapıya işlenecek kısa tarih ("12 · 06 · 2027"). */
  date?: string;
  seed: string;
};

export type GlassFeature = {
  /** Camın ardındaki net sahne (sRGB). */
  interior: AnyCanvas;
  /** Aynı sahnenin buğulu, dağınık hâli. */
  interiorSoft: AnyCanvas;
  /** Damlacık normal haritası (rg) ve yoğunluğu (a). */
  drops: AnyCanvas;
  /** Camın bulunduğu yerler, küçük çözünürlükte (silme ilerlemesi için). */
  pane: { width: number; height: number; data: Field };
};

export type SurfaceFeatures = {
  /** Anahtar deliği (kapı görseli koordinatı: u sol→sağ, v üst→alt). */
  keyhole?: { u: number; v: number };
  glass?: GlassFeature;
};

export type DoorSurface = {
  width: number;
  height: number;
  fit: 'stretch' | 'cover';
  albedo: TexImageSource | AnyCanvas;
  normal?: AnyCanvas;
  /** Düşük frekanslı yükseklik (kanat kıvrımı için). */
  displacement?: AnyCanvas;
  /** R: ortam gölgesi, G: pürüzlülük, B: metallik. */
  orm?: AnyCanvas;
  /** R: ışık dalgasının gezindiği kabartma. */
  glow?: AnyCanvas;
  /** R: sedef maskesi, G: katman kalınlığı. */
  iridescence?: AnyCanvas;
  /** R: opaklık (cam delikleri için). */
  alpha?: AnyCanvas;
  normalStrength: number;
  features: SurfaceFeatures;
};

export type PainterInput = {
  width: number;
  height: number;
  personal: DoorPersonal;
  /** Mührün dikey yeri (0 üst, 1 alt). */
  sealY: number;
  signal?: AbortSignal;
};

export type PainterOutput = {
  albedo: AnyCanvas;
  height: Field;
  roughness: Field | number;
  metalness: Field | number;
  ao?: Field;
  glow?: Field;
  iridescence?: Field;
  thickness?: Field;
  alpha?: Field;
  /** Normal haritası eğimi (piksel başına). */
  normalStrength?: number;
  features?: SurfaceFeatures;
};

export type DoorPainter = (input: PainterInput) => Promise<PainterOutput>;

const painters: Record<DoorPainterId, () => Promise<{ paint: DoorPainter }>> = {
  kakma: () => import('./painters/kakma'),
  kisbahcesi: () => import('./painters/kisbahcesi'),
  pera: () => import('./painters/pera'),
};

export async function loadPainter(id: DoorPainterId) {
  return (await painters[id]()).paint;
}

/** Çizimli kapının dokusu için boyut: ekran oranında, en fazla ~1.2 MP. */
export function paintedSize(aspect: number, cssHeight: number) {
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  let height = Math.round(Math.min(1600, Math.max(960, cssHeight * Math.min(dpr, 1.75))));
  let width = Math.round(height * aspect);
  const budget = 1_250_000;
  if (width * height > budget) {
    const k = Math.sqrt(budget / (width * height));
    width = Math.round(width * k);
    height = Math.round(height * k);
  }
  return { width, height };
}

/** Kabartma maskesinden yükseklik: alfa taşıyorsa alfadan, yoksa parlaklıktan. */
function heightFromMask(image: HTMLImageElement) {
  const budget = 1_100_000;
  const scale = Math.min(1.5, Math.sqrt(budget / (image.naturalWidth * image.naturalHeight)));
  const w = Math.max(2, Math.round(image.naturalWidth * scale));
  const h = Math.max(2, Math.round(image.naturalHeight * scale));
  const canvas = makeCanvas(w, h);
  const ctx = context2d(canvas);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  let min = 255;
  let max = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  const useAlpha = max - min > 24;
  const height = new Float32Array(w * h);
  for (let i = 0; i < height.length; i++) {
    const o = i * 4;
    height[i] = useAlpha
      ? data[o + 3] / 255
      : (data[o] * 0.2126 + data[o + 1] * 0.7152 + data[o + 2] * 0.0722) / 255;
  }
  return { height, w, h };
}

/** Görsel kapı: sanat + kabartma maskesi → haritalar. */
async function imageSurface(door: DoorConfig, signal?: AbortSignal): Promise<DoorSurface> {
  const [art, mask] = await Promise.all([
    loadImage(door.art, signal),
    door.mask ? loadImage(door.mask, signal) : Promise.resolve(null),
  ]);
  const surface: DoorSurface = {
    width: art.naturalWidth,
    height: art.naturalHeight,
    fit: door.fit,
    albedo: art,
    normalStrength: 1,
    features: {},
  };
  if (!mask) return surface;
  await yieldFrame(signal);
  const { height: raw, w, h } = heightFromMask(mask);
  // İnce gürültüyü süz, kabartma kenarlarını yumuşat: ışık pürüzsüz kayar.
  const relief = blur(raw, w, h, Math.max(1, w / 520));
  await yieldFrame(signal);
  // Eğim, görselin çözünürlüğünden bağımsız aynı kabartma derinliğini versin;
  // tasarımın derinlik ayarı (`bump`) malzemenin normal ölçeğine uygulanır.
  const strength = (w / 480) * 2.4;
  surface.normal = rgbaCanvas(w, h, normalsFromHeight(relief, w, h, strength));
  await yieldFrame(signal);
  const low = blur(raw, w, h, w / 90);
  surface.displacement = packCanvas(w, h, [low, low, low, 1]);
  await yieldFrame(signal);
  // Işık dalgası oymaların sırtında dolaşır (Fildişi ışık çalışmasındaki gibi).
  const ridges = blur(ridgeField(relief, w, h), w, h, Math.max(0.8, w / 900));
  surface.glow = packCanvas(w, h, [ridges, ridges, ridges, 1]);
  return surface;
}

/** Çizimli kapı: boyacıyı çalıştırır, katmanları haritalara çevirir. */
async function paintedSurface(
  door: DoorConfig,
  id: DoorPainterId,
  personal: DoorPersonal,
  size: { width: number; height: number },
  signal?: AbortSignal,
): Promise<DoorSurface> {
  const paint = await loadPainter(id);
  const out = await paint({ ...size, personal, sealY: door.y, signal });
  const { width: w, height: h } = size;
  await yieldFrame(signal);
  const soft = blur(out.height, w, h, Math.max(0.8, w / 900));
  const strength = (out.normalStrength ?? 3) * (w / 700);
  const normal = rgbaCanvas(w, h, normalsFromHeight(soft, w, h, strength));
  await yieldFrame(signal);
  const low = blur(out.height, w, h, w / 80);
  const surface: DoorSurface = {
    width: w,
    height: h,
    fit: 'stretch',
    albedo: out.albedo,
    normal,
    displacement: packCanvas(w, h, [low, low, low, 1]),
    orm: packCanvas(w, h, [out.ao ?? 1, out.roughness, out.metalness, 1]),
    normalStrength: 1,
    features: out.features ?? {},
  };
  if (out.glow) surface.glow = packCanvas(w, h, [out.glow, out.glow, out.glow, 1]);
  if (out.iridescence)
    surface.iridescence = packCanvas(w, h, [out.iridescence, out.thickness ?? 0.5, 0, 1]);
  if (out.alpha) surface.alpha = packCanvas(w, h, [out.alpha, out.alpha, out.alpha, 1]);
  return surface;
}

export async function buildSurface(
  door: DoorConfig,
  personal: DoorPersonal,
  size: { width: number; height: number },
  signal?: AbortSignal,
) {
  return door.procedural
    ? paintedSurface(door, door.procedural, personal, size, signal)
    : imageSurface(door, signal);
}
