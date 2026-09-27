import { sealLetters } from '@/lib/wax-seal';
import { blur, clamp01, context2d, drawField, makeCanvas, random, hash, yieldFrame, type Ctx2D, type Field } from '../relief';
import type { PainterInput, PainterOutput } from '../surface';
import { cavity, noise2, rgb, roundRect, serifFamily, textAcrossSeam } from './kit';

/* Kış Bahçesi: dövme demir, camlı çift kanat. Üstte yelpaze kemerli bir
   tepe penceresi ve göbeğinde çiftin harfleri; ortada mührün oturduğu
   dilimli bir demir gül; köşelerde Art Nouveau kıvrımları. Camın ardında
   gece bahçesi: ışık dizileri, bulanık ışık halkaları, bitki gölgeleri.
   Cam buğuludur; konuk parmağıyla sildikçe içerisi görünür. */

type Point = [number, number];

/** Kıvrık demir: bir S eğrisi ve ucunda sarmal. */
function whiplash(ctx: Ctx2D, from: Point, to: Point, bend: number, curl: number) {
  const [x0, y0] = from;
  const [x1, y1] = to;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const nx = -(y1 - y0);
  const ny = x1 - x0;
  ctx.moveTo(x0, y0);
  ctx.bezierCurveTo(
    x0 + (mx - x0) * 0.6 + nx * bend,
    y0 + (my - y0) * 0.6 + ny * bend,
    x1 - (x1 - mx) * 0.6 - nx * bend,
    y1 - (y1 - my) * 0.6 - ny * bend,
    x1,
    y1,
  );
  // Sarmal uç.
  let angle = Math.atan2(y1 - y0, x1 - x0);
  let r = curl;
  let x = x1;
  let y = y1;
  for (let k = 0; k < 26; k++) {
    angle += 0.32 * Math.sign(bend || 1);
    r *= 0.93;
    x += Math.cos(angle) * r * 0.32;
    y += Math.sin(angle) * r * 0.32;
    ctx.lineTo(x, y);
  }
}

/** Demir çubukların yuvarlak profili. */
function ironHeight(iron: Field, round: Field, wide: Field, detail: Field, embossed: Field) {
  const out = new Float32Array(iron.length);
  for (let i = 0; i < out.length; i++)
    out[i] = 0.2 + iron[i] * (0.18 + Math.sqrt(round[i]) * 0.2 + wide[i] * 0.12) + detail[i] * 0.07 + embossed[i] * 0.05;
  return out;
}

/** Camın düşük çözünürlüklü haritası (silme ilerlemesi için). */
function paneMap(iron: Field, W: number, H: number) {
  const pw = 40;
  const ph = Math.max(40, Math.round((pw * H) / W));
  const pane = new Float32Array(pw * ph);
  for (let py = 0; py < ph; py++) {
    for (let px = 0; px < pw; px++) {
      let glass = 0;
      let count = 0;
      const x0 = Math.floor((px / pw) * W);
      const x1 = Math.floor(((px + 1) / pw) * W);
      const y0 = Math.floor((py / ph) * H);
      const y1 = Math.floor(((py + 1) / ph) * H);
      for (let y = y0; y < y1; y += 2)
        for (let x = x0; x < x1; x += 2) {
          glass += 1 - iron[y * W + x];
          count++;
        }
      pane[py * pw + px] = count ? glass / count : 0;
    }
  }
  return { width: pw, height: ph, data: pane };
}

/** Damla kalıbı: yarım küre normali (rg), parıltı (b), kenar (a). */
function dropSprite(size: number) {
  const canvas = makeCanvas(size, size);
  const ctx = context2d(canvas);
  const image = ctx.createImageData(size, size);
  const L = [-0.45, 0.6, 0.66];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = ((x + 0.5) / size) * 2 - 1;
      const dy = ((y + 0.5) / size) * 2 - 1;
      const r2 = dx * dx + dy * dy;
      const o = (y * size + x) * 4;
      if (r2 >= 1) continue;
      const nz = Math.sqrt(1 - r2);
      const ny = -dy;
      const spec = Math.pow(Math.max(0, dx * L[0] + ny * L[1] + nz * L[2]), 10);
      image.data[o] = (dx * 0.5 + 0.5) * 255;
      image.data[o + 1] = (ny * 0.5 + 0.5) * 255;
      image.data[o + 2] = spec * 255;
      image.data[o + 3] = Math.min(1, (1 - r2) * 4) * 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** Camın ardındaki gece bahçesi (net). */
function paintInterior(w: number, h: number, seed: string) {
  const canvas = makeCanvas(w, h);
  const ctx = context2d(canvas);
  const rnd = random(hash(seed + '|bahce'));
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1a100a');
  g.addColorStop(0.45, '#3a2213');
  g.addColorStop(1, '#6b3c1d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w / 2, h * 0.6, 0, w / 2, h * 0.6, h * 0.6);
  glow.addColorStop(0, 'rgba(255,190,110,0.62)');
  glow.addColorStop(0.45, 'rgba(235,140,70,0.24)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  // Uzak ışık halkaları (bokeh).
  for (let i = 0; i < 120; i++) {
    const x = rnd() * w;
    const y = h * (0.1 + rnd() * 0.8);
    const r = w * (0.012 + rnd() * rnd() * 0.055);
    const warm = 28 + rnd() * 18;
    const a = 0.08 + rnd() * 0.22;
    const b = ctx.createRadialGradient(x, y, 0, x, y, r);
    b.addColorStop(0, `hsla(${warm}, 95%, 72%, ${a})`);
    b.addColorStop(0.8, `hsla(${warm}, 95%, 66%, ${a * 0.8})`);
    b.addColorStop(1, `hsla(${warm}, 95%, 60%, 0)`);
    ctx.fillStyle = b;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Işık dizileri: sarkık eğriler ve üzerinde küçük ampuller.
  for (let k = 0; k < 8; k++) {
    const y0 = h * (0.1 + k * 0.085) + (rnd() - 0.5) * h * 0.03;
    const sag = h * (0.03 + rnd() * 0.035);
    const tilt = (rnd() - 0.5) * h * 0.04;
    ctx.strokeStyle = 'rgba(20,14,10,0.7)';
    ctx.lineWidth = Math.max(1, w * 0.0018);
    ctx.beginPath();
    for (let x = 0; x <= w; x += w / 60) {
      const t = x / w;
      const y = y0 + tilt * t + sag * 4 * t * (1 - t);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    const step = w * (0.034 + rnd() * 0.012);
    for (let x = rnd() * step; x <= w; x += step) {
      const t = x / w;
      const y = y0 + tilt * t + sag * 4 * t * (1 - t) + w * 0.006;
      const r = w * 0.0075;
      const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
      halo.addColorStop(0, 'rgba(255,220,160,0.75)');
      halo.addColorStop(0.3, 'rgba(255,175,95,0.3)');
      halo.addColorStop(1, 'rgba(255,150,70,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, r * 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff1d6';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Bitki gölgeleri: köşelerde koyu yapraklar.
  const leaf = (x: number, y: number, len: number, angle: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.5, -len * 0.22, len, 0);
    ctx.quadraticCurveTo(len * 0.5, len * 0.22, 0, 0);
    ctx.fill();
    ctx.restore();
  };
  ctx.fillStyle = 'rgba(6,8,5,0.92)';
  for (const [bx, dir] of [
    [0, 1],
    [w, -1],
  ] as const) {
    for (let i = 0; i < 26; i++) {
      const y = h * (0.62 + rnd() * 0.38);
      const len = w * (0.12 + rnd() * 0.16);
      leaf(bx + dir * rnd() * w * 0.06, y, len, dir > 0 ? -0.9 + rnd() * 1.1 : Math.PI + 0.9 - rnd() * 1.1);
    }
    // Tepeden sarkan sarmaşık.
    for (let i = 0; i < 16; i++) {
      const x = bx + dir * rnd() * w * 0.22;
      const y = rnd() * h * 0.22;
      leaf(x, y, w * (0.05 + rnd() * 0.06), Math.PI / 2 + (rnd() - 0.5) * 1.4);
    }
  }
  return canvas;
}

/** Aynı sahnenin buğulu hâli: küçültülüp bulanıklaştırılır, açılır. */
function softInterior(sharp: ReturnType<typeof makeCanvas>, w: number, h: number) {
  const sw = Math.max(16, Math.round(w / 5));
  const sh = Math.max(16, Math.round(h / 5));
  const small = makeCanvas(sw, sh);
  const sctx = context2d(small);
  sctx.drawImage(sharp, 0, 0, sw, sh);
  const data = sctx.getImageData(0, 0, sw, sh);
  const channels: Field[] = [0, 1, 2].map((c) => {
    const f = new Float32Array(sw * sh);
    for (let i = 0; i < f.length; i++) f[i] = data.data[i * 4 + c] / 255;
    return blur(f, sw, sh, sw / 34);
  });
  for (let i = 0; i < sw * sh; i++) {
    data.data[i * 4] = Math.min(255, channels[0][i] * 255 * 1.3);
    data.data[i * 4 + 1] = Math.min(255, channels[1][i] * 255 * 1.22);
    data.data[i * 4 + 2] = Math.min(255, channels[2][i] * 255 * 1.12);
  }
  sctx.putImageData(data, 0, 0);
  const out = makeCanvas(w, h);
  const octx = context2d(out);
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(small, 0, 0, w, h);
  return out;
}

export async function paint({ width: W, height: H, personal, sealY, signal }: PainterInput): Promise<PainterOutput> {
  const N = W * H;
  const lw = W / 2;
  const seamX = W / 2;
  const cy = sealY * H;
  const u = lw / 100;
  const family = serifFamily();
  const letters = sealLetters(personal.initials);

  /* İskelet */
  const stile = u * 7.5;
  const seamStile = u * 4;
  const topRail = u * 7.5;
  const kick0 = H * 0.86;
  const archY = Math.min(H * 0.33, cy - lw * 0.62);
  const archR = lw * 0.88;
  const hubR = u * 21;
  const transomY = Math.max(cy + lw * 0.52, H * 0.64);
  const bar = u * 2.4;
  const rosetteR = u * 29;
  const windows = ([0, 1] as const).map((side) => {
    const x0 = side === 0 ? stile : seamX + seamStile;
    const x1 = side === 0 ? seamX - seamStile : W - stile;
    return { x: x0, y: topRail, w: x1 - x0, h: kick0 - topRail };
  });

  const iron = drawField(W, H, (ctx) => {
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'destination-out';
    for (const r of windows) ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.save();
    ctx.beginPath();
    for (const r of windows) ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    // Yelpaze kemer: kemer yayı, kemer tabanı ve ışınsal çubuklar.
    ctx.lineWidth = bar * 1.3;
    ctx.beginPath();
    ctx.arc(seamX, archY, archR, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = bar * 0.6;
    ctx.beginPath();
    ctx.arc(seamX, archY, archR * 0.93, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = bar * 1.4;
    ctx.beginPath();
    ctx.moveTo(0, archY);
    ctx.lineTo(W, archY);
    ctx.stroke();
    ctx.lineWidth = bar;
    ctx.beginPath();
    for (const deg of [-170, -150, -130, -110, -70, -50, -30, -10]) {
      const a = (deg * Math.PI) / 180;
      ctx.moveTo(seamX + Math.cos(a) * hubR, archY + Math.sin(a) * hubR);
      ctx.lineTo(seamX + Math.cos(a) * archR, archY + Math.sin(a) * archR);
    }
    ctx.stroke();
    // Kemerin üstündeki köşelerde kıvrımlar.
    ctx.lineWidth = bar * 0.8;
    ctx.beginPath();
    for (const dir of [-1, 1]) {
      const x = seamX + dir * lw * 0.98;
      whiplash(ctx, [x, archY - archR * 0.15], [seamX + dir * lw * 0.62, topRail + u * 14], 0.25 * dir, u * 5);
      whiplash(ctx, [x, topRail + u * 3], [seamX + dir * lw * 0.42, topRail + u * 6], -0.12 * dir, u * 4);
    }
    ctx.stroke();
    // Göbek: harflerin halkası.
    ctx.lineWidth = bar * 1.2;
    ctx.beginPath();
    ctx.arc(seamX, archY, hubR, Math.PI, Math.PI * 2);
    ctx.stroke();
    // Dikey ve yatay kayıtlar (alt camlar).
    ctx.lineWidth = bar;
    ctx.beginPath();
    for (const r of windows) {
      ctx.moveTo(r.x + r.w / 2, archY);
      ctx.lineTo(r.x + r.w / 2, kick0);
    }
    ctx.moveTo(0, transomY);
    ctx.lineTo(W, transomY);
    ctx.stroke();
    // Gülün çevresinde dört kıvrım.
    ctx.lineWidth = bar * 0.85;
    ctx.beginPath();
    for (const dx of [-1, 1])
      for (const dy of [-1, 1])
        whiplash(
          ctx,
          [seamX + dx * rosetteR * 0.9, cy + dy * rosetteR * 0.5],
          [seamX + dx * lw * 0.5, cy + dy * lw * 0.42],
          0.18 * dx * dy,
          u * 5.5,
        );
    ctx.stroke();
    ctx.restore();
    // Dilimli demir gül: mührün yatağı.
    ctx.beginPath();
    for (let k = 0; k <= 96; k++) {
      const a = (k / 96) * Math.PI * 2;
      const r = rosetteR * (0.92 + 0.08 * Math.cos(a * 12));
      const x = seamX + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.fill();
    // Harfler: göbekte, birleşim çizgisinin iki yanında.
    ctx.font = `600 ${Math.round(hubR * 0.95)}px ${family}`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'right';
    ctx.fillText(letters[0], seamX - u * 3.2, archY - hubR * 0.14);
    ctx.textAlign = 'left';
    ctx.fillText(letters[1] || '', seamX + u * 3.2, archY - hubR * 0.14);
    // Tarih levhası: yatay kayıt üzerinde.
    if (personal.date) {
      ctx.beginPath();
      roundRect(ctx, seamX - lw * 0.46, transomY - u * 5.2, lw * 0.92, u * 10.4, u * 2);
      ctx.fill();
    }
  });
  await yieldFrame(signal);

  /* Kabartma ayrıntıları (yalnızca yükseklik ve renk). */
  const detail = drawField(W, H, (ctx) => {
    // Kasadaki perçinler.
    ctx.beginPath();
    for (const r of windows) {
      for (let y = r.y + u * 6; y < kick0; y += u * 11) {
        for (const x of [r.x - stile * 0.5, r.x + r.w + (r.x < seamX ? seamStile * 0.5 : stile * 0.5)]) {
          ctx.moveTo(x + u * 1.1, y);
          ctx.arc(x, y, u * 1.1, 0, Math.PI * 2);
        }
      }
    }
    ctx.fill();
    // Tekme levhasında iç çerçeve.
    ctx.lineWidth = u * 0.9;
    for (const r of windows) ctx.strokeRect(r.x + u * 4, kick0 + u * 5, r.w - u * 8, H - kick0 - u * 10 - topRail * 0.4);
    // Gülün göbeği.
    ctx.lineWidth = u * 0.8;
    ctx.beginPath();
    ctx.arc(seamX, cy, rosetteR * 0.84, 0, Math.PI * 2);
    ctx.stroke();
  });
  const embossed = drawField(W, H, (ctx) => {
    if (!personal.date) return;
    ctx.font = `600 ${Math.round(u * 6.4)}px ${family}`;
    ctx.textBaseline = 'middle';
    textAcrossSeam(ctx, personal.date, seamX, transomY + u * 0.4, seamStile * 1.4);
  });
  await yieldFrame(signal);

  /* Yükseklik: yuvarlak demir çubuklar, pahlı kasa. */
  const round = blur(iron, W, H, u * 0.9);
  const wide = blur(iron, W, H, u * 2.8);
  const detailSoft = blur(detail, W, H, u * 0.45);
  const height = ironHeight(iron, round, wide, detailSoft, embossed);
  const ao = cavity(height, W, H, u * 3, 2.2);
  await yieldFrame(signal);

  /* Dövme demirin rengi: sıcak siyah, çekiç izi, kenarlarda hafif bronz. */
  const n = noise2(personal.seed + '|demir');
  const ironDark = rgb('#171513');
  const ironWarm = rgb('#2e2924');
  const bronze = rgb('#a47c4a');
  const albedo = makeCanvas(W, H);
  const actx = context2d(albedo);
  const image = actx.createImageData(W, H);
  const data = image.data;
  const roughness = new Float32Array(N);
  const alpha = new Float32Array(N);
  // Sıcak döngü eşzamanlı bir işlevde: V8 onu ilk seferde de hızlı derler.
  const shadeRows = (y0: number, y1: number) => {
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const hammer = n(x * 0.08, y * 0.08) * 0.6 + n(x * 0.3, y * 0.3) * 0.4;
        const t = 0.25 + hammer * 0.55 + (1 - round[i]) * 0.25;
        const shade = 0.8 + 0.2 * ao[i];
        const e = embossed[i];
        const o = i * 4;
        // Tarih ve harf kabartmaları eskitme bronz: demirin tek sıcak parıltısı.
        const r = ironDark[0] + (ironWarm[0] - ironDark[0]) * t;
        const gg = ironDark[1] + (ironWarm[1] - ironDark[1]) * t;
        const b = ironDark[2] + (ironWarm[2] - ironDark[2]) * t;
        data[o] = clamp01((r + (bronze[0] - r) * e) * shade) * 255;
        data[o + 1] = clamp01((gg + (bronze[1] - gg) * e) * shade) * 255;
        data[o + 2] = clamp01((b + (bronze[2] - b) * e) * shade) * 255;
        data[o + 3] = 255;
        roughness[i] = 0.42 + hammer * 0.2 - e * 0.12;
        alpha[i] = iron[i];
      }
    }
  };
  for (let y = 0; y < H; y += 160) {
    shadeRows(y, Math.min(H, y + 160));
    await yieldFrame(signal);
  }
  actx.putImageData(image, 0, 0);

  /* Camın ardı ve buğu. */
  const iw = Math.round(W * 0.6);
  const ih = Math.round(H * 0.6);
  const interior = paintInterior(iw, ih, personal.seed);
  await yieldFrame(signal);
  const interiorSoft = softInterior(interior, iw, ih);
  const drops = makeCanvas(Math.round(W * 0.5), Math.round(H * 0.5));
  const dctx = context2d(drops);
  dctx.fillStyle = 'rgba(128,128,0,0)';
  dctx.fillRect(0, 0, drops.width, drops.height);
  const sprite = dropSprite(48);
  const rnd = random(hash(personal.seed + '|damla'));
  for (let i = 0; i < 1500; i++) {
    const big = rnd() < 0.06;
    const r = big ? 2.6 + rnd() * 3.4 : 0.7 + rnd() * rnd() * 2.4;
    const x = rnd() * drops.width;
    const y = rnd() * drops.height;
    dctx.drawImage(sprite, x - r, y - r * 1.08, r * 2, r * 2.16);
  }
  const pane = paneMap(iron, W, H);
  return {
    albedo,
    height,
    roughness,
    metalness: 0.82,
    ao,
    alpha,
    normalStrength: 2.4,
    features: {
      glass: { interior, interiorSoft, drops, pane },
    },
  };
}
