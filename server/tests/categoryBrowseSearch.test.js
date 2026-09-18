import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

import createApp from "../src/app.js";
import { query, closePool } from "../src/shared/config/db.js";
import { hashPassword } from "../src/shared/utils/password.js";

const domain = "my.nst.edu.ph";

const ADMIN_EMAIL = `cat_admin@${domain}`;
const TEACHER_EMAIL = `cat_teacher@${domain}`;
const STUDENT_EMAIL = `cat_student@${domain}`;
const PASSWORD = "CatTest123!";

const postJson = async (baseUrl, path, body, token) =>
  fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

const putJson = async (baseUrl, path, body, token) =>
  fetch(`${baseUrl}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

const deleteJson = async (baseUrl, path, token) =>
  fetch(`${baseUrl}${path}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

const getJson = async (baseUrl, path, token) =>
  fetch(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

const login = async (baseUrl, email, pw) => {
  const r = await postJson(baseUrl, "/api/auth/login", { email, password: pw });
  return (await r.json()).token;
};

describe("category CRUD endpoints", () => {
  let server;
  let baseUrl;
  let adminId, teacherId, studentId;
  let adminToken, teacherToken, studentToken;

  before(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set — cannot run category tests.");
    }

    const passwordHash = await hashPassword(PASSWORD);

    await query("DELETE FROM gallery_media WHERE uploader_id IN (SELECT id FROM users WHERE email = ANY($1))", [[ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL]]).catch(() => {});
    await query("DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))", [[ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL]]).catch(() => {});
    await query("DELETE FROM categories WHERE name IN ('Test Category','New Category','Update Test Cat','Updated Cat Name','Teacher Update Test','Delete Test Cat','Protected Category','Browse Category','Search Category','Workflow Category','Teacher Category')").catch(() => {});
    await query("DELETE FROM users WHERE email = ANY($1)", [
      [ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL],
    ]).catch(() => {});

    const adminRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, 'Category Test Admin', 'admin', TRUE)
       RETURNING id`,
      [ADMIN_EMAIL, passwordHash]
    );
    adminId = adminRes.rows[0].id;

    const teacherRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, 'Category Test Teacher', 'teacher', TRUE)
       RETURNING id`,
      [TEACHER_EMAIL, passwordHash]
    );
    teacherId = teacherRes.rows[0].id;

    const studentRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, 'Category Test Student', 'student', TRUE)
       RETURNING id`,
      [STUDENT_EMAIL, passwordHash]
    );
    studentId = studentRes.rows[0].id;

    await query(
      `INSERT INTO categories (name, description, created_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO NOTHING`,
      ["Test Category", "For category tests", adminId]
    );

    server = createApp().listen(0);
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    adminToken = await login(baseUrl, ADMIN_EMAIL, PASSWORD);
    teacherToken = await login(baseUrl, TEACHER_EMAIL, PASSWORD);
    studentToken = await login(baseUrl, STUDENT_EMAIL, PASSWORD);
  });

  after(async () => {
    await query("DELETE FROM gallery_media WHERE uploader_id IN (SELECT id FROM users WHERE email = ANY($1))", [[ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL]]).catch(() => {});
    await query("DELETE FROM categories WHERE created_by = ANY($1)", [[adminId, teacherId, studentId]]).catch(() => {});
    await query("DELETE FROM users WHERE email = ANY($1)", [[ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL]]).catch(() => {});
    if (server) await new Promise((r) => server.close(r));
    // NOTE: do NOT closePool() here — other suites in this file share the pool.
  });

  it("GET /api/categories — public, no token required", async () => {
    const res = await getJson(baseUrl, "/api/categories", null);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.categories));
  });

  it("GET /api/categories — any authenticated user can list", async () => {
    const res = await getJson(baseUrl, "/api/categories", studentToken);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.categories);
    assert.ok(Array.isArray(data.categories));
  });

  it("POST /api/categories — admin creates category → 201", async () => {
    const res = await postJson(baseUrl, "/api/categories", { name: "New Category", description: "Desc" }, adminToken);
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.category);
    assert.equal(data.category.name, "New Category");
  });

  it("POST /api/categories — duplicate name → 409", async () => {
    const res = await postJson(baseUrl, "/api/categories", { name: "Test Category", description: "Dup" }, adminToken);
    assert.equal(res.status, 409);
    const data = await res.json();
    assert.equal(data.status, 409);
  });

  it("POST /api/categories — missing name → 400", async () => {
    const res = await postJson(baseUrl, "/api/categories", { description: "no name" }, adminToken);
    assert.equal(res.status, 400);
  });

  it("POST /api/categories — teacher tries to create → 403", async () => {
    const res = await postJson(baseUrl, "/api/categories", { name: "Teacher Category" }, teacherToken);
    assert.equal(res.status, 403);
  });

  it("PUT /api/categories/:id — admin updates category", async () => {
    const res = await postJson(baseUrl, "/api/categories", { name: "Update Test Cat", description: "Original" }, adminToken);
    assert.equal(res.status, 201);
    const catId = (await res.json()).category.id;

    const upd = await putJson(baseUrl, `/api/categories/${catId}`, { name: "Updated Cat Name" }, adminToken);
    assert.equal(upd.status, 200);
    const data = await upd.json();
    assert.equal(data.category.name, "Updated Cat Name");
  });

  it("PUT /api/categories/:id — teacher tries to update → 403", async () => {
    const res = await postJson(baseUrl, "/api/categories", { name: "Teacher Update Test" }, adminToken);
    const catId = (await res.json()).category.id;

    const upd = await putJson(baseUrl, `/api/categories/${catId}`, { name: "Hacked" }, teacherToken);
    assert.equal(upd.status, 403);
  });

  it("PUT /api/categories/:id — non-existent → 404", async () => {
    const upd = await putJson(baseUrl, "/api/categories/999999", { name: "Ghost" }, adminToken);
    assert.equal(upd.status, 404);
  });

  it("DELETE /api/categories/:id — admin deletes category", async () => {
    const res = await postJson(baseUrl, "/api/categories", { name: "Delete Test Cat" }, adminToken);
    const catId = (await res.json()).category.id;

    const delRes = await deleteJson(baseUrl, `/api/categories/${catId}`, adminToken);
    assert.equal(delRes.status, 200);
  });

  it("DELETE /api/categories/:id — media intact via SET NULL per Task 37", async () => {
    const res = await postJson(baseUrl, "/api/categories", { name: "Protected Category" }, adminToken);
    const catId = (await res.json()).category.id;

    const { rows } = await query(
      `INSERT INTO gallery_media (uploader_id, category_id, media_type, file_url, original_filename, caption, status)
       VALUES ($1, $2, 'image', '/uploads/gallery/images/keep.jpg', 'keep.jpg', 'Keep me', 'approved')
       RETURNING id`,
      [adminId, catId]
    );
    const mediaId = rows[0].id;

    const delRes = await deleteJson(baseUrl, `/api/categories/${catId}`, adminToken);
    assert.equal(delRes.status, 200);

    const { rows: mediaRows } = await query("SELECT id, category_id FROM gallery_media WHERE id = $1", [mediaId]);
    assert.equal(mediaRows.length, 1);
    assert.equal(mediaRows[0].category_id, null);

    await query("DELETE FROM gallery_media WHERE id = $1", [mediaId]).catch(() => {});
  });
});

describe("gallery browse endpoint (public)", () => {
  let server;
  let baseUrl;
  let adminId;
  let categoryId;
  let approvedMediaId;

  before(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set — cannot run browse tests.");
    }

    const passwordHash = await hashPassword(PASSWORD);

    await query("DELETE FROM gallery_media WHERE uploader_id IN (SELECT id FROM users WHERE email = ANY($1))", [[ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL]]).catch(() => {});
    await query("DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))", [[ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL]]).catch(() => {});
    await query("DELETE FROM categories WHERE name IN ('Test Category','New Category','Update Test Cat','Updated Cat Name','Teacher Update Test','Delete Test Cat','Protected Category','Browse Category','Search Category','Workflow Category','Teacher Category')").catch(() => {});
    await query("DELETE FROM users WHERE email = ANY($1)", [
      [ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL],
    ]).catch(() => {});

    const adminRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, 'Browse Test Admin', 'admin', TRUE)
       RETURNING id`,
      [ADMIN_EMAIL, passwordHash]
    );
    adminId = adminRes.rows[0].id;

    const catRes = await query(
      `INSERT INTO categories (name, description, created_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO NOTHING
       RETURNING id`,
      ["Browse Category", "For browse tests", adminId]
    );
    categoryId = catRes.rows[0]?.id;
    if (!categoryId) {
      const { rows } = await query("SELECT id FROM categories WHERE name = $1", ["Browse Category"]);
      categoryId = rows[0].id;
    }

    const { rows: mediaRows } = await query(
      `INSERT INTO gallery_media (uploader_id, category_id, media_type, file_url, original_filename, caption, status, reviewed_by, reviewed_at, created_at)
       VALUES ($1, $2, 'image', '/uploads/gallery/images/test1.jpg', 'test1.jpg', 'Test Image 1', 'approved', $3, NOW(), NOW())
       RETURNING id`,
      [adminId, categoryId, adminId]
    );
    approvedMediaId = mediaRows[0].id;

    await query(
      `INSERT INTO gallery_media (uploader_id, category_id, media_type, file_url, original_filename, caption, status, reviewed_by, reviewed_at, created_at)
       VALUES ($1, $2, 'video', '/uploads/gallery/videos/test2.mp4', 'test2.mp4', 'Test Video', 'approved', $3, NOW(), NOW())`,
      [adminId, categoryId, adminId]
    );

    await query(
      `INSERT INTO gallery_media (uploader_id, category_id, media_type, file_url, original_filename, caption, status, created_at)
       VALUES ($1, $2, 'image', '/uploads/gallery/images/pending1.jpg', 'pending1.jpg', 'Pending Image', 'pending', NOW())`,
      [adminId, categoryId]
    );

    server = createApp().listen(0);
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await query("DELETE FROM gallery_media WHERE uploader_id IN (SELECT id FROM users WHERE email = ANY($1))", [[ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL]]).catch(() => {});
    await query("DELETE FROM categories WHERE created_by = $1", [adminId]).catch(() => {});
    await query("DELETE FROM users WHERE email = ANY($1)", [[ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL]]).catch(() => {});
    if (server) await new Promise((r) => server.close(r));
  });

  it("GET /api/gallery — public, returns only approved media", async () => {
    const res = await getJson(baseUrl, "/api/gallery", null);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.media);
    assert.ok(Array.isArray(data.media));
    data.media.forEach((m) => assert.equal(m.status, "approved"));
    assert.equal(data.total, data.media.length);
  });

  it("GET /api/gallery?category_id=N — filters by category", async () => {
    const res = await getJson(baseUrl, `/api/gallery?category_id=${categoryId}`, null);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.media);
    data.media.forEach((m) => assert.equal(m.category_id, categoryId));
  });

  it("GET /api/gallery?media_type=video — filters by type", async () => {
    const res = await getJson(baseUrl, "/api/gallery?media_type=video", null);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.media);
    data.media.forEach((m) => assert.equal(m.media_type, "video"));
  });

  it("GET /api/gallery/:id — returns approved media only", async () => {
    const res = await getJson(baseUrl, `/api/gallery/${approvedMediaId}`, null);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.media);
    assert.equal(data.media.id, approvedMediaId);
  });

  it("GET /api/gallery/:id for pending media → 404", async () => {
    const { rows } = await query(
      `INSERT INTO gallery_media (uploader_id, category_id, media_type, file_url, original_filename, caption, status)
       VALUES ($1, $2, 'image', '/uploads/gallery/images/secret.jpg', 'secret.jpg', 'Secret', 'pending')
       RETURNING id`,
      [adminId, categoryId]
    );
    const pendingId = rows[0].id;

    const res = await getJson(baseUrl, `/api/gallery/${pendingId}`, null);
    assert.equal(res.status, 404);
  });

  it("GET /api/gallery?limit=1 — pagination works", async () => {
    const res = await getJson(baseUrl, "/api/gallery?limit=1", null);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.media.length <= 1);
  });
});

describe("gallery search endpoint (public)", () => {
  let server;
  let baseUrl;
  let adminId;
  let categoryId;

  before(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set — cannot run search tests.");
    }

    const passwordHash = await hashPassword(PASSWORD);

    await query("DELETE FROM gallery_media WHERE uploader_id IN (SELECT id FROM users WHERE email = ANY($1))", [[ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL]]).catch(() => {});
    await query("DELETE FROM categories WHERE name IN ('Test Category','New Category','Update Test Cat','Updated Cat Name','Teacher Update Test','Delete Test Cat','Protected Category','Browse Category','Search Category','Workflow Category','Teacher Category')").catch(() => {});
    await query("DELETE FROM users WHERE email = ANY($1)", [
      [ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL],
    ]).catch(() => {});

    const adminRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, 'Search Test Admin', 'admin', TRUE)
       RETURNING id`,
      [ADMIN_EMAIL, passwordHash]
    );
    adminId = adminRes.rows[0].id;

    const catRes = await query(
      `INSERT INTO categories (name, description, created_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO NOTHING
       RETURNING id`,
      ["Search Category", "For search tests", adminId]
    );
    categoryId = catRes.rows[0]?.id;
    if (!categoryId) {
      const { rows } = await query("SELECT id FROM categories WHERE name = $1", ["Search Category"]);
      categoryId = rows[0].id;
    }

    const now = new Date().toISOString();
    await query(
      `INSERT INTO gallery_media (uploader_id, category_id, media_type, file_url, original_filename, caption, status, reviewed_by, reviewed_at, created_at)
       VALUES ($1, $2, 'image', '/uploads/gallery/images/sunset.jpg', 'sunset.jpg', 'Beautiful Sunset at the Beach', 'approved', $3, NOW(), $4)`,
      [adminId, categoryId, adminId, now]
    );
    await query(
      `INSERT INTO gallery_media (uploader_id, category_id, media_type, file_url, original_filename, caption, status, reviewed_by, reviewed_at, created_at)
       VALUES ($1, $2, 'video', '/uploads/gallery/videos/school.mp4', 'school.mp4', 'School Event Highlights', 'approved', $3, NOW(), $4)`,
      [adminId, categoryId, adminId, now]
    );

    server = createApp().listen(0);
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await query("DELETE FROM gallery_media WHERE uploader_id IN (SELECT id FROM users WHERE email = ANY($1))", [[ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL]]).catch(() => {});
    await query("DELETE FROM categories WHERE created_by = $1", [adminId]).catch(() => {});
    await query("DELETE FROM users WHERE email = ANY($1)", [[ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL]]).catch(() => {});
    if (server) await new Promise((r) => server.close(r));
  });

  it("GET /api/gallery/search?q=sunset — matches filename", async () => {
    const res = await getJson(baseUrl, "/api/gallery/search?q=sunset", null);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.media.length >= 1);
    assert.ok(data.media.some((m) => m.original_filename?.includes("sunset")));
  });

  it("GET /api/gallery/search?q=School — matches caption", async () => {
    const res = await getJson(baseUrl, "/api/gallery/search?q=School", null);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.media.length >= 1);
  });

  it("GET /api/gallery/search?q=Search — matches category name", async () => {
    const res = await getJson(baseUrl, "/api/gallery/search?q=Search", null);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.media.length >= 1);
    data.media.forEach((m) => assert.ok(m.category_name?.includes("Search")));
  });

  it("GET /api/gallery/search — only approved media returned", async () => {
    const res = await getJson(baseUrl, "/api/gallery/search?q=event", null);
    assert.equal(res.status, 200);
    const data = await res.json();
    data.media.forEach((m) => assert.equal(m.status, "approved"));
  });

  it("GET /api/gallery/search — case insensitive", async () => {
    const res = await getJson(baseUrl, "/api/gallery/search?q=SUNSET", null);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.media.length >= 1);
  });

  it("GET /api/gallery/search — unauthenticated user can search", async () => {
    const res = await getJson(baseUrl, "/api/gallery/search?q=Beach", null);
    assert.equal(res.status, 200);
  });

  it("GET /api/gallery/search without q → 400", async () => {
    const res = await getJson(baseUrl, "/api/gallery/search", null);
    assert.equal(res.status, 400);
  });
});

describe("gallery approval workflow polish", () => {
  let server;
  let baseUrl;
  let adminId;
  let adminToken;
  let categoryId;
  let pendingMediaId;

  before(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set — cannot run workflow tests.");
    }

    const passwordHash = await hashPassword(PASSWORD);

    await query("DELETE FROM gallery_media WHERE uploader_id IN (SELECT id FROM users WHERE email = ANY($1))", [[ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL]]).catch(() => {});
    await query("DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))", [[ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL]]).catch(() => {});
    await query("DELETE FROM categories WHERE name IN ('Test Category','New Category','Update Test Cat','Updated Cat Name','Teacher Update Test','Delete Test Cat','Protected Category','Browse Category','Search Category','Workflow Category','Teacher Category')").catch(() => {});
    await query("DELETE FROM users WHERE email = ANY($1)", [
      [ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL],
    ]).catch(() => {});

    const adminRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, 'Workflow Test Admin', 'admin', TRUE)
       RETURNING id`,
      [ADMIN_EMAIL, passwordHash]
    );
    adminId = adminRes.rows[0].id;

    const catRes = await query(
      `INSERT INTO categories (name, description, created_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO NOTHING
       RETURNING id`,
      ["Workflow Category", "For workflow tests", adminId]
    );
    categoryId = catRes.rows[0]?.id;
    if (!categoryId) {
      const { rows } = await query("SELECT id FROM categories WHERE name = $1", ["Workflow Category"]);
      categoryId = rows[0].id;
    }

    const { rows } = await query(
      `INSERT INTO gallery_media (uploader_id, category_id, media_type, file_url, original_filename, caption, status)
       VALUES ($1, $2, 'image', '/uploads/gallery/images/pending.jpg', 'pending.jpg', 'Pending', 'pending')
       RETURNING id`,
      [adminId, categoryId]
    );
    pendingMediaId = rows[0].id;

    server = createApp().listen(0);
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    adminToken = await login(baseUrl, ADMIN_EMAIL, PASSWORD);
  });

  after(async () => {
    await query("DELETE FROM gallery_media WHERE uploader_id IN (SELECT id FROM users WHERE email = ANY($1))", [[ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL]]).catch(() => {});
    await query("DELETE FROM categories WHERE created_by = $1", [adminId]).catch(() => {});
    await query("DELETE FROM users WHERE email = ANY($1)", [[ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL]]).catch(() => {});
    await closePool().catch(() => {});
    if (server) await new Promise((r) => server.close(r));
  });

  it("GET /api/gallery/pending returns uploader full_name and email", async () => {
    const res = await getJson(baseUrl, "/api/gallery/pending", adminToken);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.media.length >= 1);
    const item = data.media.find((m) => m.id === pendingMediaId);
    assert.ok(item);
    assert.ok(item.uploader_name);
    assert.ok(item.uploader_email);
    assert.ok(item.category_name);
  });

  it("PATCH /:id/approve on already-approved → 400", async () => {
    await query(
      `UPDATE gallery_media SET status = 'approved', reviewed_at = NOW(), reviewed_by = $1 WHERE id = $2`,
      [adminId, pendingMediaId]
    );
    const res = await fetch(`${baseUrl}/api/gallery/${pendingMediaId}/approve`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 400);

    await query(`UPDATE gallery_media SET status = 'pending', reviewed_by = NULL, reviewed_at = NULL WHERE id = $1`, [pendingMediaId]);
  });

  it("PATCH /:id/reject on already-rejected → 400", async () => {
    await query(
      `UPDATE gallery_media SET status = 'rejected', reviewed_by = $1, rejection_reason = 'Previously rejected' WHERE id = $2`,
      [adminId, pendingMediaId]
    );
    const res = await fetch(`${baseUrl}/api/gallery/${pendingMediaId}/reject`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ rejection_reason: "Again rejected" }),
    });
    assert.equal(res.status, 400);
  });

  it("PATCH /:id/reject without reason → 400", async () => {
    await query(`UPDATE gallery_media SET status = 'pending', reviewed_by = NULL, reviewed_at = NULL, rejection_reason = NULL WHERE id = $1`, [pendingMediaId]);
    const res = await fetch(`${baseUrl}/api/gallery/${pendingMediaId}/reject`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });
});
