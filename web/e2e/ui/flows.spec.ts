import { test, expect } from "@playwright/test";

for(const role of ['student','teacher','admin'] as const){
  test(`${role} login, mobile navigation, and logout`,async({page,context})=>{
    await page.setViewportSize({width:375,height:812});await page.goto('/login');
    await page.getByLabel('Email',{exact:true}).fill(`${role}@${role==='student'?'my.':role==='teacher'?'tr.':''}nst.edu.ph`);
    await page.getByLabel('Password',{exact:true}).fill('UiTest123!');await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await expect(page).toHaveURL(/dashboard/);await page.getByRole('button',{name:'Open menu'}).click();
    const dialog=page.getByRole('dialog');await expect(dialog.getByText(`${role} · Nova Schola Tanauan`,{exact:true})).toBeVisible();
    await expect(dialog.getByRole('link',{name:'Account / Change Password'})).toBeVisible();
    if(role==='teacher')await expect(dialog.getByRole('link',{name:'Create Class Announcement'})).toBeVisible();
    if(role==='student')await expect(dialog.getByRole('link',{name:'Department Management'})).toHaveCount(0);
    await dialog.getByRole('button',{name:'Log out'}).click();await expect(page).toHaveURL(/login/);
    expect((await context.cookies()).some(c=>c.name==='ns_token')).toBeFalsy();
  });
}
for(const role of ['student','teacher'] as const){
  test(`${role} registration keeps role, domain guidance, and assignments`,async({page})=>{
    await page.goto(`/register?role=${role}`);
    await expect(page.getByRole('status')).toContainText(role==='student'?'@my.nst.edu.ph':'@tr.nst.edu.ph');
    await page.getByLabel('Full name').fill('UI Test Account');await page.getByLabel('Email',{exact:true}).fill(`${role}@${role==='student'?'my':'tr'}.nst.edu.ph`);
    await page.getByLabel('Department',{exact:true}).selectOption('2');
    if(role==='student')await page.getByLabel('Section',{exact:true}).selectOption('1');
    else await expect(page.getByLabel('Section',{exact:true})).toHaveCount(0);
    await page.getByLabel('Password',{exact:true}).fill('UiTest123!');await page.getByLabel('Confirm password',{exact:true}).fill('UiTest123!');
    const response=page.waitForResponse(r=>r.url().includes('/api/auth/register')&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Create account',exact:true}).click();
    const result=await response;expect(result.request().postDataJSON()).toMatchObject({role,department_id:'2',section_id:role==='student'?'1':null});expect(result.ok()).toBeTruthy();
  });
}
test('teacher publishing preserves selected recipients and class contract',async({page,context})=>{
  await context.addCookies([{name:'ns_token',value:'ui-teacher',domain:'localhost',path:'/'}]);await page.goto('/announcements/create');
  await expect(page.getByRole('button',{name:'General',exact:true})).toHaveCount(0);
  await page.getByLabel('Title *',{exact:true}).fill('UI class reminder');await page.getByLabel('Content *',{exact:true}).fill('Prepare your project for the next lesson.');
  await page.getByRole('button',{name:'Publish class announcement',exact:true}).click();await expect(page.getByText('Select at least one audience',{exact:true})).toBeVisible();
  await page.getByRole('checkbox',{name:/STEM 12/}).check();
  await page.getByRole('checkbox',{name:/^STEM \(/}).check();
  await page.getByRole('searchbox').fill('Nova');await page.getByRole('button',{name:'Add',exact:true}).click();
  const response=page.waitForResponse(r=>r.url().endsWith('/api/announcements/class')&&r.request().method()==='POST');await page.getByRole('button',{name:'Publish class announcement'}).click();
  const result=await response;expect(result.request().postDataJSON()).toMatchObject({title:'UI class reminder',section_ids:[1],course_ids:[1],student_ids:[3],show_on_tv:false});expect(result.ok()).toBeTruthy();
});
test('admin General and Department publishing retain targeting contracts',async({page,context})=>{
  await context.addCookies([{name:'ns_token',value:'ui-admin',domain:'localhost',path:'/'}]);
  for(const type of ['general','department']){
    await page.goto(`/announcements/create?type=${type}&department_id=2`);await page.getByLabel('Title *',{exact:true}).fill(`UI ${type} reminder`);await page.getByLabel('Content *',{exact:true}).fill('Please read this school update.');
    await expect(page.getByRole('searchbox')).toHaveCount(0);
    const response=page.waitForResponse(r=>r.url().endsWith(`/api/announcements/${type}`)&&r.request().method()==='POST');await page.getByRole('button',{name:'Publish',exact:true}).click();
    const result=await response;expect(result.ok()).toBeTruthy();const payload=result.request().postDataJSON();expect(payload.section_ids).toBeUndefined();if(type==='department')expect(payload.department_id).toBe(2);else expect(payload.department_id).toBeUndefined();
  }
});
test('image upload validates files and retains multipart contract',async({page,context})=>{
  await context.addCookies([{name:'ns_token',value:'ui-student',domain:'localhost',path:'/'}]);await page.goto('/gallery/upload');
  await page.getByLabel('School event image').setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('invalid')});await expect(page.locator('main').getByRole('alert')).toContainText('Only JPEG');
  await page.getByLabel('School event image').setInputFiles({name:'large.jpg',mimeType:'image/jpeg',buffer:Buffer.alloc(10*1024*1024+1)});await expect(page.locator('main').getByRole('alert')).toContainText('Maximum 10 MB');
  await page.getByLabel('Event name *').fill('UI campus event');await page.getByLabel('Category *').selectOption('1');await page.getByLabel('School event image').setInputFiles('e2e/fixtures/tiny.jpg');
  const response=page.waitForResponse(r=>r.url().endsWith('/api/gallery/upload')&&r.request().method()==='POST');await page.getByRole('button',{name:'Submit for review'}).click();
  const result=await response;expect(result.ok()).toBeTruthy();expect(result.request().headers()['content-type']).toContain('multipart/form-data');await expect(page.getByRole('dialog')).toBeVisible();
});
test('admin moderation, status views, section creation, categories, and audit filters',async({page,context})=>{
  await context.addCookies([{name:'ns_token',value:'ui-admin',domain:'localhost',path:'/'}]);await page.goto('/admin/moderation');
  for(const status of ['Approved','Rejected']){await page.getByRole('button',{name:status,exact:true}).click();await expect(page.getByText(status==='Approved'?'Campus moment 2':'Campus moment 3',{exact:true}).first()).toBeVisible();}
  await page.getByRole('button',{name:'Pending',exact:true}).click();const approval=page.waitForResponse(r=>r.url().endsWith('/approve'));await page.getByRole('button',{name:'Approve',exact:true}).click();expect((await approval).request().method()).toBe('PATCH');
  await page.reload();await page.getByRole('button',{name:'Reject',exact:true}).click();await page.getByLabel('Rejection reason *').fill('Please choose a clearer school event photo.');const rejection=page.waitForResponse(r=>r.url().endsWith('/reject'));await page.getByRole('dialog').getByRole('button',{name:'Reject',exact:true}).click();expect((await rejection).request().postDataJSON()).toEqual({rejection_reason:'Please choose a clearer school event photo.'});
  await page.goto('/admin/departments');const department=page.locator('section').filter({has:page.getByRole('heading',{name:'Senior High School',exact:true})});await department.getByLabel('Section name').fill('UI Section');await department.getByLabel('Grade / year level').fill('12');const section=page.waitForResponse(r=>r.url().endsWith('/api/sections')&&r.request().method()==='POST');await department.getByRole('button',{name:'Create Section'}).click();expect((await section).request().postDataJSON()).toMatchObject({name:'UI Section',grade_level:'12',department_id:'2'});
  await page.goto('/admin/categories');await page.getByRole('button',{name:'Add category'}).click();await page.getByRole('dialog').getByRole('textbox').fill('UI events');const category=page.waitForResponse(r=>r.url().endsWith('/api/categories')&&r.request().method()==='POST');await page.getByRole('dialog').getByRole('button',{name:'Create',exact:true}).click();expect((await category).request().postDataJSON()).toEqual({name:'UI events'});
  await page.goto('/admin/audit-logs');await page.getByLabel('Action',{exact:true}).selectOption('announcement.create');await expect(page).toHaveURL(/action=announcement.create/);await page.getByLabel('Entity type').selectOption('announcement');await expect(page).toHaveURL(/entity_type=announcement/);
});
for(const role of ['student','teacher','admin'] as const){
  test(`${role} password change preserves validation and payload`,async({page,context})=>{
    await context.addCookies([{name:'ns_token',value:`ui-${role}`,domain:'localhost',path:'/'}]);await page.goto('/account');
    await page.getByLabel('Current password',{exact:true}).fill('UiTest123!');await page.getByLabel('New password',{exact:true}).fill('NewUiTest123!');await page.getByLabel('Confirm new password',{exact:true}).fill('Mismatch123!');await page.getByRole('button',{name:'Change Password',exact:true}).click();await expect(page.locator('main').getByRole('alert')).toContainText('do not match');
    await page.getByLabel('Confirm new password',{exact:true}).fill('NewUiTest123!');const response=page.waitForResponse(r=>r.url().endsWith('/api/auth/change-password'));await page.getByRole('button',{name:'Change Password',exact:true}).click();expect((await response).request().postDataJSON()).toEqual({current_password:'UiTest123!',new_password:'NewUiTest123!'});await expect(page.getByRole('link',{name:'Sign in again'})).toBeVisible();
  });
}
test('student and teacher cannot enter admin screens',async({page,context})=>{
  for(const role of ['student','teacher']){await context.addCookies([{name:'ns_token',value:`ui-${role}`,domain:'localhost',path:'/'}]);for(const path of ['/admin/departments','/admin/events','/admin/moderation','/admin/users','/admin/categories','/admin/audit-logs']){await page.goto(path);await expect(page).toHaveURL(/dashboard/);}}
});
