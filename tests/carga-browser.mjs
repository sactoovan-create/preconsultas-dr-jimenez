// Build real, servidor efimero y navegador aislado. No accede a Supabase ni a pacientes.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const dist = path.resolve('dist');
const out = path.resolve('../output/carga-publicacion-20260910');
await fs.mkdir(out, { recursive: true });
await fs.access(path.join(dist, 'index.html'));
const mime = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(dist, '.' + (/^\/(consultorio|privacidad)(\/.*)?$/.test(pathname) || pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(dist + path.sep)) { res.writeHead(403).end(); return; }
  try { res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(await fs.readFile(file)); }
  catch (_) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const checks = [];
const check = (name, value) => { assert.ok(value, name); checks.push(name); };
const context = async options => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  await ctx.route('**/*', route => {
    const host = new URL(route.request().url()).hostname;
    if (host === '127.0.0.1') return route.continue();
    if (host === 'fonts.googleapis.com') return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    return route.abort();
  });
  return ctx;
};
try {
  for (const target of ['script', 'css', 'html-instead-of-script']) {
    const ctx = await context(), page = await ctx.newPage();
    let bloquear = true, navegaciones = 0;
    page.on('request', r => { if (r.isNavigationRequest() && r.frame() === page.mainFrame()) navegaciones++; });
    await page.route('**/assets/*', route => {
      const url = new URL(route.request().url());
      const coincide = url.pathname.includes('/InstrumentosModule-') && url.pathname.endsWith(target === 'css' ? '.css' : '.js');
      if (!bloquear || !coincide) return route.fallback();
      return target === 'html-instead-of-script'
        ? route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Obsolete asset</title>' })
        : route.abort();
    });
    await page.goto(base + '/consultorio', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'No se pudo abrir la página' }).waitFor();
    check(target + ': error visible en lugar de pantalla vacia', await page.getByRole('alert').isVisible());
    await page.evaluate(() => {
      localStorage.setItem('qa-carga-conservar', 'ficticio-local');
      sessionStorage.setItem('qa-carga-conservar', 'ficticio-sesion');
    });
    await page.setViewportSize({ width: 320, height: 740 });
    check(target + ': recuperacion legible en movil', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (target === 'script') await page.screenshot({ path: path.join(out, 'recuperacion-movil.png') });
    check(target + ': sin recarga automatica', navegaciones === 1);
    bloquear = false;
    await page.getByRole('button', { name: 'Volver a cargar' }).click();
    await page.locator('.consultorio-chrome').waitFor();
    check(target + ': reintento abre el panel', true);
    check(target + ': no borra datos del navegador', await page.evaluate(() => localStorage.getItem('qa-carga-conservar') === 'ficticio-local' && sessionStorage.getItem('qa-carga-conservar') === 'ficticio-sesion'));
    await ctx.close();
  }
  {
    const ctx = await context(), page = await ctx.newPage();
    let bloquear = true;
    await page.route('**/assets/index-*.js', route => bloquear ? route.abort() : route.fallback());
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Volver a cargar' }).waitFor({ timeout: 12000 });
    check('Sin JS principal: HTML permite recuperacion', await page.locator('.app-boot-recovery').isVisible());
    bloquear = false;
    await page.getByRole('button', { name: 'Volver a cargar' }).click();
    await page.locator('.pc-paso').waitFor();
    check('Reintento de entrada abre cuestionario', true);
    await ctx.close();
  }
  {
    const ctx = await context(), page = await ctx.newPage();
    let liberar;
    const retenido = new Promise(resolve => { liberar = resolve; });
    await page.route('**/assets/InstrumentosModule-*.js', async route => { await retenido; await route.fallback(); });
    await page.goto(base + '/consultorio', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'La carga está tardando más de lo esperado' }).waitFor({ timeout: 12000 });
    check('Carga lenta: muestra salida y sigue esperando', await page.getByRole('button', { name: 'Volver a cargar' }).isVisible());
    liberar();
    await page.locator('.consultorio-chrome').waitFor();
    check('Recurso tardio: abre sin requerir recarga', true);
    await ctx.close();
  }
  {
    const ctx = await context({ javaScriptEnabled: false }), page = await ctx.newPage();
    await page.goto(base);
    check('Sin JavaScript: aviso visible', await page.locator('noscript').isVisible());
    await ctx.close();
  }
  {
    const ctx = await context(), page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const ruta of ['/', '/privacidad', '/consultorio']) {
      await page.goto(base + ruta, { waitUntil: 'domcontentloaded' });
      await page.locator('.app-load').waitFor({ state: 'detached' });
      check('Carga normal ' + ruta, await page.locator('#root').innerText() !== '');
    }
    check('Carga normal: cero errores JS', errors.length === 0);
    await ctx.close();
  }
  console.log(JSON.stringify({ checks, total: checks.length, errores: 0 }));
  await fs.writeFile(path.join(out, 'carga-browser.json'), JSON.stringify({ checks, total: checks.length, errores: 0, alcance: 'Build local, datos sinteticos, red externa bloqueada; no envio ni acceso a expedientes.' }, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
