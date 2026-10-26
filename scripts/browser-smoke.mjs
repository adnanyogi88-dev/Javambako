import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright';
const root = resolve('dist');
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = resolve(root, `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`);
  if (!file.startsWith(`${root}/`)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.setHeader('Content-Type', ({'.html':'text/html','.css':'text/css','.webp':'image/webp','.js':'text/javascript','.xml':'application/xml'})[extname(file)] || 'application/octet-stream');
    res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(4321, '127.0.0.1', r));
await mkdir('browser-results', { recursive: true });
let browser;
try {
  browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
  for (const width of [360, 390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    // Check first-party rendering independently of external analytics availability.
    await page.route('https://www.googletagmanager.com/**', route => route.abort());
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const [label, path] of [['archive','/blog/'],['page-2','/blog/page/2/'],['article','/blog/cek-fakta-informasi-tembakau/']]) {
      await page.goto(`http://127.0.0.1:4321${path}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => Promise.all([...document.images].map(async (image) => {
        image.loading = 'eager';
        try { await image.decode(); } catch { /* Report failed decoding below. */ }
      })));
      const state = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        missingImages: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src),
        coverHeight: document.querySelector('.featured-frame')?.getBoundingClientRect().height,
      }));
      assert.equal(state.overflow, false, `${width} ${path}: horizontal overflow`);
      assert.deepEqual(state.missingImages, [], `${width} ${path}: broken image`);
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'main-content');
      if (label === 'article') {
        assert.ok(state.coverHeight > 100);
        // The image slot must retain its dimensions when the source is unavailable.
        const before = state.coverHeight;
        await page.evaluate(() => document.querySelector('.featured').src = '/missing-test-image.webp');
        assert.equal(await page.locator('.featured-frame').evaluate(e=>e.getBoundingClientRect().height), before);
        await page.reload({ waitUntil: 'networkidle' });
      }
      await page.screenshot({ path: `browser-results/${label}-${width}.png`, fullPage: true });
      console.log(`PASS ${width}px ${path}: no overflow, all image assets decoded, skip-link focus works`);
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
} finally {
  await browser?.close();
  await new Promise(r => server.close(r));
}
