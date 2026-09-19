import { test, expect } from "./fixtures";
import { credentials, loginAs } from "./fixtures";

test("login-as-each-role shows correct sidebar items", async ({ page }) => {
  // teacher → 4 items
  await loginAs(page, credentials.teacher.email, credentials.teacher.password);
  await expect(page.getByTestId("sidebar")).toBeVisible();
  await expect(page.getByTestId("nav-dashboard")).toBeVisible();
  await expect(page.getByTestId("nav-announcements")).toBeVisible();
  await expect(page.getByTestId("nav-event-gallery")).toBeVisible();
  await expect(page.getByTestId("nav-upload-media")).toBeVisible();
  await expect(page.getByTestId("nav-moderation")).toBeHidden();
  await expect(page.getByTestId("nav-users")).toBeHidden();
  await expect(page.getByTestId("nav-audit-logs")).toBeHidden();

  // logout
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL(/\/login/, { timeout: 8000 }).catch(() => {});
  await expect(page.getByTestId("sidebar")).toBeHidden();

  // admin → 7 items
  await loginAs(page, credentials.admin.email, credentials.admin.password);
  await expect(page.getByTestId("nav-dashboard")).toBeVisible();
  await expect(page.getByTestId("nav-moderation")).toBeVisible();
  await expect(page.getByTestId("nav-users")).toBeVisible();
  await expect(page.getByTestId("nav-audit-logs")).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL(/\/login/, { timeout: 8000 }).catch(() => {});
  await expect(page.getByTestId("sidebar")).toBeHidden();

  // student → 4 items
  await loginAs(page, credentials.student.email, credentials.student.password);
  await expect(page.getByTestId("nav-upload-media")).toBeVisible();
  await expect(page.getByTestId("nav-moderation")).toBeHidden();
});

test("logout-clears-session", async ({ page, context }) => {
  await loginAs(page, credentials.student.email, credentials.student.password);
  await page.goto("/dashboard");
  await expect(page.getByText(/Welcome,/)).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL(/\/login/, { timeout: 8000 }).catch(() => {});
  await expect(page.getByTestId("sidebar")).toBeHidden();

  // cookie gone
  const cookies = await context.cookies();
  const ns = cookies.find((c) => c.name === "ns_token");
  expect(ns).toBeUndefined();

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?from=%2Fdashboard/);
});
