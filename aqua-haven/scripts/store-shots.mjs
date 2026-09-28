// App Store ekran görüntüleri: node scripts/store-shots.mjs (önce: npm run dev)
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const exe = fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined;
const devices = [
  { name: 'iphone-6.9', w: 956, h: 440, dpr: 3 },
  { name: 'ipad-13', w: 1376, h: 1032, dpr: 2 },
];
const out = 'store-assets/screenshots';
fs.mkdirSync(out, { recursive: true });
const browser = await pw.chromium.launch({ executablePath: exe });
for (const lang of ['tr', 'en']) {
  for (const d of devices) {
    const page = await browser.newPage({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, hasTouch: true, locale: lang === 'tr' ? 'tr-TR' : 'en-US' });
    const snap = async (n) => { await page.waitForTimeout(600); await page.screenshot({ path: `${out}/${lang}-${d.name}-${n}.jpg`, type: 'jpeg', quality: 88 }); };
    const open = async (demo) => {
      await page.goto(`http://localhost:5173/?demo=${demo}`, { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: '.toasts,.hint{display:none!important}' });
      await page.waitForTimeout(3800);
    };
    // 1: tatlı su genel görünüm + balık kartı
    await open('fresh');
    await snap(1);
    const pt = await page.evaluate(() => { const a = [...window.__world.agents.values()].find((x) => x.sp.id === 'angel'); return { x: window.__scene.cam.sx(a.x), y: window.__scene.cam.sy(a.y) }; });
    await page.mouse.click(pt.x, pt.y);
    await snap(2);
    // 3: mağaza
    await page.click('[data-tut="menu-shop"]');
    await snap(3);
    await page.click('.mhead .iconbtn');
    // 4: üreme
    await page.click('[data-tut="menu-breed"]');
    await snap(4);
    // 5: resif akvaryumu
    await open('marine');
    await snap(5);
    // 6: gece modu (ışıklar kapalı)
    await page.evaluate(() => { window.__game.tank.light = false; });
    await page.waitForTimeout(1500);
    await snap(6);
    await page.close();
    console.log('ok', lang, d.name);
  }
}
await browser.close();
