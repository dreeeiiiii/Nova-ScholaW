# Strict Student Section registration verification

Implementation and local verification complete. Apply migration `006_section_normalization.sql` through the existing migration runner before deploying this feature. No production connection, migration or deployment was performed.

1. **Section schema:** `sections` has BIGSERIAL `id`, globally unique `name VARCHAR(100)`, required `grade_level VARCHAR(20)`, timestamps, and nullable `department_id` FK with DELETE RESTRICT. Migration 006 adds an immutable normalization function and unique expression index without altering historical IDs or names.
2. **Academic relationships:** users independently reference departments, sections and courses. Courses reference departments. There is no section-course FK, junction table or exclusive program ownership. A section can be assigned to Students with different courses in the same department. `users.student_level` is a legacy section/course enum, not a grade/year field; the authoritative grade is `sections.grade_level`. College/SHS/JHS defaults plus existing Admin-defined grades supply the level picker. Courses remain optional as in the existing schema and requirements.
3. **Root cause:** registration required an existing section ID but offered no missing-section path, course selection or grade filtering. Manual names could not be resolved into official records. Existing UNIQUE(name) protected exact strings only, not whitespace/case equivalents.
4. **Resolution algorithm:** parse IDs; lock and validate department/course records; require exactly one existing ID or manual name; validate and normalize manual name; validate selected grade; globally search equivalent names; insert only when missing; reselect conflict winner; validate section department/grade and existing Student/course department consistency; create the Student using the resolved FK; commit together.
5. **Reuse:** all official sections are searched, not just the registering Student. Equivalent names reuse the same ID. Existing Students and their course departments are checked before reuse. Inconsistent historical assignments require Admin review; no guessed mapping is written.
6. **Creation:** the backend creates a normal sections row with name, grade and department. The frontend only calls registration, never the sections insertion API. Names reject blank values, markup, controls, missing letters/year numbers, excessive malformed separators and values over 100 characters; normal hyphens and en/em dashes are preserved. Course codes are never hardcoded.
7. **Duplicate prevention:** trim, collapse whitespace, case-insensitive database comparison, Unicode whitespace normalization and a globally unique normalized-name index. Global uniqueness preserves the existing name constraint. An equivalent name in another department/grade is rejected rather than cloned. The migration fails atomically for legacy conflicts, requiring explicit review instead of automatic history rewrites.
8. **Concurrency:** INSERT ON CONFLICT DO NOTHING plus a new READ COMMITTED reselect waits for and reuses the winning section ID. PostgreSQL integration tests passed simultaneous different-Student registrations and same-email double-submit. The index also protects direct/Admin insert/update writes.
9. **Department validation:** IDs must exist; section/course departments must match the selected department. Shared locks protect against concurrent Admin changes; existing department/history integrity triggers are retained.
10. **Course validation:** supplied IDs must exist and belong to the selected department. Section-course exclusivity cannot be enforced from this schema because it does not exist. No course relationship is invented from section-name prefixes or one Student's assignment. Shared independent assignments are tested. Cross-department course selection is rejected.
11. **Assignment:** successful Student registration always writes a valid users.section_id. Department/course IDs remain relational FKs. Section resolution and account creation share one transaction; duplicate-email failure rolls back a newly created section.
12. **Admin compatibility:** registration-created sections appear in the existing Department Management API with Student counts, support editing, and cannot be deleted when assigned or historically targeted. Admin whitespace normalization and database duplicate protection apply. Existing history protection remains intact.
13. **Files changed in this continuation:**
    - server/src/features/academic/registrationSection.js (new resolver/options)
    - server/src/shared/utils/sectionInput.js (new validation)
    - server/src/shared/db/migrations/006_section_normalization.sql (new migration)
    - server/src/features/auth/authController.js (transactional registration/options)
    - server/src/features/users/userModel.js (transaction client support)
    - server/src/features/academic/academicController.js (Admin normalization)
    - server/src/features/audit/auditDetails.js (safe section-name audit detail)
    - server/tests/batch1/registrationSections.test.js (new real database tests)
    - server/tests/batch1/migrations.test.js (legacy conflict rollback test)
    - server/tests/sectionInput.test.js (new validation tests)
    - server/package.json (include validation tests)
    - web/app/(auth)/register/RegisterForm.tsx (academic selectors/manual creation)
    - web/e2e/ui/mock-api.mjs (registration fixtures)
    - web/e2e/ui/registration-sections.spec.ts (new UI tests)
    - web/e2e/ui/nst-images.spec.ts (TV added to existing responsive verification)
    - docs/NST_IMAGE_SOURCES.md and docs/NST_IMAGE_INVENTORY.md (replace interrupted status with verified usage)
    - docs/STRICT_STUDENT_SECTION_VERIFICATION.md (this report)
    Existing NST integration changes and all 36 assets were preserved.
14. **Tests added:** official assignment/login; missing creation; cross-Student case/space reuse; simultaneous creation; database Unicode/case uniqueness; double-submit; rollback/orphan prevention; wrong/invalid departments, courses, IDs and grades; blank/markup/malformed names; ambiguous choices; shared-section schema behavior; historical inconsistency; Admin visibility/edit/delete protection; filtered public choices; Teacher registration/login; legacy migration conflict rollback; frontend clearing/backend-only payload; responsive TV checks.
15. **Results:** final full backend suite: 83 passed, 0 failed, 0 skipped. Focused final section/auth/migration/validation run: 32 passed. Browser suite: 10 passed. Real database tests create/drop fresh random localhost databases only. No production IDs are hardcoded in implementation.
16. **Student registration:** existing and newly created section accounts receive the correct section_id and can log in; invalid academic requests fail before commit.
17. **Teacher regression:** registration and login passed without section/course fields; manual section creation is rejected for Teachers; frontend Student selectors are absent.
18. **Mobile/tablet:** 375px and 768px passed all page/image/overflow checks. Screenshots reviewed; forms remain readable and auth photo panel is hidden.
19. **Desktop:** 1024px and 1440px passed the same checks, with visible auth photo panels and responsive dashboard navigation. All role dashboards, gallery and TV included.
20. **Lint:** npm run lint passed, 0 errors, 19 warnings (existing img-element/unused-variable warnings).
21. **Typecheck:** npm run typecheck passed.
22. **Build:** npm run build passed. git diff --check passed.
23. **B2 gallery:** existing storage/API/media sources and moderation preserved. Populated/empty public and authenticated gallery cases passed; static NST photos are only interface imagery. No B2 writes, Brevo changes or announcement-rule changes occurred.

Logs: `.batch1-validation/section-*.log`. Browser screenshots: `web/ui-test-results/nst/`. Visual review sheets: `.batch1-validation/section-visual/`.

STRICT STUDENT SECTION REGISTRATION READY

STUDENT-CREATED SECTION BACKEND RESOLUTION READY

SECTION DUPLICATION PROTECTED

NST REAL IMAGE INTEGRATION COMPLETE
