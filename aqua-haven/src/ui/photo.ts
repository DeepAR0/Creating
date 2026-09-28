import { getGame, getScene, setUI } from './store';
import { t } from '../i18n';
import { AquaNative } from '../services/native';
import { isIOS } from '../services/platform';

export function enterPhoto() {
  setUI({ photo: true, photoShot: null, tool: 'hand', selectedFish: null, decorSel: null, panel: null, foodOpen: false });
}

export function exitPhoto() {
  setUI({ photo: false, photoShot: null });
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function watermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const fs = Math.max(14, Math.round(h * 0.042));
  ctx.font = `800 ${fs}px "Baloo 2 Variable", "Nunito Variable", sans-serif`;
  const text = 'Aqua Haven';
  const tw = ctx.measureText(text).width;
  const pad = fs * 0.6;
  const fishW = fs * 1.2;
  const bw = pad + fishW + pad * 0.5 + tw + pad;
  const bh = fs * 1.6;
  const x = w - bw - fs * 0.8;
  const y = h - bh - fs * 0.8;
  ctx.fillStyle = 'rgba(4,33,58,0.6)';
  pill(ctx, x, y, bw, bh);
  ctx.fill();
  const fx = x + pad + fishW * 0.6;
  const fy = y + bh / 2;
  ctx.fillStyle = '#ffb020';
  ctx.beginPath();
  ctx.ellipse(fx, fy, fishW * 0.38, fs * 0.3, 0, 0, Math.PI * 2);
  ctx.moveTo(fx - fishW * 0.3, fy);
  ctx.lineTo(fx - fishW * 0.62, fy - fs * 0.3);
  ctx.lineTo(fx - fishW * 0.62, fy + fs * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#04213a';
  ctx.beginPath();
  ctx.arc(fx + fishW * 0.2, fy - fs * 0.06, fs * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#eaf6ff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + pad + fishW + pad * 0.5, fy + fs * 0.06);
}

/** Sahnenin şu anki karesini logo ile birlikte JPEG olarak döndürür */
export function capturePhoto(): string {
  const src = getScene().canvas;
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  watermark(ctx, c.width, c.height);
  const g = getGame();
  g.state.stats.photos++;
  g.progress('photo', 1);
  return c.toDataURL('image/jpeg', 0.9);
}

/** Paylaşım sayfasını açar; paylaşım yoksa false döner (web: uzun basıp kaydetme) */
export async function sharePhoto(dataUrl: string): Promise<boolean> {
  const text = t('photo.shareText');
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  if (isIOS) {
    try {
      await AquaNative.shareImage({ base64, text });
      return true;
    } catch {
      return false;
    }
  }
  try {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const file = new File([bytes], 'aqua-haven.jpg', { type: 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return true;
    }
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return true;
  }
  return false;
}
