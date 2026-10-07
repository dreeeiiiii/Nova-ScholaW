# Display announcements and Announcement TV

Prepared locally for capstone display. No production deployment, import, gallery deletion, or B2 write is performed by this change.

## Data and safety

Migration `010_display_announcement_import.sql` adds nullable, unique `display_import_key` to announcements. Existing `image_url` stores local `/nst/...` paths; no new image column/storage system is needed. A CHECK constraint requires imported records to stay email-ineligible, General, and without a department. Existing live defaults and email publication code remain unchanged.

13 records: 10 published, two drafts, one archived. All are authored by an existing active Admin, with `email_eligible = false`, null department and B2 key, and no class targets. The import never loads the application, controller, scheduler, email service or Brevo. It does not change EMAIL_ENABLED_AT. The date cutoff remains a separate defense in the live email transport.

The importer uses a transaction, advisory lock, stable unique keys and ON CONFLICT DO NOTHING. Reruns preserve subsequent Admin edits, including archiving. It checks the imported records' eligibility and delivery ledger before committing; unexpected deliveries cause rollback. Missing Admin also aborts without creating users.

Historical articles retain their source dates. Undated admissions/program resources are labeled as undated. All content starts with “Demo display” and includes the official source URL. General distribution shares publicly available NST content; it does not turn a JHS/SHS topic into a department-targeted record. No future dates or 2026 policies are invented. The archived Foundation preview preserves the original September 3–6 dates, while the later recap reports September 10–13.

## Prepared titles

The first ten titles appear on TV after import while published and within their publication window:

1. NST: Now Stronger at Twelve — September 17, 2025
2. Celebrating Victory: 12th Foundation Winners — September 18, 2025
3. The JHS Uniforms Just Got an Update — June 19, 2024
4. NST Junior High Now Offers Foreign Language Class — June 7, 2024
5. Sa Huli, Sila: Last Years of Highschool with the SHS Department — October 15, 2025
6. Nurturing in the Garden that Blooms — October 6, 2025
7. Start Your Journey: NST Admissions — undated resource
8. Discover NST College Programs — undated resource
9. Explore Senior High School Pathways — undated resource
10. Learning Together at NST Junior High — undated resource
11. Draft: NST Online Registration Resource — draft, excluded from TV
12. Draft: Exploring Information Systems at NST — draft, excluded from TV
13. Archived: 2025 Foundation Celebration Preview — September 2, 2025; archived, excluded from TV

No scheduled demo records are necessary: historical notices must not masquerade as newly scheduled official notices.

## TV and imagery

The TV uses the real public announcement endpoint, which keeps the existing published/unexpired General predicate. Public payload adds status and a display-import marker. Count/offset pagination lets initial load and subsequent polls collect the entire feed rather than just the first 20. Local filtering also excludes nonpublished/private/future/expired records. No content is hardcoded in the TV component.

Slides rotate automatically every 10 seconds, with a subtle entry animation, progress indicator, slide count and three-item next queue. Hidden tabs pause elapsed rotation and refresh immediately on resume; polling otherwise runs every 30 seconds. Reduced-motion and animate=off remove the visual transition without stopping rotation. The clock uses the browser's local date/time.

Local official imagery appears on the homepage, dashboards, announcement management and TV. Full-frame contain sizing preserves faces and embedded article graphics. TV text-only/broken-image fallback and empty state use the official community photo. Existing announcement B2 uploads continue using the existing URL resolver/upload flow.

All 36 preexisting manifest assets were inspected in a contact sheet. No assets were downloaded. Source documentation records the assets reused for announcements and signage. Generic school imagery is explicitly identified in display content as illustrative, rather than represented as photography of a particular historical event.

## Gallery audit

Frontend Gallery and homepage preview already use approved API records and the official NST visual fallback when empty. No static mock gallery tiles remain in the current frontend. The existing upload, moderation, approval, presigned B2 URL and public gallery flows are preserved.

The old `server/scripts/seed-production.js` defines **30 mock gallery candidates**, filenames `seed-gal-01.jpg` through `seed-gal-30.jpg`, with “demo photo” captions and generated flat-colored SVG/JPEG art. This establishes their seed definitions, not their presence in production. Nothing was deleted or hidden automatically. Do not run that broad legacy seed for this task.

Read-only production review, if needed:

```sql
SELECT id, original_filename, caption, status, file_url, b2_key
FROM gallery_media
WHERE original_filename ~ '^seed-gal-[0-9]{2}[.]jpg$'
ORDER BY id;
```

Review returned records and storage objects separately before any destructive cleanup. Filename matches alone are not permission to delete. Approved legitimate B2 entries remain visible.

## Exact deployment/import steps

After local validation and review of this change:

1. Deploy the backend and frontend from this reviewed checkout using the existing production deployment process. Do not push automatically. Migration is additive, but apply it before executing the importer.
2. In the production backend environment, with its existing environment settings unchanged:
   `cd server`
   `npm run db:migrate -- --apply`
3. Inspect the offline plan:
   `npm run seed:display-announcements -- --dry-run`
4. Import:
   `npm run seed:display-announcements -- --apply`
5. Repeat apply if desired: inserted must be 0, existing must be 13. Review counts below.
6. Check homepage, Student and Teacher dashboards, Admin announcement management and /tv. Draft and archived records stay out of the public feed. Preserve any independently archived imports on rerun.
7. No scheduler, email configuration, passwords, user seeding, section changes or B2 cleanup steps are needed.

```sql
SELECT status, COUNT(*) FROM announcements
WHERE display_import_key LIKE 'nst-display-v1:%' GROUP BY status;
SELECT COUNT(*) AS unsafe FROM announcements
WHERE display_import_key LIKE 'nst-display-v1:%'
AND (email_eligible IS DISTINCT FROM FALSE OR type <> 'general' OR department_id IS NOT NULL);
SELECT COUNT(*) AS delivery_rows
FROM announcement_email_deliveries d JOIN announcements a ON a.id = d.announcement_id
WHERE a.display_import_key LIKE 'nst-display-v1:%';
```

Expected immediately after first apply: published=10, draft=2, archived=1; unsafe=0; delivery_rows=0. All three queries are read-only. Production import remains a deployment step, not a result of local fixture testing.

## Verification and production limitation

- Backend `npm test`: 88 passed, zero failures, on disposable localhost PostgreSQL. The display test proves zero email-service/Brevo calls, zero import delivery rows, an idempotent second run, publication attempts remaining ineligible, and an unchanged live Admin publication path.
- `npm run lint`: passed; zero errors, 17 existing warnings.
- `npm run typecheck`: passed.
- `npm run build`: passed against unused localhost API origins; no production fetches. Existing multiple-lockfile workspace warning remains.
- `git diff --check`: passed.
- Browser checks exercise all requested page widths and both TV sizes, all ten published slides, real local image decoding, no horizontal/TV vertical overflow, image fallback, empty state, hidden-tab pause, and a 205-record pagination case. Static-gallery empty states and approved API gallery rendering also passed the existing NST imagery suite.
- A bounded read-only attempt to inspect configured production gallery rows failed with EACCES before it could return counts or candidates. Thus the 30 legacy mock definitions are confirmed in code only; production mock-row presence/cleanup remains unverified and requires operator review. No production database writes or B2 operations occurred.
- Production hosting: existing Render backend (`server`, build `npm ci`, start `npm start`) and Vercel frontend (`web`, build `npm run build`). Deploy the reviewed version through those existing services; do not change email settings or EMAIL_ENABLED_AT as part of this display import.
