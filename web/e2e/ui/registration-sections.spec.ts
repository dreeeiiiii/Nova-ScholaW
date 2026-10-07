import { test, expect } from '@playwright/test';

test('Student academic changes clear sections and manual entry goes through registration', async ({ page, request }) => {
  await page.goto('/register?role=student');
  await page.getByLabel('Department', { exact: true }).selectOption('2');
  await page.getByLabel('Course / Program', { exact: true }).selectOption('1');
  await page.getByLabel('Student Level', { exact: true }).selectOption('12');
  await page.getByLabel('Section', { exact: true }).selectOption('1');
  await page.getByLabel('Course / Program', { exact: true }).selectOption('2');
  await expect(page.getByLabel('Section', { exact: true })).toHaveValue('');
  await page.getByLabel('Section', { exact: true }).selectOption('1');
  await page.getByLabel('Student Level', { exact: true }).selectOption('Grade 11');
  await expect(page.getByLabel('Section', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Section', { exact: true }).locator('option[value="1"]')).toHaveCount(0);
  await page.getByLabel('Section', { exact: true }).selectOption('new');
  await expect(page.getByLabel('New Section Name', { exact: true })).toBeVisible();
  await expect(page.getByText('If your section is not listed, enter the official section name provided by Nova Schola Tanauan.')).toBeVisible();
  await page.getByLabel('New Section Name', { exact: true }).fill('STEM 11-A');
  await page.getByLabel('Full name', { exact: true }).fill('Test Student');
  await page.getByLabel('Email', { exact: true }).fill('test@my.nst.edu.ph');
  await page.getByLabel('Password', { exact: true }).fill('UiTest123!');
  await page.getByLabel('Confirm password', { exact: true }).fill('UiTest123!');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Log in', exact: true })).toBeVisible();
  const writes = await (await request.get('http://127.0.0.1:5055/__writes')).json();
  const registration = writes.filter((w: { path: string }) => w.path === '/api/auth/register').at(-1);
  expect(registration.body).toMatchObject({ department_id: '2', course_id: '2', grade_level: 'Grade 11', section_id: null, new_section_name: 'STEM 11-A' });
  expect(writes.filter((w: { path: string }) => w.path === '/api/sections')).toHaveLength(0);
});

test('department and role changes clear section creation; Teacher has no student fields', async ({ page }) => {
  await page.goto('/register?role=student');
  await page.getByLabel('Department', { exact: true }).selectOption('2');
  await page.getByLabel('Student Level', { exact: true }).selectOption('12');
  await page.getByLabel('Section', { exact: true }).selectOption('new');
  await page.getByLabel('New Section Name', { exact: true }).fill('STEM 12-A');
  await page.getByLabel('Department', { exact: true }).selectOption('1');
  await expect(page.getByLabel('Section', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Student Level', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('New Section Name', { exact: true })).toHaveCount(0);
  await page.getByLabel('Account type', { exact: true }).selectOption('teacher');
  await expect(page.getByLabel('Section', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Student Level', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Course / Program', { exact: true })).toHaveCount(0);
});
