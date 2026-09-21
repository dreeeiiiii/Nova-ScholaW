import { test, expect } from "./fixtures";
import { credentials, loginAs } from "./fixtures";

function uniqueTitle(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

const titlesToDelete: string[] = [];

test("teacher-creates-general-announcement", async ({ page }) => {
  await loginAs(page, credentials.teacher.email, credentials.teacher.password);
  await page.goto("/announcements/create");

  const title = uniqueTitle("P45_VERIFY_General");
  await page.getByLabel("Title *").fill(title);
  await page.getByLabel("Content *").fill("General content from Playwright");

  // General is default, no audience picker
  await page.getByRole("button", { name: "Publish" }).click();

  await page.waitForURL(/\/announcements/);
  await expect(page.getByText(title)).toBeVisible();

  titlesToDelete.push(title);
});

test("teacher-edits-own-announcement", async ({ page }) => {
  await loginAs(page, credentials.teacher.email, credentials.teacher.password);

  // Create
  const title = uniqueTitle("P45_VERIFY_EditOwn");
  await page.goto("/announcements/create");
  await page.getByLabel("Title *").fill(title);
  await page.getByLabel("Content *").fill("Edit test content");
  await page.getByRole("button", { name: "Publish" }).click();
  await page.waitForURL(/\/announcements/);
  await expect(page.getByText(title)).toBeVisible();

  // Get id via backend search
  const beLogin = await page.request.post("http://localhost:5000/api/auth/login", {
    data: { email: credentials.teacher.email, password: credentials.teacher.password },
  });
  const beJson = await beLogin.json();
  const token = beJson.token;
  const searchRes = await page.request.get(`http://localhost:5000/api/announcements?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const searchJson = await searchRes.json();
  const found = (searchJson.announcements ?? []).find((a: { title: string }) => a.title === title);
  const editId = found?.id;
  expect(editId).toBeTruthy();
  await page.goto(`/announcements/${editId}/edit`);
  await expect(page.getByLabel("Title *")).toHaveValue(title);

  const newTitle = title + "_edited";
  await page.getByLabel("Title *").fill(newTitle);
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.waitForURL(/\/announcements/);
  await expect(page.getByText(newTitle)).toBeVisible();
  await expect(page.getByText(title, { exact: true })).toBeHidden();

  titlesToDelete.push(newTitle);
});

test("teacher-cannot-see-edit-on-others-announcement", async ({ page }) => {
  // Teacher A creates
  await loginAs(page, credentials.teacher.email, credentials.teacher.password);
  const title = uniqueTitle("P45_VERIFY_Other");
  await page.goto("/announcements/create");
  await page.getByLabel("Title *").fill(title);
  await page.getByLabel("Content *").fill("Other teacher content");
  await page.getByRole("button", { name: "Publish" }).click();
  await page.waitForURL(/\/announcements/);
  await expect(page.getByText(title)).toBeVisible();

  // Logout, login as teacher2
  await page.getByTestId("logout").click();
  await page.waitForURL("/login", { timeout: 15000 });
  await loginAs(page, credentials.teacher2.email, credentials.teacher2.password);
  await page.getByTestId("sidebar").waitFor({ state: "visible" });
  await expect(page.getByTestId("sidebar")).toBeVisible();
  await page.goto("/announcements");
  const card = page.locator("article", { hasText: title });
  await expect(card).toBeVisible();
  await expect(card.getByRole("link", { name: "Edit" })).toBeHidden();
  await expect(card.getByRole("button", { name: "Delete" })).toBeHidden();

  titlesToDelete.push(title);
});

test.afterEach(async ({ page }) => {
  if (titlesToDelete.length === 0) return;
  const beRes = await page.request.post("http://localhost:5000/api/auth/login", {
    data: { email: credentials.admin.email, password: credentials.admin.password },
  });
  const beJson = await beRes.json().catch(() => ({}));
  const token = beJson.token;
  if (!token) {
    titlesToDelete.length = 0;
    return;
  }
  for (const t of [...titlesToDelete]) {
    const searchRes = await page.request.get(`http://localhost:5000/api/announcements?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const searchJson = await searchRes.json().catch(() => ({}));
    const found = (searchJson.announcements ?? []).find((a: { title: string }) => a.title === t);
    if (found) {
      await page.request.delete(`http://localhost:5000/api/announcements/${found.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }
  titlesToDelete.length = 0;
});
