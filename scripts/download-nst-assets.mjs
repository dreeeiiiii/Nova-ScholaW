/** Official NST static imagery only. Run from any directory with Node 22:
 * node scripts/download-nst-assets.mjs
 * Uses sharp from the existing web installation; no production services.
 */
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'web/public/nst');
const require = createRequire(path.join(root, 'web/package.json'));
const allowedHosts = new Set(['nst.edu.ph', 'www.nst.edu.ph', 'blog.nst.edu.ph']);
const categories = ['branding', 'campus', 'programs', 'students', 'events', 'community', 'misc'];
const maxPages = 18;
const maxAssets = 36;
const maxBytes = 8 * 1024 * 1024;
const totalBudget = 24 * 1024 * 1024;
const imageExtension = /\.(?:jpe?g|png|webp)(?:\?|$)/i;

function decode(value) {
  return value.replace(/\\\//g, '/').replace(/&amp;|&#038;|&#38;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

export function allowedUrl(value, base = 'https://nst.edu.ph/') {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(decode(value), base);
    if (!allowedHosts.has(url.hostname) || !['https:', 'http:'].includes(url.protocol) || url.port || url.username || url.password) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}

function attributes(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attrs[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4]);
  }
  return attrs;
}

export function extractImages(text, page) {
  const found = [];
  function add(value, alt = '') {
    if (!value || value.startsWith('data:')) return;
    try {
      const url = new URL(decode(value), page);
      url.hash = '';
      if (imageExtension.test(url.href)) found.push({ url: url.href, page, alt });
    } catch { /* Invalid inline values are not assets. */ }
  }
  for (const match of text.matchAll(/<(?:img|source)\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    for (const key of ['src', 'data-src', 'data-lazy-src', 'data-original']) add(attrs[key], attrs.alt);
    for (const key of ['srcset', 'data-srcset', 'data-lazy-srcset']) {
      for (const candidate of (attrs[key] || '').split(',')) add(candidate.trim().split(/\s+/)[0], attrs.alt);
    }
  }
  for (const match of text.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/gi)) add(match[1]);
  // Elementor JSON and WordPress media metadata can contain escaped URLs.
  for (const match of decode(text).matchAll(/https?:\/\/[^\s"'<>\\]+?\.(?:jpe?g|png|webp)(?:\?[^\s"'<>\\]*)?/gi)) add(match[0]);
  return found;
}

function classify(item) {
  const value = `${item.url} ${item.alt}`.toLowerCase();
  if (/logo|wordmark|branding|seal/.test(value)) return 'branding';
  if (/campus|building|facilit|school-exterior/.test(value)) return 'campus';
  if (/testi|alumni|parent|community/.test(value)) return 'community';
  if (/event|parade|graduat|celebrat|festival|halloween/.test(value)) return 'events';
  if (/student|classroom|learning|uniform/.test(value)) return 'students';
  if (/junior|senior|college|preschool|program|strand|curriculum|enroll/.test(`${value} ${item.page}`)) return 'programs';
  return 'misc';
}

function family(url) {
  // Prefer the full WordPress original to duplicate responsive crops.
  return url.replace(/-\d{2,4}x\d{2,4}(?=\.[^.?#]+(?:\?|$))/, '').replace(/\?.*$/, '');
}

async function request(url, accept, byteLimit = maxBytes) {
  let target = allowedUrl(url);
  if (!target) throw new Error('Source is outside the NST boundary');
  for (let redirects = 0; redirects <= 5; redirects++) {
    const response = await fetch(target, {
      redirect: 'manual', signal: AbortSignal.timeout(20_000),
      headers: { Accept: accept, 'User-Agent': 'NovaScholaHub-AssetImporter/1.0' },
    });
    if (response.status >= 300 && response.status < 400) {
      const next = allowedUrl(response.headers.get('location') || '', target);
      await response.body?.cancel();
      if (!next) throw new Error('External redirect rejected');
      target = next;
      continue;
    }
    if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}`); }
    const type = response.headers.get('content-type')?.split(';')[0] || '';
    if (Number(response.headers.get('content-length')) > byteLimit) {
      await response.body?.cancel(); throw new Error('Response exceeds size limit');
    }
    const chunks = [];
    let bytes = 0;
    for await (const chunk of response.body) {
      bytes += chunk.length;
      if (bytes > byteLimit) throw new Error('Response exceeds size limit');
      chunks.push(Buffer.from(chunk));
    }
    return { buffer: Buffer.concat(chunks), type, url: target };
  }
  throw new Error('Too many redirects');
}

export async function downloadNstAssets() {
  const sharp = require('sharp');
  const report = { startedAt: new Date().toISOString(), pagesCrawled: [], pageFailures: [], discovered: 0, downloaded: 0, skipped: 0, failed: 0, duplicatesRemoved: 0, skippedSources: [], failures: [] };
  const queue = ['https://nst.edu.ph/'];
  const visited = new Set();
  const styles = new Set();
  const candidates = [];
  while (queue.length && visited.size < maxPages) {
    const page = queue.shift();
    if (visited.has(page)) continue;
    visited.add(page);
    try {
      const response = await request(page, 'text/html', 4 * 1024 * 1024);
      if (!response.type.includes('text/html')) throw new Error('Not an HTML page');
      const html = response.buffer.toString('utf8');
      report.pagesCrawled.push(response.url);
      candidates.push(...extractImages(html, response.url));
      for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
        const url = allowedUrl(attributes(match[0]).href, response.url);
        if (!url) continue;
        const parsed = new URL(url);
        if (parsed.search || /\.(?:pdf|zip|jpe?g|png|webp)$|wp-admin|wp-json|\/feed\//i.test(parsed.pathname)) continue;
        if (!visited.has(url) && !queue.includes(url)) queue.push(url);
      }
      for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
        const attrs = attributes(match[0]);
        const url = allowedUrl(attrs.href, response.url);
        if (attrs.rel !== 'stylesheet' || !url || styles.has(url) || styles.size >= 35) continue;
        styles.add(url);
        try {
          const css = await request(url, 'text/css', 2 * 1024 * 1024);
          candidates.push(...extractImages(css.buffer.toString('utf8'), css.url).map(item => ({ ...item, page: response.url })));
        } catch (error) { report.failures.push({ sourceUrl: url, reason: error.message }); }
      }
    } catch (error) { report.pageFailures.push({ page, reason: error.message }); }
  }
  const urls = new Map();
  for (const item of candidates) {
    if (!urls.has(item.url)) urls.set(item.url, { ...item, sourcePages: [item.page] });
    else {
      const existing = urls.get(item.url);
      existing.alt ||= item.alt;
      if (!existing.sourcePages.includes(item.page)) existing.sourcePages.push(item.page);
    }
  }
  report.discovered = urls.size;
  const groups = new Map();
  function skip(item, reason) { report.skipped++; report.skippedSources.push({ sourceUrl: item.url, sourcePage: item.page, reason }); }
  for (const item of urls.values()) {
    if (!allowedUrl(item.url)) { skip(item, 'External image host'); continue; }
    if (/favicon|tracking|pixel|emoji|social-icon|facebook|google|youtube|advert/i.test(item.url)) { skip(item, 'Icon, tracking, or third-party branding'); continue; }
    const key = family(item.url);
    if (groups.has(key)) {
      const existing = groups.get(key);
      existing.sourcePages = [...new Set([...existing.sourcePages, ...item.sourcePages])];
      existing.alt ||= item.alt;
      existing.variants.push(item.url);
      report.duplicatesRemoved++;
      skip(item, 'Duplicate WordPress crop');
    } else groups.set(key, { ...item, original: key, variants: [item.url] });
  }
  let previous = [];
  try { previous = JSON.parse(await readFile(path.join(output, 'manifest.json'), 'utf8')); } catch { /* First run. */ }
  const manifest = [];
  const hashes = new Map();
  let totalBytes = 0;
  for (const item of groups.values()) {
    if (manifest.length >= maxAssets) { skip(item, 'Curated asset count limit'); continue; }
    try {
      const category = classify(item);
      const stem = path.basename(new URL(item.original).pathname).replace(/\.[^.]+$/, '').normalize('NFKD').replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 85).toLowerCase() || 'nst-image';
      const suffix = createHash('sha256').update(item.original).digest('hex').slice(0, 8);
      const localPath = `/nst/${category}/${stem}-${suffix}.webp`;
      const destination = path.join(output, category, `${stem}-${suffix}.webp`);
      try {
        await access(destination);
        const buffer = await readFile(destination);
        const metadata = await sharp(buffer).metadata();
        if (metadata.format !== 'webp' || !metadata.width || !metadata.height) throw new Error('Invalid existing asset');
        const hash = createHash('sha256').update(buffer).digest('hex');
        if (hashes.has(hash)) { report.duplicatesRemoved++; skip(item, 'Duplicate image content'); continue; }
        hashes.set(hash, localPath);
        const old = previous.find(entry => entry.localPath === localPath);
        manifest.push({ sourceUrl: old?.sourceUrl || item.original, sourcePages: item.sourcePages, localPath, width: metadata.width, height: metadata.height, category, alt: old?.alt || item.alt || `Nova Schola ${stem.replace(/[-_]/g, ' ')}`, bytes: buffer.length, sha256: hash });
        totalBytes += buffer.length;
        skip(item, 'Already exists');
        continue;
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      let image;
      let lastError;
      for (const url of [...new Set([item.original, ...item.variants])]) {
        try { image = await request(url, 'image/jpeg,image/png,image/webp'); break; }
        catch (error) { lastError = error; }
      }
      if (!image) throw lastError;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) throw new Error('Not an allowed image MIME type');
      const metadata = await sharp(image.buffer, { limitInputPixels: 40_000_000 }).metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format) || !metadata.width || !metadata.height || (metadata.pages || 1) > 1) { skip(item, 'Invalid or animated image'); continue; }
      if (category === 'branding' ? metadata.width < 120 || metadata.height < 60 : metadata.width < 480 || metadata.height < 240) { skip(item, 'Small icon or low-resolution image'); continue; }
      const optimized = await sharp(image.buffer).rotate().resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
      const hash = createHash('sha256').update(optimized.data).digest('hex');
      if (hashes.has(hash)) { report.duplicatesRemoved++; skip(item, 'Duplicate image content'); continue; }
      if (totalBytes + optimized.data.length > totalBudget) { skip(item, 'Total asset size budget'); continue; }
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, optimized.data, { flag: 'wx' });
      hashes.set(hash, localPath);
      totalBytes += optimized.data.length;
      manifest.push({ sourceUrl: image.url, sourcePages: item.sourcePages, localPath, width: optimized.info.width, height: optimized.info.height, category, alt: item.alt || `Nova Schola ${stem.replace(/[-_]/g, ' ')}`, bytes: optimized.data.length, sha256: hash });
      report.downloaded++;
    } catch (error) { report.failed++; report.failures.push({ sourceUrl: item.url, reason: error.message }); }
  }
  await mkdir(output, { recursive: true });
  for (const category of categories) await mkdir(path.join(output, category), { recursive: true });
  // A failed/offline crawl must never erase an existing successful inventory.
  if (report.pagesCrawled.length && manifest.length) {
    const retained = previous.filter(entry => !manifest.some(next => next.localPath === entry.localPath));
    const inventory = [...manifest, ...retained];
    await writeFile(path.join(output, 'manifest.json'), JSON.stringify(inventory, null, 2) + '\n');
    const cell = value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
    const rows = inventory.map(entry => `| ${cell(entry.localPath)} | ${cell(entry.sourcePages?.join(', ') || 'Not recorded')} | ${cell(entry.sourceUrl)} | Available; assign and visually verify before integration |`).join('\n');
    await mkdir(path.join(root, 'docs'), { recursive: true });
    await writeFile(path.join(root, 'docs/NST_IMAGE_INVENTORY.md'), '# NST downloaded image inventory\n\nGenerated by scripts/download-nst-assets.mjs. Dimensions, sizes and SHA-256 hashes are in web/public/nst/manifest.json. Usage review is recorded separately in NST_IMAGE_SOURCES.md.\n\n| Local asset | Source page | Source image | Used in |\n|---|---|---|---|\n' + rows + '\n');
  } else if (!previous.length) {
    await writeFile(path.join(output, 'manifest.json'), '[]\n');
  }
  await writeFile(path.join(output, 'crawl-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (!report.pagesCrawled.length || (!manifest.length && !previous.length)) throw new Error('No usable NST assets imported. See crawl-report.json; frontend integration is incomplete.');
  return report;
}

if (typeof process !== 'undefined' && process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  downloadNstAssets().catch(error => { console.error(error.message); process.exitCode = 1; });
}
