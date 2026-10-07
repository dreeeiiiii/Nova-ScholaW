# NST image sources and verified integration

Status: **NST REAL IMAGE INTEGRATION COMPLETE** (workspace implementation verified October 8, 2026).

The existing successful import contains 36 local WebP assets. This continuation preserved the existing integration and completed responsive verification; it did not rerun the importer or replace the images. Six curated assets are referenced by the UI; the remaining assets are available in the local collection.

The full provenance, dimensions, byte sizes and SHA-256 hashes remain in `web/public/nst/manifest.json`. The 36-row inventory is in [NST_IMAGE_INVENTORY.md](NST_IMAGE_INVENTORY.md). The existing canonical importer remains `scripts/download-nst-assets.mjs`.

## Actual UI usage

| Local asset | First-party source image | Used in |
|---|---|---|
| /nst/branding/cropped-cropped-nova-schola-ntc-batangas-logos-7-scaled-727e34dd.webp | https://nst.edu.ph/wp-content/uploads/2020/03/cropped-cropped-Nova-Schola-NTC-Batangas-Logos-7-scaled.png | Homepage footer |
| /nst/branding/cropped-nova-schola-ntc-batangas-logos-2-a6775e70.webp | https://nst.edu.ph/wp-content/uploads/2020/03/cropped-Nova-Schola-NTC-Batangas-Logos-2.png | Homepage and public gallery navigation |
| /nst/misc/m50-shs-18-32a1dd37.webp | https://nst.edu.ph/wp-content/uploads/2024/12/M50-SHS-18.jpg | Homepage hero |
| /nst/misc/m50-shs-12-41e59256.webp | https://nst.edu.ph/wp-content/uploads/2024/12/M50-SHS-12.jpg | Login panel, homepage TV CTA, labelled gallery empty state |
| /nst/misc/img_2819-969097a2.webp | https://nst.edu.ph/wp-content/uploads/2024/12/IMG_2819.jpg | Student, Teacher and Admin dashboard welcome panel |
| /nst/misc/shs-02-d9b6836d.webp | https://nst.edu.ph/wp-content/uploads/2022/06/SHS-02.jpg | Homepage purpose panel and registration panel |

Curated references and descriptive alt text live in `web/lib/nst-images.ts`. Static image imports and Next Image reserve aspect ratios; the homepage hero uses preload and responsive sizes. Auth photographs appear at desktop widths; the form remains readable at smaller widths.

## Responsive verification

Playwright passed 10 tests, covering 375, 768, 1024 and 1440px. Each width covers the homepage, login, Student and Teacher registration, all three role dashboards, public gallery, TV, and the authenticated gallery empty state. Checks cover visible main content, horizontal overflow, decoded visible images, nonempty alt text, desktop auth panel visibility, runtime errors, populated gallery data and labelled empty-state imagery. Lazy images were scrolled into view before decoding checks.

Screenshots: `web/ui-test-results/nst/`. Visual review sheets: `.batch1-validation/section-visual/{375,768,1024,1440}.png`. Registration browser tests additionally passed course/level/department clearing, missing-section request payload and Teacher field isolation.

## Validation and preservation

- `npm run lint`: passed, 0 errors and 19 warnings.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.
- All 36 manifest assets remain present. No broken visible image or runtime error was found in the responsive tests.
- Approved gallery media still comes from the existing dynamic API. Tests assert fixture media is displayed when available, and the NST empty illustration is absent. Static assets are never inserted into gallery rows or uploaded to B2.
- B2 storage, gallery approval/moderation logic, Brevo, production data and announcement rules were preserved. Browser checks used an isolated mock API; backend checks used fresh localhost test databases and safe network guards.
- Five previously removed unused starter SVGs remain removed. Existing upload test fixtures, favicon, seed and storage maintenance scripts remain intact.

This verification supersedes the earlier interrupted status that reported an empty manifest and unavailable runtime tools. No production deployment or production migration was performed.


## Announcement TV and display imports (October 8, 2026)

No new downloads. All 36 existing assets were inspected; the following local WebP files are reused. Historical story imagery is illustrative unless it is the matching article graphic. Gallery fallbacks remain decorative and are never inserted into managed gallery records.

| Local filename | Original NST page | Original image URL | Category | Hub use |
| --- | --- | --- | --- | --- |
| `/nst/misc/m50-shs-12-41e59256.webp` | https://nst.edu.ph/ | https://nst.edu.ph/wp-content/uploads/2024/12/M50-SHS-12.jpg | misc | NST: Now Stronger at Twelve; Archived: 2025 Foundation Celebration Preview; TV fallback/empty state; existing gallery fallback |
| `/nst/misc/m50-shs-18-32a1dd37.webp` | https://nst.edu.ph/ | https://nst.edu.ph/wp-content/uploads/2024/12/M50-SHS-18.jpg | misc | Celebrating Victory: 12th Foundation Winners |
| `/nst/misc/jhs-male-crazy-walk-copy02-8f06f869.webp` | https://nst.edu.ph/ | https://nst.edu.ph/wp-content/uploads/2024/06/JHS-Male-Crazy-Walk-copy02.png | misc | The JHS Uniforms Just Got an Update |
| `/nst/misc/jhs-f05-9387be68.webp` | https://nst.edu.ph/ | https://nst.edu.ph/wp-content/uploads/2022/05/JHS-F05.jpg | misc | NST Junior High Now Offers Foreign Language Class |
| `/nst/misc/wp-shs-teachers-day-1fb8a9c1.webp` | https://nst.edu.ph/ | https://nst.edu.ph/wp-content/uploads/2025/10/WP-SHS-Teachers-Day.jpg | misc | Sa Huli, Sila: Last Years of Highschool with the SHS Department |
| `/nst/misc/teachers-day-jhs-3d0446b0.webp` | https://nst.edu.ph/ | https://nst.edu.ph/wp-content/uploads/2025/10/Teachers-Day-JHS.jpg | misc | Nurturing in the Garden that Blooms |
| `/nst/misc/img_2819-969097a2.webp` | https://nst.edu.ph/ | https://nst.edu.ph/wp-content/uploads/2024/12/IMG_2819.jpg | misc | Start Your Journey: NST Admissions; Draft: NST Online Registration Resource |
| `/nst/misc/shs-02-d9b6836d.webp` | https://nst.edu.ph/ | https://nst.edu.ph/wp-content/uploads/2022/06/SHS-02.jpg | misc | Discover NST College Programs; Draft: Exploring Information Systems at NST |
| `/nst/misc/m100-shs-25-31bd19fc.webp` | https://nst.edu.ph/ | https://nst.edu.ph/wp-content/uploads/2024/12/M100-SHS-25.jpg | misc | Explore Senior High School Pathways |
| `/nst/misc/jhs-activity-01-bc6356fb.webp` | https://nst.edu.ph/ | https://nst.edu.ph/wp-content/uploads/2022/05/JHS-Activity-01.jpg | misc | Learning Together at NST Junior High |
| `/nst/branding/cropped-nova-schola-ntc-batangas-logos-2-a6775e70.webp` | https://nst.edu.ph/ | https://nst.edu.ph/wp-content/uploads/2020/03/cropped-Nova-Schola-NTC-Batangas-Logos-2.png | branding | TV NST brand mark |
