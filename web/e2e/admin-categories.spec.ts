import { test, expect } from "./fixtures";
import { credentials, loginAs } from "./fixtures";

function uniqueName(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

test("admin creates and deletes a category", async ({ page }) => {
  await loginAs(page, credentials.admin.email, credentials.admin.password);
  await page.goto("/admin/categories");
  await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add category" })).toBeVisible();

  const name = uniqueName("P73 Test Category");

  await page.getByRole("button", { name: "Add category" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name *").fill(name);
  await dialog.getByRole("button", { name: "Create" }).click();

  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 10000 });
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });

  // Find row and Delete
  const row = page.locator("tr", { hasText: name }).first();
  const hasRow = await row.count();
  let deleteBtn;
  if (hasRow > 0) {
    deleteBtn = row.getByRole("button", { name: "Delete" });
  } else {
    // fallback if table not visible, try direct
    deleteBtn = page.getByRole("button", { name: "Delete" }).first();
  }
  await expect(deleteBtn).toBeVisible();
  await deleteBtn.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText(`Delete “${name}”?`)).toBeVisible();
  await page.getByRole("button", { name: "Delete" }).last().click();
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 10000 });
  await expect(page.getByText(name)).toBeHidden({ timeout: 10000 });

  // Verify via backend that it's gone
  try {
    const beLogin = await page.request.post("http://localhost:5000/api/auth/login", {
      data: { email: credentials.admin.email, password: credentials.admin.password },
    });
    const beJson = await beLogin.json();
    const token = beJson.token;
    const catRes = await page.request.get("http://localhost:5000/api/categories", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const catJson = await catRes.json();
    const stillThere = (catJson.categories ?? []).some((c: { name: string }) => c.name === name);
    expect(stillThere).toBeFalsy();
  } catch {}
});
