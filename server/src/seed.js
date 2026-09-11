import config from './config/env.js';
import { getClient, closePool } from './config/db.js';
import { hashPassword } from './utils/password.js';

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
 * Creates a user unless the email already exists. Returns { row, created }.
 */
const createUser = async (client, { email, password, fullName, role, sectionId, courseId }) => {
  const passwordHash = await hashPassword(password);
  const { rows } = await client.query(
    `INSERT INTO users (email, password_hash, full_name, role, section_id, course_id, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email, role`,
    [email, passwordHash, fullName, role, sectionId, courseId]
  );
  if (rows[0]) return { row: rows[0], created: true };
  return { row: null, created: false, email };
};

const buildUserSummary = (row) =>
  row ? `${row.email} (id=${row.id}, role=${row.role})` : null;

const run = async () => {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is not set. Configure server/.env before seeding.');
  }

  const domain = config.nstEmailDomain || 'nst.edu.ph';
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || `admin@${domain}`).trim();
  const teacherEmail = (process.env.SEED_TEACHER_EMAIL || `teacher@${domain}`).trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@1234';
  const samplePassword = process.env.SEED_SAMPLE_PASSWORD || 'Nova1234!';

  const studentSpecs = process.env.SEED_STUDENT_EMAILS
    ? process.env.SEED_STUDENT_EMAILS.split(',')
        .map((email, i) => ({ email: email.trim(), fullName: `Student ${i + 1}` }))
        .filter((s) => s.email !== '')
    : [
        { email: `student1@${domain}`, fullName: 'Alex Reyes' },
        { email: `student2@${domain}`, fullName: 'Bianca Santos' },
        { email: `student3@${domain}`, fullName: 'Carlo Mendoza' },
      ];

  const createdSections = [];
  const existingSections = [];
  const createdCourses = [];
  const existingCourses = [];
  const createdUsers = [];
  const existingUsers = [];
  let students = [];

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

    const admin = await createUser(client, {
      email: adminEmail,
      password: adminPassword,
      fullName: 'System Administrator',
      role: 'admin',
    });

    const teacher = await createUser(client, {
      email: teacherEmail,
      password: samplePassword,
      fullName: 'Grace Aguinaldo',
      role: 'teacher',
    });

    students = [];
    for (const spec of studentSpecs) {
      const section = SECTIONS[students.length % SECTIONS.length].row;
      const course = COURSES[students.length % COURSES.length].row;
      const result = await createUser(client, {
        email: spec.email,
        password: samplePassword,
        fullName: spec.fullName,
        role: 'student',
        sectionId: section.id,
        courseId: course.id,
      });
      students.push({ spec, result });
    }

    for (const result of [admin, teacher, ...students.map((s) => s.result)]) {
      if (result.created) createdUsers.push(buildUserSummary(result.row));
      else existingUsers.push(result.email ?? 'unknown');
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
  console.log('[seed] Users already existed:', existingUsers.join('; ') || '(none)');
  console.log('');
  console.log('[seed] Credentials (sample accounts only):');
  console.log(`  ${adminEmail} / ${adminPassword}  (admin)`);
  console.log(`  ${teacherEmail} / ${samplePassword}  (teacher)`);
  for (const { spec } of students) {
    console.log(`  ${spec.email} / ${samplePassword}  (student)`);
  }
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