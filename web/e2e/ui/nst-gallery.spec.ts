import { test, expect, type Page } from '@playwright/test';

async function verify(page: Page) {
  await expect(page.locator('main')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  await expect(page.getByText('(demo photo)', { exact: false })).toHaveCount(0);
  for (const img of await page.locator('main img').all()) {
    if (!await img.isVisible()) continue;
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBeTruthy();
  }
  await page.evaluate(() => scrollTo(0, 0));
}

for (const width of [375, 768, 1024, 1440]) {
  test('real NST gallery, homepage, admin and empty state at ' + width + 'px', async ({ page, context, request }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await request.post('http://127.0.0.1:5055/__gallery-nst', { data: { enabled: true } });
    try {
      for (const url of ['/', '/gallery']) {
        await page.goto(url);
        await verify(page);
        await expect(page.locator('.nst-gallery-empty')).toHaveCount(0);
        await expect(page.getByText('NST Foundation Activity', { exact: true })).toBeVisible();
        await page.screenshot({ path: 'ui-test-results/nst-gallery/' + (url === '/' ? 'home' : 'public') + '-' + width + '.png', fullPage: true });
      }
      await context.addCookies([{ name: 'ns_token', value: 'ui-admin', domain: 'localhost', path: '/' }]);
      await page.goto('/admin/events');
      await verify(page);
      await expect(page.getByRole('heading', { name: 'Event Management', exact: true })).toBeVisible();
      await page.getByRole('link', { name: /Approved gallery/ }).click();
      await verify(page);
      await page.getByRole('button', { name: 'Open NST Foundation Activity', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await page.goto('/admin/moderation');
      await page.getByRole('button', { name: 'Approved', exact: true }).click();
      await expect(page.getByText('NST Foundation Activity', { exact: true })).toBeVisible();
      await verify(page);
      await expect(page.getByRole('button', { name: 'Withdraw', exact: true })).toHaveCount(8);
      await page.screenshot({ path: 'ui-test-results/nst-gallery/admin-' + width + '.png', fullPage: true });
      await context.clearCookies();
      await request.post('http://127.0.0.1:5055/__gallery-empty', { data: { empty: true } });
      for (const url of ['/', '/gallery']) {
        await page.goto(url);
        await verify(page);
        await expect(page.getByText('No approved event photos are available yet.', { exact: true })).toBeVisible();
        await expect(page.locator('.nst-gallery-empty img')).toHaveCount(1);
      }
      expect(errors).toEqual([]);
    } finally {
      await request.post('http://127.0.0.1:5055/__gallery-nst', { data: { enabled: false } });
    }
  });
}
