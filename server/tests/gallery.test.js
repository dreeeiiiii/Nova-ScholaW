import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

import createApp from "../src/app.js";
import config from "../src/shared/config/env.js";
import { query, closePool } from "../src/shared/config/db.js";
import { hashPassword } from "../src/shared/utils/password.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

// Same client config as server/src/shared/config/b2.js — lets the test
// prove objects really exist in (and disappear from) the B2 bucket.
const b2 = new S3Client({
  endpoint: `https://${config.b2Endpoint}`,
  region: config.b2Region,
  credentials: {
    accessKeyId: config.b2KeyId,
    secretAccessKey: config.b2ApplicationKey,
  },
  forcePathStyle: true,
});

const domain = "my.nst.edu.ph";

const ADMIN_EMAIL = `gal_admin@${domain}`;
const TEACHER_EMAIL = `gal_teacher@${domain}`;
const STUDENT_EMAIL = `gal_student@${domain}`;
const PASSWORD = "GalTest123!";

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

const deleteJson = async (baseUrl, path, token) =>
  fetch(`${baseUrl}${path}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

const buildMultipart = (fileContent, filename, contentType, extraFields = {}) => {
  const boundary = `----formdata-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const parts = [];

  for (const [key, value] of Object.entries(extraFields)) {
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}`
    );
  }

  parts.push(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n` +
    fileContent.toString('binary')
  );

  const body = Buffer.from(parts.join('\r\n') + '\r\n' + `--${boundary}--\r\n`);
  return { boundary, body };
};

const uploadFile = async (baseUrl, path, { boundary, body }, token) =>
  fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

describe("gallery endpoints", () => {
  let server;
  let baseUrl;
  let adminId, teacherId, studentId;
  let adminToken, teacherToken, studentToken;
  let categoryId;

  before(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set — cannot run gallery tests.");
    }

    const passwordHash = await hashPassword(PASSWORD);

    await query("DELETE FROM gallery_media").catch(() => {});
    await query("DELETE FROM audit_logs").catch(() => {});
    await query("DELETE FROM users WHERE email = ANY($1)", [
      [ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL],
    ]).catch(() => {});

    const adminRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, 'Gallery Test Admin', 'admin', TRUE)
       RETURNING id`,
      [ADMIN_EMAIL, passwordHash]
    );
    adminId = adminRes.rows[0].id;

    const teacherRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, 'Gallery Test Teacher', 'teacher', TRUE)
       RETURNING id`,
      [TEACHER_EMAIL, passwordHash]
    );
    teacherId = teacherRes.rows[0].id;

    const studentRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, section_id, course_id, is_active)
       VALUES ($1, $2, 'Gallery Test Student', 'student', 1, 1, TRUE)
       RETURNING id`,
      [STUDENT_EMAIL, passwordHash]
    );
    studentId = studentRes.rows[0].id;

    const catRes = await query(
      `INSERT INTO categories (name, description, created_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO NOTHING
       RETURNING id`,
      ["Test Gallery", "For gallery tests", adminId]
    );
    categoryId = catRes.rows[0]?.id;
    if (!categoryId) {
      const { rows } = await query("SELECT id FROM categories WHERE name = $1", ["Test Gallery"]);
      categoryId = rows[0].id;
    }

    server = createApp().listen(0);
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const login = async (email, pw) => {
      const r = await postJson(baseUrl, "/api/auth/login", { email, password: pw });
      return (await r.json()).token;
    };
    adminToken = await login(ADMIN_EMAIL, PASSWORD);
    teacherToken = await login(TEACHER_EMAIL, PASSWORD);
    studentToken = await login(STUDENT_EMAIL, PASSWORD);
  });

  after(async () => {
    await query("DELETE FROM gallery_media WHERE uploader_id = ANY($1)", [[adminId, teacherId, studentId]]).catch(() => {});
    await query("DELETE FROM users WHERE email = ANY($1)", [[ADMIN_EMAIL, TEACHER_EMAIL, STUDENT_EMAIL]]).catch(() => {});
    await closePool().catch(() => {});
    if (server) await new Promise((r) => server.close(r));
  });

  it("Student uploads valid JPEG → 201 with B2 presigned file_url + b2_key", async () => {
    const jpegBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00,
      0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    ]);
    const { boundary, body } = buildMultipart(jpegBuffer, "test.jpg", "image/jpeg", {
      category_id: String(categoryId),
      title: "Test Image",
    });
    const res = await uploadFile(baseUrl, "/api/gallery/upload", { boundary, body }, studentToken);
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.media);
    assert.equal(data.media.status, "approved");
    assert.equal(data.media.reviewed_by, studentId);
    assert.ok(data.media.reviewed_at);
    assert.equal(data.media.media_type, "image");
    assert.equal(typeof data.media.file_url, "string");
    assert.ok(data.media.file_url.length > 0);
    assert.ok(
      data.media.file_url.includes("s3.us-east-005.backblazeb2.com"),
      "file_url must be a B2 presigned URL",
    );
    assert.ok(
      data.media.file_url.includes("X-Amz-Signature"),
      "file_url must be signed",
    );
    assert.equal(typeof data.media.b2_key, "string");
    assert.ok(data.media.b2_key.startsWith("gallery/"));

    // The object actually exists in the bucket.
    const head = await b2.send(
      new GetObjectCommand({ Bucket: config.b2BucketName, Key: data.media.b2_key }),
    );
    assert.ok(head.ContentLength > 0);
    await head.Body.transformToByteArray();

    // The uploader deletes their own media; the object must vanish from B2.
    const delRes = await deleteJson(baseUrl, `/api/gallery/${data.media.id}`, studentToken);
    assert.equal(delRes.status, 200);

    await assert.rejects(
      b2.send(
        new GetObjectCommand({ Bucket: config.b2BucketName, Key: data.media.b2_key }),
      ),
      (err) => err.name === "NoSuchKey" || err.name === "NotFound",
    );
  });

  it("Student uploads image without category_id → 400", async () => {
    const jpegBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00,
      0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    ]);
    const { boundary, body } = buildMultipart(jpegBuffer, "test2.jpg", "image/jpeg", {
      title: "Test Image",
    });
    const res = await uploadFile(baseUrl, "/api/gallery/upload", { boundary, body }, studentToken);
    assert.equal(res.status, 400);
  });

  it("Student uploads invalid MIME type (.exe) → 400", async () => {
    const exeBuffer = Buffer.alloc(100, 0x90);
    const { boundary, body } = buildMultipart(exeBuffer, "test.exe", "application/x-msdownload", {
      category_id: String(categoryId),
      title: "Test Exe",
    });
    const res = await uploadFile(baseUrl, "/api/gallery/upload", { boundary, body }, studentToken);
    assert.equal(res.status, 400);
  });

  it("Student uploads oversized image → 400", async () => {
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
    const { boundary, body } = buildMultipart(largeBuffer, "large.jpg", "image/jpeg", {
      category_id: String(categoryId),
      title: "Large Image",
    });
    const res = await uploadFile(baseUrl, "/api/gallery/upload", { boundary, body }, studentToken);
    assert.equal(res.status, 400);
  });

  it("Student cannot call /pending → 403", async () => {
    const res = await getJson(baseUrl, "/api/gallery/pending", studentToken);
    assert.equal(res.status, 403);
  });

  it("Admin lists pending media → 200", async () => {
    const res = await getJson(baseUrl, "/api/gallery/pending", adminToken);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.media);
    assert.ok(Array.isArray(data.media));
  });

  it("Admin approves a pending upload → status='approved'", async () => {
    // Uploads default to approved, so insert a pending row directly
    const { rows } = await query(
      `INSERT INTO gallery_media (uploader_id, category_id, media_type, file_url, original_filename, caption, status)
       VALUES ($1, $2, 'image', '/uploads/gallery/images/approve_test.jpg', 'approve_test.jpg', 'Approve Test', 'pending')
       RETURNING id`,
      [studentId, categoryId]
    );
    const mediaId = rows[0].id;

    const res = await patchJson(baseUrl, `/api/gallery/${mediaId}/approve`, {}, adminToken);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.media.status, "approved");
    assert.equal(data.media.reviewed_by, adminId);
  });

  it("Admin rejects with reason → status='rejected' + rejection_reason set", async () => {
    // Uploads default to approved, so insert a pending row directly
    const { rows } = await query(
      `INSERT INTO gallery_media (uploader_id, category_id, media_type, file_url, original_filename, caption, status)
       VALUES ($1, $2, 'image', '/uploads/gallery/images/reject_test.jpg', 'reject_test.jpg', 'Reject Test', 'pending')
       RETURNING id`,
      [studentId, categoryId]
    );
    const mediaId = rows[0].id;

    const res = await patchJson(baseUrl, `/api/gallery/${mediaId}/reject`, { rejection_reason: "Inappropriate content" }, adminToken);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.media.status, "rejected");
    assert.equal(data.media.rejection_reason, "Inappropriate content");
  });

  it("Student sees own uploads via /mine", async () => {
    const res = await getJson(baseUrl, "/api/gallery/mine", studentToken);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.media);
    assert.ok(Array.isArray(data.media));
    data.media.forEach((m) => {
      assert.equal(m.uploader_id, studentId);
    });
  });

  it("Unauthenticated access to /api/gallery/upload → 401", async () => {
    const jpegBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00,
      0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    ]);
    const { boundary, body } = buildMultipart(jpegBuffer, "unauth.jpg", "image/jpeg", {
      category_id: String(categoryId),
      title: "No Auth",
    });
    const res = await uploadFile(baseUrl, "/api/gallery/upload", { boundary, body }, null);
    assert.equal(res.status, 401);
  });
});