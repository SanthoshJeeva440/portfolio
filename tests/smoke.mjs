// Smoke test for the portfolio. Serves the repo root locally and checks
// links, icons, assets, layout at mobile/tablet/desktop widths, and the
// resume/contact behaviour. Run: node tests/smoke.mjs [--screens <dir>]
import http from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const screensArg = process.argv.indexOf('--screens');
const screensDir = screensArg > -1 ? process.argv[screensArg + 1] : null;

const types = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.pdf': 'application/pdf', '.json': 'application/json',
};
const server = http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = normalize(join(root, path === '/' ? 'index.html' : path));
  try {
    if (!file.startsWith(root) || !(await stat(file)).isFile()) throw new Error('not found');
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const failures = [];
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures.push(msg); };

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = [];
  const badResponses = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`); });

  await page.goto(base, { waitUntil: 'load' });
  check(errors.length === 0, `no JS/console errors ${errors.join(' | ')}`);
  check(badResponses.length === 0, `all local assets load ${badResponses.join(' | ')}`);

  const meta = await page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || '',
    h1: document.querySelectorAll('h1').length,
    lang: document.documentElement.lang,
    favicon: !!document.querySelector('link[rel="icon"]'),
  }));
  check(meta.title.includes('Santhosh G.'), `title: ${meta.title}`);
  check(meta.description.length > 50, 'meta description present');
  check(meta.h1 === 1, 'exactly one h1');
  check(meta.lang === 'en' && meta.favicon, 'lang and favicon set');

  const nav = await page.$$eval('#nav-links a', (as) => as.map((a) => a.textContent.trim()));
  const wanted = ['Home', 'About', 'Skills', 'Projects', 'Experience', 'Achievements', 'Resume', 'Contact'];
  check(JSON.stringify(nav) === JSON.stringify(wanted), `nav items: ${nav.join(', ')}`);

  const broken = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      const id = a.getAttribute('href').slice(1);
      if (id && !document.getElementById(id)) out.push(`anchor #${id}`);
    });
    document.querySelectorAll('use').forEach((u) => {
      const id = (u.getAttribute('href') || '').slice(1);
      if (!document.getElementById(id)) out.push(`icon #${id}`);
    });
    document.querySelectorAll('img').forEach((img) => {
      if (img.loading !== 'lazy' && (!img.complete || img.naturalWidth === 0)) out.push(`image ${img.src}`);
      if (!img.hasAttribute('alt')) out.push(`alt missing ${img.src}`);
    });
    document.querySelectorAll('a, button').forEach((el) => {
      if (el.closest('[hidden]')) return;
      const name = (el.getAttribute('aria-label') || el.textContent || '').trim();
      if (!name) out.push(`unnamed ${el.outerHTML.slice(0, 80)}`);
    });
    document.querySelectorAll('a[target="_blank"]').forEach((a) => {
      if (!(a.rel || '').includes('noopener')) out.push(`noopener ${a.href}`);
    });
    return out;
  });
  check(broken.length === 0, `anchors, icons, images, accessible names ${broken.join(' | ')}`);

  const lazy = await page.$$eval('img[loading="lazy"]', (imgs) => imgs.map((i) => i.getAttribute('src')));
  for (const src of lazy) {
    const res = await page.request.get(new URL(src, base).href);
    check(res.ok(), `lazy image loads: ${src}`);
  }

  const external = await page.$$eval('a[href^="http"]', (as) => [...new Set(as.map((a) => a.href))]);
  const githubRepos = external.filter((u) => u.startsWith('https://github.com/SanthoshJeeva440/'));
  check(githubRepos.length > 0 && githubRepos.every((u) => /^https:\/\/github\.com\/SanthoshJeeva440\/[\w.-]+$/.test(u)), `GitHub links well-formed (${githubRepos.length})`);
  console.log('      external links:\n' + external.map((u) => `        ${u}`).join('\n'));

  // Default state: nothing private or fake is shown.
  const state = await page.evaluate(() => ({
    emailHidden: document.getElementById('contact-email').hidden,
    phoneHidden: document.getElementById('contact-phone').hidden,
    formHidden: document.getElementById('contact-form').hidden,
    resumeDisabled: document.querySelector('#resume [data-resume]').getAttribute('aria-disabled') === 'true'
      && !document.querySelector('[data-resume][download]'),
    placeholders: /\[INSERT|your@email|Your Name|yourusername|lorem ipsum/i.test(document.body.innerText),
  }));
  check(state.emailHidden && state.phoneHidden, 'email/phone hidden until configured');
  check(state.formHidden, 'contact form hidden until an endpoint is configured');
  check(state.resumeDisabled, 'no download link until a resume PDF is configured');
  check(!state.placeholders, 'no template placeholder text visible');

  await page.click('.hero-actions [data-resume]');
  await page.waitForTimeout(1500);
  check(await page.evaluate(() => Math.abs(document.getElementById('resume').getBoundingClientRect().top) < 200), 'resume button scrolls to resume section');

  await page.click('[data-filter="professional"]');
  const visible = await page.$$eval('.project', (ps) => ps.filter((p) => !p.hidden).map((p) => p.dataset.kind));
  check(visible.length === 2 && visible.every((k) => k === 'professional'), 'project filter works');
  await page.click('[data-filter="all"]');

  if (screensDir) {
    await mkdir(screensDir, { recursive: true });
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible')));
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(screensDir, 'desktop-full.png'), fullPage: true });
  }

  for (const [label, width] of [['mobile', 375], ['tablet', 768], ['desktop', 1280]]) {
    const p = await browser.newPage({ viewport: { width, height: 800 } });
    await p.goto(base, { waitUntil: 'load' });
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overflow <= 0, `${label} (${width}px): no horizontal scroll (overflow ${overflow}px)`);
    if (width < 960) {
      await p.click('#nav-toggle');
      const open = await p.evaluate(() => document.getElementById('nav-toggle').getAttribute('aria-expanded') === 'true'
        && getComputedStyle(document.getElementById('nav-links')).display !== 'none');
      check(open, `${label}: menu opens`);
      await p.click('#nav-links a[href="#contact"]');
      await p.waitForTimeout(500);
      const closed = await p.evaluate(() => document.getElementById('nav-toggle').getAttribute('aria-expanded') === 'false');
      check(closed, `${label}: menu closes after navigation`);
    }
    if (screensDir) {
      await p.evaluate(() => { window.scrollTo(0, 0); document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible')); });
      await p.waitForTimeout(800);
      await p.screenshot({ path: join(screensDir, `${label}-full.png`), fullPage: true });
    }
    await p.close();
  }
} finally {
  await browser.close();
  server.close();
}

console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nAll checks passed');
process.exit(failures.length ? 1 : 0);
