import { test as base, expect, type Page } from "@playwright/test";

// Read from env, fallback to seeded test passwords for local dev
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "B22Test123!";
const TEACHER_PASSWORD = process.env.TEST_TEACHER_PASSWORD || "B22Test123!";
const TEACHER2_PASSWORD = process.env.TEST_TEACHER2_PASSWORD || "Teacher2Pass123!";
const STUDENT_PASSWORD = process.env.TEST_STUDENT_PASSWORD || "B22Test123!";
const STUDENT2_PASSWORD = process.env.TEST_STUDENT2_PASSWORD || "Empty123!";

export const credentials = {
  admin: { email: "b22test_admin@my.nst.edu.ph", password: ADMIN_PASSWORD },
  teacher: { email: "b22test_teacher@my.nst.edu.ph", password: TEACHER_PASSWORD },
  teacher2: { email: "b22test_teacher2@my.nst.edu.ph", password: TEACHER2_PASSWORD },
  student: { email: "b22test_student@my.nst.edu.ph", password: STUDENT_PASSWORD },
  studentEmpty: { email: "b22test_student_empty@my.nst.edu.ph", password: STUDENT2_PASSWORD },
};

async function gotoWithRetry(page: Page, url: string) {
  const attempts = 3;
  for (let i = 1; i <= attempts; i++) {
    try {
      await page.goto(url, { timeout: 15000 });
      return;
    } catch (err) {
      if (i === attempts) throw err;
      await page.waitForTimeout(1000);
    }
  }
}

export async function loginAs(page: Page, email: string, password: string) {
  await gotoWithRetry(page, "/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);

  // Wait for the login POST so we know the session cookie was accepted; a wrong
  // password / rate-limit shows up here as a hard failure instead of a timeout.
  const [loginRes] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/login")),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
  if (!loginRes.ok()) {
    throw new Error(`Login failed (${loginRes.status()}) for ${email}`);
  }

  // Next's router.push + router.refresh in LoginForm can drop the client-side
  // navigation under load; the cookie is already set, so fall back to a hard
  // navigation if the URL never moves.
  await page
    .waitForURL(/\/dashboard|\/announcements/, { timeout: 10000 })
    .catch(() => page.goto("/dashboard"));

  // The authenticated shell must be fully mounted before callers proceed.
  await expect(page.getByTestId("sidebar")).toBeVisible({ timeout: 10000 });
}

export const test = base.extend({});

export { expect };
