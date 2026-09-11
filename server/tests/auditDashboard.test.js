import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

import createApp from "../src/app.js";
import { query, closePool } from "../src/config/db.js";
import { hashPassword } from "../src/utils/password.js";

const domain = "my.nst.edu.ph";

const ADMIN_EMAIL = `audit_admin@${domain}`;
const TEACHER_EMAIL = `audit_teacher@${domain}`;
const PASSWORD = "AuditTest123!";

const postJson = async (baseUrl, path, body, token) =>
  fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

const getJson = async (baseUrl, path, token) =>
  fetch(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

const patchJson = async (baseUrl, path, body, token) =>
  fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : "",
  });

describe("audit logs + dashboard stats", () => {
  let server;
  let baseUrl;
  let adminId, teacherId;
  let adminToken, teacherToken;
  let createdAnnouncementId;

  before(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set — cannot run audit tests.");
    }

    const passwordHash = await hashPassword(PASSWORD);

    await query("DELETE FROM announcement_targets").catch(() => {});
    await query("DELETE FROM announcements WHERE title LIKE 'Audit Test%'").catch(() => {});
    await query("DELETE FROM gallery_media WHERE original_filename LIKE 'audit-test%'").catch(() => {});
    await query("DELETE FROM users WHERE email = ANY($1)", [
      [ADMIN_EMAIL, TEACHER_EMAIL],
    ]).catch(() => {});

    const adminRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, 'Audit Test Admin', 'admin', TRUE)
       RETURNING id`,
      [ADMIN_EMAIL, passwordHash]
    );
    adminId = adminRes.rows[0].id;

    const teacherRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, 'Audit Test Teacher', 'teacher', TRUE)
       RETURNING id`,
      [TEACHER_EMAIL, passwordHash]
    );
    teacherId = teacherRes.rows[0].id;

    server = createApp().listen(0);
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const login = async (email, pw) => {
      const r = await postJson(baseUrl, "/api/auth/login", { email, password: pw });
      return (await r.json()).token;
    };
    adminToken = await login(ADMIN_EMAIL, PASSWORD);
    teacherToken = await login(TEACHER_EMAIL, PASSWORD);
  });

  after(async () => {
    await query("DELETE FROM announcement_targets").catch(() => {});
    await query("DELETE FROM announcements WHERE title LIKE 'Audit Test%'").catch(() => {});
    await query("DELETE FROM gallery_media WHERE original_filename LIKE 'audit-test%'").catch(() => {});
    await query("DELETE FROM users WHERE email = ANY($1)", [[ADMIN_EMAIL, TEACHER_EMAIL]]).catch(() => {});
    await closePool().catch(() => {});
    if (server) await new Promise((r) => server.close(r));
  });

  it("Admin GET /api/dashboard/stats → 200 with role/type/status breakdowns", async () => {
    const res = await getJson(baseUrl, "/api/dashboard/stats", adminToken);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.users);
    assert.ok(Number.isInteger(data.users.total));
    assert.ok(Number.isInteger(data.users.admin));
    assert.ok(Number.isInteger(data.users.teacher));
    assert.ok(Number.isInteger(data.users.student));
    assert.ok(data.announcements);
    assert.ok(Number.isInteger(data.announcements.general));
    assert.ok(Number.isInteger(data.announcements.class));
    assert.ok(data.gallery);
    assert.ok(Number.isInteger(data.gallery.pending));
    assert.ok(Number.isInteger(data.gallery.approved));
    assert.ok(Number.isInteger(data.gallery.rejected));
  });

  it("Teacher GET /api/dashboard/stats → 403", async () => {
    const res = await getJson(baseUrl, "/api/dashboard/stats", teacherToken);
    assert.equal(res.status, 403);
  });

  it("Creating an announcement writes an audit_logs row", async () => {
    const res = await postJson(
      baseUrl,
      "/api/announcements/general",
      { title: "Audit Test Announcement", content: "Audit test content." },
      teacherToken
    );
    assert.equal(res.status, 201);
    const data = await res.json();
    createdAnnouncementId = data.announcement.id;
    assert.ok(createdAnnouncementId);

    const { rows } = await query(
      `SELECT id, user_id, action, entity_type, entity_id
         FROM audit_logs
        WHERE action = 'announcement.create'
          AND entity_type = 'announcement'
          AND entity_id = $1`,
      [createdAnnouncementId]
    );
    assert.equal(rows.length, 1);
    assert.equal(Number(rows[0].user_id), Number(teacherId));
  });

  it("Approving media writes an audit_logs row", async () => {
    const { rows: mediaRows } = await query(
      `INSERT INTO gallery_media (uploader_id, media_type, file_url, original_filename, caption, status)
       VALUES ($1, 'image', '/uploads/gallery/images/audit-test.jpg', 'audit-test.jpg', 'audit caption', 'pending')
       RETURNING id`,
      [teacherId]
    );
    const mediaId = mediaRows[0].id;

    const res = await patchJson(baseUrl, `/api/gallery/${mediaId}/approve`, null, adminToken);
    assert.equal(res.status, 200);

    const { rows } = await query(
      `SELECT id, user_id, action, entity_type, entity_id
         FROM audit_logs
        WHERE action = 'gallery.approve'
          AND entity_type = 'gallery_media'
          AND entity_id = $1`,
      [mediaId]
    );
    assert.equal(rows.length, 1);
    assert.equal(Number(rows[0].user_id), Number(adminId));
  });

  it("GET /api/audit-logs requires admin (teacher → 403, admin → 200)", async () => {
    const forbidden = await getJson(baseUrl, "/api/audit-logs", teacherToken);
    assert.equal(forbidden.status, 403);

    const res = await getJson(baseUrl, "/api/audit-logs?limit=5", adminToken);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.logs));
    assert.ok(Number.isInteger(data.total));
    assert.ok(data.logs.length > 0);
    const log = data.logs[0];
    assert.ok(log.action);
    assert.ok(log.entity_type);
    assert.ok(log.created_at);
  });

  it("Unauthenticated GET /api/audit-logs → 401", async () => {
    const res = await getJson(baseUrl, "/api/audit-logs", null);
    assert.equal(res.status, 401);
  });
});
