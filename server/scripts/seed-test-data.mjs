import bcrypt from "bcrypt";
import { query, getClient } from "../src/shared/config/db.js";

const PEXELS = [
  "https://images.pexels.com/photos/8127310/pexels-photo-8127310.jpeg",
  "https://images.pexels.com/photos/16276592/pexels-photo-16276592.jpeg",
  "https://images.pexels.com/photos/33524620/pexels-photo-33524620.jpeg",
  "https://images.pexels.com/photos/9159042/pexels-photo-9159042.jpeg",
  "https://images.pexels.com/photos/14700793/pexels-photo-14700793.jpeg",
  "https://images.pexels.com/photos/18587790/pexels-photo-18587790.jpeg",
  "https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg",
  "https://images.pexels.com/photos/1595391/pexels-photo-1595391.jpeg",
  "https://images.pexels.com/photos/159844/cellular-education-classroom-159844.jpeg",
  "https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg",
];

const FIRST = [
  "Juan",
  "Maria",
  "Jose",
  "Ana",
  "Pedro",
  "Rosa",
  "Carlos",
  "Lucia",
  "Miguel",
  "Elena",
  "Rafael",
  "Sofia",
  "Diego",
  "Isabella",
  "Luis",
  "Carmen",
  "Antonio",
  "Paula",
  "Fernando",
  "Bianca",
  "Marco",
  "Gabriela",
  "Alberto",
  "Natalia",
  "Ricardo",
  "Valeria",
  "Eduardo",
  "Daniela",
  "Andres",
  "Camila",
  "Victor",
  "Andrea",
  "Hector",
  "Monica",
  "Oscar",
  "Patricia",
  "Raul",
  "Veronica",
  "Sergio",
  "Teresa",
  "Jorge",
  "Ximena",
  "Emilio",
  "Renata",
  "Nicolas",
  "Alessandra",
  "Adrian",
  "Mariana",
  "Fabian",
  "Alejandra",
];

const LAST = [
  "Santos",
  "Reyes",
  "Cruz",
  "Bautista",
  "Ocampo",
  "Garcia",
  "Mendoza",
  "Torres",
  "Flores",
  "Ramos",
  "Villanueva",
  "Aquino",
  "Del Rosario",
  "Castillo",
  "Navarro",
  "Domingo",
  "Salazar",
  "Rivera",
  "Aguilar",
  "Marquez",
];

const CAPTIONS = [
  "Foundation Day",
  "Intramurals highlights",
  "Science fair",
  "Graduation",
  "Sports fest",
  "Cultural dance",
  "Field trip",
  "Art showcase",
  "Debate competition",
  "Choir practice",
];

async function main() {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    const sections = (await client.query("SELECT id FROM sections LIMIT 3"))
      .rows;
    const courses = (await client.query("SELECT id FROM courses LIMIT 3")).rows;
    const categories = (await client.query("SELECT id FROM categories")).rows;
    const admin = (
      await client.query("SELECT id FROM users WHERE role='admin' LIMIT 1")
    ).rows[0];
    const teacher = (
      await client.query("SELECT id FROM users WHERE role='teacher' LIMIT 1")
    ).rows[0];

    if (
      !sections.length ||
      !courses.length ||
      !categories.length ||
      !admin ||
      !teacher
    ) {
      throw new Error("Run npm run db:seed first");
    }

    const password = "Student@1234";
    const hash = await bcrypt.hash(password, 10);

    console.log("Inserting 50 students...");
    const studentIds = [];
    for (let i = 1; i <= 50; i++) {
      const email = `student${100 + i}@my.nst.edu.ph`;
      const name = `${FIRST[(i - 1) % FIRST.length]} ${LAST[(i - 1) % LAST.length]}`;
      const r = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, section_id, course_id, is_active)
         VALUES ($1,$2,$3,'student',$4,$5,true)
         ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, is_active=true
         RETURNING id`,
        [
          email,
          hash,
          name,
          sections[i % sections.length].id,
          courses[i % courses.length].id,
        ],
      );
      studentIds.push(r.rows[0].id);
    }

    console.log("Inserting 50 gallery images...");
    const statuses = [
      "approved",
      "approved",
      "approved",
      "pending",
      "rejected",
    ];
    for (let i = 0; i < 50; i++) {
      const status = statuses[i % statuses.length];
      const isPending = status === "pending";
      const isRejected = status === "rejected";
      await client.query(
        `INSERT INTO gallery_media
         (uploader_id, category_id, media_type, file_url, original_filename, caption, status, reviewed_by, reviewed_at, rejection_reason, featured)
         VALUES ($1,$2,'image',$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          studentIds[i % studentIds.length],
          categories[i % categories.length].id,
          PEXELS[i % PEXELS.length],
          `test-${i + 1}.jpg`,
          `${CAPTIONS[i % CAPTIONS.length]} #${i + 1}`,
          status,
          isPending ? null : admin.id,
          isPending ? null : new Date(),
          isRejected ? "Blurry photo. Please upload a clearer image." : null,
          i % 10 === 0,
        ],
      );
    }

    console.log("Inserting 20 announcements...");
    const announcements = [
      [
        "Foundation Day 2026",
        "general",
        "Join us for Foundation Day. Assembly 7:30 AM at the covered court.",
      ],
      [
        "Intramurals registration open",
        "general",
        "Sign up your team. Registration closes March 5.",
      ],
      [
        "Science Fair winners",
        "general",
        "Congratulations to all participants.",
      ],
      [
        "Enrollment for SY 2026-2027",
        "general",
        "Early enrollment opens April 1.",
      ],
      [
        "Parent-Teacher Conference",
        "general",
        "March 22 at the AVR. Parents encouraged to attend.",
      ],
      [
        "Library extended hours",
        "general",
        "Open until 7 PM during exam week.",
      ],
      ["BSIS 3 consultation", "class", "Mandatory capstone consultation."],
      ["Grade 10 Field Trip", "class", "March 18. Permission slips required."],
      ["Chess Club tryouts", "general", "March 15 at the AVR."],
      ["Basketball varsity practice", "class", "Practice moved to 4 PM."],
      ["Recognition Day", "general", "April 5. Program will follow."],
      [
        "Cafeteria menu update",
        "general",
        "New healthy options starting March 10.",
      ],
      ["BSIT 2 workshop", "class", "Free JavaScript workshop this Saturday."],
      ["Scholarship applications", "general", "Deadline April 30."],
      ["Sports Fest opening", "general", "March 20 at 8 AM."],
      ["Class suspension", "general", "Classes suspended March 12."],
      ["New canteen concessionaire", "general", "Starting March 8."],
      ["Grade 11 orientation", "class", "Senior year orientation."],
      ["Alumni homecoming", "general", "April 12."],
      ["Summer class offerings", "general", "Start April 20."],
    ];

    for (const [title, type, body] of announcements) {
      await client.query(
        `INSERT INTO announcements (title, content, type, status, author_id, image_url, publish_at, show_on_tv)
         VALUES ($1,$2,$3,'published',$4,$5,NOW(),$6)`,
        [
          title,
          body,
          type,
          teacher.id,
          PEXELS[Math.floor(Math.random() * PEXELS.length)],
          type === "general",
        ],
      );
    }

    await client.query("COMMIT");
    console.log("\n✓ Done. 50 students, 50 images, 20 announcements.");
    console.log("Login: student101@my.nst.edu.ph / Student@1234");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Failed:", e.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

main();
