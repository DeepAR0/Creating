// Uygulama ikonu (1024x1024, saydamlık yok) ve açılış görseli (2732x2732) üretir.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const pw = require('/opt/node22/lib/node_modules/playwright');
const browser = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
await page.goto('http://localhost:5173/?demo=nano', { waitUntil: 'networkidle' });
const out = await page.evaluate(async () => {
  const { speciesThumb } = await import('/src/render/thumbs.ts');
  const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const make = async (S, fishScale, withText) => {
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, '#4fd1e8'); g.addColorStop(0.55, '#1596b8'); g.addColorStop(1, '#073b63');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const rx = S * (0.1 + i * 0.2);
      const rg = x.createLinearGradient(0, 0, 0, S);
      rg.addColorStop(0, 'rgba(255,255,240,0.18)'); rg.addColorStop(1, 'rgba(255,255,240,0)');
      x.fillStyle = rg;
      x.beginPath(); x.moveTo(rx, 0); x.lineTo(rx + S * 0.07, 0); x.lineTo(rx + S * 0.3, S); x.lineTo(rx + S * 0.14, S); x.fill();
    }
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = '#e8d5ac';
    x.beginPath(); x.moveTo(0, S * 0.86); x.quadraticCurveTo(S * 0.5, S * 0.8, S, S * 0.87); x.lineTo(S, S); x.lineTo(0, S); x.fill();
    const fish = await load(speciesThumb('goldfish', 'M', undefined, 2, 1400));
    const w = S * fishScale; const h = w * (fish.height / fish.width);
    x.drawImage(fish, (S - w) / 2 + S * 0.02, (S - h) / 2 - S * (withText ? 0.08 : 0.02), w, h);
    x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = S * 0.008;
    for (const [bx, by, br] of [[0.78, 0.3, 0.035], [0.83, 0.2, 0.025], [0.8, 0.12, 0.018], [0.2, 0.25, 0.02]]) { x.beginPath(); x.arc(S * bx, S * by, S * br, 0, Math.PI * 2); x.stroke(); }
    if (withText) {
      x.font = `900 ${S * 0.07}px "Baloo 2 Variable", sans-serif`; x.textAlign = 'center';
      x.fillStyle = '#ffffff'; x.strokeStyle = 'rgba(0,30,60,0.6)'; x.lineWidth = S * 0.012;
      x.strokeText('Aqua Haven', S / 2, S * 0.72); x.fillText('Aqua Haven', S / 2, S * 0.72);
    }
    return c.toDataURL('image/png');
  };
  return { icon: await make(1024, 0.82, false), splash: await make(2732, 0.35, true) };
});
const save = (p, d) => fs.writeFileSync(p, Buffer.from(d.split(',')[1], 'base64'));
save('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', out.icon);
for (const n of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) save(`ios/App/App/Assets.xcassets/Splash.imageset/${n}`, out.splash);
fs.mkdirSync('public', { recursive: true });
save('public/icon-1024.png', out.icon);
await browser.close();
console.log('icons ok');
