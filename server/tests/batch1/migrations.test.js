import test from 'node:test';
import assert from 'node:assert/strict';
import { isolatedDatabase } from './harness.js';
import { readFile } from 'node:fs/promises';
import { migrate } from '../../src/shared/db/migrate.js';

// The harness creates a fresh, strictly localhost test database per run.
test('upgrade preserves historical rows, unknown membership, and supports repeated application', async () => {
  const isolated = await isolatedDatabase('migration'); const db = isolated.db;
  try {
    await db.query(await readFile(new URL('../../../DATABASE_SCHEMA.sql', import.meta.url), 'utf8'));
    const user = (await db.query("INSERT INTO users (email,password_hash,full_name,role,section_course) VALUES ('historic@my.nst.edu.ph','historic-hash','Historic Student','student','unmapped') RETURNING id")).rows[0];
    await db.query("INSERT INTO announcements(author_id,type,title,content,status) VALUES ($1,'general','History','Preserve this','published')", [user.id]);
    const historicalClass = (await db.query("INSERT INTO announcements(author_id,type,title,content) VALUES($1,'class','Historical audience','Preserved') RETURNING id", [user.id])).rows[0];
    await db.query("INSERT INTO announcement_targets(announcement_id,target_type,student_id) VALUES($1,'student',$2)", [historicalClass.id,user.id]);
    await db.query("INSERT INTO gallery_media(uploader_id,media_type,file_url,b2_key,original_filename,status) VALUES($1,'image','https://legacy.invalid/image','gallery/historical-image','old.png','approved'),($1,'video','https://legacy.invalid/video','gallery/historical-video','old.mp4','approved')", [user.id]);
    await db.query(await readFile(new URL('../../../scripts/migration-preflight.sql', import.meta.url), 'utf8'));
    await migrate(db); await migrate(db);
    await db.query(await readFile(new URL('../../../scripts/migration-verify.sql', import.meta.url), 'utf8'));
    const saved = (await db.query('SELECT * FROM users WHERE id=$1', [user.id])).rows[0];
    assert.equal(saved.department_id, null); assert.equal(saved.section_course, 'unmapped'); assert.equal(saved.password_hash, 'historic-hash');
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM announcements')).rows[0].n, 2);
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM announcement_targets')).rows[0].n, 1);
    assert.deepEqual((await db.query('SELECT b2_key FROM gallery_media ORDER BY id')).rows.map(r=>r.b2_key), ['gallery/historical-image','gallery/historical-video']);
    assert.deepEqual((await db.query('SELECT name FROM departments ORDER BY code')).rows.map(r=>r.name), ['College','Junior High School','Senior High School']);
    assert.equal((await db.query('SELECT email_eligible FROM announcements')).rows[0].email_eligible,false);
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM departments')).rows[0].n, 3);
    await assert.rejects(db.query("INSERT INTO departments(code,name) VALUES ('elementary','Elementary')"));
    await assert.rejects(db.query("INSERT INTO announcements(author_id,type,title,content) VALUES ($1,'department','Missing department','x')", [user.id]));
    await db.query("INSERT INTO announcements(author_id,type,title,content,department_id) SELECT $1,'department','College','x',id FROM departments WHERE code='college'", [user.id]);
    await db.query("INSERT INTO users(email,password_hash,full_name,role) VALUES ('admin@nst.edu.ph','hash','Admin','admin')");
    await assert.rejects(db.query("INSERT INTO users(email,password_hash,full_name,role) VALUES ('extra@nst.edu.ph','hash','Extra','admin')"));
    const departments = (await db.query('SELECT id,code FROM departments')).rows;
    const college = departments.find(d=>d.code==='college').id, shs=departments.find(d=>d.code==='shs').id;
    const section=(await db.query("INSERT INTO sections(name,grade_level) VALUES('Reviewed','1st Year') RETURNING id")).rows[0].id;
    await db.query('UPDATE users SET section_id=$1 WHERE id=$2',[section,user.id]);
    await db.query('UPDATE sections SET department_id=$1 WHERE id=$2',[college,section]);
    assert.equal((await db.query('SELECT department_id FROM users WHERE id=$1',[user.id])).rows[0].department_id,null);
    await assert.rejects(db.query('UPDATE users SET department_id=$1 WHERE id=$2',[shs,user.id]));
    await db.query('UPDATE users SET department_id=$1 WHERE id=$2',[college,user.id]);
    await assert.rejects(db.query('UPDATE sections SET department_id=$1 WHERE id=$2',[shs,section]));
    await assert.rejects(db.query('DELETE FROM sections WHERE id=$1',[section]));
    const historical=(await db.query("INSERT INTO announcements(author_id,type,title,content) VALUES($1,'class','History class','Targets stay') RETURNING id",[user.id])).rows[0];
    await db.query("INSERT INTO announcement_targets(announcement_id,target_type,section_id) VALUES($1,'section',$2)",[historical.id,section]);
    await db.query('UPDATE users SET section_id=NULL WHERE id=$1',[user.id]);
    await assert.rejects(db.query('DELETE FROM sections WHERE id=$1',[section]));
    await db.query("UPDATE schema_migrations SET checksum='changed' WHERE version='004_paper_departments.sql'");
    await assert.rejects(migrate(db),/Previously applied migration changed/);
  } finally { await isolated.cleanup(); }
});

test('multiple Administrators abort migration atomically without deleting accounts',async()=>{
  const isolated=await isolatedDatabase('rollback'),db=isolated.db;
  try{
    await db.query(await readFile(new URL('../../../DATABASE_SCHEMA.sql',import.meta.url),'utf8'));
    await db.query("INSERT INTO users(email,password_hash,full_name,role) VALUES('a@nst.edu.ph','hash','A','admin'),('b@nst.edu.ph','hash','B','admin')");
    await assert.rejects(migrate(db));
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM users')).rows[0].n,2);
    assert.equal((await db.query("SELECT to_regclass('public.departments') AS name")).rows[0].name,null);
    assert.equal((await db.query("SELECT to_regclass('public.schema_migrations') AS name")).rows[0].name,null);
  }finally{await isolated.cleanup();}
});

test('normalized-name conflicts abort upgrade without merging sections or history', async () => {
  const isolated = await isolatedDatabase('section_conflicts');
  try {
    await isolated.db.query(await readFile(new URL('../../../DATABASE_SCHEMA.sql', import.meta.url), 'utf8'));
    await isolated.db.query("INSERT INTO sections(name,grade_level) VALUES('BSIS 1-A','1st Year'),('bsis   1-a','1st Year')");
    await assert.rejects(migrate(isolated.db), /Equivalent section names exist/);
    assert.equal((await isolated.db.query('SELECT count(*)::int AS n FROM sections')).rows[0].n, 2);
    assert.equal((await isolated.db.query("SELECT to_regclass('public.schema_migrations') AS table_name")).rows[0].table_name, null);
  } finally { await isolated.cleanup(); }
});
