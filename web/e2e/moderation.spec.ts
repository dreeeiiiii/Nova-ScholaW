import { test, expect } from "./fixtures";
import { credentials, loginAs } from "./fixtures";
import path from "path";

function uniqueTitle(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

test("admin approves a pending gallery item", async ({ page, context, browser }) => {
  const title = uniqueTitle("P73_Mod");

  // Create pending item as student via separate context
  const studentContext = await browser.newContext();
  const studentPage = await studentContext.newPage();
  await loginAs(studentPage, credentials.student.email, credentials.student.password);
  await studentPage.goto("/gallery/upload");
  await expect(studentPage.getByText("Upload event media")).toBeVisible();
  await studentPage.getByLabel("Event name *").fill(title);
  const categorySelect = studentPage.getByLabel("Category *");
  await expect(categorySelect).toBeVisible();
  await studentPage.waitForTimeout(500);
  await categorySelect.selectOption({ index: 1 });
  const fileInput = studentPage.locator('input[type="file"]');
  const tinyPath = path.join(process.cwd(), "e2e", "fixtures", "tiny.jpg");
  await fileInput.setInputFiles(tinyPath);
  await expect(studentPage.locator('img[alt="Preview"]')).toBeVisible({ timeout: 8000 });
  await studentPage.getByRole("button", { name: "Submit for review" }).click();
  await expect(studentPage.getByText("Ready for review")).toBeVisible({ timeout: 15000 });
  await studentPage.getByRole("button", { name: "Done" }).click();
  await studentPage.waitForURL(/\/gallery\/mine/, { timeout: 10000 });
  await studentContext.close();

  // Admin approves
  await loginAs(page, credentials.admin.email, credentials.admin.password);
  await page.goto("/admin/moderation");
  await expect(page.getByText("Admin Moderation")).toBeVisible();
  // Find card by title
  const card = page.locator("li", { hasText: title });
  await expect(card).toBeVisible({ timeout: 15000 });
  await expect(card.getByText("Pending review")).toBeVisible();
  await card.getByRole("button", { name: "Approve" }).click();
  // Card should disappear
  await expect(card).toBeHidden({ timeout: 10000 });
  // Verify via web proxy that pending no longer contains it
  const cookies = await context.cookies();
  const tokenCookie = cookies.find((c) => c.name === "ns_token");
  // Use page.request which shares cookies with context
  const pendingRes = await page.request.get("http://localhost:3000/api/gallery/pending");
  // If page.request doesn't have cookie, try with explicit header from token via backend login
  let pendingJson: { media?: Array<{ caption?: string; original_filename?: string }> } | null = null;
  try {
    pendingJson = await pendingRes.json();
  } catch {
    pendingJson = null;
  }
  if (pendingJson && pendingJson.media) {
    const stillThere = pendingJson.media.some((m) => m.caption === title || m.original_filename?.includes(title));
    expect(stillThere).toBeFalsy();
  } else {
    // fallback: check via backend directly with admin token
    const beLogin = await page.request.post("http://localhost:5000/api/auth/login", {
      data: { email: credentials.admin.email, password: credentials.admin.password },
    });
    const beJson = await beLogin.json();
    const beToken = beJson.token;
    const bePending = await page.request.get("http://localhost:5000/api/gallery/pending", {
      headers: { Authorization: `Bearer ${beToken}` },
    });
    const beJson2 = await bePending.json();
    const stillThere2 = (beJson2.media ?? []).some((m: { caption?: string }) => m.caption === title);
    expect(stillThere2).toBeFalsy();
  }
  // Cleanup: if approved, media remains in gallery but not pending, we will leave it or try to delete via backend if needed
  // Try to find and delete the gallery item via backend
  try {
    const beLogin2 = await page.request.post("http://localhost:5000/api/auth/login", {
      data: { email: credentials.admin.email, password: credentials.admin.password },
    });
    const beJson3 = await beLogin2.json();
    const beToken2 = beJson3.token;
    const searchRes = await page.request.get("http://localhost:5000/api/gallery?limit=50", {
      headers: { Authorization: `Bearer ${beToken2}` },
    });
    const searchJson = await searchRes.json();
    const found = (searchJson.media ?? []).find((m: { caption?: string }) => m.caption === title);
    if (found) {
      await page.request.delete(`http://localhost:5000/api/gallery/${found.id}`, {
        headers: { Authorization: `Bearer ${beToken2}` },
      });
    }
  } catch {}
});

test("non-admin cannot access /admin/moderation", async ({ page }) => {
  await loginAs(page, credentials.student.email, credentials.student.password);
  await page.goto("/admin/moderation");
  await expect(page).toHaveURL(/\/dashboard/);
});
