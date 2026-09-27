import { sealLetters } from '@/lib/wax-seal';
import { blur, clamp01, drawField, hash, makeCanvas, context2d, yieldFrame, type Ctx2D } from '../relief';
import type { PainterInput, PainterOutput } from '../surface';
import {
  cavity,
  dotsAlongRect,
  lerp3,
  minus,
  noise2,
  rgb,
  roundRect,
  serifFamily,
  starPath,
  textAcrossSeam,
  wood,
  type RGB,
} from './kit';

/* Sedef Kakma: ceviz kündekâri kanatlar. Ana panoda Selçuklu'nun sekiz
   köşeli yıldız ve haç örgüsü; çıtaların ortasında sedef şerit, her
   yıldızın göbeğinde sedef yıldızcık. Üst panolarda çiftin baş harfleri
   sedef şemselerde, altta tarih kartuşu. Sağ kanatta gümüş anahtar
   aynası. Desen mührün tam ortasına hizalanır: kapalıyken iki kanat
   tek bir örgü gibi okunur. */

type Rect = { x: number; y: number; w: number; h: number };

const tileHash = (i: number, j: number) => hash(`${i},${j}`);

export async function paint({ width: W, height: H, personal, sealY, signal }: PainterInput): Promise<PainterOutput> {
  const N = W * H;
  const lw = W / 2;
  const seamX = W / 2;
  const sealCY = sealY * H;

  /* İskelet: kasa, kayıtlar, panolar. */
  const edge = lw * 0.045;
  const stile = lw * 0.1;
  const seamStile = lw * 0.075;
  const rail = lw * 0.085;
  // Üst pano uzun: isim levhası üst kısmı örter, şemseler onun altında kalır.
  const top0 = edge + stile;
  const topH = Math.max(H * 0.13, sealY * H - lw * 0.55 - rail - top0);
  const main0 = top0 + topH + rail;
  const bottomH = H * 0.09;
  const bottom1 = H - edge - stile;
  const bottom0 = bottom1 - bottomH;
  const main1 = bottom0 - rail;
  const leaves = ([0, 1] as const).map((side) => {
    const x0 = side === 0 ? edge + stile : seamX + seamStile;
    const x1 = side === 0 ? seamX - seamStile : W - edge - stile;
    return {
      top: { x: x0, y: top0, w: x1 - x0, h: topH },
      main: { x: x0, y: main0, w: x1 - x0, h: main1 - main0 },
      bottom: { x: x0, y: bottom0, w: x1 - x0, h: bottomH },
    };
  });
  const panelsOf = (kind: 'top' | 'main' | 'bottom') => leaves.map((l) => l[kind]);
  const allPanels = [...panelsOf('top'), ...panelsOf('main'), ...panelsOf('bottom')];

  /* Yıldız ve haç örgüsü (ana pano), mühre ortalı. */
  const s = leaves[0].main.w / 2.5;
  const outer = s / 2;
  const a = s / (2 * Math.SQRT2);
  const inner = a / Math.cos(Math.PI / 8);
  const lath = s * 0.078;
  const cols = Math.ceil(lw / s) + 2;
  const rows = Math.ceil(H / s) + 2;
  const eachStar = (fn: (cx: number, cy: number) => void) => {
    for (let j = -rows; j <= rows; j++)
      for (let i = -cols; i <= cols; i++) fn(seamX + i * s, sealCY + j * s);
  };
  // Alt panoda daha küçük yıldız dizisi.
  const s2 = bottomH * 0.62;
  const bottomCY = bottom0 + bottomH / 2;
  const eachSmall = (fn: (cx: number, cy: number) => void) => {
    for (let i = -Math.ceil(lw / s2) - 1; i <= Math.ceil(lw / s2) + 1; i++) fn(seamX + (i + 0.5) * s2, bottomCY);
  };

  const clip = (ctx: Ctx2D, rects: Rect[]) => {
    ctx.beginPath();
    for (const r of rects) ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
  };
  const stars = (ctx: Ctx2D, scale: number) => {
    ctx.beginPath();
    eachStar((cx, cy) => starPath(ctx, cx, cy, 8, outer * scale, inner * scale, 0));
  };
  const smallStars = (ctx: Ctx2D, scale: number) => {
    ctx.beginPath();
    eachSmall((cx, cy) => starPath(ctx, cx, cy, 8, (s2 / 2) * scale, (s2 / 2) * scale * 0.765, 0));
  };

  /* Şemse: baş harf çevresinde sedef halka, inci dizisi ve salbekler. */
  const letters = sealLetters(personal.initials);
  const family = serifFamily();
  const medallionR = Math.min(leaves[0].top.w * 0.3, topH * 0.2);
  const medallionY = top0 + topH - medallionR * 2.35 - lath * 2;
  const medallions = leaves.map((l, side) => ({
    cx: l.top.x + l.top.w / 2 + (side === 0 ? 1 : -1) * l.top.w * 0.04,
    cy: medallionY,
    r: medallionR,
    letter: letters[side] || '✦',
  }));

  /* Anahtar aynası (eskitme pirinç): sağ kanatta, mührün altında. */
  const kx = seamX + lw * 0.16;
  const ky = sealCY + lw * 0.36;
  const plateW = lw * 0.13;
  const plateH = lw * 0.36;
  const plate = (ctx: Ctx2D, grow = 0) => {
    const w = plateW / 2 + grow;
    const top = ky - plateH * 0.28 - grow;
    const bottom = ky + plateH * 0.72 + grow;
    ctx.beginPath();
    ctx.moveTo(kx, top - w * 0.5);
    ctx.bezierCurveTo(kx + w * 0.7, top - w * 0.1, kx + w, top + w * 0.6, kx + w, ky);
    ctx.lineTo(kx + w, bottom - w * 1.2);
    ctx.bezierCurveTo(kx + w, bottom - w * 0.4, kx + w * 0.5, bottom, kx, bottom + w * 0.35);
    ctx.bezierCurveTo(kx - w * 0.5, bottom, kx - w, bottom - w * 0.4, kx - w, bottom - w * 1.2);
    ctx.lineTo(kx - w, ky);
    ctx.bezierCurveTo(kx - w, top + w * 0.6, kx - w * 0.7, top - w * 0.1, kx, top - w * 0.5);
    ctx.closePath();
  };
  const keyholeShape = (ctx: Ctx2D) => {
    const r = plateW * 0.17;
    ctx.beginPath();
    ctx.arc(kx, ky, r, 0, Math.PI * 2);
    ctx.moveTo(kx - r * 0.45, ky + r * 0.4);
    ctx.lineTo(kx + r * 0.45, ky + r * 0.4);
    ctx.lineTo(kx + r * 0.75, ky + r * 3.1);
    ctx.lineTo(kx - r * 0.75, ky + r * 3.1);
    ctx.closePath();
  };

  /* Tarih kartuşu: iki kanadın ortasında, şemselerin altında. */
  const dateText = personal.date?.trim();
  const cartouche = { w: lw * 0.86, h: medallionR * 0.62 };
  const cartoucheY = medallionY + medallionR * 1.62 + cartouche.h * 0.5;

  /* Maskeler */
  const frame = drawField(W, H, (ctx) => {
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'destination-out';
    for (const r of allPanels) ctx.fillRect(r.x, r.y, r.w, r.h);
  });
  const starTiles = drawField(W, H, (ctx) => {
    ctx.save();
    clip(ctx, panelsOf('main'));
    stars(ctx, 1);
    ctx.fill();
    ctx.restore();
    ctx.save();
    clip(ctx, panelsOf('bottom'));
    smallStars(ctx, 1);
    ctx.fill();
    ctx.restore();
  });
  await yieldFrame(signal);
  const laths = drawField(W, H, (ctx) => {
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 3;
    ctx.save();
    clip(ctx, panelsOf('main'));
    ctx.lineWidth = lath;
    stars(ctx, 1);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    clip(ctx, panelsOf('bottom'));
    ctx.lineWidth = lath * 0.8;
    smallStars(ctx, 1);
    ctx.stroke();
    ctx.restore();
    // Pano çerçeveleri.
    ctx.lineWidth = lath * 1.3;
    for (const r of allPanels) ctx.strokeRect(r.x + lath * 0.65, r.y + lath * 0.65, r.w - lath * 1.3, r.h - lath * 1.3);
  });
  const pearl = drawField(W, H, (ctx) => {
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 3;
    ctx.save();
    clip(ctx, panelsOf('main'));
    ctx.lineWidth = lath * 0.36;
    stars(ctx, 1);
    ctx.stroke();
    stars(ctx, 0.34);
    ctx.fill();
    ctx.beginPath();
    eachStar((cx, cy) => {
      ctx.moveTo(cx + s / 2 + s * 0.05, cy + s / 2);
      ctx.arc(cx + s / 2, cy + s / 2, s * 0.05, 0, Math.PI * 2);
    });
    ctx.fill();
    ctx.restore();
    ctx.save();
    clip(ctx, panelsOf('bottom'));
    ctx.lineWidth = lath * 0.3;
    smallStars(ctx, 1);
    ctx.stroke();
    ctx.beginPath();
    eachSmall((cx, cy) => {
      ctx.moveTo(cx + s2 * 0.08, cy);
      ctx.arc(cx, cy, s2 * 0.08, 0, Math.PI * 2);
    });
    ctx.fill();
    ctx.restore();
    // Pano çerçevelerinin sedef çizgisi ve kasadaki inci dizisi.
    ctx.lineWidth = lath * 0.42;
    for (const r of allPanels) ctx.strokeRect(r.x + lath * 0.65, r.y + lath * 0.65, r.w - lath * 1.3, r.h - lath * 1.3);
    for (const r of allPanels)
      dotsAlongRect(ctx, r.x - stile * 0.42, r.y - stile * 0.42, r.w + stile * 0.84, r.h + stile * 0.84, lw * 0.042, lw * 0.009);
    // Şemseler.
    for (const m of medallions) {
      ctx.lineWidth = m.r * 0.07;
      ctx.beginPath();
      ctx.arc(m.cx, m.cy, m.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = m.r * 0.03;
      ctx.beginPath();
      ctx.arc(m.cx, m.cy, m.r * 0.84, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      for (let k = 0; k < 24; k++) {
        const t = (k / 24) * Math.PI * 2;
        const x = m.cx + Math.cos(t) * m.r * 1.16;
        const y = m.cy + Math.sin(t) * m.r * 1.16;
        ctx.moveTo(x + m.r * 0.045, y);
        ctx.arc(x, y, m.r * 0.045, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.beginPath();
      for (const dir of [-1, 1]) starPath(ctx, m.cx, m.cy + dir * m.r * 1.52, 8, m.r * 0.2, m.r * 0.13, 0);
      ctx.fill();
      ctx.font = `600 ${Math.round(m.r * 1.18)}px ${family}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.letter, m.cx, m.cy + m.r * 0.06);
    }
    // Tarih kartuşu.
    ctx.lineWidth = lath * 0.42;
    ctx.beginPath();
    roundRect(ctx, seamX - cartouche.w / 2, cartoucheY - cartouche.h / 2, cartouche.w, cartouche.h, cartouche.h / 2);
    ctx.stroke();
    ctx.font = `600 ${Math.round(cartouche.h * 0.5)}px ${family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (dateText) textAcrossSeam(ctx, dateText, seamX, cartoucheY + cartouche.h * 0.04, seamStile * 0.9);
    else {
      ctx.beginPath();
      starPath(ctx, seamX, cartoucheY, 8, cartouche.h * 0.28, cartouche.h * 0.19, 0);
      ctx.fill();
    }
  });
  await yieldFrame(signal);
  const cartoucheBed = drawField(W, H, (ctx) => {
    ctx.beginPath();
    roundRect(ctx, seamX - cartouche.w / 2, cartoucheY - cartouche.h / 2, cartouche.w, cartouche.h, cartouche.h / 2);
    ctx.fill();
  });
  const silver = drawField(W, H, (ctx) => {
    plate(ctx);
    ctx.fill();
  });
  const hole = drawField(W, H, (ctx) => {
    keyholeShape(ctx);
    ctx.fill();
  });
  const raised = drawField(W, H, (ctx) => {
    for (const m of medallions) {
      ctx.font = `600 ${Math.round(m.r * 1.18)}px ${family}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.letter, m.cx, m.cy + m.r * 0.06);
      ctx.lineWidth = m.r * 0.07;
      ctx.beginPath();
      ctx.arc(m.cx, m.cy, m.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  // Çıtanın sedef olmayan kenarları abanoz.
  const ebony = minus(laths, pearl);
  await yieldFrame(signal);

  /* Yükseklik */
  const frameBevel = blur(frame, W, H, lw * 0.018);
  const pillow = blur(starTiles, W, H, s * 0.1);
  const lathSoft = blur(laths, W, H, 1.2);
  const plateSoft = blur(silver, W, H, 2.5);
  const height = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    height[i] =
      0.26 +
      0.3 * frameBevel[i] +
      0.08 * starTiles[i] +
      0.07 * pillow[i] +
      0.15 * lathSoft[i] -
      0.012 * pearl[i] +
      0.06 * raised[i] +
      0.18 * plateSoft[i] -
      0.3 * hole[i];
  }
  await yieldFrame(signal);
  const ao = cavity(height, W, H, lw * 0.06, 2.6);
  await yieldFrame(signal);

  /* Renk ve malzeme */
  const n = noise2(personal.seed + '|kakma');
  const tint = noise2(personal.seed + '|sedef');
  const walnutDark = rgb('#26140a');
  const walnutMid = rgb('#4a2a15');
  const walnutLight = rgb('#6c4122');
  const crossDark = rgb('#1f1008');
  const crossMid = rgb('#3a2011');
  const ebonyColor = rgb('#120a06');
  const pearlBase = rgb('#ddd5c7');
  const silverColor = rgb('#b8914f');
  const holeColor = rgb('#070504');
  const albedo = makeCanvas(W, H);
  const actx = context2d(albedo);
  const image = actx.createImageData(W, H);
  const data = image.data;
  const roughness = new Float32Array(N);
  const metalness = new Float32Array(N);
  const thickness = new Float32Array(N);
  const glow = new Float32Array(N);
  const railBands: [number, number][] = [
    [0, top0],
    [top0 + topH, main0],
    [main1, bottom0],
    [bottom1, H],
  ];
  const angles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4];
  for (let y = 0; y < H; y++) {
    const inRail = railBands.some(([a0, a1]) => y >= a0 && y < a1);
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let base: RGB;
      if (frame[i] > 0.5) {
        // Kasa: dikmelerde dikey, kayıtlarda yatay damar.
        const inStile = x < edge + stile || x > W - edge - stile || Math.abs(x - seamX) < seamStile;
        const g = wood(n, x, y, inRail && !inStile ? 0 : Math.PI / 2, lw / 340);
        base = lerp3(walnutDark, walnutMid, g);
      } else if (y > main0 - 1 && y < main1 + 1) {
        const fx = (x - seamX) / s;
        const fy = (y - sealCY) / s;
        const ci = Math.round(fx);
        const cj = Math.round(fy);
        const dx = Math.abs((fx - ci) * s);
        const dy = Math.abs((fy - cj) * s);
        const inStar = Math.max(dx, dy) <= a || dx + dy <= outer;
        const h = inStar ? tileHash(ci, cj) : tileHash(Math.floor(fx) + 5000, Math.floor(fy) + 5000);
        const g = wood(n, x + (h & 255), y + ((h >> 8) & 255), angles[h & 3], lw / 420);
        base = inStar ? lerp3(walnutMid, walnutLight, g) : lerp3(crossDark, crossMid, g);
      } else {
        const g = wood(n, x, y, Math.PI / 2, lw / 380);
        base = starTiles[i] > 0.5 ? lerp3(walnutMid, walnutLight, g) : lerp3(crossDark, crossMid, g * 0.9 + 0.1);
      }
      // Sedef: parça parça hafif pembe, yeşil, mavi yansımalar.
      const t1 = tint(x / 26, y / 26);
      const t2 = tint(x / 90 + 40, y / 90);
      const pearlColor: RGB = [
        pearlBase[0] - 0.035 + t1 * 0.05,
        pearlBase[1] - 0.03 + t2 * 0.045,
        pearlBase[2] - 0.05 + (1 - t1) * 0.07,
      ];
      const p = pearl[i];
      const e = ebony[i];
      const sv = silver[i];
      const hl = hole[i];
      const bed = cartoucheBed[i] * (1 - p);
      let r = base[0];
      let gg = base[1];
      let b = base[2];
      if (bed > 0) {
        r += (ebonyColor[0] - r) * bed * 0.85;
        gg += (ebonyColor[1] - gg) * bed * 0.85;
        b += (ebonyColor[2] - b) * bed * 0.85;
      }
      r += (ebonyColor[0] - r) * e;
      gg += (ebonyColor[1] - gg) * e;
      b += (ebonyColor[2] - b) * e;
      r += (pearlColor[0] - r) * p;
      gg += (pearlColor[1] - gg) * p;
      b += (pearlColor[2] - b) * p;
      const brushed = 0.85 + n(x * 0.05, y * 0.05) * 0.25;
      r += (silverColor[0] * brushed - r) * sv;
      gg += (silverColor[1] * brushed - gg) * sv;
      b += (silverColor[2] * brushed - b) * sv;
      r += (holeColor[0] - r) * hl;
      gg += (holeColor[1] - gg) * hl;
      b += (holeColor[2] - b) * hl;
      const shade = 0.78 + 0.22 * ao[i];
      const o = i * 4;
      data[o] = clamp01(r * shade) * 255;
      data[o + 1] = clamp01(gg * shade) * 255;
      data[o + 2] = clamp01(b * shade) * 255;
      data[o + 3] = 255;
      const woodRough = 0.5 - bed * 0.08;
      let rough = woodRough + (0.42 - woodRough) * e;
      rough += (0.17 - rough) * p;
      rough += (0.26 - rough) * sv;
      rough += (0.9 - rough) * hl;
      roughness[i] = rough;
      metalness[i] = sv * (1 - hl) * 0.78;
      thickness[i] = clamp01(0.15 + 0.85 * tint(x / 55 + 7, y / 55 - 3));
      glow[i] = p;
    }
    if ((y & 127) === 0) await yieldFrame(signal);
  }
  actx.putImageData(image, 0, 0);
  return {
    albedo,
    height,
    roughness,
    metalness,
    ao,
    glow: blur(glow, W, H, 1),
    iridescence: pearl,
    thickness,
    normalStrength: 3.2,
    features: { keyhole: { u: kx / W, v: ky / H } },
  };
}
