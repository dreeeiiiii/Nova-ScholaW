import { test, expect } from "@playwright/test";
test('section edit and delete dialogs preserve requests and keyboard focus',async({page,context})=>{
  await context.addCookies([{name:'ns_token',value:'ui-admin',domain:'localhost',path:'/'}]);await page.setViewportSize({width:375,height:812});await page.goto('/admin/departments');
  const department=page.locator('section').filter({has:page.getByRole('heading',{name:'Senior High School',exact:true})});const edit=department.getByRole('button',{name:'Edit',exact:true});await edit.click();
  const dialog=page.getByRole('dialog',{name:'Edit section'});await expect(dialog).toBeVisible();
  for(let i=0;i<7;i++){await page.keyboard.press('Tab');expect(await dialog.evaluate(d=>d.contains(document.activeElement))).toBeTruthy();}
  await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(edit).toBeFocused();await edit.click();
  await dialog.getByLabel('Section name').fill('Updated UI section');await dialog.getByLabel('Grade / year level').fill('11');const update=page.waitForResponse(r=>r.url().endsWith('/api/sections/1')&&r.request().method()==='PUT');await dialog.getByRole('button',{name:'Save changes'}).click();expect((await update).request().postDataJSON()).toEqual({name:'Updated UI section',grade_level:'11',department_id:'2'});await expect(dialog).not.toBeVisible();
  await department.getByRole('button',{name:'Delete',exact:true}).click();const confirmation=page.getByRole('dialog',{name:'Delete section'});await expect(confirmation).toBeVisible();const deletion=page.waitForResponse(r=>r.url().endsWith('/api/sections/1')&&r.request().method()==='DELETE');await confirmation.getByRole('button',{name:'Delete Section',exact:true}).click();expect((await deletion).ok()).toBeTruthy();await expect(confirmation).not.toBeVisible();
});
test('image withdrawal dialog closes and restores focus without withdrawing',async({page,context})=>{
  await context.addCookies([{name:'ns_token',value:'ui-admin',domain:'localhost',path:'/'}]);await page.goto('/admin/moderation');await page.getByRole('button',{name:'Approved',exact:true}).click();const trigger=page.getByRole('button',{name:'Withdraw',exact:true});await trigger.click();const dialog=page.getByRole('dialog',{name:'Withdraw image'});await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();
});
