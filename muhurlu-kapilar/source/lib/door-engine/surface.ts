import type { DoorConfig, DoorPainterId } from '@/lib/door-themes';
import {
  type AnyCanvas,
  type Field,
  type MapData,
  blur,
  context2d,
  loadImage,
  makeCanvas,
  normalsFromHeight,
  packData,
  rgbaData,
  ridgeField,
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
  normal?: MapData;
  /** Düşük frekanslı yükseklik (kanat kıvrımı için). */
  displacement?: MapData;
  /** R: ortam gölgesi, G: pürüzlülük, B: metallik. */
  orm?: MapData;
  /** R: ışık dalgasının gezindiği kabartma. */
  glow?: MapData;
  /** R: sedef maskesi, G: katman kalınlığı. */
  iridescence?: MapData;
  /** R: opaklık (cam delikleri için). */
  alpha?: MapData;
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

/** İki kanadın toplam genişliği (sahne birimi); kamera 4 birim görür. */
export const DOOR_WIDTH = 4.06;

/** Kapı düzleminin en/boy oranı: sahnenin kurduğu düzlemle aynı hesap. */
export function doorAspect(width: number, height: number) {
  const planeHeight = ((4 * Math.max(1, height)) / Math.max(1, width)) * 1.025;
  return DOOR_WIDTH / planeHeight;
}

/** Ekran kutusu için doku boyutu (çizim 3B motordan önce başlayabilsin). */
export function surfaceSize(rect: { width: number; height: number }) {
  const width = rect.width || 390;
  const height = rect.height || 844;
  return paintedSize(doorAspect(width, height), height);
}

/** Çizimli kapının dokusu için boyut: ekran oranında, en fazla ~0.8 MP.
    (Fildişi görseli 1024 × 1536; ışıklı normal haritası bu çözünürlükte
    telefonda keskin kalır, çizim bir saniyenin altında biter.) */
export function paintedSize(aspect: number, cssHeight: number) {
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  let height = Math.round(Math.min(1400, Math.max(960, cssHeight * Math.min(dpr, 1.6))));
  let width = Math.round(height * aspect);
  const budget = 820_000;
  if (width * height > budget) {
    const k = Math.sqrt(budget / (width * height));
    width = Math.round(width * k);
    height = Math.round(height * k);
  }
  return { width, height };
}

/** Kanat kıvrımı için yüksekliğin kaba hâli: dörtte bir çözünürlükte
    bulanıklaştırılır (ayrıntı normal haritasında; burada yalnızca biçim). */
function lowPass(height: Field, w: number, h: number, divisor: number): MapData {
  const k = 4;
  const sw = Math.max(2, Math.floor(w / k));
  const sh = Math.max(2, Math.floor(h / k));
  const small = new Float32Array(sw * sh);
  for (let y = 0; y < sh; y++)
    for (let x = 0; x < sw; x++) {
      let acc = 0;
      for (let dy = 0; dy < k; dy++) {
        const row = (y * k + dy) * w + x * k;
        for (let dx = 0; dx < k; dx++) acc += height[row + dx];
      }
      small[y * sw + x] = acc / (k * k);
    }
  const low = blur(small, sw, sh, sw / divisor);
  return packData(sw, sh, [low, 0, 0, 1]);
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
  surface.normal = rgbaData(w, h, normalsFromHeight(relief, w, h, strength));
  await yieldFrame(signal);
  surface.displacement = lowPass(raw, w, h, 90);
  await yieldFrame(signal);
  // Işık dalgası oymaların sırtında dolaşır (Fildişi ışık çalışmasındaki gibi).
  const ridges = blur(ridgeField(relief, w, h), w, h, Math.max(0.8, w / 900));
  surface.glow = packData(w, h, [ridges, 0, 0, 1]);
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
  const normal = rgbaData(w, h, normalsFromHeight(soft, w, h, strength));
  await yieldFrame(signal);
  const surface: DoorSurface = {
    width: w,
    height: h,
    fit: 'stretch',
    albedo: out.albedo,
    normal,
    displacement: lowPass(out.height, w, h, 80),
    orm: packData(w, h, [out.ao ?? 1, out.roughness, out.metalness, 1]),
    normalStrength: 1,
    features: out.features ?? {},
  };
  if (out.glow) surface.glow = packData(w, h, [out.glow, 0, 0, 1]);
  if (out.iridescence) surface.iridescence = packData(w, h, [out.iridescence, out.thickness ?? 0.5, 0, 1]);
  // Cam maskesi: alfa haritası yeşil kanalı okur.
  if (out.alpha) surface.alpha = packData(w, h, [out.alpha, out.alpha, 0, 1]);
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
