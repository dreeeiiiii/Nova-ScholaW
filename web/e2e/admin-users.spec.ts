import { test, expect } from "./fixtures";
import { credentials, loginAs } from "./fixtures";

function uniqueEmail(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@my.nst.edu.ph`.toLowerCase();
}

test("admin creates and deactivates a user", async ({ page }) => {
  await loginAs(page, credentials.admin.email, credentials.admin.password);
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add user" })).toBeVisible();

  const email = uniqueEmail("p73test");
  const fullName = "P73 Test";

  await page.getByRole("button", { name: "Add user" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name *").fill(fullName);
  await dialog.getByLabel("Email *").fill(email);
  await dialog.getByLabel("Password *").fill("Test1234!");
  await dialog.getByLabel("Role *").selectOption("student");
  await dialog.getByRole("button", { name: "Create" }).click();

  // Modal should close
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 10000 });
  // New email appears in table
  await expect(page.getByText(email).first()).toBeVisible({ timeout: 10000 });

  // Find row and Deactivate
  const row = page.locator("tr", { hasText: email }).first();
  // fallback to card if mobile
  const hasRow = await row.count();
  let deactivateBtn;
  if (hasRow > 0) {
    deactivateBtn = row.getByRole("button", { name: "Deactivate" });
  } else {
    const card = page.locator("div.clay", { hasText: email }).first();
    deactivateBtn = card.getByRole("button", { name: "Deactivate" });
  }
  await expect(deactivateBtn).toBeVisible();
  await deactivateBtn.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Deactivate user?")).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 10000 });
  // Status becomes Inactive
  const targetRow = page.locator("tr", { hasText: email }).first();
  const hasTargetRow = await targetRow.count();
  if (hasTargetRow > 0) {
    await expect(targetRow.getByText("Inactive").first()).toBeVisible({ timeout: 10000 });
  } else {
    const card2 = page.locator("div.clay", { hasText: email }).first();
    await expect(card2.getByText("Inactive").first()).toBeVisible({ timeout: 10000 });
  }

  // Cleanup: reactivate and leave (users cannot be deleted via API, so we deactivate then reactivate for reuse)
  // Try to reactivate via backend to keep DB clean for next run
  try {
    const beLogin = await page.request.post("http://localhost:5000/api/auth/login", {
      data: { email: credentials.admin.email, password: credentials.admin.password },
    });
    const beJson = await beLogin.json();
    const token = beJson.token;
    const searchRes = await page.request.get(`http://localhost:5000/api/users?search=${encodeURIComponent(email)}&limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const searchJson = await searchRes.json();
    const found = (searchJson.users ?? []).find((u: { email: string }) => u.email === email);
    if (found) {
      await page.request.patch(`http://localhost:5000/api/users/${found.id}/activate`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {}
});

test("teacher cannot access /admin/users", async ({ page }) => {
  await loginAs(page, credentials.teacher.email, credentials.teacher.password);
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/dashboard/);
});
