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
  await expect(page.getByLabel('Section', { exact: true })).toHaveValue('new');
  await expect(page.getByText('No existing sections found.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Section', { exact: true }).locator('option[value="1"]')).toHaveCount(0);
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

 test('zero sections in a department automatically requires only the manual section name', async ({ page }) => {
  let registration: Record<string, unknown> | undefined;
  await page.route('**/api/auth/register', async route => {
    registration = route.request().postDataJSON();
    await route.fulfill({ json: { message: 'Account created.' }, status: 201 });
  });
  await page.goto('/register?role=student');
  await page.getByLabel('Department', { exact: true }).selectOption('1');
  await page.getByLabel('Student Level', { exact: true }).selectOption('1st Year');
  await expect(page.getByText('No existing sections found.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Section', { exact: true })).toHaveValue('new');
  await expect(page.getByLabel('Section', { exact: true }).getByRole('option', { name: 'My section is not listed', exact: true })).toHaveCount(1);
  await page.getByLabel('Full name', { exact: true }).fill('Zero Section Student');
  await page.getByLabel('Email', { exact: true }).fill('zero@my.nst.edu.ph');
  await page.getByLabel('Password', { exact: true }).fill('UiTest123!');
  await page.getByLabel('Confirm password', { exact: true }).fill('UiTest123!');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  expect(registration).toBeUndefined();
  await page.getByLabel('New Section Name', { exact: true }).fill('BSIS 1-C');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Log in', exact: true })).toBeVisible();
  expect(registration).toMatchObject({ section_id: null, new_section_name: 'BSIS 1-C', department_id: '1', grade_level: '1st Year' });
});

 test('open Admin and registration tabs synchronize creation and editing through shared API data', async ({ page, context }) => {
  const records = [{ id: 1, name: 'STEM 12-A', grade_level: '12', department_id: '2', student_count: 0 }];
  const options = { courses: [], levels: ['12', 'Grade 11'] };
  await context.addCookies([{ name: 'ns_token', value: 'ui-admin', domain: 'localhost', path: '/' }]);
  await context.route('**/api/auth/sections?*', route => route.fulfill({ json: { ...options, sections: records } }));
  await context.route('**/api/sections**', async route => {
    const req = route.request();
    if (req.method() === 'POST') records.push({ ...req.postDataJSON(), id: records.length + 1, student_count: 0 });
    if (req.method() === 'PUT') Object.assign(records.find(s => String(s.id) === new URL(req.url()).pathname.split('/').at(-1))!, req.postDataJSON());
    await route.fulfill({ json: { sections: records.filter(s => s.department_id === new URL(req.url()).searchParams.get('department_id')), message: 'Saved.' } });
  });
  await context.route('**/api/auth/register', async route => {
    const body = route.request().postDataJSON();
    records.push({ id: records.length + 1, name: body.new_section_name, grade_level: body.grade_level, department_id: body.department_id, student_count: 1 });
    await route.fulfill({ json: { message: 'Account created.' }, status: 201 });
  });
  await page.goto('/register?role=student');
  await page.getByLabel('Department', { exact: true }).selectOption('2');
  await page.getByLabel('Student Level', { exact: true }).selectOption('12');
  const admin = await context.newPage();
  await admin.goto('/admin/departments');
  const department = admin.locator('section').filter({ has: admin.getByRole('heading', { name: 'Senior High School', exact: true }) });
  await department.getByLabel('Section name', { exact: true }).fill('STEM 12-B');
  await department.getByLabel('Grade / year level', { exact: true }).fill('12');
  await department.getByRole('button', { name: 'Create Section', exact: true }).click();
  await expect(department.getByText('STEM 12-B', { exact: true })).toBeVisible();
  await page.bringToFront();
  await expect(page.getByLabel('Section', { exact: true }).locator('option[value="2"]')).toHaveText('STEM 12-B');
  await page.getByLabel('Section', { exact: true }).selectOption('2');
  await admin.bringToFront();
  await department.locator('li').filter({ hasText: 'STEM 12-B' }).getByRole('button', { name: 'Edit', exact: true }).click();
  const dialog = admin.getByRole('dialog', { name: 'Edit section' });
  await dialog.getByLabel('Section name', { exact: true }).fill('STEM 12-C');
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.bringToFront();
  await expect(page.getByLabel('Section', { exact: true }).locator('option[value="2"]')).toHaveText('STEM 12-C');
  await page.getByLabel('Student Level', { exact: true }).selectOption('Grade 11');
  await expect(page.getByLabel('Section', { exact: true })).toHaveValue('new');
  await page.getByLabel('New Section Name', { exact: true }).fill('STEM 11-A');
  await page.getByLabel('Full name', { exact: true }).fill('Shared Section Student');
  await page.getByLabel('Email', { exact: true }).fill('shared@my.nst.edu.ph');
  await page.getByLabel('Password', { exact: true }).fill('UiTest123!');
  await page.getByLabel('Confirm password', { exact: true }).fill('UiTest123!');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Log in', exact: true })).toBeVisible();
  await admin.bringToFront();
  await expect(department.getByText('STEM 11-A', { exact: true })).toBeVisible();
});
