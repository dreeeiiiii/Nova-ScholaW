import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { Readable } from "node:stream";

import config from "../src/shared/config/env.js";
import createApp from "../src/app.js";
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

const domain = config.nstEmailDomain || "my.nst.edu.ph";

const ADMIN_EMAIL = `anntest_admin@${domain}`;
const TEACHER_EMAIL = `anntest_teacher@${domain}`;
const TEACHER2_EMAIL = `anntest_teacher2@${domain}`;
const STUDENT_EMAIL = `anntest_student@${domain}`;
const STUDENT2_EMAIL = `anntest_student2@${domain}`;
const PASSWORD = "AnnTest123!";

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

describe("announcement endpoints", () => {
  let server;
  let baseUrl;
  let adminId, teacherId, teacher2Id, studentId, student2Id;
  let adminToken, teacherToken, teacher2Token, studentToken, student2Token;
  let sectionId, courseId, otherSectionId;
  let generalAnnouncementId, classAnnouncementId;

  before(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is not set — cannot run announcement tests.",
      );
    }

    const passwordHash = await hashPassword(PASSWORD);

    await query("DELETE FROM announcement_targets").catch(() => {});
    await query("DELETE FROM announcements").catch(() => {});
    await query("DELETE FROM users WHERE email = ANY($1)", [
      [
        ADMIN_EMAIL,
        TEACHER_EMAIL,
        TEACHER2_EMAIL,
        STUDENT_EMAIL,
        STUDENT2_EMAIL,
      ],
    ]).catch(() => {});
    await query("DELETE FROM sections WHERE name IN ($1, $2)", [
      "Grade 10 - Test",
      "Grade 11 - Other",
    ]).catch(() => {});
    await query("DELETE FROM courses WHERE code = $1", ["TEST101"]).catch(
      () => {},
    );

    const adminRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, 'Ann Test Admin', 'admin', TRUE)
       RETURNING id`,
      [ADMIN_EMAIL, passwordHash],
    );
    adminId = adminRes.rows[0].id;

    const teacherRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, 'Ann Test Teacher', 'teacher', TRUE)
       RETURNING id`,
      [TEACHER_EMAIL, passwordHash],
    );
    teacherId = teacherRes.rows[0].id;

    const teacher2Res = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, 'Ann Test Teacher 2', 'teacher', TRUE)
       RETURNING id`,
      [TEACHER2_EMAIL, passwordHash],
    );
    teacher2Id = teacher2Res.rows[0].id;

    const sectionRes = await query(
      `INSERT INTO sections (name, grade_level)
       VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ["Grade 10 - Test", "Grade 10"],
    );
    sectionId = sectionRes.rows[0].id;

    const otherSectionRes = await query(
      `INSERT INTO sections (name, grade_level)
       VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ["Grade 11 - Other", "Grade 11"],
    );
    otherSectionId = otherSectionRes.rows[0].id;

    const courseRes = await query(
      `INSERT INTO courses (name, code)
       VALUES ($1, $2)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ["Test Course", "TEST101"],
    );
    courseId = courseRes.rows[0].id;

    const studentRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, section_id, course_id, is_active)
       VALUES ($1, $2, 'Ann Test Student', 'student', $3, $4, TRUE)
       RETURNING id`,
      [STUDENT_EMAIL, passwordHash, sectionId, courseId],
    );
    studentId = studentRes.rows[0].id;

    const student2Res = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, 'Ann Test Student 2', 'student', TRUE)
       RETURNING id`,
      [STUDENT2_EMAIL, passwordHash],
    );
    student2Id = student2Res.rows[0].id;

    server = createApp().listen(0);
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const loginRes = await postJson(baseUrl, "/api/auth/login", {
      email: ADMIN_EMAIL,
      password: PASSWORD,
    });
    adminToken = (await loginRes.json()).token;

    const loginRes2 = await postJson(baseUrl, "/api/auth/login", {
      email: TEACHER_EMAIL,
      password: PASSWORD,
    });
    teacherToken = (await loginRes2.json()).token;

    const loginRes3 = await postJson(baseUrl, "/api/auth/login", {
      email: TEACHER2_EMAIL,
      password: PASSWORD,
    });
    teacher2Token = (await loginRes3.json()).token;

    const loginRes4 = await postJson(baseUrl, "/api/auth/login", {
      email: STUDENT_EMAIL,
      password: PASSWORD,
    });
    studentToken = (await loginRes4.json()).token;

    const loginRes5 = await postJson(baseUrl, "/api/auth/login", {
      email: STUDENT2_EMAIL,
      password: PASSWORD,
    });
    student2Token = (await loginRes5.json()).token;
  });

  after(async () => {
    await query(
      "DELETE FROM announcement_targets WHERE announcement_id IN (SELECT id FROM announcements WHERE author_id = ANY($1))",
      [[adminId, teacherId, teacher2Id]],
    ).catch(() => {});
    await query("DELETE FROM announcements WHERE author_id = ANY($1)", [
      [adminId, teacherId, teacher2Id],
    ]).catch(() => {});
    await query("DELETE FROM users WHERE email = ANY($1)", [
      [
        ADMIN_EMAIL,
        TEACHER_EMAIL,
        TEACHER2_EMAIL,
        STUDENT_EMAIL,
        STUDENT2_EMAIL,
      ],
    ]).catch(() => {});
    await query("DELETE FROM sections WHERE name IN ($1, $2)", [
      "Grade 10 - Test",
      "Grade 11 - Other",
    ]).catch(() => {});
    await query("DELETE FROM courses WHERE code = $1", ["TEST101"]).catch(
      () => {},
    );
    await closePool().catch(() => {});
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("admin creates general announcement → 201", async () => {
    const res = await postJson(
      baseUrl,
      "/api/announcements/general",
      {
        title: "Admin General Announcement",
        content: "This is a general announcement from admin.",
      },
      adminToken,
    );
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.announcement);
    assert.equal(body.announcement.type, "general");
    assert.equal(body.announcement.author_id, adminId);
    assert.equal(body.announcement.status, "published");
    generalAnnouncementId = body.announcement.id;
  });

  it("teacher creates general announcement → 201", async () => {
    const res = await postJson(
      baseUrl,
      "/api/announcements/general",
      {
        title: "Teacher General Announcement",
        content: "This is a general announcement from teacher.",
      },
      teacherToken,
    );
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.announcement);
    assert.equal(body.announcement.type, "general");
    assert.equal(body.announcement.author_id, teacherId);
    assert.equal(body.announcement.status, "published");
  });

  it("teacher creates class announcement with section_ids + course_ids + student_ids → 201 with correct targets", async () => {
    const res = await postJson(
      baseUrl,
      "/api/announcements/class",
      {
        title: "Class Announcement",
        content: "This is a class announcement.",
        section_ids: [sectionId],
        course_ids: [courseId],
        student_ids: [student2Id],
      },
      teacherToken,
    );
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.announcement);
    assert.ok(body.targets);
    assert.equal(body.announcement.type, "class");
    assert.equal(body.announcement.author_id, teacherId);
    assert.equal(body.targets.length, 3);
    const targetTypes = body.targets.map((t) => t.target_type).sort();
    assert.deepEqual(targetTypes, ["course", "section", "student"]);
    classAnnouncementId = body.announcement.id;
  });

  it("class announcement with no targets → 400", async () => {
    const res = await postJson(
      baseUrl,
      "/api/announcements/class",
      {
        title: "No Targets",
        content: "This should fail.",
        section_ids: [],
        course_ids: [],
        student_ids: [],
      },
      teacherToken,
    );
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.status, 400);
    assert.match(body.message, /at least one target/);
  });

  it("student sees general + targeted class announcements, but NOT other class announcements", async () => {
    const otherClassRes = await postJson(
      baseUrl,
      "/api/announcements/class",
      {
        title: "Other Class Announcement",
        content: "Student should not see this.",
        section_ids: [otherSectionId],
        course_ids: [],
        student_ids: [],
      },
      teacherToken,
    );
    assert.equal(otherClassRes.status, 201);
    const otherClass = (await otherClassRes.json()).announcement;

    const res = await getJson(baseUrl, "/api/announcements", studentToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.announcements);
    assert.ok(Array.isArray(body.announcements));

    const titles = body.announcements.map((a) => a.title);
    assert.ok(
      titles.includes("Admin General Announcement"),
      "Should see general announcement from admin",
    );
    assert.ok(
      titles.includes("Teacher General Announcement"),
      "Should see general announcement from teacher",
    );
    assert.ok(
      titles.includes("Class Announcement"),
      "Should see targeted class announcement",
    );
    assert.ok(
      !titles.includes("Other Class Announcement"),
      "Should NOT see non-targeted class announcement",
    );
  });

  it("teacher sees all announcements", async () => {
    const res = await getJson(baseUrl, "/api/announcements", teacherToken);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.announcements);
    const titles = body.announcements.map((a) => a.title);
    assert.ok(titles.includes("Admin General Announcement"));
    assert.ok(titles.includes("Teacher General Announcement"));
    assert.ok(titles.includes("Class Announcement"));
    assert.ok(titles.includes("Other Class Announcement"));
  });

  it("non-author teacher cannot edit another teacher's announcement → 403", async () => {
    const res = await putJson(
      baseUrl,
      `/api/announcements/${classAnnouncementId}`,
      {
        title: "Hacked Title",
      },
      teacher2Token,
    );
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.status, 403);
    assert.match(body.message, /permission/);
  });

  it("author teacher can edit their own announcement → 200", async () => {
    const res = await putJson(
      baseUrl,
      `/api/announcements/${classAnnouncementId}`,
      {
        title: "Updated Class Announcement",
      },
      teacherToken,
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.announcement.title, "Updated Class Announcement");
  });

  it("admin can edit any announcement → 200", async () => {
    const res = await putJson(
      baseUrl,
      `/api/announcements/${classAnnouncementId}`,
      {
        title: "Admin Updated Title",
      },
      adminToken,
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.announcement.title, "Admin Updated Title");
  });

  it("updating class announcement targets replaces them in a transaction", async () => {
    const uniqueName = `Grade 11 - New ${Date.now()}`;
    const newSectionRes = await query(
      `INSERT INTO sections (name, grade_level)
       VALUES ($1, $2)
       RETURNING id`,
      [uniqueName, "Grade 11"],
    );
    const newSectionId = newSectionRes.rows[0].id;

    const res = await putJson(
      baseUrl,
      `/api/announcements/${classAnnouncementId}`,
      {
        section_ids: [newSectionId],
        course_ids: [],
        student_ids: [],
      },
      teacherToken,
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.targets);
    assert.equal(body.targets.length, 1);
    assert.equal(body.targets[0].target_type, "section");
    assert.equal(body.targets[0].section_id, newSectionId);

    await query("DELETE FROM sections WHERE id = $1", [newSectionId]).catch(
      () => {},
    );
    await query("DELETE FROM sections WHERE name LIKE $1", [
      "Grade 11 - New%",
    ]).catch(() => {});
  });

  it("non-author teacher cannot delete another teacher's announcement → 403", async () => {
    const res = await deleteJson(
      baseUrl,
      `/api/announcements/${classAnnouncementId}`,
      teacher2Token,
    );
    assert.equal(res.status, 403);
  });

  it("author teacher can delete their own announcement → 200", async () => {
    const res = await deleteJson(
      baseUrl,
      `/api/announcements/${classAnnouncementId}`,
      teacherToken,
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.message, "Announcement deleted.");
  });

  it("GET /api/announcements/:id returns 404 for non-existent", async () => {
    const res = await getJson(
      baseUrl,
      "/api/announcements/999999",
      studentToken,
    );
    assert.equal(res.status, 404);
  });

  it("student can view general announcement by id", async () => {
    const res = await getJson(
      baseUrl,
      `/api/announcements/${generalAnnouncementId}`,
      studentToken,
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.announcement.id, generalAnnouncementId);
  });

  it("student can view targeted class announcement by id", async () => {
    const createRes = await postJson(
      baseUrl,
      "/api/announcements/class",
      {
        title: "Targeted Class For Student",
        content: "Student should see this.",
        student_ids: [studentId],
      },
      teacherToken,
    );
    assert.equal(createRes.status, 201);
    const { announcement } = await createRes.json();

    const res = await getJson(
      baseUrl,
      `/api/announcements/${announcement.id}`,
      studentToken,
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.announcement.id, announcement.id);
  });

  it("student cannot view non-targeted class announcement by id → 403", async () => {
    const createRes = await postJson(
      baseUrl,
      "/api/announcements/class",
      {
        title: "Non-Targeted Class",
        content: "Student should not see this.",
        section_ids: [otherSectionId],
      },
      teacherToken,
    );
    assert.equal(createRes.status, 201);
    const { announcement } = await createRes.json();

    const res = await getJson(
      baseUrl,
      `/api/announcements/${announcement.id}`,
      studentToken,
    );
    assert.equal(res.status, 403);
  });

  it("unauthenticated access to /api/announcements → 401", async () => {
    const res = await getJson(baseUrl, "/api/announcements", null);
    assert.equal(res.status, 401);
  });

  it("unauthenticated access to /api/announcements/general POST → 401", async () => {
    const res = await postJson(
      baseUrl,
      "/api/announcements/general",
      {
        title: "No Auth",
        content: "Should fail.",
      },
      null,
    );
    assert.equal(res.status, 401);
  });

  it("student cannot create announcement → 403", async () => {
    const res = await postJson(
      baseUrl,
      "/api/announcements/general",
      {
        title: "Student Attempt",
        content: "Should fail.",
      },
      studentToken,
    );
    assert.equal(res.status, 403);
  });

  it("query params: type filter works", async () => {
    const res = await getJson(
      baseUrl,
      "/api/announcements?type=general",
      teacherToken,
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.announcements.every((a) => a.type === "general"));
  });

  it("query params: status filter works", async () => {
    const res = await getJson(
      baseUrl,
      "/api/announcements?status=published",
      teacherToken,
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.announcements.every((a) => a.status === "published"));
  });

  it("query params: limit and offset work", async () => {
    const res = await getJson(
      baseUrl,
      "/api/announcements?limit=1&offset=0",
      teacherToken,
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.announcements.length <= 1);
  });

  it("GET /api/announcements/tv is public (no auth required)", async () => {
    const res = await getJson(baseUrl, "/api/announcements/tv", null);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.announcements);
    assert.ok(Array.isArray(body.announcements));
  });

  it("GET /api/announcements/tv returns only published general announcements", async () => {
    const res = await getJson(baseUrl, "/api/announcements/tv", null);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.announcements);
    assert.ok(Array.isArray(body.announcements));
    body.announcements.forEach((a) => {
      assert.ok("id" in a);
      assert.ok("title" in a);
      assert.ok("content" in a);
      assert.ok(!("author_id" in a), "Should not include author_id");
      assert.ok(!("publish_at" in a), "Should not include publish_at");
      assert.ok(!("expires_at" in a), "Should not include expires_at");
      assert.ok(!("status" in a), "Should not include status");
    });
  });

  it("Image upload valid JPEG → 201 with B2 presigned image_url + b2_key", async () => {
    const jpegBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    ]);
    const boundary = "----formdata-test";
    const body = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n` +
        jpegBuffer.toString("binary") +
        `\r\n--${boundary}--\r\n`,
    );
    const res = await fetch(`${baseUrl}/api/announcements/upload-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(typeof data.image_url, "string");
    assert.ok(data.image_url.length > 0);
    assert.ok(
      data.image_url.includes("s3.us-east-005.backblazeb2.com"),
      "image_url must be a B2 presigned URL",
    );
    assert.ok(
      data.image_url.includes("X-Amz-Signature"),
      "image_url must be signed",
    );
    assert.equal(typeof data.b2_key, "string");
    assert.ok(data.b2_key.startsWith("announcements/"));

    // The object actually exists in the bucket.
    const head = await b2.send(
      new GetObjectCommand({ Bucket: config.b2BucketName, Key: data.b2_key }),
    );
    assert.ok(head.ContentLength > 0);
    await head.Body.transformToByteArray();

    // Full round trip: attach the key to an announcement, then delete it.
    const createRes = await postJson(
      baseUrl,
      "/api/announcements/general",
      {
        title: "B2 roundtrip probe",
        content: "Proves upload → store → delete against B2.",
        image_url: data.image_url,
        b2_key: data.b2_key,
      },
      adminToken,
    );
    assert.equal(createRes.status, 201);
    const announcementId = (await createRes.json()).announcement.id;

    const delRes = await deleteJson(
      baseUrl,
      `/api/announcements/${announcementId}`,
      adminToken,
    );
    assert.equal(delRes.status, 200);

    // The object is gone from B2 after the DELETE endpoint ran.
    await assert.rejects(
      b2.send(
        new GetObjectCommand({ Bucket: config.b2BucketName, Key: data.b2_key }),
      ),
      (err) => err.name === "NoSuchKey" || err.name === "NotFound",
    );
  });

  it("Image upload oversized file → 400", async () => {
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
    const boundary = "----formdata-test2";
    const body = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="large.jpg"\r\nContent-Type: image/jpeg\r\n\r\n` +
        largeBuffer.toString("binary") +
        `\r\n--${boundary}--\r\n`,
    );
    const res = await fetch(`${baseUrl}/api/announcements/upload-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.status, 400);
  });

  it("Image upload wrong MIME type → 400", async () => {
    const gifBuffer = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
      0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
      0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
      0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
    ]);
    const boundary = "----formdata-test3";
    const body = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="test.gif"\r\nContent-Type: image/gif\r\n\r\n` +
        gifBuffer.toString("binary") +
        `\r\n--${boundary}--\r\n`,
    );
    const res = await fetch(`${baseUrl}/api/announcements/upload-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.status, 400);
  });

  it("Scheduled announcement (publish_at in future) → status='scheduled', NOT in feed", async () => {
    const futureDate = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const res = await postJson(
      baseUrl,
      "/api/announcements/general",
      {
        title: "Scheduled Announcement",
        content: "This should be scheduled.",
        publish_at: futureDate,
      },
      adminToken,
    );
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.announcement.status, "scheduled");

    const feedRes = await getJson(baseUrl, "/api/announcements", teacherToken);
    const feedBody = await feedRes.json();
    const titles = feedBody.announcements.map((a) => a.title);
    assert.ok(
      !titles.includes("Scheduled Announcement"),
      "Scheduled announcement should NOT appear in feed",
    );
  });

  it("Expired announcement (expires_at in past) → NOT in feed", async () => {
    const pastDate = new Date(
      Date.now() - 1 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const res = await postJson(
      baseUrl,
      "/api/announcements/general",
      {
        title: "Expired Announcement",
        content: "This should be expired.",
        expires_at: pastDate,
      },
      adminToken,
    );
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.announcement.status, "published");

    const feedRes = await getJson(baseUrl, "/api/announcements", teacherToken);
    const feedBody = await feedRes.json();
    const titles = feedBody.announcements.map((a) => a.title);
    assert.ok(
      !titles.includes("Expired Announcement"),
      "Expired announcement should NOT appear in feed",
    );
  });
});
