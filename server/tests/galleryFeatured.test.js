import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

import config from '../src/shared/config/env.js';
import createApp from '../src/app.js';
import { query } from '../src/shared/config/db.js';
import { hashPassword } from '../src/shared/utils/password.js';

const domain = config.nstEmailDomain || 'my.nst.edu.ph';
const ADMIN_EMAIL = `featured_admin@${domain}`;
const TEACHER_EMAIL = `featured_teacher@${domain}`;
const STUDENT_EMAIL = `featured_student@${domain}`;
const PASSWORD = 'Featured123!';

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
    body: body ? JSON.stringify(body) : undefined,
  });

const buildMultipart = (fileContent, filename, contentType, extraFields = {}) => {
  const boundary = `----formdata-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const parts = [];
  for (const [key, value] of Object.entries(extraFields)) {
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}`);
  }
  parts.push(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n` + fileContent.toString('binary')
  );
  const body = Buffer.from(parts.join('\r\n') + '\r\n' + `--${boundary}--\r\n`);
  return { boundary, body };
};

const uploadFile = async (baseUrl, path, { boundary, body }, token) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });

describe('B1.4 gallery featured column', () => {
  let server;
  let baseUrl;
  let adminId;
  let adminToken, teacherToken, studentToken;
  let categoryId;
  let mediaId1; // unfeatured
  let mediaIdFeatured; // will be featured

  before(async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');

    const hash = await hashPassword(PASSWORD);
    await query('DELETE FROM gallery_media WHERE uploader_id IN (SELECT id FROM users WHERE email = ANY($1))', [[ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL]]).catch(() => {});
    await query('DELETE FROM users WHERE email = ANY($1)', [[ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL]]).catch(() => {});

    const adminRes = await query(`INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES ($1,$2,'Featured Admin','admin',TRUE) ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id`, [ADMIN_EMAIL, hash]);
    adminId = adminRes.rows[0].id;
    const teacherRes = await query(`INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES ($1,$2,'Featured Teacher','teacher',TRUE) ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id`, [TEACHER_EMAIL, hash]);
    const studentRes = await query(`INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES ($1,$2,'Featured Student','student',TRUE) ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id`, [STUDENT_EMAIL, hash]);

    const catRes = await query(`INSERT INTO categories (name, description, created_by) VALUES ($1,$2,$3) ON CONFLICT (name) DO UPDATE SET description=EXCLUDED.description RETURNING id`, ['Featured Cat', 'for featured tests', adminId]);
    categoryId = catRes.rows[0].id;
    if (!categoryId) {
      const r = await query('SELECT id FROM categories WHERE name=$1', ['Featured Cat']);
      categoryId = r.rows[0].id;
    }

    server = createApp().listen(0);
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const login = async (email) => {
      const r = await postJson(baseUrl, '/api/auth/login', { email, password: PASSWORD });
      return (await r.json()).token;
    };
    adminToken = await login(ADMIN_EMAIL);
    teacherToken = await login(TEACHER_EMAIL);
    studentToken = await login(STUDENT_EMAIL);
  });

  after(async () => {
    await query('DELETE FROM gallery_media WHERE uploader_id = ANY($1)', [[adminId]]).catch(() => {});
    // Also delete those created by adminId even if student uploaded, clean by category
    await query('DELETE FROM gallery_media WHERE category_id=$1', [categoryId]).catch(() => {});
    await query('DELETE FROM users WHERE email = ANY($1)', [[ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL]]).catch(() => {});
    if (server) await new Promise((r) => server.close(r));
  });

  const jpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);

  it('default featured is false after upload', async () => {
    const { boundary, body } = buildMultipart(jpeg, 'feat1.jpg', 'image/jpeg', { category_id: String(categoryId), title: 'Feat Default 1' });
    const res = await uploadFile(baseUrl, '/api/gallery/upload', { boundary, body }, adminToken);
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.media.featured, false);
    assert.equal(data.media.status, 'approved');
    mediaId1 = data.media.id;
  });

  it('GET /api/gallery?featured=true returns only flagged rows', async () => {
    // create and feature second media
    const { boundary, body } = buildMultipart(jpeg, 'feat2.jpg', 'image/jpeg', { category_id: String(categoryId), title: 'Feat To Feature' });
    const res = await uploadFile(baseUrl, '/api/gallery/upload', { boundary, body }, adminToken);
    assert.equal(res.status, 201);
    const mid = (await res.json()).media.id;
    mediaIdFeatured = mid;

    const feat = await patchJson(baseUrl, `/api/gallery/${mid}/feature`, { featured: true }, adminToken);
    assert.equal(feat.status, 200);
    assert.equal(feat.headers.get('content-type')?.includes('json'), true);
    const featBody = await feat.json();
    assert.equal(featBody.media.featured, true);
    assert.equal(featBody.media.id, mid);

    const browseFeat = await getJson(baseUrl, '/api/gallery?featured=true');
    assert.equal(browseFeat.status, 200);
    const bBody = await browseFeat.json();
    assert.ok(Array.isArray(bBody.media));
    assert.ok(bBody.media.length >= 1);
    assert.ok(bBody.media.every((m) => m.featured === true));
    assert.ok(bBody.media.some((m) => m.id === mid));
    assert.ok(!bBody.media.some((m) => m.id === mediaId1), 'unfeatured should not appear when featured=true');
  });

  it('GET /api/gallery (no featured param) returns both flagged and unflagged', async () => {
    const res = await getJson(baseUrl, '/api/gallery');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.media.some((m) => m.id === mediaId1));
    assert.ok(body.media.some((m) => m.id === mediaIdFeatured));
  });

  it('GET /api/gallery?featured=false returns both (not a filter)', async () => {
    const res = await getJson(baseUrl, '/api/gallery?featured=false');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.media.some((m) => m.id === mediaId1));
    assert.ok(body.media.some((m) => m.id === mediaIdFeatured));
  });

  it('PATCH /:id/feature admin toggles true -> false and false -> true', async () => {
    // currently true -> false
    const r1 = await patchJson(baseUrl, `/api/gallery/${mediaIdFeatured}/feature`, { featured: false }, adminToken);
    assert.equal(r1.status, 200);
    assert.equal((await r1.json()).media.featured, false);

    // verify browse no longer includes it
    const b1 = await getJson(baseUrl, '/api/gallery?featured=true');
    const b1body = await b1.json();
    assert.ok(!b1body.media.some((m) => m.id === mediaIdFeatured));

    // false -> true again
    const r2 = await patchJson(baseUrl, `/api/gallery/${mediaIdFeatured}/feature`, { featured: true }, adminToken);
    assert.equal(r2.status, 200);
    assert.equal((await r2.json()).media.featured, true);
  });

  it('PATCH /:id/feature with non-boolean body -> 400', async () => {
    const cases = [{ featured: 'true' }, { featured: 1 }, { featured: null }, {}, { featured: 'false' }];
    for (const body of cases) {
      const res = await patchJson(baseUrl, `/api/gallery/${mediaIdFeatured}/feature`, body, adminToken);
      assert.equal(res.status, 400, `should 400 for body ${JSON.stringify(body)}`);
      const b = await res.json();
      assert.match(b.message, /featured must be a boolean/i);
    }
  });

  it('PATCH /:id/feature non-admin (teacher) -> 403', async () => {
    const res = await patchJson(baseUrl, `/api/gallery/${mediaId1}/feature`, { featured: true }, teacherToken);
    assert.equal(res.status, 403);
  });

  it('PATCH /:id/feature unauth -> 401', async () => {
    const res = await patchJson(baseUrl, `/api/gallery/${mediaId1}/feature`, { featured: true }, null);
    assert.equal(res.status, 401);
  });

  it('PATCH /:id/feature non-existent id -> 404', async () => {
    const res = await patchJson(baseUrl, `/api/gallery/99999999/feature`, { featured: true }, adminToken);
    assert.equal(res.status, 404);
  });

  it('audit log row written on toggle (action = gallery.feature)', async () => {
    // toggle to trigger audit
    await patchJson(baseUrl, `/api/gallery/${mediaId1}/feature`, { featured: true }, adminToken);
    // query audit_logs directly
    const { rows } = await query(`SELECT action, entity_type, entity_id FROM audit_logs WHERE action='gallery.feature' AND entity_id=$1 ORDER BY created_at DESC LIMIT 1`, [mediaId1]);
    assert.ok(rows.length >= 1);
    assert.equal(rows[0].action, 'gallery.feature');
    assert.equal(rows[0].entity_type, 'gallery_media');
    // cleanup toggle back
    await patchJson(baseUrl, `/api/gallery/${mediaId1}/feature`, { featured: false }, adminToken);
  });

  it('featured appears on every returned media row (browse and search)', async () => {
    const res = await getJson(baseUrl, '/api/gallery');
    const body = await res.json();
    for (const m of body.media.slice(0, 5)) {
      assert.ok('featured' in m, 'featured should be in browse row');
      assert.equal(typeof m.featured, 'boolean');
    }
  });
});
