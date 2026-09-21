import config from './shared/config/env.js';
import { getClient, closePool } from './shared/config/db.js';
import { hashPassword } from './shared/utils/password.js';

const SECTIONS = [
  { name: 'Grade 10 - Emerald', grade_level: 'Grade 10' },
  { name: 'Grade 10 - Ruby', grade_level: 'Grade 10' },
  { name: 'Grade 11 - Onyx', grade_level: 'Grade 11' },
];

const COURSES = [
  {
    name: 'BSIS 3',
    code: 'BSIS3',
    description: 'Bachelor of Science in Information Systems — Year 3',
  },
  {
    name: 'BSIT 2',
    code: 'BSIT2',
    description: 'Bachelor of Science in Information Technology — Year 2',
  },
  {
    name: 'BSA 1',
    code: 'BSA1',
    description: 'Bachelor of Science in Accountancy — Year 1',
  },
];

const PEXELS_URLS = [
  'https://images.pexels.com/photos/8127310/pexels-photo-8127310.jpeg',
  'https://images.pexels.com/photos/16276592/pexels-photo-16276592.jpeg',
  'https://images.pexels.com/photos/33524620/pexels-photo-33524620.jpeg',
  'https://images.pexels.com/photos/9159042/pexels-photo-9159042.jpeg',
  'https://images.pexels.com/photos/14700793/pexels-photo-14700793.jpeg',
  'https://images.pexels.com/photos/18587790/pexels-photo-18587790.jpeg',
];

/**
 * Inserts a section unless the name already exists. Returns { row, created }.
 */
const getOrCreateSection = async (client, { name, grade_level }) => {
  const { rows } = await client.query(
    `INSERT INTO sections (name, grade_level)
     VALUES ($1, $2)
     ON CONFLICT (name) DO NOTHING
     RETURNING id, name`,
    [name, grade_level]
  );
  if (rows[0]) return { row: rows[0], created: true };
  const existing = await client.query('SELECT id, name FROM sections WHERE name = $1', [name]);
  return { row: existing.rows[0], created: false };
};

/**
 * Inserts a course unless the name already exists. Returns { row, created }.
 */
const getOrCreateCourse = async (client, { name, code, description }) => {
  const { rows } = await client.query(
    `INSERT INTO courses (name, code, description)
     VALUES ($1, $2, $3)
     ON CONFLICT (name) DO NOTHING
     RETURNING id, name`,
    [name, code, description]
  );
  if (rows[0]) return { row: rows[0], created: true };
  const existing = await client.query(
    'SELECT id, name FROM courses WHERE code = $1 OR name = $2',
    [code, name]
  );
  return { row: existing.rows[0], created: false };
};

/**
 * Upserts a user by email. Always resets password and reactivates. Returns { row, created, updated }.
 */
const upsertUser = async (client, { email, password, fullName, role, sectionId, courseId }) => {
  const passwordHash = await hashPassword(password);
  const { rows } = await client.query(
    `INSERT INTO users (email, password_hash, full_name, role, section_id, course_id, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       full_name = EXCLUDED.full_name,
       role = EXCLUDED.role,
       section_id = EXCLUDED.section_id,
       course_id = EXCLUDED.course_id,
       is_active = TRUE,
       updated_at = NOW()
     RETURNING id, email, role, (xmax = 0) AS was_inserted`,
    [email, passwordHash, fullName, role, sectionId, courseId]
  );
  // xmax = 0 indicates INSERT, !=0 indicates UPDATE in Postgres
  const wasInserted = rows[0]?.was_inserted;
  return { row: rows[0], created: wasInserted, updated: !wasInserted };
};

const run = async () => {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is not set. Configure server/.env before seeding.');
  }

  const createdSections = [];
  const existingSections = [];
  const createdCourses = [];
  const existingCourses = [];
  let createdUsers = [];
  let updatedUsers = [];
  let galleryInserted = 0;
  let galleryDeletedBroken = 0;
  let studentsForGallery = [];

  const client = await getClient();
  try {
    await client.query('BEGIN');

    for (const section of SECTIONS) {
      const { row, created } = await getOrCreateSection(client, section);
      if (created) createdSections.push(row.name);
      else existingSections.push(row.name);
      section.row = row;
    }

    for (const course of COURSES) {
      const { row, created } = await getOrCreateCourse(client, course);
      if (created) createdCourses.push(row.name);
      else existingCourses.push(row.name);
      course.row = row;
    }

    // Seed exactly these 5 accounts, idempotent via upsert
    const accounts = [
      { email: 'admin@my.nst.edu.ph', password: 'Admin@1234', fullName: 'System Administrator', role: 'admin', sectionId: null, courseId: null },
      { email: 'teacher@my.nst.edu.ph', password: 'Nova1234!', fullName: 'Grace Aguinaldo', role: 'teacher', sectionId: null, courseId: null },
      { email: 'student1@my.nst.edu.ph', password: 'Nova1234!', fullName: 'Alex Reyes', role: 'student', sectionId: SECTIONS[0].row.id, courseId: COURSES[0].row.id },
      { email: 'student2@my.nst.edu.ph', password: 'Nova1234!', fullName: 'Bianca Santos', role: 'student', sectionId: SECTIONS[1].row.id, courseId: COURSES[1].row.id },
      { email: 'student3@my.nst.edu.ph', password: 'Nova1234!', fullName: 'Carlo Mendoza', role: 'student', sectionId: SECTIONS[2].row.id, courseId: COURSES[2].row.id },
    ];

    createdUsers = [];
    updatedUsers = [];
    for (const acc of accounts) {
      const { row, created } = await upsertUser(client, acc);
      if (created) createdUsers.push(`${row.email} (id=${row.id}, role=${row.role})`);
      else updatedUsers.push(`${row.email} (id=${row.id}, role=${row.role})`);
    }

    // Gallery idempotency: remove only broken /uploads rows, keep http rows
    const delBroken = await client.query(`DELETE FROM gallery_media WHERE file_url LIKE '/uploads/%'`);
    galleryDeletedBroken = delBroken.rowCount ?? 0;

    // Check if Pexels seed already exists (idempotent guard)
    const existingPexels = await client.query(`SELECT COUNT(*)::int AS cnt FROM gallery_media WHERE file_url LIKE 'https://images.pexels.com/%'`);
    const pexelsCount = existingPexels.rows[0]?.cnt ?? 0;

    if (pexelsCount === 0) {
      // Need a category id if available
      const catRes = await client.query(`SELECT id FROM categories ORDER BY id LIMIT 1`);
      const categoryId = catRes.rows[0]?.id ?? null;

      // Find a student id for pending/rejected
      const stuRes = await client.query(`SELECT id FROM users WHERE email = 'student1@my.nst.edu.ph' LIMIT 1`);
      const studentId = stuRes.rows[0]?.id;
      const adminRes = await client.query(`SELECT id FROM users WHERE email = 'admin@my.nst.edu.ph' LIMIT 1`);
      const adminId = adminRes.rows[0]?.id ?? studentId;

      if (!studentId) throw new Error('Student user not found for gallery seed');

      const galleryRows = [
        // 4 approved
        { caption: 'Foundation Day celebration', file_url: PEXELS_URLS[0], status: 'approved', uploader_id: studentId, category_id: categoryId, rejection_reason: null, reviewed_by: adminId },
        { caption: 'Science fair exhibit', file_url: PEXELS_URLS[1], status: 'approved', uploader_id: studentId, category_id: categoryId, rejection_reason: null, reviewed_by: adminId },
        { caption: 'Intramurals game', file_url: PEXELS_URLS[2], status: 'approved', uploader_id: studentId, category_id: categoryId, rejection_reason: null, reviewed_by: adminId },
        { caption: 'Classroom activity', file_url: PEXELS_URLS[3], status: 'approved', uploader_id: studentId, category_id: categoryId, rejection_reason: null, reviewed_by: adminId },
        // 1 pending
        { caption: 'Pending review image', file_url: PEXELS_URLS[4], status: 'pending', uploader_id: studentId, category_id: categoryId, rejection_reason: null, reviewed_by: null },
        // 1 rejected
        { caption: 'Blurry rejected image', file_url: PEXELS_URLS[5], status: 'rejected', uploader_id: studentId, category_id: categoryId, rejection_reason: 'Blurry photo. Please upload a clearer image.', reviewed_by: adminId },
      ];

      for (let i = 0; i < galleryRows.length; i++) {
        const g = galleryRows[i];
        await client.query(
          `INSERT INTO gallery_media (uploader_id, category_id, media_type, file_url, original_filename, caption, status, reviewed_by, reviewed_at, rejection_reason, created_at, updated_at)
           VALUES ($1, $2, 'image', $3, $4, $5, $6, $7, CASE WHEN $7::bigint IS NOT NULL THEN NOW() ELSE NULL END, $8, NOW() - ($9::text || ' days')::interval, NOW())`,
          [
            g.uploader_id,
            g.category_id,
            g.file_url,
            `pexels-${i}.jpg`,
            g.caption,
            g.status,
            g.reviewed_by,
            g.rejection_reason,
            String(galleryRows.length - i),
          ]
        );
        galleryInserted++;
      }
    } else {
      galleryInserted = 0;
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  console.log('[seed] Sections created:', createdSections.join(', ') || '(none)');
  console.log('[seed] Sections already existed:', existingSections.join(', ') || '(none)');
  console.log('[seed] Courses created:', createdCourses.join(', ') || '(none)');
  console.log('[seed] Courses already existed:', existingCourses.join(', ') || '(none)');
  console.log('[seed] Users created:', createdUsers.join('; ') || '(none)');
  console.log('[seed] Users updated (reactivated):', updatedUsers.join('; ') || '(none)');
  console.log(`[seed] Gallery: deleted ${galleryDeletedBroken} broken /uploads rows, inserted ${galleryInserted} Pexels rows`);
  console.log('');
  console.log('[seed] Credentials (seed accounts):');
  console.log(`  admin@my.nst.edu.ph / Admin@1234  (admin)`);
  console.log(`  teacher@my.nst.edu.ph / Nova1234!  (teacher)`);
  console.log(`  student1@my.nst.edu.ph / Nova1234!  (student)`);
  console.log(`  student2@my.nst.edu.ph / Nova1234!  (student)`);
  console.log(`  student3@my.nst.edu.ph / Nova1234!  (student)`);
  console.log('');
  console.log('[seed] Seed complete. Passwords are bcrypt-hashed.');
};

run()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('[seed] Failed:', err.message);
    await closePool().catch(() => {});
    process.exit(1);
  });
