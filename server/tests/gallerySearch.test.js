import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

import config from '../src/shared/config/env.js';
import createApp from '../src/app.js';
import { query } from '../src/shared/config/db.js';
import { hashPassword } from '../src/shared/utils/password.js';

const domain = config.nstEmailDomain || 'my.nst.edu.ph';
const ADMIN_EMAIL = `search15_admin@${domain}`;
const PASSWORD = 'Search15!1';

const postJson = async (baseUrl, path, body, token) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

const getJson = async (baseUrl, path, token) =>
  fetch(`${baseUrl}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

describe('B1.5 GET /api/gallery/search server-side filters', () => {
  let server;
  let baseUrl;
  let adminId;
  let adminToken;
  let catAId;
  let catBId;
  const token = 'B15SEARCHTOKEN';
  const createdIds = [];

  before(async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');

    const hash = await hashPassword(PASSWORD);
    await query('DELETE FROM gallery_media WHERE caption LIKE $1', [`%${token}%`]).catch(() => {});
    await query('DELETE FROM users WHERE email = $1', [ADMIN_EMAIL]).catch(() => {});

    const adminRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES ($1,$2,'Search15 Admin','admin',TRUE) ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id`,
      [ADMIN_EMAIL, hash]
    );
    adminId = adminRes.rows[0].id;

    const catARes = await query(
      `INSERT INTO categories (name, description, created_by) VALUES ($1,$2,$3) ON CONFLICT (name) DO UPDATE SET description=EXCLUDED.description RETURNING id`,
      ['B15 Cat A', 'cat a', adminId]
    );
    catAId = catARes.rows[0].id;
    if (!catAId) catAId = (await query('SELECT id FROM categories WHERE name=$1', ['B15 Cat A'])).rows[0].id;

    const catBRes = await query(
      `INSERT INTO categories (name, description, created_by) VALUES ($1,$2,$3) ON CONFLICT (name) DO UPDATE SET description=EXCLUDED.description RETURNING id`,
      ['B15 Cat B', 'cat b', adminId]
    );
    catBId = catBRes.rows[0].id;
    if (!catBId) catBId = (await query('SELECT id FROM categories WHERE name=$1', ['B15 Cat B'])).rows[0].id;

    server = createApp().listen(0);
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    const login = await postJson(baseUrl, '/api/auth/login', { email: ADMIN_EMAIL, password: PASSWORD });
    adminToken = (await login.json()).token;

    // Helper to insert approved media with controlled year and media_type
    const insert = async ({ caption, category_id, media_type, created_at }) => {
      const { rows } = await query(
        `INSERT INTO gallery_media (uploader_id, category_id, media_type, file_url, original_filename, caption, status, created_at, updated_at, featured)
         VALUES ($1,$2,$3,$4,$5,$6,'approved',$7,$7,false) RETURNING id`,
        [adminId, category_id, media_type, `/uploads/gallery/images/${Date.now()}-${Math.random()}.jpg`, `${caption}.jpg`, caption, created_at]
      );
      createdIds.push(rows[0].id);
      return rows[0].id;
    };

    // Seed 5 matches for q=token, with varying categories/years/types
    // 2 in catA, 3 in catB; years 2024,2024,2025,2025,2026; types image/image/image/video/video
    await insert({ caption: `${token} Alpha`, category_id: catAId, media_type: 'image', created_at: '2024-01-15T00:00:00Z' });
    await insert({ caption: `${token} Beta`, category_id: catAId, media_type: 'image', created_at: '2024-06-15T00:00:00Z' });
    await insert({ caption: `${token} Gamma`, category_id: catBId, media_type: 'image', created_at: '2025-03-10T00:00:00Z' });
    await insert({ caption: `${token} Delta`, category_id: catBId, media_type: 'video', created_at: '2025-08-20T00:00:00Z' });
    await insert({ caption: `${token} Epsilon`, category_id: catBId, media_type: 'video', created_at: '2026-02-01T00:00:00Z' });

    // One non-matching approved media to ensure not returned
    await query(
      `INSERT INTO gallery_media (uploader_id, category_id, media_type, file_url, original_filename, caption, status, created_at, featured)
       VALUES ($1,$2,'image','/uploads/gallery/images/other.jpg','other.jpg','OTHER_NO_MATCH','approved','2025-01-01',false)`
    ).then(r => {}).catch(()=>{});
  });

  after(async () => {
    if (createdIds.length) await query('DELETE FROM gallery_media WHERE id = ANY($1::bigint[])', [createdIds]).catch(() => {});
    await query('DELETE FROM gallery_media WHERE caption LIKE $1', [`%${token}%`]).catch(() => {});
    await query('DELETE FROM gallery_media WHERE caption=$1', ['OTHER_NO_MATCH']).catch(() => {});
    await query('DELETE FROM users WHERE email=$1', [ADMIN_EMAIL]).catch(() => {});
    await query('DELETE FROM categories WHERE name IN ($1,$2)', ['B15 Cat A', 'B15 Cat B']).catch(() => {});
    if (server) await new Promise((r) => server.close(r));
  });

  it('q alone still works (regression)', async () => {
    const res = await getJson(baseUrl, `/api/gallery/search?q=${encodeURIComponent(token)}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.media.length >= 5);
    assert.equal(typeof body.total, 'number');
    assert.ok(body.total >= 5);
    assert.ok(body.media.every((m) => 'featured' in m));
  });

  it('q + category_id → only matching category', async () => {
    const res = await getJson(baseUrl, `/api/gallery/search?q=${encodeURIComponent(token)}&category_id=${catAId}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.media.length > 0);
    assert.ok(body.media.every((m) => String(m.category_id) === String(catAId)));
    assert.ok(body.media.every((m) => m.caption.includes(token)));
  });

  it('q + year → only matching year', async () => {
    const res = await getJson(baseUrl, `/api/gallery/search?q=${encodeURIComponent(token)}&year=2024`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.media.length === 2, `expected 2 for 2024, got ${body.media.length}`);
    for (const m of body.media) {
      assert.equal(new Date(m.created_at).getUTCFullYear(), 2024);
    }
  });

  it('q + media_type=image → only images', async () => {
    const res = await getJson(baseUrl, `/api/gallery/search?q=${encodeURIComponent(token)}&media_type=image`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.media.length > 0);
    assert.ok(body.media.every((m) => m.media_type === 'image'));
  });

  it('q + media_type=video → only videos', async () => {
    const res = await getJson(baseUrl, `/api/gallery/search?q=${encodeURIComponent(token)}&media_type=video`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.media.length === 2);
    assert.ok(body.media.every((m) => m.media_type === 'video'));
  });

  it('q + media_type=document → 400', async () => {
    const res = await getJson(baseUrl, `/api/gallery/search?q=${encodeURIComponent(token)}&media_type=document`);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /media_type/i);
  });

  it('q + category_id + year + media_type all combined → intersection', async () => {
    // catA + 2024 + image should be 2 (both catA 2024 are images)
    const res = await getJson(baseUrl, `/api/gallery/search?q=${encodeURIComponent(token)}&category_id=${catAId}&year=2024&media_type=image`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.media.length, 2);
    assert.equal(body.total, 2);
    // catB + 2025 + video should be 1 (Delta)
    const res2 = await getJson(baseUrl, `/api/gallery/search?q=${encodeURIComponent(token)}&category_id=${catBId}&year=2025&media_type=video`);
    assert.equal(res2.status, 200);
    const body2 = await res2.json();
    assert.equal(body2.media.length, 1);
    assert.equal(body2.total, 1);
  });

  it('total reflects filtered set, not all matches (5 matches for q, 2 in catA → total 2)', async () => {
    const resAll = await getJson(baseUrl, `/api/gallery/search?q=${encodeURIComponent(token)}`);
    const bodyAll = await resAll.json();
    assert.ok(bodyAll.total >= 5);

    const resCatA = await getJson(baseUrl, `/api/gallery/search?q=${encodeURIComponent(token)}&category_id=${catAId}`);
    const bodyCatA = await resCatA.json();
    assert.equal(bodyCatA.total, 2);
    assert.equal(bodyCatA.media.length, 2);
    // ensure not returning all 5
    assert.ok(bodyCatA.total < bodyAll.total);
  });

  it('limit=1 returns 1 row, total reflects full filtered count', async () => {
    const res = await getJson(baseUrl, `/api/gallery/search?q=${encodeURIComponent(token)}&limit=1`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.media.length, 1);
    assert.ok(body.total >= 5);
  });

  it('offset works with filters', async () => {
    const res0 = await getJson(baseUrl, `/api/gallery/search?q=${encodeURIComponent(token)}&limit=2&offset=0`);
    const res1 = await getJson(baseUrl, `/api/gallery/search?q=${encodeURIComponent(token)}&limit=2&offset=2`);
    assert.equal(res0.status, 200);
    assert.equal(res1.status, 200);
    const b0 = await res0.json();
    const b1 = await res1.json();
    assert.equal(b0.media.length, 2);
    assert.ok(b1.media.length >= 1);
    // ensure no overlap
    const ids0 = new Set(b0.media.map((m) => m.id));
    for (const m of b1.media) assert.ok(!ids0.has(m.id));
    assert.equal(b0.total, b1.total);
  });

  it('empty q → 400 (regression)', async () => {
    const res = await getJson(baseUrl, `/api/gallery/search?q=`);
    assert.equal(res.status, 400);
    const res2 = await getJson(baseUrl, `/api/gallery/search`);
    assert.equal(res2.status, 400);
  });

  it('public access still works without auth', async () => {
    const res = await getJson(baseUrl, `/api/gallery/search?q=${encodeURIComponent(token)}`);
    assert.equal(res.status, 200);
  });

  it('invalid year non-numeric → 400', async () => {
    const res = await getJson(baseUrl, `/api/gallery/search?q=${encodeURIComponent(token)}&year=abc`);
    assert.equal(res.status, 400);
  });

  it('invalid category_id non-numeric → 400', async () => {
    const res = await getJson(baseUrl, `/api/gallery/search?q=${encodeURIComponent(token)}&category_id=notanid`);
    assert.equal(res.status, 400);
  });
});
