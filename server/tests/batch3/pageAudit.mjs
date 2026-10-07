import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const directory = new URL('../../../.batch1-validation/predeploy-visual/', import.meta.url);
const records = [];

export async function auditPageSet(page, origin, role, routes) {
  if (!process.argv.includes('--page-audit')) return;
  await mkdir(directory, { recursive: true });
  for (const [width, height] of [[1280,900],[375,812]]) {
    await page.setViewportSize({width,height});
    for (const route of routes) {
      const response = await page.goto(origin+route);
      assert.equal(response.status(),200,`${role} ${route}`);
      assert.equal(new URL(page.url()).pathname,new URL(origin+route).pathname,`Unexpected redirect: ${role} ${route}`);
      await page.getByRole('heading').first().waitFor();
      await page.evaluate(()=>document.fonts.ready);
      if(route==='/'){
        // Exercise scroll reveals before the full-page visual capture.
        const height=await page.evaluate(()=>document.documentElement.scrollHeight);
        for(let y=0;y<height;y+=600){await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(60);}
        await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(650);
      }
      // Fonts/forms/media hydrate before screenshots; bounded local-only wait.
      await page.waitForTimeout(250);
      const bounds = await page.evaluate(()=>({viewport:innerWidth,content:document.documentElement.scrollWidth,
        offenders:[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&getComputedStyle(e).position!=='fixed').slice(0,8).map(e=>({tag:e.tagName,className:e.className,right:e.getBoundingClientRect().right}))}));
      const filename=`${role}-${route.replace(/[^a-z0-9]/gi,'_')||'home'}-${width}.png`;
      await page.screenshot({path:new URL(filename,directory).pathname.replace(/^\/(?=[A-Za-z]:)/,''),fullPage:true,animations:'disabled'});
      records.push({role,route,width,status:response.status(),filename,bounds});
      if(bounds.content>bounds.viewport+1)console.log('UI overflow found:',role,route,width,JSON.stringify(bounds));
    }
    if(role!=='public' && width===375){
      await page.getByRole('button',{name:'Open menu',exact:true}).click();
      const drawer=page.getByRole('dialog',{name:'Mobile navigation',exact:true});
      await drawer.getByTestId('logout').waitFor();
      await page.screenshot({path:new URL(`${role}-mobile-navigation.png`,directory).pathname.replace(/^\/(?=[A-Za-z]:)/,''),animations:'disabled'});
      await drawer.getByTestId('logout').click();
      await page.waitForURL(/\/login/);
      assert.equal((await page.context().cookies()).filter(c=>c.name==='ns_token').length,0);
    }
  }
  await writeFile(new URL('pages.json',directory),JSON.stringify(records,null,2));
  await page.setViewportSize({width:1280,height:900});
  console.log(`PASS: ${role} required pages at desktop/mobile; ${routes.length*2} page captures`);
}

export function assertPageAudit(){assert.ok(records.every(r=>r.bounds.content<=r.bounds.viewport+1),'Page overflow recorded; review pages.json');}
