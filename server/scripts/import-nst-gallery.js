import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const directory = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.resolve(directory, '../../web/public');
export const records = JSON.parse(await readFile(new URL('./data/nst-gallery.json', import.meta.url), 'utf8'));
export const legacy = JSON.parse(await readFile(new URL('./data/legacy-gallery-demo.json', import.meta.url), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const lock = 642033;

export function identifyLegacy(row) {
  const seed = legacy.find(s => s.filename === row.original_filename);
  if (!seed || row.media_type !== 'image' || row.caption !== seed.caption ||
      row.uploader_email !== seed.uploader || row.category_name !== seed.category) return null;
  // Require the exact namespace and filename written by the old B2 seed.
  const keyPattern = new RegExp('^gallery/[0-9]+-[a-f0-9]{16}-' + seed.filename.replace('.', '[.]') + '$');
  return keyPattern.test(row.b2_key || '') ? seed : null;
}

export async function loadImages() {
  const manifest = JSON.parse(await readFile(path.join(publicRoot, 'nst/manifest.json'), 'utf8'));
  return Promise.all(records.map(async record => {
    const source = manifest.find(m => m.localPath === record.localPath);
    if (!source || source.sha256 !== record.sha256 || source.sourceUrl !== record.sourceUrl ||
        new URL(record.sourceUrl).hostname !== 'nst.edu.ph' ||
        record.sourcePages.some(p => new URL(p).hostname !== 'nst.edu.ph' || !source.sourcePages.includes(p))) {
      throw new Error('Unverified first-party source: ' + record.localPath);
    }
    const local = path.resolve(publicRoot, '.' + record.localPath);
    if (!local.startsWith(publicRoot + path.sep)) throw new Error('Image path escapes public directory');
    const buffer = await readFile(local);
    const metadata = await sharp(buffer).metadata();
    if (hash(buffer) !== record.sha256 || metadata.format !== 'webp' || metadata.width < 600 || metadata.height < 400) {
      throw new Error('Image hash/format/dimensions failed: ' + record.localPath);
    }
    return { ...record, buffer };
  }));
}

// Reproduce old seed artwork ONLY for content verification, never for upload.
export async function matchesLegacyImage(buffer, seed) {
  const svg = '<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="1200" height="800" fill="' + seed.background + '"/>' +
    '<circle cx="150" cy="120" r="70" fill="#ffffff" opacity="0.18"/>' +
    '<circle cx="1080" cy="700" r="110" fill="#ffffff" opacity="0.12"/>' +
    '<rect x="80" y="300" width="1040" height="200" rx="24" fill="#000000" opacity="0.28"/>' +
    '<text x="600" y="395" font-family="Arial,sans-serif" font-size="64" font-weight="bold" fill="#ffffff" text-anchor="middle">Nova Schola</text>' +
    '<text x="600" y="460" font-family="Arial,sans-serif" font-size="44" fill="#ffffff" text-anchor="middle">' + seed.label + '</text></svg>';
  const expected = await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
  const metadata = await sharp(buffer).metadata();
  if (metadata.format !== 'jpeg' || metadata.width !== 1200 || metadata.height !== 800) return false;
  // Decoded equality also tolerates differences in container metadata.
  return hash(await sharp(buffer).raw().toBuffer()) === hash(await sharp(expected).raw().toBuffer());
}

export async function readB2(b2, key) {
  const url = await b2.getPresignedUrl(key);
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('B2 image retrieval failed: HTTP ' + response.status);
  const length = Number(response.headers.get('content-length'));
  if (length > 10 * 1024 * 1024) throw new Error('B2 verification image exceeds size limit');
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 10 * 1024 * 1024) throw new Error('B2 verification image exceeds size limit');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const joinedRows = async client => (await client.query(
  'SELECT g.*, u.email AS uploader_email, c.name AS category_name FROM gallery_media g LEFT JOIN users u ON u.id=g.uploader_id LEFT JOIN categories c ON c.id=g.category_id ORDER BY g.id')).rows;

export async function auditGallery(client, b2) {
  const all = await joinedRows(client);
  const confirmed = []; const unresolved = [];
  for (const row of all) {
    const seed = identifyLegacy(row);
    if (!seed) {
      if (/^seed-gal-[0-9]{2}[.]jpg$/.test(row.original_filename) || /\(demo photo\)/i.test(row.caption || '')) {
        unresolved.push({ id: row.id, filename: row.original_filename, reason: 'Exact legacy identity did not match; preserved' });
      }
      continue;
    }
    const buffer = await readB2(b2, row.b2_key);
    if (!await matchesLegacyImage(buffer, seed)) {
      unresolved.push({ id: row.id, filename: row.original_filename, reason: 'B2 pixels differ from known generated seed; preserved' });
      continue;
    }
    confirmed.push({ row, buffer });
  }
  return { all, confirmed, unresolved };
}

export async function importGallery(client, b2, images, { apply = false, backupRoot = path.join(directory, '../backups/nst-gallery') } = {}) {
  // Serialize this importer; no schema changes and no user account creation.
  const acquired = (await client.query('SELECT pg_try_advisory_lock($1) AS acquired', [lock])).rows[0].acquired;
  if (!acquired) throw new Error('Another NST gallery import is running');
  const uploaded = []; let committed = false; let transaction = false; let commitAttempted = false;
  try {
    const audit = await auditGallery(client, b2);
    const missing = [];
    for (const image of images) {
      const found = audit.all.filter(row => row.original_filename === image.filename);
      if (found.length > 1) throw new Error('Duplicate import identity: ' + image.filename);
      if (found.length) {
        const row = found[0];
        if (!row.b2_key?.startsWith('gallery/') || hash(await readB2(b2, row.b2_key)) !== image.sha256) {
          throw new Error('Existing import filename belongs to different content; preserved');
        }
        // Existing records, including admin edits or withdrawal, are never overwritten.
      } else missing.push(image);
    }
    const report = {
      selected: images.length, totalBefore: audit.all.length, fakeFound: audit.confirmed.length,
      fakeB2ObjectsFound: new Set(audit.confirmed.map(x => x.row.b2_key)).size,
      unresolved: audit.unresolved, plannedImports: missing.length, existingImports: images.length - missing.length,
      removed: 0, created: 0, fakeB2ObjectsRemoved: 0, preserved: audit.all.length - audit.confirmed.length,
    };
    if (!apply) return { ...report, dryRun: true };
    if (audit.unresolved.length) throw new Error('Ambiguous demo candidates remain; review dry-run report before applying');
    const admin = (await client.query("SELECT id FROM users WHERE role='admin' AND is_active=TRUE ORDER BY id LIMIT 1")).rows[0];
    if (!admin) throw new Error('An existing active admin is required');
    // Preflight foreign keys before uploading any objects.
    for (const image of missing) {
      if (!(await client.query('SELECT id FROM categories WHERE name=$1', [image.category])).rows.length && !image.category.trim()) {
        throw new Error('Invalid category');
      }
    }
    const backup = path.join(backupRoot, new Date().toISOString().replace(/[:.]/g, '-'));
    await mkdir(backup, { recursive: true });
    await writeFile(path.join(backup, 'records.json'), JSON.stringify(audit.confirmed.map(x => x.row), null, 2));
    for (const item of audit.confirmed) await writeFile(path.join(backup, String(item.row.id) + '.jpg'), item.buffer);
    report.backupDirectory = backup;
    await client.query('BEGIN'); transaction = true;
    await client.query("SET LOCAL lock_timeout='5s'");
    // A short row-lock preflight protects against moderation edits during the import.
    const ids = audit.confirmed.map(x => x.row.id);
    if (ids.length) await client.query('SELECT id FROM gallery_media WHERE id=ANY($1::bigint[]) FOR UPDATE', [ids]);
    const current = await joinedRows(client);
    if (hash(Buffer.from(JSON.stringify(current))) !== hash(Buffer.from(JSON.stringify(audit.all)))) {
      throw new Error('Gallery changed since audit; retry without modifying any records');
    }
    for (const image of missing) {
      let category = (await client.query('SELECT id FROM categories WHERE name=$1 ORDER BY id LIMIT 1', [image.category])).rows[0];
      if (!category) category = (await client.query('INSERT INTO categories (name,description) VALUES ($1,$2) RETURNING id',
        [image.category, 'Nova Schola Tanauan school activities.'])).rows[0];
      const { key } = await b2.uploadBuffer(image.buffer, { folder: 'gallery', contentType: 'image/webp', filename: 'nst-' + image.sha256.slice(0, 16) + '.webp' });
      uploaded.push(key);
      if (hash(await readB2(b2, key)) !== image.sha256) throw new Error('Uploaded NST image verification failed');
      const fileUrl = await b2.getPresignedUrl(key);
      await client.query(
        "INSERT INTO gallery_media (uploader_id,category_id,media_type,file_url,b2_key,original_filename,caption,status,reviewed_by,reviewed_at,featured) VALUES ($1,$2,'image',$3,$4,$5,$6,'approved',$1,NOW(),$7)",
        [admin.id, category.id, fileUrl, key, image.filename, image.caption, image.category === 'Foundation Day']);
      report.created++;
    }
    for (const item of audit.confirmed) {
      // Compare identity again inside the DELETE. Never match by caption/title alone.
      const result = await client.query(
        'DELETE FROM gallery_media WHERE id=$1 AND original_filename=$2 AND caption=$3 AND b2_key=$4 AND uploader_id=$5 AND category_id=$6 RETURNING id',
        [item.row.id, item.row.original_filename, item.row.caption, item.row.b2_key, item.row.uploader_id, item.row.category_id]);
      if (result.rowCount !== 1) throw new Error('Legacy record changed during cleanup');
      report.removed++;
    }
    const after = await joinedRows(client);
    const preserved = audit.all.filter(row => !ids.includes(row.id));
    for (const row of preserved) {
      if (JSON.stringify(after.find(r => r.id === row.id)) !== JSON.stringify(row)) throw new Error('Unrelated gallery record changed; rolling back');
    }
    if (after.some(r => /\(demo photo\)/i.test(r.caption || ''))) throw new Error('Demo photo caption remains; rolling back');
    commitAttempted = true;
    await client.query('COMMIT'); transaction = false; committed = true;
    // B2 deletion happens only after replacement records commit. Keep shared objects.
    report.b2CleanupFailures = []; report.sharedObjectsPreserved = [];
    for (const key of new Set(audit.confirmed.map(x => x.row.b2_key))) {
      const referenced = (await client.query('SELECT id FROM gallery_media WHERE b2_key=$1 LIMIT 1', [key])).rows.length;
      if (referenced) { report.sharedObjectsPreserved.push(key); continue; }
      try { await b2.deleteObject(key); report.fakeB2ObjectsRemoved++; }
      catch { report.b2CleanupFailures.push(key); }
    }
    // Retain exact verified keys locally so failed object cleanup can be reviewed.
    await writeFile(path.join(backup, 'result.json'), JSON.stringify(report, null, 2));
    return report;
  } catch (error) {
    if (transaction) await client.query('ROLLBACK');
    if (!committed && !commitAttempted) {
      // Compensation is restricted to new objects uploaded by this invocation.
      for (const key of uploaded) {
        try { await b2.deleteObject(key); }
        catch { console.error('[nst-gallery] New orphan object needs cleanup:', key); }
      }
    }
    throw error;
  } finally { await client.query('SELECT pg_advisory_unlock($1)', [lock]); }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(a => !['--dry-run', '--apply', '--offline'].includes(a)) ||
      (args.includes('--apply') && (args.includes('--dry-run') || args.includes('--offline')))) {
    throw new Error('Use --dry-run, --dry-run --offline, or --apply');
  }
  const images = await loadImages();
  console.table(images.map(({ key, caption, category, sourcePages }) => ({ key, caption, category, sourcePage: sourcePages[0] })));
  if (args.includes('--offline')) {
    console.log(JSON.stringify({ dryRun: true, offline: true, selected: images.length, legacyDefinitions: legacy.length,
      liveCounts: 'UNVERIFIED', writes: 0, note: 'Local source validation only; no database or B2 connection.' }));
    return;
  }
  // Do not load the application, scheduler, announcements, or email services.
  const { default: config } = await import('../src/shared/config/env.js');
  const { default: pg } = await import('pg');
  const b2 = await import('../src/shared/config/b2.js');
  const client = new pg.Client({ connectionString: config.databaseUrl, ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000, query_timeout: 30000 });
  try {
    await client.connect();
    const report = await importGallery(client, b2, images, { apply: args.includes('--apply') });
    console.log(JSON.stringify(report, null, 2));
    if (report.unresolved.length || report.b2CleanupFailures?.length) process.exitCode = 1;
  } finally { await client.end(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error('[nst-gallery]', error.code || error.message || 'Operation failed'); process.exitCode = 1; });
}
