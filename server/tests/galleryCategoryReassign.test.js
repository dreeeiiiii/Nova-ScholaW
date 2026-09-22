import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

import config from '../src/shared/config/env.js';
import createApp from '../src/app.js';
import { query } from '../src/shared/config/db.js';
import { hashPassword } from '../src/shared/utils/password.js';

const domain = config.nstEmailDomain || 'my.nst.edu.ph';
const ADMIN_EMAIL = `catreassign_admin@${domain}`;
const TEACHER_EMAIL = `catreassign_teacher@${domain}`;
const PASSWORD = 'CatReassign123!';

const postJson = async (baseUrl, path, body, token) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

const getJson = async (baseUrl, path, token) =>
  fetch(`${baseUrl}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

const patchJson = async (baseUrl, path, body, token) =>
  fetch(`${baseUrl}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

const buildMultipart = (fileContent, filename, contentType, extraFields = {}) => {
  const boundary = `----formdata-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const parts = [];
  for (const [k, v] of Object.entries(extraFields)) {
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}`);
  }
  parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n` + fileContent.toString('binary'));
  const body = Buffer.from(parts.join('\r\n') + '\r\n' + `--${boundary}--\r\n`);
  return { boundary, body };
};

const uploadFile = async (baseUrl, path, { boundary, body }, token) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });

describe('B1.6 PATCH /api/gallery/:id/category (pending-only reassign)', () => {
  let server;
  let baseUrl;
  let adminToken, teacherToken;
  let adminId;
  let catAId, catBId;
  let pendingId;
  let approvedId;
  let rejectedId;

  const jpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);

  before(async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');

    const hash = await hashPassword(PASSWORD);
    await query('DELETE FROM gallery_media WHERE caption LIKE $1', ['CATREASSIGN%']).catch(() => {});
    await query('DELETE FROM users WHERE email = ANY($1)', [[ADMIN_EMAIL, TEACHER_EMAIL]]).catch(() => {});

    const adminRes = await query(`INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES ($1,$2,'CatReassign Admin','admin',TRUE) ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id`, [ADMIN_EMAIL, hash]);
    adminId = adminRes.rows[0].id;
    await query(`INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES ($1,$2,'CatReassign Teacher','teacher',TRUE) ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id`, [TEACHER_EMAIL, hash]);

    const catA = await query(`INSERT INTO categories (name, description, created_by) VALUES ($1,$2,$3) ON CONFLICT (name) DO UPDATE SET description=EXCLUDED.description RETURNING id`, ['CatReassign A', 'a', adminId]);
    catAId = catA.rows[0].id;
    if (!catAId) catAId = (await query('SELECT id FROM categories WHERE name=$1', ['CatReassign A'])).rows[0].id;
    const catB = await query(`INSERT INTO categories (name, description, created_by) VALUES ($1,$2,$3) ON CONFLICT (name) DO UPDATE SET description=EXCLUDED.description RETURNING id`, ['CatReassign B', 'b', adminId]);
    catBId = catB.rows[0].id;
    if (!catBId) catBId = (await query('SELECT id FROM categories WHERE name=$1', ['CatReassign B'])).rows[0].id;

    server = createApp().listen(0);
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const login = async (email) => (await (await postJson(baseUrl, '/api/auth/login', { email, password: PASSWORD })).json()).token;
    adminToken = await login(ADMIN_EMAIL);
    teacherToken = await login(TEACHER_EMAIL);

    // Create pending media directly (uploads now default to approved)
    const pendRes = await query(
      `INSERT INTO gallery_media (uploader_id, category_id, media_type, file_url, original_filename, caption, status)
       VALUES ($1, $2, 'image', '/uploads/gallery/images/catpending.jpg', 'catpending.jpg', 'CATREASSIGN Pending', 'pending')
       RETURNING id`,
      [adminId, catAId]
    );
    pendingId = pendRes.rows[0].id;

    // Create approved media (upload defaults to approved, no approve PATCH needed)
    const { boundary: b2, body: body2 } = buildMultipart(jpeg, 'catapproved.jpg', 'image/jpeg', { category_id: String(catAId), title: 'CATREASSIGN Approved' });
    const up2 = await uploadFile(baseUrl, '/api/gallery/upload', { boundary: b2, body: body2 }, adminToken);
    assert.equal(up2.status, 201);
    approvedId = (await up2.json()).media.id;

    // Create rejected media: insert pending directly, then reject via endpoint
    const rejIns = await query(
      `INSERT INTO gallery_media (uploader_id, category_id, media_type, file_url, original_filename, caption, status)
       VALUES ($1, $2, 'image', '/uploads/gallery/images/catrejected.jpg', 'catrejected.jpg', 'CATREASSIGN Rejected', 'pending')
       RETURNING id`,
      [adminId, catAId]
    );
    const mid3 = rejIns.rows[0].id;
    const rej = await patchJson(baseUrl, `/api/gallery/${mid3}/reject`, { rejection_reason: 'bad content test' }, adminToken);
    assert.equal(rej.status, 200);
    rejectedId = mid3;
  });

  after(async () => {
    await query('DELETE FROM gallery_media WHERE caption LIKE $1', ['CATREASSIGN%']).catch(() => {});
    await query('DELETE FROM users WHERE email = ANY($1)', [[ADMIN_EMAIL, TEACHER_EMAIL]]).catch(() => {});
    await query('DELETE FROM categories WHERE name IN ($1,$2)', ['CatReassign A', 'CatReassign B']).catch(() => {});
    if (server) await new Promise((r) => server.close(r));
  });

  it('admin reassigns a pending item to a valid category → 200, category_id reflects new value', async () => {
    const res = await patchJson(baseUrl, `/api/gallery/${pendingId}/category`, { category_id: Number(catBId) }, adminToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.media);
    assert.equal(String(body.media.category_id), String(catBId));
  });

  it('admin clears category with null → 200, category_id is null', async () => {
    const res = await patchJson(baseUrl, `/api/gallery/${pendingId}/category`, { category_id: null }, adminToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.media.category_id, null);
    // restore to catA for further tests
    const res2 = await patchJson(baseUrl, `/api/gallery/${pendingId}/category`, { category_id: Number(catAId) }, adminToken);
    assert.equal(res2.status, 200);
  });

  it('non-pending item (approved) → 400', async () => {
    const res = await patchJson(baseUrl, `/api/gallery/${approvedId}/category`, { category_id: Number(catBId) }, adminToken);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /pending/i);
  });

  it('non-pending item (rejected) → 400', async () => {
    const res = await patchJson(baseUrl, `/api/gallery/${rejectedId}/category`, { category_id: Number(catBId) }, adminToken);
    assert.equal(res.status, 400);
  });

  it('non-existent media id → 404', async () => {
    const res = await patchJson(baseUrl, `/api/gallery/99999999/category`, { category_id: Number(catAId) }, adminToken);
    assert.equal(res.status, 404);
  });

  it('non-existent category_id (non-null) → 400', async () => {
    const res = await patchJson(baseUrl, `/api/gallery/${pendingId}/category`, { category_id: 99999999 }, adminToken);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /Category does not exist/i);
  });

  it('missing category_id in body → 400', async () => {
    const res = await patchJson(baseUrl, `/api/gallery/${pendingId}/category`, {}, adminToken);
    assert.equal(res.status, 400);
  });

  it('category_id as string ("5") → 400', async () => {
    const res = await patchJson(baseUrl, `/api/gallery/${pendingId}/category`, { category_id: "5" }, adminToken);
    assert.equal(res.status, 400);
  });

  it('category_id as object ({}) → 400', async () => {
    const res = await patchJson(baseUrl, `/api/gallery/${pendingId}/category`, { category_id: {} }, adminToken);
    assert.equal(res.status, 400);
  });

  it('malformed :id → 400', async () => {
    const res = await patchJson(baseUrl, `/api/gallery/notanid/category`, { category_id: catAId }, adminToken);
    assert.equal(res.status, 400);
  });

  it('non-admin (teacher) → 403', async () => {
    const res = await patchJson(baseUrl, `/api/gallery/${pendingId}/category`, { category_id: Number(catBId) }, teacherToken);
    assert.equal(res.status, 403);
  });

  it('unauth → 401', async () => {
    const res = await patchJson(baseUrl, `/api/gallery/${pendingId}/category`, { category_id: Number(catBId) }, null);
    assert.equal(res.status, 401);
  });

  it('audit log row with action = gallery.category_update exists after success', async () => {
    // do a successful reassign to trigger audit
    const res = await patchJson(baseUrl, `/api/gallery/${pendingId}/category`, { category_id: Number(catBId) }, adminToken);
    assert.equal(res.status, 200);
    const { rows } = await query(`SELECT action, entity_type, entity_id, details FROM audit_logs WHERE action='gallery.category_update' AND entity_id=$1 ORDER BY created_at DESC LIMIT 1`, [pendingId]);
    assert.ok(rows.length >= 1);
    assert.equal(rows[0].action, 'gallery.category_update');
    assert.equal(rows[0].entity_type, 'gallery_media');
    assert.equal(String(rows[0].entity_id), String(pendingId));
    // revert
    await patchJson(baseUrl, `/api/gallery/${pendingId}/category`, { category_id: Number(catAId) }, adminToken);
  });

  it('NO audit row written on validation failure (non-pending)', async () => {
    const before = await query(`SELECT COUNT(*)::int as c FROM audit_logs WHERE action='gallery.category_update' AND entity_id=$1`, [approvedId]);
    const beforeC = before.rows[0].c;
    const res = await patchJson(baseUrl, `/api/gallery/${approvedId}/category`, { category_id: Number(catBId) }, adminToken);
    assert.equal(res.status, 400);
    const after = await query(`SELECT COUNT(*)::int as c FROM audit_logs WHERE action='gallery.category_update' AND entity_id=$1`, [approvedId]);
    assert.equal(after.rows[0].c, beforeC, 'no new audit row on validation failure');
  });
});
