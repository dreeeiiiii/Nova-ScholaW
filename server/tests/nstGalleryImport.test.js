import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { identifyLegacy, legacy, records, loadImages, matchesLegacyImage, importGallery } from '../scripts/import-nst-gallery.js';

function fixture(initial = [], { noAdmin = false, failInsert = false } = {}) {
  let rows = structuredClone(initial), saved;
  const queries = [], uploaded = [], deleted = [], objects = new Map();
  const client = { query: async (sql, values = []) => {
    queries.push({ sql, values });
    if (sql.startsWith('SELECT pg_try')) return { rows: [{ acquired: true }] };
    if (sql === 'BEGIN') { saved = structuredClone(rows); return { rows: [] }; }
    if (sql === 'ROLLBACK') { rows = saved; return { rows: [] }; }
    if (sql.startsWith('SELECT g.*')) return { rows: structuredClone(rows) };
    if (sql.startsWith('SELECT id FROM users')) return { rows: noAdmin ? [] : [{ id: '1' }] };
    if (sql.startsWith('SELECT id FROM categories')) return { rows: [{ id: '9' }] };
    if (sql.startsWith('INSERT INTO gallery_media')) {
      if (failInsert) throw new Error('Injected insertion failure');
      const [uploader_id, category_id, file_url, b2_key, original_filename, caption, featured] = values;
      rows.push({ id: String(rows.length + 100), uploader_id, category_id, file_url, b2_key,
        original_filename, caption, featured, status: 'approved', media_type: 'image', reviewed_by: uploader_id,
        uploader_email: 'admin@nst.edu.ph', category_name: 'School Events' });
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith('DELETE FROM gallery_media')) {
      const at = rows.findIndex(row => row.id === values[0] && row.original_filename === values[1] &&
        row.caption === values[2] && row.b2_key === values[3] && row.uploader_id === values[4] && row.category_id === values[5]);
      if (at === -1) return { rows: [], rowCount: 0 };
      rows.splice(at, 1); return { rows: [{ id: values[0] }], rowCount: 1 };
    }
    if (sql.startsWith('SELECT id FROM gallery_media WHERE b2_key')) return { rows: rows.filter(row => row.b2_key === values[0]) };
    return { rows: [] };
  } };
  const b2 = {
    uploadBuffer: async (buffer, { folder, filename, contentType }) => {
      assert.equal(folder, 'gallery'); assert.equal(contentType, 'image/webp');
      const key = 'gallery/new-' + filename; objects.set(key, buffer); uploaded.push(key); return { key };
    },
    getPresignedUrl: async key => 'https://test.invalid/' + key,
    deleteObject: async key => { deleted.push(key); objects.delete(key); },
  };
  return { client, b2, queries, uploaded, deleted, objects, rows: () => structuredClone(rows) };
}
async function withStorage(f, callback) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    const key = new URL(url).pathname.slice(1);
    const buffer = f.objects.get(key);
    return new Response(buffer || '', { status: buffer ? 200 : 404 });
  };
  try { return await callback(); } finally { globalThis.fetch = originalFetch; }
}
const realImages = await loadImages();
const legitimate = { id: '42', original_filename: 'student-upload.webp', caption: 'Science Fair',
  b2_key: 'gallery/real-user-object', media_type: 'image', uploader_email: 'real@my.nst.edu.ph', status: 'approved' };

test('all eight selected assets have valid first-party provenance and distinct stable identities', () => {
  assert.equal(realImages.length, 8);
  assert.equal(new Set(records.map(r => r.filename)).size, 8);
  assert.equal(new Set(records.map(r => r.key)).size, 8);
  assert.ok(records.every(r => r.eventDate === null && new URL(r.sourceUrl).hostname === 'nst.edu.ph'));
});
test('cleanup requires exact legacy filename, caption, uploader, category and B2 key', () => {
  assert.equal(legacy.length, 30);
  for (const seed of legacy) {
    const row = { original_filename: seed.filename, caption: seed.caption, uploader_email: seed.uploader,
      category_name: seed.category, media_type: 'image', b2_key: 'gallery/1789105878363-1234567890abcdef-' + seed.filename };
    assert.equal(identifyLegacy(row), seed);
    for (const property of ['original_filename','caption','uploader_email','category_name','b2_key','media_type']) {
      assert.equal(identifyLegacy({ ...row, [property]: 'changed' }), null);
    }
  }
  assert.equal(identifyLegacy(legitimate), null); // Event names alone never select user uploads.
});
test('real photograph pixels cannot be mistaken for the old generated cards', async () => {
  assert.equal(await matchesLegacyImage(realImages[0].buffer, legacy[0]), false);
});
test('dry-run preserves every row and never uploads, deletes or writes database records', async () => {
  const f = fixture([legitimate]);
  const report = await importGallery(f.client, f.b2, realImages);
  assert.equal(report.plannedImports, 8); assert.equal(report.removed, 0);
  assert.deepEqual(f.rows(), [legitimate]); assert.deepEqual(f.uploaded, []); assert.deepEqual(f.deleted, []);
  assert.ok(!f.queries.some(q => /^(BEGIN|INSERT|UPDATE|DELETE)/.test(q.sql)));
});
test('ambiguous demo rows fail closed before any apply upload or deletion', async () => {
  const ambiguous = { ...legitimate, original_filename: 'seed-gal-18.jpg', caption: legacy[17].caption };
  const f = fixture([legitimate, ambiguous]);
  await assert.rejects(importGallery(f.client, f.b2, realImages, { apply: true }), /Ambiguous/);
  assert.deepEqual(f.uploaded, []); assert.deepEqual(f.deleted, []);
  assert.deepEqual(f.rows(), [legitimate, ambiguous]);
});
test('missing active admin aborts before storage or database mutations', async () => {
  const f = fixture([legitimate], { noAdmin: true });
  await assert.rejects(importGallery(f.client, f.b2, realImages, { apply: true }), /active admin/);
  assert.deepEqual(f.uploaded, []); assert.ok(!f.queries.some(q => q.sql === 'BEGIN'));
});
test('apply imports approved B2 images, preserves unrelated uploads, and is idempotent', async () => {
  const backupRoot = await mkdtemp(path.join(os.tmpdir(), 'nst-gallery-test-'));
  const f = fixture([legitimate]);
  try {
    await withStorage(f, async () => {
      const first = await importGallery(f.client, f.b2, realImages, { apply: true, backupRoot });
      assert.equal(first.created, 8); assert.equal(first.removed, 0);
      assert.deepEqual(f.rows()[0], legitimate);
      assert.ok(f.rows().slice(1).every(row => row.status === 'approved' && row.reviewed_by === '1' && row.b2_key.startsWith('gallery/')));
      const second = await importGallery(f.client, f.b2, realImages, { apply: true, backupRoot });
      assert.equal(second.created, 0); assert.equal(second.existingImports, 8);
      assert.equal(f.uploaded.length, 8); assert.deepEqual(f.deleted, []);
    });
  } finally { await rm(backupRoot, { recursive: true, force: true }); }
});
test('failed database insertion rolls back and compensates only this run’s new B2 object', async () => {
  const backupRoot = await mkdtemp(path.join(os.tmpdir(), 'nst-gallery-test-'));
  const f = fixture([legitimate], { failInsert: true });
  try {
    await withStorage(f, async () => {
      await assert.rejects(importGallery(f.client, f.b2, realImages, { apply: true, backupRoot }), /Injected/);
      assert.deepEqual(f.rows(), [legitimate]); assert.deepEqual(f.deleted, f.uploaded);
      assert.ok(!f.deleted.includes(legitimate.b2_key));
      assert.ok(f.queries.some(q => q.sql === 'ROLLBACK')); assert.ok(!f.queries.some(q => q.sql === 'COMMIT'));
    });
  } finally { await rm(backupRoot, { recursive: true, force: true }); }
});
test('importer does not load app, announcements, scheduler or email services', async () => {
  const source = await readFile(new URL('../scripts/import-nst-gallery.js', import.meta.url), 'utf8');
  assert.ok(!/import\([^)]*(?:announcement|scheduler|email|app\.js)/i.test(source));
});

test('verified seeded pixels and records are removed while legitimate event-name uploads survive', async () => {
  const sharp = (await import('sharp')).default;
  const seed = legacy[17];
  const svg = '<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="1200" height="800" fill="' + seed.background + '"/>' +
    '<circle cx="150" cy="120" r="70" fill="#ffffff" opacity="0.18"/>' +
    '<circle cx="1080" cy="700" r="110" fill="#ffffff" opacity="0.12"/>' +
    '<rect x="80" y="300" width="1040" height="200" rx="24" fill="#000000" opacity="0.28"/>' +
    '<text x="600" y="395" font-family="Arial,sans-serif" font-size="64" font-weight="bold" fill="#ffffff" text-anchor="middle">Nova Schola</text>' +
    '<text x="600" y="460" font-family="Arial,sans-serif" font-size="44" fill="#ffffff" text-anchor="middle">Morning Assembly</text></svg>';
  const buffer = await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
  assert.equal(await matchesLegacyImage(buffer, seed), true);
  const fake = { id: '43', original_filename: seed.filename, caption: seed.caption, uploader_email: seed.uploader,
    category_name: seed.category, category_id: '9', uploader_id: '17', media_type: 'image',
    b2_key: 'gallery/1789105878363-1234567890abcdef-' + seed.filename };
  const f = fixture([legitimate, fake]); f.objects.set(fake.b2_key, buffer);
  const backupRoot = await mkdtemp(path.join(os.tmpdir(), 'nst-gallery-test-'));
  try {
    await withStorage(f, async () => {
      const report = await importGallery(f.client, f.b2, realImages, { apply: true, backupRoot });
      assert.equal(report.fakeFound, 1); assert.equal(report.removed, 1); assert.equal(report.fakeB2ObjectsRemoved, 1);
      assert.deepEqual(f.rows()[0], legitimate); assert.ok(!f.rows().some(row => row.id === fake.id));
      assert.deepEqual(f.deleted, [fake.b2_key]);
      assert.deepEqual(await readFile(path.join(report.backupDirectory, fake.id + '.jpg')), buffer);
    });
  } finally { await rm(backupRoot, { recursive: true, force: true }); }
});
