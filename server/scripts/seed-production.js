// Nova Schola Hub — production-safe COMPREHENSIVE test-data seed.
//
// SCOPE (additive only, idempotent):
//   *  1 admin + 10 teachers + 30 students (41 users) by email lookup
//   *  6 courses (by code) + 12 sections (by name)
//   * 10 gallery categories (by name)
//   * 30 announcements (20 general + 10 class w/ announcement_targets), by title+type
//   * Gallery images are excluded. Use import-nst-gallery.js for real NST photos.
//   * NOT seeded: audit_logs (system-generated), notifications (table does not
//     exist in this project — verified: no notification table, model, route or UI).
//
// PRODUCTION SAFETY:
//   * NEVER drops/truncates/deletes/resets. Only INSERTs. Existing rows are
//     reused, never updated, never overwritten (passwords/roles untouched).
//   * Default mode is DRY RUN — zero DB writes, zero B2 uploads.
//   * Live writes require --confirm-production.
//   * Transaction design: single-statement inserts are inherently atomic;
//     multi-row writes (class announcement + targets) go through the model's
//     own transaction (createClassWithTargets: BEGIN/COMMIT/ROLLBACK). One
//     giant transaction is deliberately avoided so a seed run never holds long
//     locks on production tables.
//   * B2 uploads live outside any PG transaction: upload FIRST, insert second.
//     If the insert fails, the object uploaded BY THIS RUN is deleted. Existing
//     B2 objects are never touched.
//   * Secrets are never printed. DATABASE_URL is shown host-only. A warning is
//     printed when DATABASE_URL looks like a hosted (Neon/AWS) database while
//     NODE_ENV is not 'production'.
//
// USAGE (run from server/):
//   npm run seed:production -- --dry-run
//   SEED_DEMO_PASSWORD='StrongDemoPass123!' npm run seed:production -- --confirm-production
//
// Demo password comes ONLY from SEED_DEMO_PASSWORD (never committed to git)
// and applies ONLY to newly created users. Existing users are left untouched.
//
// NOTE on emails: seed accounts use the institutional role-specific domains
// (admin @nst.edu.ph, teachers @tr.nst.edu.ph, students @my.nst.edu.ph),
// matching the backend NST_*_EMAIL_DOMAIN validation, so seeded accounts pass
// the same rules as app-created accounts. Login does not check domains.

import { query, getClient, closePool } from '../src/shared/config/db.js';
import config from '../src/shared/config/env.js';
import { hashPassword, comparePassword } from '../src/shared/utils/password.js';
import { normalizeEmail } from '../src/shared/utils/nstEmail.js';
import * as userModel from '../src/features/users/userModel.js';
import * as announcementModel from '../src/features/announcements/announcementModel.js';
import * as categoryModel from '../src/features/categories/categoryModel.js';
import * as sectionModel from '../src/features/academic/sectionModel.js';
import * as courseModel from '../src/features/academic/courseModel.js';

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const CONFIRMED = args.has('--confirm-production');

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || '';

// ---------------------------------------------------------------------------
// Seed definitions (stable identifiers for idempotency)
// ---------------------------------------------------------------------------

const SEED_COURSES = [
  { code: 'BSIS', name: 'Bachelor of Science in Information Systems', description: 'Systems analysis, databases, and business IT solutions.' },
  { code: 'BSIT', name: 'Bachelor of Science in Information Technology', description: 'Networks, programming, and IT infrastructure.' },
  { code: 'BSCS', name: 'Bachelor of Science in Computer Science', description: 'Algorithms, software engineering, and computing theory.' },
  { code: 'BBA', name: 'Bachelor of Business Administration', description: 'Management, marketing, and entrepreneurship.' },
  { code: 'BSHM', name: 'Bachelor of Science in Hospitality Management', description: 'Hotel, restaurant, and tourism operations.' },
  { code: 'BEED', name: 'Bachelor of Elementary Education', description: 'Primary-level teaching methods and child development.' },
];

const SEED_SECTIONS = [
  { name: 'BSIS 1-A', grade_level: '1st Year', courseCode: 'BSIS' },
  { name: 'BSIS 2-A', grade_level: '2nd Year', courseCode: 'BSIS' },
  { name: 'BSIT 1-A', grade_level: '1st Year', courseCode: 'BSIT' },
  { name: 'BSIT 2-A', grade_level: '2nd Year', courseCode: 'BSIT' },
  { name: 'BSCS 1-A', grade_level: '1st Year', courseCode: 'BSCS' },
  { name: 'BSCS 3-A', grade_level: '3rd Year', courseCode: 'BSCS' },
  { name: 'BBA 1-A', grade_level: '1st Year', courseCode: 'BBA' },
  { name: 'BBA 2-A', grade_level: '2nd Year', courseCode: 'BBA' },
  { name: 'BSHM 1-A', grade_level: '1st Year', courseCode: 'BSHM' },
  { name: 'BSHM 2-A', grade_level: '2nd Year', courseCode: 'BSHM' },
  { name: 'BEED 1-A', grade_level: '1st Year', courseCode: 'BEED' },
  { name: 'BEED 2-A', grade_level: '2nd Year', courseCode: 'BEED' },
];

const SEED_TEACHERS = [
  { email: 'maria.santos@tr.nst.edu.ph', full_name: 'Maria Santos' },
  { email: 'john.reyes@tr.nst.edu.ph', full_name: 'John Reyes' },
  { email: 'ana.delacruz@tr.nst.edu.ph', full_name: 'Ana Dela Cruz' },
  { email: 'carlos.mendoza@tr.nst.edu.ph', full_name: 'Carlos Mendoza' },
  { email: 'jenny.lim@tr.nst.edu.ph', full_name: 'Jenny Lim' },
  { email: 'roberto.garcia@tr.nst.edu.ph', full_name: 'Roberto Garcia' },
  { email: 'lucia.fernandez@tr.nst.edu.ph', full_name: 'Lucia Fernandez' },
  { email: 'mark.villanueva@tr.nst.edu.ph', full_name: 'Mark Villanueva' },
  { email: 'grace.aquino@tr.nst.edu.ph', full_name: 'Grace Aquino' },
  { email: 'daniel.torres@tr.nst.edu.ph', full_name: 'Daniel Torres' },
];

// [full_name, email-local-part, sectionName, isActive]
const SEED_STUDENT_ROWS = [
  ['Andrei Manacop', 'andrei.manacop', 'BSIS 1-A', true],
  ['Sofia Cruz', 'sofia.cruz', 'BSIS 1-A', true],
  ['Miguel Torres', 'miguel.torres', 'BSIS 1-A', true],
  ['Isabella Reyes', 'isabella.reyes', 'BSIS 2-A', true],
  ['Lucas Santos', 'lucas.santos', 'BSIS 2-A', true],
  ['Emma Garcia', 'emma.garcia', 'BSIT 1-A', true],
  ['Mateo Dela Cruz', 'mateo.delacruz', 'BSIT 1-A', true],
  ['Olivia Mendoza', 'olivia.mendoza', 'BSIT 1-A', true],
  ['Liam Villanueva', 'liam.villanueva', 'BSIT 2-A', true],
  ['Ava Fernandez', 'ava.fernandez', 'BSIT 2-A', true],
  ['Noah Aquino', 'noah.aquino', 'BSCS 1-A', true],
  ['Mia Ramos', 'mia.ramos', 'BSCS 1-A', true],
  ['Ethan Navarro', 'ethan.navarro', 'BSCS 1-A', true],
  ['Chloe Salazar', 'chloe.salazar', 'BSCS 3-A', true],
  ['Aiden Mercado', 'aiden.mercado', 'BSCS 3-A', true],
  ['Sophia Aguilar', 'sophia.aguilar', 'BBA 1-A', true],
  ['Caleb Flores', 'caleb.flores', 'BBA 1-A', true],
  ['Lily Gonzales', 'lily.gonzales', 'BBA 1-A', true],
  ['Isaac Bautista', 'isaac.bautista', 'BBA 2-A', true],
  ['Zoe Castillo', 'zoe.castillo', 'BBA 2-A', true],
  ['Gabriel Morales', 'gabriel.morales', 'BSHM 1-A', true],
  ['Ruby Padilla', 'ruby.padilla', 'BSHM 1-A', true],
  ['Nathan Velasco', 'nathan.velasco', 'BSHM 1-A', true],
  ['Ella Santiago', 'ella.santiago', 'BSHM 2-A', true],
  ['Oliver Marquez', 'oliver.marquez', 'BSHM 2-A', true],
  ['Hannah Lopez', 'hannah.lopez', 'BEED 1-A', true],
  ['Samuel Ocampo', 'samuel.ocampo', 'BEED 1-A', true],
  ['Victoria Perez', 'victoria.perez', 'BEED 1-A', true],
  ['Daniel Rivera', 'daniel.rivera', 'BEED 2-A', true],
  ['Julia Santos', 'julia.santos', 'BEED 2-A', false], // inactive account (tests deactivated login path)
];

const SEED_CATEGORIES = [
  { name: 'School Events', description: 'Official school programs, ceremonies, and celebrations.' },
  { name: 'Classroom Activities', description: 'Learning moments and classroom work.' },
  { name: 'Campus Life', description: 'Student life and campus gatherings.' },
  { name: 'Foundation Day', description: 'Foundation anniversary festivities and parades.' },
  { name: 'Orientation', description: 'Freshmen orientation and welcome activities.' },
  { name: 'Intramurals', description: 'Sports fest games, cheers, and awarding.' },
  { name: 'Recognition', description: 'Honors assemblies and awarding ceremonies.' },
  { name: 'Faculty Activities', description: 'Teacher training, meetings, and team building.' },
  { name: 'Student Organizations', description: 'Club work, org fairs, and leadership events.' },
  { name: 'Community Outreach', description: 'Extension, clean-up drives, and volunteer work.' },
];

// Announcement spec:
//   t: 'g' general | 'c' class ; st: published|scheduled|draft|archived
//   pubInDays: publish_at offset for scheduled ; expInDays: expires_at offset (past allowed)
//   tv: show_on_tv ; tg: targets for class { s:[sectionNames], c:[courseCodes], u:[studentEmails] }
const SEED_ANNOUNCEMENTS = [
  { t: 'g', st: 'published', tv: true, by: 'admin@nst.edu.ph', title: 'Class Suspension Advisory', content: 'Demo advisory: classes are suspended on Friday due to severe weather, per the school administration. Please monitor official channels for further updates. This is sample data for presentation purposes.' },
  { t: 'g', st: 'published', tv: true, by: 'admin@nst.edu.ph', title: 'Enrollment Reminder for Next Semester', content: 'Demo reminder: enrollment for the next semester opens Monday at the registrar office. Bring your report card and a photocopy of your birth certificate. This is sample data for presentation purposes.' },
  { t: 'g', st: 'published', tv: true, by: 'maria.santos@tr.nst.edu.ph', title: 'Midterm Examination Schedule', content: 'Students are reminded that the Midterm Examinations will be conducted according to the schedule released by the school administration. Please check the official examination schedule and coordinate with your instructors for any concerns.' },
  { t: 'g', st: 'published', tv: true, by: 'john.reyes@tr.nst.edu.ph', title: 'Foundation Day Celebration', content: 'Demo announcement: the school Foundation Day celebration will be held on the main campus grounds with booths, performances, and a parade. All students and faculty are invited. This is sample data for presentation purposes.' },
  { t: 'g', st: 'published', tv: true, by: 'admin@nst.edu.ph', title: 'Reminder: Library Hours and ID Policy', content: 'Demo reminder: the library is open 8:00 AM to 5:00 PM on school days. Always wear your school ID on campus. This is sample data for presentation purposes.' },
  { t: 'g', st: 'published', tv: false, by: 'maria.santos@tr.nst.edu.ph', title: 'Faculty Meeting on Friday', content: 'Demo notice: all faculty members are requested to attend the meeting on Friday at 3:00 PM in the conference room. Agenda includes grading deadlines and event assignments. This is sample data for presentation purposes.' },
  { t: 'g', st: 'published', tv: true, by: 'john.reyes@tr.nst.edu.ph', title: 'Intramurals Tryouts Schedule', content: 'Demo notice: tryouts for basketball, volleyball, badminton, and track events start next week at the school covered court. Bring your athletic attire and parent consent form. This is sample data for presentation purposes.' },
  { t: 'g', st: 'published', tv: false, by: 'ana.delacruz@tr.nst.edu.ph', title: 'Second Semester Grading Deadlines', content: 'Demo memo for faculty: encoding of second-semester grades closes at the end of the month. Late submissions require a written explanation to the academic head. This is sample data for presentation purposes.' },
  { t: 'g', st: 'published', tv: true, by: 'carlos.mendoza@tr.nst.edu.ph', title: 'Community Outreach Volunteers Needed', content: 'Demo call: the outreach office needs forty student volunteers for the weekend coastal clean-up. Service hours will be credited. Sign up at the student affairs office. This is sample data for presentation purposes.' },
  { t: 'g', st: 'published', tv: true, by: 'jenny.lim@tr.nst.edu.ph', title: 'Recognition Day Honors List', content: 'Demo announcement: congratulations to all honor students for this semester. The recognition program will be held in the gymnasium; awardees must be in complete uniform. This is sample data for presentation purposes.' },
  { t: 'g', st: 'published', tv: true, by: 'roberto.garcia@tr.nst.edu.ph', title: 'Important Advisory Regarding the Proper Use of Laboratory Equipment and Safety Protocols for All Science Classes This Semester', content: 'Demo advisory with a long title (edge case): students must wear safety goggles and secure long hair before entering the laboratory. Report any damaged apparatus to your instructor immediately. This is sample data for presentation purposes.' },
  { t: 'g', st: 'published', tv: true, by: 'lucia.fernandez@tr.nst.edu.ph', title: 'Lost and Found', content: 'Claim unclaimed IDs and wallets at the guard house. Short notice edge case.' },
  { t: 'g', st: 'published', tv: false, by: 'mark.villanueva@tr.nst.edu.ph', title: 'Student Handbook Addendum on Dress Code', content: 'Demo notice with long content (edge case): ' + 'All students are expected to observe the prescribed dress code on school days, including wash days. Shirts must be tucked in, skirts must be of regulation length, and closed shoes must be worn at all times inside the campus. Repeated violations will be referred to the discipline office for counseling and appropriate sanction. Class advisers are requested to check compliance during the first-period assembly. Parents and guardians will be notified after the third recorded violation. The full addendum is available at the student affairs office for photocopying. '.repeat(3) + 'This is sample data for presentation purposes.' },
  { t: 'g', st: 'scheduled', tv: true, pubInDays: 7, by: 'grace.aquino@tr.nst.edu.ph', title: 'Semestral Break Advisory', content: 'Demo advisory: semestral break begins in one week. Dormitory residents must coordinate checkout with the housing office. This is sample data for presentation purposes.' },
  { t: 'g', st: 'scheduled', tv: true, pubInDays: 14, by: 'daniel.torres@tr.nst.edu.ph', title: 'Christmas Party and Year-End Program', content: 'Demo announcement: the year-end celebration will feature class presentations and the annual lantern parade. Food assignments will be coordinated per section. This is sample data for presentation purposes.' },
  { t: 'g', st: 'scheduled', tv: true, pubInDays: 21, by: 'admin@nst.edu.ph', title: 'Career Fair and Job Placement Week', content: 'Demo announcement: graduating students are invited to the career fair with partner companies. Bring updated resumes and wear business attire. This is sample data for presentation purposes.' },
  { t: 'g', st: 'draft', tv: false, by: 'maria.santos@tr.nst.edu.ph', title: 'Draft: Thesis Defense Panel Schedule', content: 'Draft edge case (not yet final): tentative thesis defense panels for graduating classes. Subject to confirmation by the research coordinator. This is sample data for presentation purposes.' },
  { t: 'g', st: 'draft', tv: false, by: 'john.reyes@tr.nst.edu.ph', title: 'Draft: Canteen Menu Survey', content: 'Draft edge case: proposed survey on canteen menu preferences. Pending approval from the administration. This is sample data for presentation purposes.' },
  { t: 'g', st: 'archived', tv: false, by: 'admin@nst.edu.ph', title: 'Brigada Eskwela Kickoff (Archived)', content: 'Archived record from the school clean-up drive: thank you to all parent and student volunteers. This is sample data for presentation purposes.' },
  { t: 'g', st: 'archived', tv: true, expInDays: -30, by: 'ana.delacruz@tr.nst.edu.ph', title: 'Fire Drill Recap (Expired)', content: 'Expired edge case: last quarter fire drill results and evacuation-time report. Kept for records. This is sample data for presentation purposes.' },
  { t: 'c', st: 'published', by: 'maria.santos@tr.nst.edu.ph', title: 'BSIS 1-A Laboratory Schedule', content: 'Demo class notice: BSIS 1-A computer laboratory sessions move to Room 204 every Tuesday and Thursday. Bring your activity notebook. This is sample data for presentation purposes.', tg: { s: ['BSIS 1-A'], c: [], u: [] } },
  { t: 'c', st: 'published', by: 'john.reyes@tr.nst.edu.ph', title: 'BSIT Remedial Programming Sessions', content: 'Demo class notice: remedial programming sessions for all BSIT students every Wednesday afternoon at the IT lab. Attendance will be checked. This is sample data for presentation purposes.', tg: { s: [], c: ['BSIT'], u: [] } },
  { t: 'c', st: 'published', by: 'carlos.mendoza@tr.nst.edu.ph', title: 'Thesis Advisees Meeting', content: 'Demo class notice: all my thesis advisees must attend the consultation meeting on Saturday morning. Bring your chapter drafts. This is sample data for presentation purposes.', tg: { s: [], c: [], u: ['andrei.manacop@my.nst.edu.ph', 'sofia.cruz@my.nst.edu.ph', 'miguel.torres@my.nst.edu.ph'] } },
  { t: 'c', st: 'published', by: 'jenny.lim@tr.nst.edu.ph', title: 'BBA Accounting Quiz Coverage', content: 'Demo class notice: the accounting quiz covers chapters 4 to 6. Calculators allowed; no mobile phones during the exam. This is sample data for presentation purposes.', tg: { s: ['BBA 1-A'], c: ['BBA'], u: [] } },
  { t: 'c', st: 'published', by: 'roberto.garcia@tr.nst.edu.ph', title: 'BSHM Kitchen Duty Roster', content: 'Demo class notice: the kitchen duty roster for BSHM first and second year is posted on the bulletin board. Wear complete kitchen uniform. This is sample data for presentation purposes.', tg: { s: ['BSHM 1-A', 'BSHM 2-A'], c: [], u: [] } },
  { t: 'c', st: 'published', by: 'lucia.fernandez@tr.nst.edu.ph', title: 'BSCS Capstone Proposal Guidelines', content: 'Demo class notice: capstone proposals must follow the new format with problem statement, objectives, and system architecture diagram. Deadline is end of month. This is sample data for presentation purposes.', tg: { s: [], c: ['BSCS'], u: [] } },
  { t: 'c', st: 'published', by: 'mark.villanueva@tr.nst.edu.ph', title: 'BEED Field Study Briefing', content: 'Demo class notice: BEED first-year students must attend the field study briefing before deployment to partner schools. Bring your observation forms. This is sample data for presentation purposes.', tg: { s: ['BEED 1-A'], c: [], u: [] } },
  { t: 'c', st: 'published', by: 'grace.aquino@tr.nst.edu.ph', title: 'Saturday Make-up Classes', content: 'Demo class notice: make-up classes will be held on Saturday for missed sessions this week. Check your section assignment below. This is sample data for presentation purposes.', tg: { s: ['BSIS 2-A'], c: [], u: ['lily.gonzales@my.nst.edu.ph', 'isaac.bautista@my.nst.edu.ph'] } },
  { t: 'c', st: 'scheduled', pubInDays: 10, by: 'admin@nst.edu.ph', title: 'Scholarship Interviews for Computing Programs', content: 'Demo class notice: scholarship interviews for computing program applicants will be conducted next week at the guidance office. Bring your grades and recommendation letter. This is sample data for presentation purposes.', tg: { s: [], c: ['BSIS', 'BSIT', 'BSCS'], u: [] } },
  { t: 'c', st: 'draft', by: 'daniel.torres@tr.nst.edu.ph', title: 'Draft: BSCS 3-A Research Colloquium', content: 'Draft edge case: proposed research colloquium for third-year computing students. Topics and panelists to be confirmed. This is sample data for presentation purposes.', tg: { s: ['BSCS 3-A'], c: [], u: [] } },
];

// Gallery imports must use first-party NST photographs via import-nst-gallery.js.
const SEED_GALLERY = [];


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const maskDatabaseHost = (url) => {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return '(unparseable DATABASE_URL — host hidden)';
  }
};

const looksHosted = (url) => /neon\.tech|amazonaws|render\.com|railway/i.test(url || '');

const stats = {
  coursesCreated: 0, coursesSkipped: 0,
  sectionsCreated: 0, sectionsSkipped: 0,
  usersCreated: 0, usersSkipped: 0,
  teachersCreated: 0, studentsCreated: 0,
  categoriesCreated: 0, categoriesSkipped: 0,
  announcementsCreated: 0, announcementsSkipped: 0,
  galleryCreated: 0, gallerySkipped: 0,
  imagesUploaded: 0,
  errors: 0,
};
const errorLog = [];
const fail = (scope, label, err) => {
  stats.errors++;
  errorLog.push(`${scope} ${label}: ${err.message}`);
  console.error(`[${scope}] ERROR ${label}: ${err.message}`);
};

const findCourse = async (code, name) => {
  const { rows } = await query(`SELECT id, code, name FROM courses WHERE code = $1 OR name = $2 LIMIT 1`, [code, name]);
  return rows[0] ?? null;
};
const findSection = async (name) => {
  const { rows } = await query(`SELECT id, name FROM sections WHERE name = $1 LIMIT 1`, [name]);
  return rows[0] ?? null;
};
const findAnnouncement = async (title, type) => {
  const { rows } = await query(`SELECT id FROM announcements WHERE title = $1 AND type = $2 LIMIT 1`, [title, type]);
  return rows[0] ?? null;
};
const offsetDate = (days) => new Date(Date.now() + days * 86400000).toISOString();

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const run = async () => {
  const live = CONFIRMED && !DRY_RUN;

  console.log('Nova Schola Hub — comprehensive test-data seed');
  console.log(`Environment : ${config.nodeEnv}`);
  console.log(`Database    : ${config.databaseUrl ? maskDatabaseHost(config.databaseUrl) : '(not configured)'}`);
  console.log(`B2 bucket   : ${config.b2BucketName} @ ${config.b2Endpoint}`);
  if (config.databaseUrl && looksHosted(config.databaseUrl) && config.nodeEnv !== 'production') {
    console.log('WARNING: DATABASE_URL points at a hosted database but NODE_ENV is not "production".');
    console.log('Treat this as a production-like database regardless of NODE_ENV.');
  }
  console.log(live ? 'WARNING: You are about to modify the configured production database.' : 'DRY RUN — no writes, no uploads.');
  if (!live) {
    console.log(
      CONFIRMED
        ? 'Note: --confirm-production was given together with --dry-run, so staying in dry-run mode.'
        : 'Note: live changes require --confirm-production. Re-run with that flag to apply.'
    );
  }
  if (live && DEMO_PASSWORD.length < 8) {
    throw new Error('Refusing to seed: set SEED_DEMO_PASSWORD (min 8 chars) for new demo accounts.');
  }

  // Pre-flight: confirm tables exist (read-only), fail fast before any write.
  const { rows: tableRows } = await query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      AND tablename IN ('users','sections','courses','announcements','announcement_targets','gallery_media','categories')`
  );
  const found = new Set(tableRows.map((r) => r.tablename));
  const missing = ['users', 'sections', 'courses', 'announcements', 'announcement_targets', 'gallery_media', 'categories'].filter((t) => !found.has(t));
  if (missing.length > 0) {
    throw new Error(`Required tables missing: ${missing.join(', ')}. Run db:migrate first; aborting seed.`);
  }
  // NOTE: there is intentionally no 'notifications' table in this project
  // (verified across schema, models, routes, and web UI), so nothing is seeded for it.

  // Lazy-load B2 only when actually uploading (keeps dry-run side-effect free).
  const b2 = live ? await import('../src/shared/config/b2.js') : null;

  const courseCodeToId = new Map();
  const sectionNameToId = new Map();
  const sectionNameToCourseId = new Map();
  const emailToId = new Map();
  const categoryNameToId = new Map();
  const seedUserEmails = new Set([
    normalizeEmail('admin@nst.edu.ph'),
    ...SEED_TEACHERS.map((t) => normalizeEmail(t.email)),
    ...SEED_STUDENT_ROWS.map((s) => normalizeEmail(`${s[1]}@my.nst.edu.ph`)),
  ]);

  // ---- 1. Courses (idempotent by code/name) ----
  for (const seed of SEED_COURSES) {
    try {
      const existing = await findCourse(seed.code, seed.name);
      if (existing) {
        courseCodeToId.set(seed.code, existing.id);
        stats.coursesSkipped++;
        console.log(`[course] skip existing ${seed.code}`);
        continue;
      }
      if (!live) {
        stats.coursesCreated++;
        console.log(`[course] would create ${seed.code} — ${seed.name}`);
        continue;
      }
      try {
        const created = await courseModel.createCourse(seed);
        courseCodeToId.set(seed.code, created.id);
      } catch (err) {
        if (err.code === '23505') {
          const raced = await findCourse(seed.code, seed.name);
          courseCodeToId.set(seed.code, raced.id);
          stats.coursesSkipped++;
          console.log(`[course] skip existing ${seed.code} (race)`);
          continue;
        }
        throw err;
      }
      stats.coursesCreated++;
      console.log(`[course] created ${seed.code}`);
    } catch (err) {
      fail('course', seed.code, err);
    }
  }

  // ---- 2. Sections (idempotent by name) ----
  for (const seed of SEED_SECTIONS) {
    try {
      const existing = await findSection(seed.name);
      let sectionId = existing ? existing.id : null;
      if (existing) {
        stats.sectionsSkipped++;
        console.log(`[section] skip existing "${seed.name}"`);
      } else if (!live) {
        stats.sectionsCreated++;
        console.log(`[section] would create "${seed.name}" (${seed.grade_level})`);
        continue;
      } else {
        try {
          const created = await sectionModel.createSection({ name: seed.name, grade_level: seed.grade_level });
          sectionId = created.id;
        } catch (err) {
          if (err.code === '23505') {
            const raced = await findSection(seed.name);
            sectionId = raced.id;
            stats.sectionsSkipped++;
            console.log(`[section] skip existing "${seed.name}" (race)`);
            sectionNameToId.set(seed.name, sectionId);
            continue;
          }
          throw err;
        }
        stats.sectionsCreated++;
        console.log(`[section] created "${seed.name}"`);
      }
      sectionNameToId.set(seed.name, sectionId);
    } catch (err) {
      fail('section', seed.name, err);
    }
  }
  // Map each seed section to its course (prefer live DB id, else dry-run placeholder).
  for (const seed of SEED_SECTIONS) {
    let courseId = courseCodeToId.get(seed.courseCode) ?? null;
    if (courseId === null) {
      const c = await findCourse(seed.courseCode, seed.courseCode);
      courseId = c ? c.id : null;
    }
    if (courseId === null && !live) courseId = 0; // dry-run placeholder
    if (courseId !== null) sectionNameToCourseId.set(seed.name, courseId);
  }

  // ---- 3. Users: 1 admin + 10 teachers + 30 students (idempotent by email) ----
  const ensureUser = async ({ email, full_name, role, section_id, course_id, is_active }) => {
    const norm = normalizeEmail(email);
    const existing = await userModel.findByEmail(norm);
    if (existing) {
      emailToId.set(norm, existing.id);
      stats.usersSkipped++;
      console.log(`[user] skip existing ${norm} (role=${existing.role})`);
      return existing;
    }
    if (!live) {
      stats.usersCreated++;
      if (role === 'teacher') stats.teachersCreated++;
      if (role === 'student') stats.studentsCreated++;
      console.log(`[user] would create ${norm} (role=${role})`);
      return null;
    }
    try {
      const created = await userModel.createUser({
        email: norm,
        password_hash: await hashPassword(DEMO_PASSWORD),
        full_name,
        role,
        section_id,
        course_id,
        student_level: role === 'student' ? 'section' : null,
        section_course: null,
      });
      if (!is_active) {
        await query(`UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1`, [created.id]);
      }
      emailToId.set(norm, created.id);
      stats.usersCreated++;
      if (role === 'teacher') stats.teachersCreated++;
      if (role === 'student') stats.studentsCreated++;
      console.log(`[user] created ${norm} (role=${role}, id=${created.id}${is_active ? '' : ', inactive'})`);
      return created;
    } catch (err) {
      if (err.code === '23505') {
        const raced = await userModel.findByEmail(norm);
        emailToId.set(norm, raced.id);
        stats.usersSkipped++;
        console.log(`[user] skip existing ${norm} (race)`);
        return raced;
      }
      throw err;
    }
  };

  try {
    await ensureUser({ email: 'admin@nst.edu.ph', full_name: 'System Administrator', role: 'admin', section_id: null, course_id: null, is_active: true });
  } catch (err) {
    fail('user', 'admin@nst.edu.ph', err);
  }
  for (const t of SEED_TEACHERS) {
    try {
      await ensureUser({ email: t.email, full_name: t.full_name, role: 'teacher', section_id: null, course_id: null, is_active: true });
    } catch (err) {
      fail('user', t.email, err);
    }
  }
  for (const [fullName, local, sectionName, isActive] of SEED_STUDENT_ROWS) {
    try {
      let sectionId = sectionNameToId.get(sectionName) ?? null;
      if (sectionId === null) {
        const s = await findSection(sectionName);
        sectionId = s ? s.id : null;
      }
      let courseId = sectionNameToCourseId.get(sectionName) ?? null;
      if (sectionId === null && !live) sectionId = 0; // dry-run placeholder
      if (courseId === null && !live) courseId = 0; // dry-run placeholder
      if (sectionId === null || courseId === null) {
        throw new Error(`section "${sectionName}" not found (sections must seed first)`);
      }
      if (!live) {
        // Dry-run mirrors ensureUser's existence check/reporting (read-only):
        // existing student → SKIP, missing student → WOULD CREATE.
        const norm = normalizeEmail(`${local}@my.nst.edu.ph`);
        const existing = await userModel.findByEmail(norm);
        if (existing) {
          emailToId.set(norm, existing.id);
          stats.usersSkipped++;
          console.log(`[user] skip existing ${norm} (role=${existing.role}, ${sectionName})`);
        } else {
          stats.usersCreated++;
          stats.studentsCreated++;
          console.log(`[user] would create ${norm} (role=student, ${sectionName})`);
        }
        continue;
      }
      await ensureUser({
        email: `${local}@my.nst.edu.ph`,
        full_name: fullName,
        role: 'student',
        section_id: sectionId,
        course_id: courseId,
        is_active: isActive,
      });
    } catch (err) {
      fail('user', `${local}@my.nst.edu.ph`, err);
    }
  }

  // ---- 4. Categories (idempotent by name) ----
  const adminRow = await userModel.findByEmail(normalizeEmail('admin@nst.edu.ph'));
  const adminId = adminRow ? adminRow.id : null;
  for (const seed of SEED_CATEGORIES) {
    try {
      const existing = await categoryModel.findCategoryByName(seed.name);
      if (existing) {
        categoryNameToId.set(seed.name, existing.id);
        stats.categoriesSkipped++;
        console.log(`[category] skip existing "${seed.name}"`);
        continue;
      }
      if (!live) {
        stats.categoriesCreated++;
        console.log(`[category] would create "${seed.name}"`);
        continue;
      }
      try {
        const created = await categoryModel.createCategory({ name: seed.name, description: seed.description, created_by: adminId });
        categoryNameToId.set(seed.name, created.id);
      } catch (err) {
        if (err.code === '23505') {
          const raced = await categoryModel.findCategoryByName(seed.name);
          categoryNameToId.set(seed.name, raced.id);
          stats.categoriesSkipped++;
          console.log(`[category] skip existing "${seed.name}" (race)`);
          continue;
        }
        throw err;
      }
      stats.categoriesCreated++;
      console.log(`[category] created "${seed.name}"`);
    } catch (err) {
      fail('category', seed.name, err);
    }
  }

  // ---- 5. Announcements: 30 (idempotent by title+type) ----
  const resolveAuthor = async (authorEmail) => {
    const norm = normalizeEmail(authorEmail);
    let id = emailToId.get(norm) ?? null;
    if (id === null) {
      const u = await userModel.findByEmail(norm);
      id = u ? u.id : null;
    }
    if (id === null && !live && seedUserEmails.has(norm)) return 0; // dry-run placeholder
    return id;
  };
  for (const seed of SEED_ANNOUNCEMENTS) {
    const type = seed.t === 'c' ? 'class' : 'general';
    try {
      const existing = await findAnnouncement(seed.title, type);
      if (existing) {
        stats.announcementsSkipped++;
        console.log(`[announcement] skip existing "${seed.title}"`);
        continue;
      }
      const authorId = await resolveAuthor(seed.by);
      if (authorId === null) throw new Error(`author ${seed.by} not found (users must seed first)`);
      const publish_at = seed.st === 'scheduled' ? offsetDate(seed.pubInDays ?? 7) : null;
      const expires_at = seed.expInDays !== undefined ? offsetDate(seed.expInDays) : null;
      if (!live) {
        stats.announcementsCreated++;
        console.log(`[announcement] would create "${seed.title}" (${type}/${seed.st}) by ${seed.by}`);
        continue;
      }
      if (type === 'general') {
        await announcementModel.createAnnouncement({
          author_id: authorId,
          type: 'general',
          title: seed.title,
          content: seed.content,
          image_url: null,
          b2_key: null,
          show_on_tv: seed.tv ?? true,
          status: seed.st,
          publish_at,
          expires_at,
        });
      } else {
        // Resolve targets against live rows; the model inserts atomically (BEGIN/COMMIT).
        const section_ids = [];
        for (const name of seed.tg.s) {
          let sid = sectionNameToId.get(name) ?? null;
          if (sid === null) {
            const s = await findSection(name);
            sid = s ? s.id : null;
          }
          if (sid === null) throw new Error(`target section "${name}" not found`);
          section_ids.push(sid);
        }
        const course_ids = [];
        for (const code of seed.tg.c) {
          let cid = courseCodeToId.get(code) ?? null;
          if (cid === null) {
            const c = await findCourse(code, code);
            cid = c ? c.id : null;
          }
          if (cid === null) throw new Error(`target course "${code}" not found`);
          course_ids.push(cid);
        }
        const student_ids = [];
        for (const em of seed.tg.u) {
          const uid = await resolveAuthor(em);
          if (uid === null) throw new Error(`target student ${em} not found`);
          student_ids.push(uid);
        }
        if (section_ids.length + course_ids.length + student_ids.length === 0) {
          throw new Error('class announcement has no resolvable targets');
        }
        await announcementModel.createClassWithTargets({
          author_id: authorId,
          title: seed.title,
          content: seed.content,
          image_url: null,
          b2_key: null,
          status: seed.st,
          publish_at,
          expires_at,
          section_ids,
          course_ids,
          student_ids,
        });
      }
      stats.announcementsCreated++;
      console.log(`[announcement] created "${seed.title}" (${type}/${seed.st})`);
    } catch (err) {
      fail('announcement', `"${seed.title}"`, err);
    }
  }

  // Gallery seeding disabled: use the dedicated, sourced NST importer.

  // ---- 7. Verification (read-only; never calls updateLastLogin) ----
  const v = await getClient();
  try {
    const seedEmails = [
      normalizeEmail('admin@nst.edu.ph'),
      ...SEED_TEACHERS.map((t) => normalizeEmail(t.email)),
      ...SEED_STUDENT_ROWS.map((s) => normalizeEmail(`${s[1]}@my.nst.edu.ph`)),
    ];
    const { rows: userRows } = await v.query(
      `SELECT email, role, is_active, section_id, course_id,
              password_hash LIKE '$2%' AS hash_ok
         FROM users WHERE email = ANY($1)`,
      [seedEmails]
    );
    const { rows: courseRows } = await v.query(`SELECT code FROM courses WHERE code = ANY($1)`, [SEED_COURSES.map((c) => c.code)]);
    const { rows: sectionRows } = await v.query(`SELECT name FROM sections WHERE name = ANY($1)`, [SEED_SECTIONS.map((s) => s.name)]);
    const { rows: annRows } = await v.query(
      `SELECT type, status, COUNT(*)::int AS n FROM announcements
        WHERE title = ANY($1) GROUP BY type, status ORDER BY type, status`,
      [SEED_ANNOUNCEMENTS.map((a) => a.title)]
    );
    const { rows: galRows } = await v.query(
      `SELECT status, COUNT(*)::int AS n, COUNT(*) FILTER (WHERE featured)::int AS feat
         FROM gallery_media WHERE original_filename = ANY($1) GROUP BY status ORDER BY status`,
      [SEED_GALLERY.map((g) => g.f)]
    );
    const { rows: badFk } = await v.query(
      `SELECT
        (SELECT COUNT(*)::int FROM announcements a LEFT JOIN users u ON u.id = a.author_id WHERE a.title = ANY($1) AND u.id IS NULL) AS bad_ann_author,
        (SELECT COUNT(*)::int FROM gallery_media g LEFT JOIN users u ON u.id = g.uploader_id WHERE g.original_filename = ANY($2) AND u.id IS NULL) AS bad_gal_uploader,
        (SELECT COUNT(*)::int FROM users WHERE email = ANY($3) AND role = 'student' AND (section_id IS NULL OR course_id IS NULL)) AS students_missing_fk,
        (SELECT COUNT(*)::int FROM users WHERE email = ANY($3) AND password_hash NOT LIKE '$2%') AS bad_hashes`,
      [SEED_ANNOUNCEMENTS.map((a) => a.title), SEED_GALLERY.map((g) => g.f), seedEmails]
    );
    console.log('--- verification (seed keys only) ---');
    console.log(`[verify] users: ${userRows.length}/41 (admin=${userRows.filter((r) => r.role === 'admin').length}, teachers=${userRows.filter((r) => r.role === 'teacher').length}, students=${userRows.filter((r) => r.role === 'student').length})`);
    console.log(`[verify] courses: ${courseRows.length}/${SEED_COURSES.length}, sections: ${sectionRows.length}/${SEED_SECTIONS.length}`);
    console.log(`[verify] announcements: ${annRows.map((r) => `${r.type}/${r.status}=${r.n}`).join(', ') || 'none'}`);
    console.log(`[verify] gallery: ${galRows.map((r) => `${r.status}=${r.n}${r.feat ? ` (featured=${r.feat})` : ''}`).join(', ') || 'none'}`);
    console.log(`[verify] FK/hash faults: bad_ann_author=${badFk[0].bad_ann_author}, bad_gal_uploader=${badFk[0].bad_gal_uploader}, students_missing_fk=${badFk[0].students_missing_fk}, bad_hashes=${badFk[0].bad_hashes}`);
    if (Number(badFk[0].bad_ann_author) + Number(badFk[0].bad_gal_uploader) + Number(badFk[0].bad_hashes) > 0) {
      stats.errors++;
      errorLog.push('verification: FK or password-hash faults detected (see counts above)');
    }
    // Auth safety: exactly ONE read-only bcrypt check of the admin demo account,
    // only on a live run with a password configured. Never touches last_login_at.
    if (live && DEMO_PASSWORD) {
      const admin = await userModel.findByEmailWithHash(normalizeEmail('admin@nst.edu.ph'));
      const ok = admin && admin.is_active ? await comparePassword(DEMO_PASSWORD, admin.password_hash).catch(() => false) : false;
      console.log(`[verify] admin demo login check: ${ok ? 'OK' : 'FAIL (new account or pre-existing password)'}`);
      if (!ok) {
        stats.errors++;
        errorLog.push('admin demo login check failed (account may pre-date the seed with a different password — not modified)');
      }
    }
  } finally {
    v.release();
  }

  console.log('---');
  console.log('USERS (seed scope)');
  console.log('  Admin: 1');
  console.log('  Teachers: 10');
  console.log('  Students: 30');
  console.log('  Total users: 41');
  console.log(`  Created this run: ${stats.usersCreated} (admin=${stats.usersCreated - stats.teachersCreated - stats.studentsCreated}, teachers=${stats.teachersCreated}, students=${stats.studentsCreated}), Reused: ${stats.usersSkipped}`);
  console.log(`COURSES  Would create: ${stats.coursesCreated}  Would reuse: ${stats.coursesSkipped}`);
  console.log(`SECTIONS Would create: ${stats.sectionsCreated}  Would reuse: ${stats.sectionsSkipped}`);
  console.log(`ANNOUNCEMENTS Would create: ${stats.announcementsCreated}  Would reuse: ${stats.announcementsSkipped}`);
  console.log(`GALLERY  Would create: ${stats.galleryCreated}  Would reuse: ${stats.gallerySkipped}  Images uploaded: ${stats.imagesUploaded}`);
  console.log('NOTIFICATIONS Would create: 0 (no notifications table in this project)');
  console.log(`Errors: ${stats.errors}`);
  if (errorLog.length > 0) {
    console.log('Error details:');
    for (const line of errorLog) console.log(`  - ${line}`);
  }
  console.log(live ? 'LIVE RUN COMPLETE.' : 'DRY RUN — NO WRITES PERFORMED.');
}

run()
  .then(() => closePool())
  .then(() => process.exit(stats.errors > 0 ? 1 : 0))
  .catch(async (err) => {
    console.error('Seed failed:', err.message);
    await closePool().catch(() => {});
    process.exit(1);
  });
