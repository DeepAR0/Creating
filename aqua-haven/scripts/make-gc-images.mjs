// Game Center başarım görselleri (1024x1024, App Store Connect için). Önce: npm run dev
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const exe = fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined;
const out = 'store-assets/game-center';
fs.mkdirSync(out, { recursive: true });
const browser = await pw.chromium.launch({ executablePath: exe });
const page = await browser.newPage();
await page.goto('http://localhost:5173/?demo=nano', { waitUntil: 'networkidle' });
const images = await page.evaluate(async () => {
  const { speciesThumb, decorThumb, plantThumb } = await import('/src/render/thumbs.ts');
  const art = {
    feeder: () => speciesThumb('goldfish', 'M', undefined, 2, 900),
    merchant: () => speciesThumb('discus', 'M', 'pigeon', 2, 900),
    grower: () => speciesThumb('angel', 'M', undefined, 2, 900),
    breeder: () => speciesThumb('guppy', 'M', 'cobra', 2, 900),
    geneticist: () => speciesThumb('betta', 'M', 'galaxy', 2, 900),
    cleaner: () => speciesThumb('pleco', 'M', undefined, 2, 900),
    aquarist: () => decorThumb('diver', 900),
    tycoon: () => decorThumb('chest', 900),
    collector: () => speciesThumb('clown', 'M', undefined, 2, 900),
    expert: () => decorThumb('temple', 900),
    designer: () => decorThumb('castle', 900),
    lucky: () => decorThumb('clam', 900),
    gardener: () => plantThumb('anubias', 900),
    dedicated: () => decorThumb('lighthouse', 900),
  };
  const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const S = 1024;
  const res = {};
  for (const [id, fn] of Object.entries(art)) {
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const x = c.getContext('2d');
    x.fillStyle = '#04213a';
    x.fillRect(0, 0, S, S);
    const R = S * 0.47;
    const bg = x.createRadialGradient(S * 0.42, S * 0.36, S * 0.05, S / 2, S / 2, R);
    bg.addColorStop(0, '#5ee3f5'); bg.addColorStop(0.55, '#1596b8'); bg.addColorStop(1, '#073b63');
    x.fillStyle = bg;
    x.beginPath(); x.arc(S / 2, S / 2, R, 0, Math.PI * 2); x.fill();
    x.save();
    x.beginPath(); x.arc(S / 2, S / 2, R, 0, Math.PI * 2); x.clip();
    x.fillStyle = 'rgba(232,213,172,0.95)';
    x.beginPath(); x.moveTo(0, S * 0.78); x.quadraticCurveTo(S / 2, S * 0.72, S, S * 0.79); x.lineTo(S, S); x.lineTo(0, S); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.25)';
    for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(S * (0.2 + (i * 0.37) % 0.6), S * (0.2 + (i * 0.23) % 0.45), S * (0.01 + (i % 3) * 0.006), 0, Math.PI * 2); x.fill(); }
    const src = fn();
    const img = await load(src);
    const k = Math.min((S * 0.68) / img.width, (S * 0.56) / img.height);
    // dekor ve bitkiler kuma otursun, canlılar ortada yüzsün
    const grounded = /^(aquarist|tycoon|expert|designer|lucky|gardener|dedicated)$/.test(id);
    const y = grounded ? S * 0.82 - img.height * k : S * 0.5 - (img.height * k) / 2;
    x.drawImage(img, S / 2 - (img.width * k) / 2, y, img.width * k, img.height * k);
    x.restore();
    x.lineWidth = S * 0.035;
    const ring = x.createLinearGradient(0, 0, S, S);
    ring.addColorStop(0, '#fff3b0'); ring.addColorStop(0.5, '#f5b82e'); ring.addColorStop(1, '#b7791f');
    x.strokeStyle = ring;
    x.beginPath(); x.arc(S / 2, S / 2, R, 0, Math.PI * 2); x.stroke();
    res[id] = c.toDataURL('image/jpeg', 0.9);
  }
  return res;
});
for (const [id, url] of Object.entries(images)) {
  fs.writeFileSync(`${out}/${id}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`${out}/${id}.jpg`);
}
await browser.close();
