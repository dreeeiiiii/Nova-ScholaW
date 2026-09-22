import { query } from "./src/shared/config/db.js";

const r = await query(
  "SELECT file_url FROM gallery_media WHERE file_url LIKE 'https://res.cloudinary.com/%' ORDER BY id DESC LIMIT 1",
);
console.log("URL:", r.rows[0]?.file_url);
process.exit(0);
