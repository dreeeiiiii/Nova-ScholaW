import { test, expect } from "./fixtures";
import { credentials, loginAs } from "./fixtures";
import path from "path";

function uniqueTitle(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

test("student-uploads-media", async ({ page }) => {
  await loginAs(page, credentials.student.email, credentials.student.password);
  await page.goto("/gallery/upload");

  await expect(page.getByText("Upload event media")).toBeVisible();
  await expect(page.getByLabel("Event name *")).toBeVisible();

  const title = uniqueTitle("P45_VERIFY_Gallery");
  await page.getByLabel("Event name *").fill(title);
  // Select first real category (skip placeholder) - wait for categories to load
  const categorySelect = page.getByLabel("Category *");
  await expect(categorySelect).toBeVisible();
  await page.waitForTimeout(500);
  await categorySelect.selectOption({ index: 1 });

  const fileInput = page.locator('input[type="file"]');
  const tinyPath = path.join(process.cwd(), "e2e", "fixtures", "tiny.jpg");
  await fileInput.setInputFiles(tinyPath);

  // Preview should appear
  await expect(page.locator('img[alt="Preview"]')).toBeVisible({ timeout: 8000 });

  await page.getByRole("button", { name: "Submit for review" }).click();

  await expect(page.getByText("Ready for review")).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Done" }).click();
  await page.waitForURL(/\/gallery\/mine/, { timeout: 10000 });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);
  // Debug: log page content if Pending not found
  const pendingVisible = await page.getByText("Pending").first().isVisible().catch(() => false);
  if (!pendingVisible) {
    console.log("DEBUG mine page content:", (await page.content()).slice(0, 3000));
  }
  await expect(page.getByText("Pending").first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(title, { exact: false }).first()).toBeVisible({ timeout: 15000 });
});

test("student-my-uploads-shows-isolation", async ({ page }) => {
  const titleA = uniqueTitle("P45_VERIFY_IsolationA");
  // Student A uploads
  await loginAs(page, credentials.student.email, credentials.student.password);
  await page.goto("/gallery/upload");
  await page.getByLabel("Event name *").fill(titleA);
  const catSelA = page.getByLabel("Category *");
  await expect(catSelA).toBeVisible();
  await page.waitForTimeout(500);
  await catSelA.selectOption({ index: 1 });
  const fileInputA = page.locator('input[type="file"]');
  await fileInputA.setInputFiles(path.join(process.cwd(), "e2e", "fixtures", "tiny.jpg"));
  await expect(page.locator('img[alt="Preview"]')).toBeVisible({ timeout: 8000 });
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText("Ready for review")).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Done" }).click();
  await page.waitForURL(/\/gallery\/mine/, { timeout: 10000 });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await expect(page.locator("text=Pending").first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(titleA, { exact: false }).first()).toBeVisible({ timeout: 15000 });

  // Logout (button is on the mounted shell at /gallery/mine), login as studentEmpty
await page.getByTestId("logout").click();
  await page.waitForURL(/\/login/, { timeout: 8000 }).catch(() => {});
  await expect(page.getByTestId("sidebar")).toBeHidden();
  await loginAs(page, credentials.studentEmpty.email, credentials.studentEmpty.password);
  await page.goto("/gallery/mine");
  await expect(page.getByText(titleA)).toBeHidden();
});

test("upload-rejects-oversized-image", async ({ page }) => {
  await loginAs(page, credentials.student.email, credentials.student.password);
  await page.goto("/gallery/upload");
  await page.getByLabel("Event name *").fill(uniqueTitle("P45_VERIFY_Big"));
  await page.getByLabel("Category *").selectOption({ index: 1 });

  const fileInput = page.locator('input[type="file"]');
  const bigPath = path.join(process.cwd(), "e2e", "fixtures", "big.jpg");
  await fileInput.setInputFiles(bigPath);
  await page.waitForTimeout(1000);

  // Should show inline error before upload (client validation)
  await expect(page.getByText(/too large/i)).toBeVisible({ timeout: 10000 });

  // Ensure no request was sent to /api/gallery/upload by checking that submit is disabled or error persists
  // Try to submit and expect client error, not network
  await page.getByRole("button", { name: "Submit for review" }).click();
  // Still should show error (either too large or please select), not modal
  await expect(page.locator("text=/too large|Please select a file/i").first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Ready for review")).toBeHidden();
});
