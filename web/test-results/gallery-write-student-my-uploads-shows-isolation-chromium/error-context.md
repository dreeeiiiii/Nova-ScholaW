# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: gallery-write.spec.ts >> student-my-uploads-shows-isolation
- Location: e2e\gallery-write.spec.ts:47:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
Call log:
  - navigating to "http://localhost:3000/login", waiting until "load"

```

# Test source

```ts
  1  | import { test as base, expect, type Page } from "@playwright/test";
  2  | 
  3  | // Read from env, fallback to seeded test passwords for local dev
  4  | const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "B22Test123!";
  5  | const TEACHER_PASSWORD = process.env.TEST_TEACHER_PASSWORD || "B22Test123!";
  6  | const TEACHER2_PASSWORD = process.env.TEST_TEACHER2_PASSWORD || "Teacher2Pass123!";
  7  | const STUDENT_PASSWORD = process.env.TEST_STUDENT_PASSWORD || "B22Test123!";
  8  | const STUDENT2_PASSWORD = process.env.TEST_STUDENT2_PASSWORD || "Empty123!";
  9  | 
  10 | export const credentials = {
  11 |   admin: { email: "b22test_admin@nst.edu.ph", password: ADMIN_PASSWORD },
  12 |   teacher: { email: "b22test_teacher@tr.nst.edu.ph", password: TEACHER_PASSWORD },
  13 |   teacher2: { email: "b22test_teacher2@tr.nst.edu.ph", password: TEACHER2_PASSWORD },
  14 |   student: { email: "b22test_student@my.nst.edu.ph", password: STUDENT_PASSWORD },
  15 |   studentEmpty: { email: "b22test_student_empty@my.nst.edu.ph", password: STUDENT2_PASSWORD },
  16 | };
  17 | 
  18 | async function gotoWithRetry(page: Page, url: string) {
  19 |   const attempts = 3;
  20 |   for (let i = 1; i <= attempts; i++) {
  21 |     try {
> 22 |       await page.goto(url, { timeout: 15000 });
     |                  ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
  23 |       return;
  24 |     } catch (err) {
  25 |       if (i === attempts) throw err;
  26 |       await page.waitForTimeout(1000);
  27 |     }
  28 |   }
  29 | }
  30 | 
  31 | export async function loginAs(page: Page, email: string, password: string) {
  32 |   await gotoWithRetry(page, "/login");
  33 |   await page.getByLabel("Email").fill(email);
  34 |   await page.getByLabel("Password").fill(password);
  35 | 
  36 |   // Wait for the login POST so we know the session cookie was accepted; a wrong
  37 |   // password / rate-limit shows up here as a hard failure instead of a timeout.
  38 |   const [loginRes] = await Promise.all([
  39 |     page.waitForResponse((r) => r.url().includes("/api/auth/login")),
  40 |     page.getByRole("button", { name: "Sign in" }).click(),
  41 |   ]);
  42 |   if (!loginRes.ok()) {
  43 |     throw new Error(`Login failed (${loginRes.status()}) for ${email}`);
  44 |   }
  45 | 
  46 |   // Next's router.push + router.refresh in LoginForm can drop the client-side
  47 |   // navigation under load; the cookie is already set, so fall back to a hard
  48 |   // navigation if the URL never moves.
  49 |   await page
  50 |     .waitForURL(/\/dashboard|\/announcements/, { timeout: 10000 })
  51 |     .catch(() => page.goto("/dashboard"));
  52 | 
  53 |   // The authenticated shell must be fully mounted before callers proceed.
  54 |   await expect(page.getByTestId("sidebar")).toBeVisible({ timeout: 10000 });
  55 | }
  56 | 
  57 | export const test = base.extend({});
  58 | 
  59 | export { expect };
  60 | 
```