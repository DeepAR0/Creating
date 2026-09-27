import type { TankGeom } from './layout';
import { clamp } from '../game/util';

/**
 * Dünya → ekran dönüşümü. Küçük tanklar odada ortalanır; büyük tanklar
 * ekrandan genişse yatay kaydırma (pan) açılır.
 */
export class Camera {
  vw = 1;
  vh = 1;
  dpr = 1;
  scale = 10;
  offX = 0;
  offY = 0;
  camX = 0;
  minCamX = 0;
  maxCamX = 0;
  canPan = false;
  private geom: TankGeom | null = null;

  fit(g: TankGeom, vw: number, vh: number, dpr: number, safeLeft = 0, safeRight = 0) {
    const keepCenter = this.geom && this.canPan ? this.camX + this.vw / this.scale / 2 : null;
    this.geom = g;
    this.vw = vw;
    this.vh = vh;
    this.dpr = dpr;
    this.scale = vh / (g.H * g.viewF);
    const usableW = vw - safeLeft - safeRight;
    const tankPx = g.W * this.scale;
    this.offY = vh * 0.545 - (g.H / 2) * this.scale;
    if (tankPx <= usableW * 0.98) {
      this.canPan = false;
      this.camX = 0;
      this.offX = safeLeft + (usableW - tankPx) / 2;
    } else {
      this.canPan = true;
      this.offX = 0;
      const margin = 3;
      this.minCamX = -margin - safeLeft / this.scale;
      this.maxCamX = g.W + margin + safeRight / this.scale - vw / this.scale;
      const center = keepCenter ?? g.W / 2;
      this.camX = clamp(center - vw / this.scale / 2, this.minCamX, this.maxCamX);
    }
  }

  panBy(dxPx: number) {
    if (!this.canPan) return;
    this.camX = clamp(this.camX - dxPx / this.scale, this.minCamX, this.maxCamX);
  }

  /** Belirtilen dünya x'ini ekranda görünür yapar */
  focusX(x: number) {
    if (!this.canPan) return;
    this.camX = clamp(x - this.vw / this.scale / 2, this.minCamX, this.maxCamX);
  }

  sx(x: number) {
    return (x - this.camX) * this.scale + this.offX;
  }

  sy(y: number) {
    return y * this.scale + this.offY;
  }

  wx(sx: number) {
    return (sx - this.offX) / this.scale + this.camX;
  }

  wy(sy: number) {
    return (sy - this.offY) / this.scale;
  }

  /** Canvas bağlamını dünya koordinatlarına ayarlar */
  apply(ctx: CanvasRenderingContext2D) {
    const k = this.scale * this.dpr;
    ctx.setTransform(k, 0, 0, k, (this.offX - this.camX * this.scale) * this.dpr, this.offY * this.dpr);
  }

  applyScreen(ctx: CanvasRenderingContext2D) {
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /** Görünür dünya x aralığı */
  visibleX(): [number, number] {
    return [this.wx(0), this.wx(this.vw)];
  }
}
