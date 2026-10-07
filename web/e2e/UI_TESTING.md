# Frontend validation

Run from `web` with Node 22 and Chrome installed. These suites use local isolated services, independent of the existing legacy E2E tests.

```powershell
npm run lint
npm run typecheck
npm run build
npm run test:ui
```

`test:ui` starts a disposable fixture API on 127.0.0.1:5055 and a Next development server on localhost:3100. It checks all four requested viewport widths, keyboard menus/dialogs, frontend payloads, and the TV display. Reports and screenshots go to `ui-test-results`.

For real application/database integration, provide a dedicated localhost PostgreSQL test database that permits creation of throwaway databases. Its name must contain `test`. Never use a production connection.

```powershell
$env:BATCH1_DATABASE_URL = 'postgresql://postgres@127.0.0.1:5432/novaschola_test'
npm run build
npm run test:live
```

The existing backend harness creates its own randomly named test database, runs migrations, and seeds synthetic users. The browser API binds to 127.0.0.1:5056; Next production starts on localhost:3200. Test-only storage returns a local fixture URL. The existing safe-network preload disables real email/storage and rejects external fetches. Reports go to `live-test-results`.

After real integration tests, clean up the throwaway database through the local test harness endpoint while it is still running:

```powershell
Invoke-WebRequest -UseBasicParsing -Method POST http://127.0.0.1:5056/__cleanup
```

On Windows, if automated child-process teardown stalls, clean up the harness and stop only the recorded test-server processes. `UI_REUSE_SERVERS=1` lets a test invocation reuse known running test servers; use it only for these disposable local services. `UI_REPORT_PATH` can retain a separate JSON report for targeted UI retests.

Backend tests run from `server` with the same isolated `BATCH1_DATABASE_URL`:

```powershell
npm test
```

The legacy `test:e2e` suite remains available with its original configuration. The new `ui` and `live` directories are excluded from that configuration so their independent environments cannot be mixed accidentally.
