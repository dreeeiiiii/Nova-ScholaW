import { test, expect, type Page } from "@playwright/test";

const widths = [375, 768, 1024, 1440];

async function checkImages(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  // Scroll lazy images into view before verifying their actual decoded content.
  for (const image of await page.locator("img").all()) {
    if (!await image.isVisible()) continue;
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBeTruthy();
    expect(await image.getAttribute("alt")).toBeTruthy();
  }
  await page.evaluate(() => scrollTo(0, 0));
}

for (const width of widths) {
  test(`NST imagery, auth forms and approved gallery at ${width}px`, async ({ page, context, request }) => {
    await request.post("http://127.0.0.1:5055/__gallery-empty", { data: { empty: false } });
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const path of ["/", "/login", "/register?role=student", "/register?role=teacher", "/gallery", "/tv"]) {
      await page.goto(path);
      await checkImages(page);
      if (path === "/") {
        await expect(page.locator(".hero-photo img")).toHaveAttribute("alt", /Griffin mascot/);
        await expect(page.locator(".home-gallery img")).toHaveAttribute("src", /fixture.jpg/);
        await expect(page.locator(".nst-gallery-empty")).toHaveCount(0);
      }
      if (path.includes("login") || path.includes("register")) {
        await expect(page.locator(".nst-auth-photo")).toBeVisible({ visible: width >= 1024 });
        await expect(page.locator("form")).toBeVisible();
      }
      await page.screenshot({ path: `ui-test-results/nst/${path.replaceAll(/[^a-z]/g, "-") || "home"}-${width}.png`, fullPage: true });
    }
    for (const role of ["student", "teacher", "admin"]) {
      await context.addCookies([{ name: "ns_token", value: `ui-${role}`, domain: "localhost", path: "/" }]);
      await page.goto("/dashboard");
      await checkImages(page);
      await expect(page.locator(".nst-dashboard-welcome img")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
      await page.screenshot({ path: `ui-test-results/nst/dashboard-${role}-${width}.png`, fullPage: true });
    }
    expect(errors).toEqual([]);
  });

  test(`NST empty states stay outside uploaded gallery at ${width}px`, async ({ page, request, context }) => {
    await page.setViewportSize({ width, height: 900 });
    await request.post("http://127.0.0.1:5055/__gallery-empty", { data: { empty: true } });
    try {
      for (const path of ["/", "/gallery"]) {
        await page.goto(path);
        await checkImages(page);
        await expect(page.getByText("From the official NST website")).toBeVisible();
        await expect(page.locator(".nst-gallery-empty img")).toHaveAttribute("alt", /covered court/);
        await expect(page.locator(".home-gallery, .gallery-story")).toHaveCount(0);
      }
      await context.addCookies([{ name: "ns_token", value: "ui-student", domain: "localhost", path: "/" }]);
      await page.goto("/gallery");
      await checkImages(page);
      await expect(page.locator(".nst-gallery-empty")).toBeVisible();
      await expect(page.getByRole("button", { name: /^Open Campus moment/ })).toHaveCount(0);
      await page.screenshot({ path: `ui-test-results/nst/empty-gallery-${width}.png`, fullPage: true });
    } finally {
      await request.post("http://127.0.0.1:5055/__gallery-empty", { data: { empty: false } });
    }
  });
}
