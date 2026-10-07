import { test, expect, type Page } from "@playwright/test";
const widths=[375,768,1024,1440];
const roles=['student','teacher','admin'] as const;
async function checkLayout(page:Page){
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  await expect(page.locator('main')).toBeVisible();
  expect(await page.locator('main').getAttribute('id')).toBe('main-content');
}
for(const width of widths){
  test(`public and auth pages at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error" && /hydrat|didn.t match/i.test(m.text()))errors.push(m.text());});
    for(const path of ['/','/announcements','/gallery','/login','/register?role=student','/register?role=teacher','/tv?animate=off']){
      await page.goto(path);await checkLayout(page);
      await page.screenshot({path:`ui-test-results/screenshots/public-${path.split('?')[0].replaceAll('/','')||'home'}-${width}.png`,fullPage:true,caret:"initial"});
    }
    expect(errors).toEqual([]);
  });
  for(const role of roles){
    test(`${role} pages at ${width}px`,async({page,context})=>{
      await page.setViewportSize({width,height:900});
      await context.addCookies([{name:'ns_token',value:`ui-${role}`,domain:'localhost',path:'/'}]);
      const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error" && /hydrat|didn.t match/i.test(m.text()))errors.push(m.text());});
      const paths=['/dashboard','/announcements?type=general','/announcements?type=department','/announcements?type=class','/gallery','/gallery/upload','/gallery/mine','/account'];
      if(role!=='student')paths.push('/announcements/create');
      if(role==='admin')paths.push('/admin/departments','/admin/users?department_id=2&role=student','/admin/users?department_id=2&role=teacher','/admin/events','/admin/moderation','/admin/categories','/admin/audit-logs');
      for(const path of paths){await page.goto(path);await checkLayout(page);await page.screenshot({path:`ui-test-results/screenshots/${role}-${path.split('?')[0].replaceAll('/','-')}-${width}.png`,fullPage:true,caret:"initial"});}
      expect(errors).toEqual([]);
    });
  }
}
test('mobile menu traps focus, closes with Escape, and restores focus',async({page})=>{
  await page.setViewportSize({width:375,height:812});await page.goto('/');
  const trigger=page.getByRole('button',{name:'Open menu'});await trigger.click();
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  for(let i=0;i<10;i++){await page.keyboard.press('Tab');expect(await dialog.evaluate(d=>d.contains(document.activeElement))).toBeTruthy();}
  await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();
});
test('TV is readable at 1920x1080 with only public General updates',async({page})=>{
  await page.setViewportSize({width:1920,height:1080});await page.goto('/tv?animate=off');await checkLayout(page);
  await expect(page.getByRole('heading',{name:'A new chapter begins'})).toBeVisible();
  await expect(page.getByText('Class project reminders')).toHaveCount(0);
  await expect(page.locator('nav')).toHaveCount(0);
  expect(await page.locator('h1').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThan(90);
  await page.screenshot({path:'ui-test-results/screenshots/tv-1920.png',fullPage:true,caret:"initial"});
});
