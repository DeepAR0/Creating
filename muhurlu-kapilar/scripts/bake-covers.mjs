// Çizimli kapıların kapak görsellerini pişirir: yükleme arka planı ve
// WebGL olmayan cihazlar için CSS yedeği. Mühür ve harfler yoktur
// (yükleme sırasında 2B mühür üstte durur; harfler 3B kapıda belirir).
//
// Kullanım: npm run dev  (ayrı bir terminalde)
//           node scripts/bake-covers.mjs [http://localhost:5173]
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}

const base = process.argv[2] ?? 'http://localhost:5173';
const themes = ['kakma', 'kisbahcesi', 'pera'];
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  ignoreHTTPSErrors: true,
});
for (const theme of themes) {
  const page = await context.newPage();
  await page.goto(`${base}/?pisir=1&tema=${theme}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__door), null, { timeout: 60000 });
  await page.evaluate(() => {
    window.__door.setSealVisible(false);
    document.documentElement.dataset.pisir = '1';
  });
  await page.waitForTimeout(1500);
  const png = await page.locator('.door3d-canvas canvas').screenshot({ type: 'png' });
  await writeFile(`public/${theme}-door.png`, png);
  console.log(`${theme}: ${png.length} bayt`);
  await page.close();
}
await browser.close();
