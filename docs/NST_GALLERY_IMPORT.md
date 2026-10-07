# NST Event Gallery cleanup and import

Workspace implementation: October 8, 2026. **Production cleanup/import is blocked by outbound network access (EACCES). Do not interpret local test results as a production deployment.** No push has been performed.

## Trace of old colored cards

The legacy `server/scripts/seed-production.js` defined 30 generated images, `seed-gal-01.jpg` through `seed-gal-30.jpg`. Its `generateDemoImage` rendered 1200×800 SVG artwork with a flat background, decorative circles, and the text “Nova Schola” plus an invented event label, then converted it to JPEG with Sharp. Its gallery loop uploaded the JPEG using the existing `b2.uploadBuffer` service under `gallery/<timestamp>-<16-hex-random>-seed-gal-NN.jpg`, then inserted a normal gallery_media row with its development caption.

Specific matches to the reported examples:

| Filename | Embedded event label | Seed category | Intended status |
|---|---|---|---|
| seed-gal-16.jpg | Gift Giving | Community Outreach | approved |
| seed-gal-17.jpg | Science Fair | School Events | approved |
| seed-gal-18.jpg | Morning Assembly | Campus Life | approved |

The seed defined 18 approved, 8 pending and 4 rejected candidates. **These are definition counts, not verified production row counts.** Exact historical identity data is retained in `server/scripts/data/legacy-gallery-demo.json` solely for cleanup matching. The broad seed no longer generates or inserts gallery photos.

GalleryModel browses approved image rows, GalleryController refreshes their presigned B2 URLs, and both the public gallery and homepage render those API records. No matching static frontend card assets, placeholder URL generator, or hardcoded demo-photo captions were found in those frontend paths. The observed labels match the legacy generator; the live API/database/B2 chain could not be independently inspected from this session.

## Selected first-party photographs

Eight local WebP photographs were visually reviewed. Promotional graphics were excluded. All selected source pages in the existing manifest are the official NST homepage; the two Foundation captions also follow the context recorded in the existing manifest and NST_IMAGE_SOURCES.md. Other captions describe visible school/student activity without inventing event names. Exact event dates are unknown and are not fabricated. Gallery timestamps are explicitly labeled “Uploaded”; the importer does not backdate created_at.

| # | Caption | Local image | Provenance |
|---|---|---|---|
| 1 | NST Foundation Activity | /nst/misc/m50-shs-18-32a1dd37.webp | [Image](https://nst.edu.ph/wp-content/uploads/2024/12/M50-SHS-18.jpg) · [Source page](https://nst.edu.ph/) |
| 2 | Nova Schola Tanauan Foundation Activity | /nst/misc/m50-shs-12-41e59256.webp | [Image](https://nst.edu.ph/wp-content/uploads/2024/12/M50-SHS-12.jpg) · [Source page](https://nst.edu.ph/) |
| 3 | Nova Schola Student Activity | /nst/misc/jhs-activity-01-bc6356fb.webp | [Image](https://nst.edu.ph/wp-content/uploads/2022/05/JHS-Activity-01.jpg) · [Source page](https://nst.edu.ph/) |
| 4 | Nova Schola Student Gathering | /nst/misc/jhs-class-night-01-scaled-36c42894.webp | [Image](https://nst.edu.ph/wp-content/uploads/2022/05/JHS-Class-Night-01-scaled.jpg) · [Source page](https://nst.edu.ph/) |
| 5 | Students during a Nova Schola Tanauan school activity. | /nst/misc/img_3455-5ff14157.webp | [Image](https://nst.edu.ph/wp-content/uploads/2024/12/IMG_3455.jpg) · [Source page](https://nst.edu.ph/) |
| 6 | Nova Schola Tanauan student learning activity. | /nst/misc/img_9178-32a234e5.webp | [Image](https://nst.edu.ph/wp-content/uploads/2024/12/IMG_9178.jpg) · [Source page](https://nst.edu.ph/) |
| 7 | Students during a Nova Schola Tanauan school activity. | /nst/misc/img_3415-70d0de67.webp | [Image](https://nst.edu.ph/wp-content/uploads/2024/12/IMG_3415.jpg) · [Source page](https://nst.edu.ph/) |
| 8 | Nova Schola Tanauan student activity. | /nst/misc/img_2679-13ea4793.webp | [Image](https://nst.edu.ph/wp-content/uploads/2024/12/IMG_2679-1113x628.jpg) · [Source page](https://nst.edu.ph/) |

SHA-256 hashes, source URLs/pages, neutral captions and category choices are captured in `server/scripts/data/nst-gallery.json`. The local files remain unchanged.

## Import and cleanup behavior

Run from `server/`:

```powershell
node scripts/import-nst-gallery.js --dry-run --offline
node scripts/import-nst-gallery.js --dry-run
node scripts/import-nst-gallery.js --apply
```

The offline mode only validates local sources and reports definition counts. The normal dry run performs read-only database queries and B2 downloads, reporting confirmed candidates and ambiguous rows without record/object writes. Apply requires an existing active Admin and uses the configured database and existing B2 service; it creates no users, changes no credentials, and never imports the application, announcements, email services or scheduler.

Cleanup requires exact legacy filename, caption, uploader email, category, media type, matching B2 namespace/filename, and exact decoded equality with known seeded JPEG artwork. A legitimate upload whose event happens to be called Science Fair is not a match. A changed row or different photograph is preserved and blocks apply for manual review; generated image differences across rendering environments may also require manual review rather than broadening deletion criteria.

Before deletion, confirmed rows and their original image bytes are backed up locally. The importer uploads and downloads each new NST image to verify its SHA-256, then creates normal approved image records attributed/reviewed by the existing Admin. It uses existing categories or creates suitable named categories. No schema migration is required. The schema has no dedicated gallery source/import column: the stable full-hash `original_filename` is its persisted import identity, with the full source key in the curated data manifest. Short B2 storage filenames keep signed URLs within the baseline 500-character file_url column (480 characters with the current configuration); API reads continue to refresh URLs through the existing service.

A session advisory lock serializes this importer. A transaction rechecks the audited records, inserts replacements and deletes only exact confirmed IDs. Every unrelated existing gallery row is compared before commit. Repeat runs verify existing image hashes and skip them; admin caption/status changes and withdrawals are not overwritten. Failure rolls back and compensates only objects uploaded by that invocation. If COMMIT has an uncertain outcome, new objects are retained to avoid deleting potentially committed images. Only confirmed old objects with no remaining gallery references are deleted after commit; shared objects are preserved. Cleanup failures are reported and recorded in the local result backup. Review that backup for any residual orphan cleanup rather than deleting by bucket prefix.

## Frontend and admin preservation

Homepage, guest gallery and signed-in gallery empty states use the existing single first-party NST photograph with “No approved event photos are available yet.” It remains outside gallery records and lightboxes. Populated views continue to use approved API records; no static gallery replacement was added. Imported approved records use the normal Admin Event Management → Approved gallery and moderation Approved/Recently uploaded views, including normal withdrawal behavior.

## Verification and limits

- Backend npm test: 98 tests passed against the isolated local PostgreSQL test server, with test email/storage safety guards.
- Importer tests: 10 passed, covering identity matching, real-photo rejection as fake content, dry-run safety, ambiguous-row protection, missing Admin, approved import, idempotence, rollback compensation, unrelated-upload preservation and positive fake cleanup with backups.
- Additional real isolated PostgreSQL import exercise (B2 mocked): eight records created; second import created zero; unrelated gallery record and later admin withdrawal preserved.
- Responsive Playwright: four tests passed at 375, 768, 1024 and 1440px. Real selected NST photographs rendered through a disposable test API, with public/homepage/admin views, lightbox, empty state, horizontal-overflow, decoded-image and runtime-error checks. No visible demo-photo captions or generated colored cards in these local views.
- Screenshot review: public cards crop at 4:3, homepage thumbnails retain established layout, and admin thumbnail/caption rows fit all widths. Artifacts: `web/ui-test-results/nst-gallery/`.
- npm run lint: zero errors, 17 existing warnings. npm run typecheck and npm run build: passed. The npm shell environment required an explicit Windows cmd path; no repository runtime settings were changed for that workaround.
- git diff --check: passed.
- Production API access: Node fetch blocked with EACCES; web fetch could not access the API; no connected computer browser was available.
- Production database audit/import: blocked with EACCES before gallery/database/B2 writes.
- Live fake rows found: **unknown**; rows removed: **0**; live fake B2 objects: **unknown**; real B2 uploads: **0**; production gallery records created: **0**.
- Existing production uploads: no changes made, so no legitimate records or objects were deleted by this session; live inventory count remains unknown.

**Verdict: B2 Event Gallery architecture preserved and replacement/cleanup code locally verified. Production fake-photo removal and activation of imported NST event records remain pending connectivity. The requested production completion verdict cannot yet be asserted.**
