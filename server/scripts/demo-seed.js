/**
 * Nova Schola Hub — Demo seed script (capstone presentation data).
 *
 * Run from the server directory:
 *   node scripts/demo-seed.js
 *   node scripts/demo-seed.js --reset
 *
 * - Safe to re-run. Sections/courses/users/categories use ON CONFLICT DO NOTHING.
 * - Demo announcements / gallery / audit rows are wiped before re-insert so
 *   re-runs don't duplicate them.
 * - `--reset` additionally deletes the 25 demo users before re-seeding.
 *
 * Uses the existing pool from ../src/config/db.js and
 * hashPassword from ../src/utils/password.js. Does not touch the schema,
 * routes, controllers, or models.
 */
import pool, { closePool } from '../src/shared/config/db.js';
import { hashPassword } from '../src/shared/utils/password.js';

const RESET = process.argv.includes('--reset');
const DEMO_PASSWORD = 'Nova1234!';
const DEMO_DOMAIN = 'my.nst.edu.ph';

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const SECTIONS = [
  { name: 'Grade 10 - Emerald', grade_level: 'Grade 10' },
  { name: 'Grade 10 - Ruby', grade_level: 'Grade 10' },
  { name: 'Grade 10 - Diamond', grade_level: 'Grade 10' },
  { name: 'Grade 11 - STEM A', grade_level: 'Grade 11' },
  { name: 'Grade 11 - STEM B', grade_level: 'Grade 11' },
  { name: 'Grade 12 - STEM A', grade_level: 'Grade 12' },
  { name: 'Grade 12 - ABM', grade_level: 'Grade 12' },
  { name: 'Grade 12 - HUMSS', grade_level: 'Grade 12' },
];

const COURSES = [
  { name: 'BS Information Systems', code: 'BSIS', description: 'Bachelor of Science in Information Systems' },
  { name: 'BS Information Technology', code: 'BSIT', description: 'Bachelor of Science in Information Technology' },
  { name: 'BS Accountancy', code: 'BSA', description: 'Bachelor of Science in Accountancy' },
  { name: 'BS Business Administration', code: 'BSBA', description: 'Bachelor of Science in Business Administration' },
];

const TEACHERS = [
  { email: `maria.santos@${DEMO_DOMAIN}`, fullName: 'Maria Santos' },
  { email: `jose.garcia@${DEMO_DOMAIN}`, fullName: 'Jose Garcia' },
  { email: `ana.reyes@${DEMO_DOMAIN}`, fullName: 'Ana Reyes' },
  { email: `mark.villanueva@${DEMO_DOMAIN}`, fullName: 'Mark Villanueva' },
  { email: `grace.mendoza@${DEMO_DOMAIN}`, fullName: 'Grace Mendoza' },
];

// First 12 → section students, last 8 → course students.
const STUDENTS = [
  { email: `juan.delacruz@${DEMO_DOMAIN}`, fullName: 'Juan Dela Cruz' },
  { email: `rosa.bautista@${DEMO_DOMAIN}`, fullName: 'Rosa Bautista' },
  { email: `miguel.torres@${DEMO_DOMAIN}`, fullName: 'Miguel Torres' },
  { email: `sofia.ramos@${DEMO_DOMAIN}`, fullName: 'Sofia Ramos' },
  { email: `daniel.aquino@${DEMO_DOMAIN}`, fullName: 'Daniel Aquino' },
  { email: `angel.cruz@${DEMO_DOMAIN}`, fullName: 'Angel Cruz' },
  { email: `gabriel.santiago@${DEMO_DOMAIN}`, fullName: 'Gabriel Santiago' },
  { email: `isabella.navarro@${DEMO_DOMAIN}`, fullName: 'Isabella Navarro' },
  { email: `liam.fernandez@${DEMO_DOMAIN}`, fullName: 'Liam Fernandez' },
  { email: `mia.gonzales@${DEMO_DOMAIN}`, fullName: 'Mia Gonzales' },
  { email: `ethan.morales@${DEMO_DOMAIN}`, fullName: 'Ethan Morales' },
  { email: `ava.castillo@${DEMO_DOMAIN}`, fullName: 'Ava Castillo' },
  { email: `noah.flores@${DEMO_DOMAIN}`, fullName: 'Noah Flores' },
  { email: `lucas.villanueva@${DEMO_DOMAIN}`, fullName: 'Lucas Villanueva' },
  { email: `emma.pascual@${DEMO_DOMAIN}`, fullName: 'Emma Pascual' },
  { email: `oliver.domingo@${DEMO_DOMAIN}`, fullName: 'Oliver Domingo' },
  { email: `amara.lim@${DEMO_DOMAIN}`, fullName: 'Amara Lim' },
  { email: `elijah.mercado@${DEMO_DOMAIN}`, fullName: 'Elijah Mercado' },
  { email: `chloe.aguilar@${DEMO_DOMAIN}`, fullName: 'Chloe Aguilar' },
  { email: `caleb.dizon@${DEMO_DOMAIN}`, fullName: 'Caleb Dizon' },
];

const DEMO_USER_EMAILS = [...TEACHERS, ...STUDENTS].map((u) => u.email);

const CATEGORIES = [
  { name: 'Academic Events', description: 'Exams, seminars, science fairs, and academic programs.' },
  { name: 'Sports Events', description: 'Intramurals, varsity games, and outdoor activities.' },
  { name: 'Cultural Events', description: 'Buwan ng Wika, festivals, and heritage celebrations.' },
  { name: 'Social Events', description: 'Foundation Day, acquaintance parties, and outreach.' },
  { name: 'Classroom Activities', description: 'Quizzes, group work, and everyday class moments.' },
];

const GENERAL_ANNOUNCEMENTS = [
  { title: 'Foundation Day 2026 — Save the Date', content: 'Nova Schola Tanauan celebrates its Foundation Day on September 25! Expect booths, a parade, and the evening concert. All students are encouraged to attend.' },
  { title: 'Intramurals 2026 Schedule Released', content: 'Intramurals run September 15–18. Tryouts for basketball, volleyball, badminton, and esports continue this week. Check with your class advisers for the full bracket.' },
  { title: 'Buwan ng Wika Celebration', content: 'Join us for Buwan ng Wika with sabayang pagbigkas, poster making, and the cultural show on August 29. Filipino attire is encouraged.' },
  { title: 'First Quarter Exam Schedule', content: 'First Quarter Exams are set for October 6–8. Room assignments will be posted on the bulletin board. Bring your exam permits and arrive 30 minutes early.' },
  { title: 'Second Quarter Exam Schedule', content: 'Second Quarter Exams are scheduled for December 14–16. Reviewers have been uploaded to the library portal. Good luck, scholars!' },
  { title: 'Enrollment for Second Semester Now Open', content: 'Enrollment for the second semester is open until October 30. Proceed to the Registrar for assessment, then claim your class cards at your department.' },
  { title: 'NST Scholarship Applications', content: 'Applications for the NST Academic and Athletic Scholarships are open until November 15. Submit grades, certificates, and the accomplished form to the Scholarship Office.' },
  { title: 'Library Extends Hours During Exams', content: 'The library will be open 7:00 AM – 8:00 PM on weekdays during exam season. Group study rooms can be reserved at the front desk.' },
  { title: 'Science Fair 2026 Call for Entries', content: 'The Science Fair is back! Submit your project proposals by October 10. Categories include robotics, environmental science, and investigatory projects.' },
  { title: 'Career Guidance Week', content: 'Career Guidance Week runs November 9–13 with talks from alumni in IT, business, and accountancy. Grade 12 students are required to attend at least two sessions.' },
  { title: 'School Clean-Up Drive Saturday', content: 'All classes are invited to the campus clean-up drive this Saturday, 7:00 AM. Bring gloves and extra shirts. Attendance counts as community service hours.' },
  { title: 'No Classes — Faculty Development Day', content: 'There will be no classes on Friday due to the Faculty Development Seminar. Offices remain open for transactions. Classes resume Monday.' },
];

const CLASS_ANNOUNCEMENTS = [
  { title: 'Chapter 5 Quiz Tomorrow — Grade 10 Emerald', content: 'Reminder: Chapter 5 quiz tomorrow, first period. Coverage: pages 88–104. Bring a calculator and review the sample problems we solved in class.' },
  { title: 'Science Lab Reports Due Friday — Grade 10 Ruby', content: 'Lab reports on the density experiment are due Friday. Follow the format in the manual and attach your data tables.' },
  { title: 'Filipino Speech Practice — Grade 10 Diamond', content: 'We will hold speech practice sessions all week for Buwan ng Wika. Memorize your piece and bring your costume measurements tomorrow.' },
  { title: 'Pre-Calculus Problem Set 3 — Grade 11 STEM A', content: 'Problem Set 3 is posted. Solve items 1–20 on graphing rational functions. Submission is on Monday before class.' },
  { title: 'Physics Experiment Groups — Grade 11 STEM B', content: 'Experiment groups are finalized. Leaders, claim your laboratory kits after class. Wear closed shoes on lab day.' },
  { title: 'Research Title Defense Schedule — Grade 12 STEM A', content: 'Title defense is on Thursday, 1:00 PM at Room 302. Bring three printed copies of your proposal and your presentation slides.' },
  { title: 'Financial Statements Worksheet — Grade 12 ABM', content: 'Complete the worksheet on income statements and balance sheets. We will check answers in class on Wednesday.' },
  { title: 'UCSP Fieldwork Interviews — Grade 12 HUMSS', content: 'Conduct your barangay interviews this weekend. Secure consent forms first and encode responses by Monday.' },
  { title: 'Math Remedial Session — BSIS Students', content: 'BSIS students with quiz scores below 75% must attend the remedial session on Saturday, 9:00 AM, Computer Lab 1.' },
  { title: 'Programming Assignment 4 — BSIT Students', content: 'Assignment 4 (CRUD with PostgreSQL) is due Sunday midnight. Push your code to the class repository and include a short README.' },
  { title: 'Accounting Quiz Bee Tryouts — BSA Students', content: 'Tryouts for the Accounting Quiz Bee will be held Tuesday after class. Review partnership accounting and taxation basics.' },
  { title: 'Business Plan Draft — BSBA Students', content: 'Submit the first draft of your business plan (Chapters 1–2) by Friday. Use the template shared in the class drive.' },
  { title: 'Homeroom Assembly — Selected Students', content: 'The following students are requested to attend the homeroom assembly at 3:00 PM in the AVR for Intramurals committee assignments.' },
];

const GALLERY_CAPTIONS = [
  'Intramurals 2026 opening ceremony',
  'Buwan ng Wika cultural dance performance',
  'Foundation Day parade around campus',
  'Science Fair robotics exhibit winners',
  'Grade 10 Emerald group study session',
  'Basketball championship — final quarter',
  'Library orientation for freshmen',
  'Outreach program gift-giving in Barangay Hall',
  'Acquaintance party photo booth fun',
  'Volleyball finals match point celebration',
  'Classroom poster-making contest entries',
  'Career Guidance Week guest speaker',
  'Campus clean-up drive volunteers',
  'Choir performance at the school program',
  'Esports tournament grand finals',
  'Art exhibit — student paintings display',
  'Scholarship awarding ceremony',
  'Field trip to the science museum',
  'Teachers vs students exhibition game',
  'Graduation rehearsal march practice',
];

const REJECTION_REASONS = [
  'Image is blurry — please re-upload',
  'Photo contains visible personal contact details — please crop and re-upload',
  'Duplicate of an already approved photo',
];

const AUDIT_PLAN = [
  { action: 'auth.login', count: 8, entityType: 'user', kind: 'login' },
  { action: 'announcement.created', count: 5, entityType: 'announcement', kind: 'announcement' },
  { action: 'announcement.updated', count: 3, entityType: 'announcement', kind: 'announcement' },
  { action: 'gallery.uploaded', count: 3, entityType: 'gallery_media', kind: 'gallery' },
  { action: 'gallery.approved', count: 5, entityType: 'gallery_media', kind: 'gallery' },
  { action: 'gallery.rejected', count: 3, entityType: 'gallery_media', kind: 'gallery' },
  { action: 'user.created', count: 3, entityType: 'user', kind: 'user' },
];

const DEMO_ANNOUNCEMENT_TITLES = [
  ...GENERAL_ANNOUNCEMENTS.map((a) => a.title),
  ...CLASS_ANNOUNCEMENTS.map((a) => a.title),
];

// Real demo media files on disk (generated by scripts/generate-demo-images.js
// + ffmpeg). Gallery uses 17 images + 3 videos (20 rows, each file at most
// once); the first 5 general announcements use demo-18..22 (copies live in
// uploads/announcements/ so image_url follows the /uploads/announcements/
// convention used by the upload-image endpoint).
const DEMO_GALLERY_IMAGES = Array.from(
  { length: 17 },
  (_, k) => `demo-${String(k + 1).padStart(2, '0')}.jpg`
);
const DEMO_GALLERY_VIDEOS = ['demo-01.mp4', 'demo-02.mp4', 'demo-03.mp4'];
const DEMO_ANNOUNCEMENT_IMAGES = [
  'demo-18.jpg',
  'demo-19.jpg',
  'demo-20.jpg',
  'demo-21.jpg',
  'demo-22.jpg',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
/** Random Date within the last `days` days. */
const randomDaysAgo = (days, minDays = 0) => {
  const span = Math.max(days - minDays, 0);
  const ago = minDays + Math.random() * span;
  return new Date(Date.now() - ago * 24 * 60 * 60 * 1000);
};
const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// ---------------------------------------------------------------------------
// Wipe helpers (idempotency + --reset)
// ---------------------------------------------------------------------------

const wipeDemoContent = async (client) => {
  // Audit rows are tagged details.demo_seed = true so only our rows are removed.
  const audit = await client.query(
    `DELETE FROM audit_logs WHERE details ->> 'demo_seed' = 'true'`
  );
  // Class-announcement targets cascade when their announcement is deleted.
  const announcements = await client.query(
    'DELETE FROM announcements WHERE title = ANY($1)',
    [DEMO_ANNOUNCEMENT_TITLES]
  );
  const gallery = await client.query(
    "DELETE FROM gallery_media WHERE original_filename LIKE 'demo-%'"
  );
  return {
    audit: Number(audit.rowCount ?? 0),
    announcements: Number(announcements.rowCount ?? 0),
    gallery: Number(gallery.rowCount ?? 0),
  };
};

const wipeDemoUsers = async (client) => {
  const res = await client.query('DELETE FROM users WHERE email = ANY($1)', [DEMO_USER_EMAILS]);
  return Number(res.rowCount ?? 0);
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const run = async () => {
  const client = await pool.connect();
  const counts = {
    sections: 0,
    courses: 0,
    users: 0,
    usersSkipped: 0,
    categories: 0,
    generalAnnouncements: 0,
    classAnnouncements: 0,
    targets: 0,
    galleryApproved: 0,
    galleryPending: 0,
    galleryRejected: 0,
    audit: 0,
    wiped: null,
    usersWiped: 0,
  };

  try {
    if (RESET) {
      counts.wiped = await wipeDemoContent(client);
      counts.usersWiped = await wipeDemoUsers(client);
      console.log(`[demo-seed] --reset: wiped ${counts.usersWiped} demo users + demo content.`);
    } else {
      // Always clear previous demo content so re-runs stay idempotent.
      counts.wiped = await wipeDemoContent(client);
    }

    // ---- Sections (ON CONFLICT DO NOTHING) ----
    for (const s of SECTIONS) {
      const r = await client.query(
        `INSERT INTO sections (name, grade_level) VALUES ($1, $2)
         ON CONFLICT (name) DO NOTHING`,
        [s.name, s.grade_level]
      );
      counts.sections += Number(r.rowCount ?? 0);
    }
    const { rows: sectionRows } = await client.query(
      'SELECT id, name FROM sections WHERE name = ANY($1)',
      [SECTIONS.map((s) => s.name)]
    );

    // ---- Courses (ON CONFLICT DO NOTHING) ----
    for (const c of COURSES) {
      const r = await client.query(
        `INSERT INTO courses (name, code, description) VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [c.name, c.code, c.description]
      );
      counts.courses += Number(r.rowCount ?? 0);
    }
    // Courses may conflict on code from the base seed (e.g. BSA1 vs BSA), so
    // resolve ids by code OR name.
    const { rows: courseRows } = await client.query(
      'SELECT id, name, code FROM courses WHERE code = ANY($1) OR name = ANY($2)',
      [COURSES.map((c) => c.code), COURSES.map((c) => c.name)]
    );
    // Map requested code -> actual row (fall back to matching by name).
    const courseByCode = new Map();
    for (const c of COURSES) {
      const found =
        courseRows.find((r) => r.code === c.code) ?? courseRows.find((r) => r.name === c.name);
      if (found) courseByCode.set(c.code, found);
    }

    // ---- Users (25 demo accounts, ON CONFLICT DO NOTHING) ----
    // Hash once and reuse — fast seeding, still a valid bcrypt hash for every account.
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    const sectionIds = sectionRows.map((r) => r.id);
    const courseIds = [...courseByCode.values()].map((r) => r.id);

    const userSpecs = [
      ...TEACHERS.map((t) => ({ ...t, role: 'teacher', sectionId: null, courseId: null })),
      ...STUDENTS.slice(0, 12).map((s) => ({
        ...s,
        role: 'student',
        sectionId: pick(sectionIds),
        courseId: null,
      })),
      ...STUDENTS.slice(12).map((s) => ({
        ...s,
        role: 'student',
        sectionId: null,
        courseId: pick(courseIds),
      })),
    ];

    for (const u of userSpecs) {
      const r = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, section_id, course_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)
         ON CONFLICT (email) DO NOTHING`,
        [u.email, passwordHash, u.fullName, u.role, u.sectionId, u.courseId]
      );
      if (Number(r.rowCount ?? 0) === 1) counts.users += 1;
      else counts.usersSkipped += 1;
    }
    const { rows: demoUsers } = await client.query(
      'SELECT id, email, role FROM users WHERE email = ANY($1)',
      [DEMO_USER_EMAILS]
    );
    const teacherIds = demoUsers.filter((u) => u.role === 'teacher').map((u) => u.id);
    const studentIds = demoUsers.filter((u) => u.role === 'student').map((u) => u.id);
    const allDemoUserIds = demoUsers.map((u) => u.id);

    // Admin id for gallery review attribution (falls back to a demo teacher).
    const { rows: adminRows } = await client.query(
      "SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1"
    );
    const reviewerId = adminRows[0]?.id ?? teacherIds[0] ?? null;

    // ---- Categories (ON CONFLICT DO NOTHING) ----
    for (const c of CATEGORIES) {
      const r = await client.query(
        `INSERT INTO categories (name, description) VALUES ($1, $2)
         ON CONFLICT (name) DO NOTHING`,
        [c.name, c.description]
      );
      counts.categories += Number(r.rowCount ?? 0);
    }
    const { rows: categoryRows } = await client.query(
      'SELECT id, name FROM categories WHERE name = ANY($1)',
      [CATEGORIES.map((c) => c.name)]
    );
    const categoryIds = categoryRows.map((r) => r.id);

    // ---- General announcements (12, published, publish_at in the past) ----
    // First 5 rows get a real image_url (demo-18..22, each used at most once).
    const generalIds = [];
    for (let idx = 0; idx < GENERAL_ANNOUNCEMENTS.length; idx += 1) {
      const a = GENERAL_ANNOUNCEMENTS[idx];
      const publishAt = randomDaysAgo(30, 1);
      const imageUrl =
        idx < DEMO_ANNOUNCEMENT_IMAGES.length
          ? `/uploads/announcements/${DEMO_ANNOUNCEMENT_IMAGES[idx]}`
          : null;
      const { rows } = await client.query(
        `INSERT INTO announcements (author_id, type, title, content, image_url, status, publish_at, created_at, updated_at)
         VALUES ($1, 'general', $2, $3, $4, 'published', $5, $5, $5)
         RETURNING id`,
        [pick(teacherIds), a.title, a.content, imageUrl, publishAt.toISOString()]
      );
      generalIds.push(rows[0].id);
    }
    counts.generalAnnouncements = generalIds.length;

    // ---- Class announcements (13, each with 1–3 mixed targets) ----
    const classIds = [];
    for (const a of CLASS_ANNOUNCEMENTS) {
      const publishAt = randomDaysAgo(30, 1);
      const { rows } = await client.query(
        `INSERT INTO announcements (author_id, type, title, content, status, publish_at, created_at, updated_at)
         VALUES ($1, 'class', $2, $3, 'published', $4, $4, $4)
         RETURNING id`,
        [pick(teacherIds), a.title, a.content, publishAt.toISOString()]
      );
      const announcementId = rows[0].id;
      classIds.push(announcementId);

      const targetCount = randomInt(1, 3);
      const kinds = shuffle(['section', 'course', 'student']).slice(0, targetCount);
      for (const kind of kinds) {
        if (kind === 'section') {
          await client.query(
            `INSERT INTO announcement_targets (announcement_id, target_type, section_id)
             VALUES ($1, 'section', $2)`,
            [announcementId, pick(sectionIds)]
          );
        } else if (kind === 'course') {
          await client.query(
            `INSERT INTO announcement_targets (announcement_id, target_type, course_id)
             VALUES ($1, 'course', $2)`,
            [announcementId, pick(courseIds)]
          );
        } else {
          await client.query(
            `INSERT INTO announcement_targets (announcement_id, target_type, student_id)
             VALUES ($1, 'student', $2)`,
            [announcementId, pick(studentIds)]
          );
        }
        counts.targets += 1;
      }
    }
    counts.classAnnouncements = classIds.length;
    const allAnnouncementIds = [...generalIds, ...classIds];

    // ---- Gallery media (20: 12 approved, 5 pending, 3 rejected) ----
    // 17 real images (demo-01..17) + 3 real videos (demo-01..03.mp4).
    // Each file is used at most once; statuses are shuffled across files.
    const galleryPlan = [
      ...Array.from({ length: 12 }, () => 'approved'),
      ...Array.from({ length: 5 }, () => 'pending'),
      ...Array.from({ length: 3 }, () => 'rejected'),
    ];
    const shuffledPlan = shuffle(galleryPlan);
    const mediaFiles = shuffle([
      ...DEMO_GALLERY_IMAGES.map((file) => ({ file, kind: 'image' })),
      ...DEMO_GALLERY_VIDEOS.map((file) => ({ file, kind: 'video' })),
    ]);
    const galleryIds = { approved: [], pending: [], rejected: [] };

    for (let i = 0; i < shuffledPlan.length; i += 1) {
      const status = shuffledPlan[i];
      const { file, kind } = mediaFiles[i];
      const isVideo = kind === 'video';
      const fileUrl = isVideo
        ? `/uploads/gallery/videos/${file}`
        : `/uploads/gallery/images/${file}`;
      const createdAt = randomDaysAgo(45, 0);
      const reviewedAt =
        status === 'pending'
          ? null
          : new Date(Math.min(createdAt.getTime() + randomInt(1, 72) * 3600 * 1000, Date.now()));
      const rejectionReason = status === 'rejected' ? pick(REJECTION_REASONS) : null;

      const { rows } = await client.query(
        `INSERT INTO gallery_media
           (uploader_id, category_id, media_type, file_url, original_filename, caption,
            duration_seconds, status, reviewed_by, reviewed_at, rejection_reason,
            created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
         RETURNING id`,
        [
          pick(allDemoUserIds),
          pick(categoryIds),
          isVideo ? 'video' : 'image',
          fileUrl,
          file,
          GALLERY_CAPTIONS[i % GALLERY_CAPTIONS.length],
          isVideo ? randomInt(15, 110) : null,
          status,
          status === 'pending' ? null : reviewerId,
          reviewedAt ? reviewedAt.toISOString() : null,
          rejectionReason,
          createdAt.toISOString(),
        ]
      );
      galleryIds[status].push(rows[0].id);
      if (status === 'approved') counts.galleryApproved += 1;
      else if (status === 'pending') counts.galleryPending += 1;
      else counts.galleryRejected += 1;
    }

    // ---- Audit logs (30) ----
    const auditInserts = [];
    const emailById = new Map(demoUsers.map((u) => [String(u.id), u.email]));
    for (const item of AUDIT_PLAN) {
      for (let i = 0; i < item.count; i += 1) {
        const userId = pick(allDemoUserIds);
        const createdAt = randomDaysAgo(30, 0);
        let entityId = null;
        let details = { demo_seed: true };

        if (item.kind === 'login') {
          entityId = userId;
          details = { demo_seed: true, email: emailById.get(String(userId)), ip_address: '127.0.0.1' };
        } else if (item.kind === 'announcement') {
          entityId = pick(allAnnouncementIds);
          details =
            item.action === 'announcement.created'
              ? { demo_seed: true, announcement_id: entityId }
              : { demo_seed: true, announcement_id: entityId, updated_fields: ['title', 'content'] };
        } else if (item.kind === 'gallery') {
          const poolIds =
            item.action === 'gallery.approved'
              ? galleryIds.approved
              : item.action === 'gallery.rejected'
                ? galleryIds.rejected
                : [...galleryIds.approved, ...galleryIds.pending, ...galleryIds.rejected];
          entityId = poolIds.length ? pick(poolIds) : null;
          details =
            item.action === 'gallery.rejected'
              ? { demo_seed: true, gallery_media_id: entityId, rejection_reason: pick(REJECTION_REASONS) }
              : { demo_seed: true, gallery_media_id: entityId };
        } else if (item.kind === 'user') {
          entityId = pick(studentIds.length ? studentIds : allDemoUserIds);
          details = { demo_seed: true, email: emailById.get(String(entityId)), role: 'student' };
        }

        auditInserts.push({ userId, action: item.action, entityType: item.entityType, entityId, details, createdAt });
      }
    }
    for (const a of shuffle(auditInserts)) {
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
        [a.userId, a.action, a.entityType, a.entityId, JSON.stringify(a.details), '127.0.0.1', a.createdAt.toISOString()]
      );
      counts.audit += 1;
    }
  } finally {
    client.release();
  }

  // ---- Summary ----
  console.log('');
  console.log('[demo-seed] Demo data summary:');
  console.log(`  Sections:            ${SECTIONS.length} ensured (${counts.sections} new)`);
  console.log(`  Courses:             ${COURSES.length} ensured (${counts.courses} new)`);
  console.log(`  Users:               25 demo accounts (${counts.users} new, ${counts.usersSkipped} already existed)`);
  console.log(`  Categories:          ${CATEGORIES.length} ensured (${counts.categories} new)`);
  console.log(`  Announcements:       ${counts.generalAnnouncements} general + ${counts.classAnnouncements} class, ${counts.targets} targets`);
  console.log(`  Gallery:             ${counts.galleryApproved} approved + ${counts.galleryPending} pending + ${counts.galleryRejected} rejected`);
  console.log(`  Audit logs:          ${counts.audit} demo rows`);
  if (counts.wiped && (counts.wiped.audit + counts.wiped.announcements + counts.wiped.gallery > 0)) {
    console.log(`  Previous demo rows wiped: ${counts.wiped.announcements} announcements, ${counts.wiped.gallery} gallery, ${counts.wiped.audit} audit logs`);
  }
  if (RESET) console.log(`  Reset:               removed ${counts.usersWiped} demo users before re-seeding`);
  console.log('');
  console.log(`[demo-seed] All demo users use password "${DEMO_PASSWORD}".`);
  console.log('[demo-seed] Done.');
};

run()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('[demo-seed] Failed:', err.message);
    await closePool().catch(() => {});
    process.exit(1);
  });
