import { test, expect, type Page } from "@playwright/test";
import { loadTvAnnouncements } from "../../lib/tv-announcements";

async function noOverflow(page:Page, television=false) {
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1)).toBeTruthy();
  if(television) expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight+1)).toBeTruthy();
  for(const image of await page.locator("img").all()) {
    if(!await image.isVisible()) continue;
    await image.scrollIntoViewIfNeeded();
    await expect.poll(()=>image.evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth>0)).toBeTruthy();
  }
  await page.evaluate(()=>scrollTo(0,0));
}
test.afterEach(async({request})=>{
  await request.post("http://127.0.0.1:5055/__tv-feed",{data:{mode:"normal"}});
  await request.post("http://127.0.0.1:5055/__gallery-empty",{data:{empty:false}});
});
for(const width of [375,768,1024,1440]) {
  test("display announcement imagery and dynamic gallery at "+width,async({page,context,request})=>{
    await request.post("http://127.0.0.1:5055/__tv-feed",{data:{mode:"display"}});
    await page.setViewportSize({width,height:900});
    await page.goto("/"); await noOverflow(page);
    await expect(page.locator(".bulletin-card .announcement-visual img").first()).toHaveAttribute("src",/^\/nst\//);
    await expect(page.locator(".home-gallery img")).toHaveAttribute("src",/fixture.jpg/);
    await page.screenshot({path:"ui-test-results/display/home-"+width+".png",fullPage:true});
    for(const role of ["student","teacher","admin"]) {
      await context.addCookies([{name:"ns_token",value:"ui-"+role,domain:"localhost",path:"/"}]);
      await page.goto("/dashboard");await noOverflow(page);
      await expect(page.locator(".dashboard-feed .announcement-visual").first()).toBeVisible();
      await page.goto("/announcements?type=general");await noOverflow(page);
      await expect(page.locator(".announcement-card .announcement-visual").first()).toBeVisible();
      await page.screenshot({path:"ui-test-results/display/announcements-"+role+"-"+width+".png",fullPage:true});
    }
    await request.post("http://127.0.0.1:5055/__gallery-empty",{data:{empty:true}});
    await page.goto("/gallery");await noOverflow(page);
    await expect(page.locator(".nst-gallery-empty img")).toBeVisible();
    await page.screenshot({path:"ui-test-results/display/gallery-empty-"+width+".png",fullPage:true});
  });
}
for(const [width,height] of [[1920,1080],[1366,768]]) {
  test("TV rotates all 10 General records and fits "+width+"x"+height,async({page,request})=>{
    await request.post("http://127.0.0.1:5055/__tv-feed",{data:{mode:"display"}});
    await page.setViewportSize({width,height});
    await page.clock.install();
    await page.goto("/tv");await noOverflow(page,true);
    await expect(page.getByRole("heading",{name:"NST: Now Stronger at Twelve",exact:true})).toBeVisible();
    await expect(page.getByLabel("Current announcement").locator("img")).toHaveAttribute("src",/^\/nst\//);
    const titles=new Set<string>();
    for(let index=0;index<10;index++){
      titles.add((await page.locator("h1").textContent())!);
      await noOverflow(page,true);
      expect(await page.locator("h1").evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(40);
      await page.screenshot({path:"ui-test-results/display/tv-"+width+"-"+index+".png"});
      await page.clock.runFor(10000);
    }
    expect(titles.size).toBe(10);
    await expect(page.locator("h1")).toHaveText("NST: Now Stronger at Twelve");
    await expect(page.getByText(/Draft:|Archived:/)).toHaveCount(0);
    await expect(page.locator("nav")).toHaveCount(0);
  });
}
test("TV fallback, defensive filtering, hidden-tab pause and empty state",async({page,request})=>{
  await request.post("http://127.0.0.1:5055/__tv-feed",{data:{mode:"mixed"}});
  await page.clock.install();
  await page.setViewportSize({width:1366,height:768});
  await page.goto("/tv?animate=off");await noOverflow(page,true);
  await expect(page.getByLabel("Current announcement").locator("img")).toHaveAttribute("src",/m50-shs-12/);
  await expect(page.getByText(/Class project reminders|Senior High School assembly|Draft:|Archived:|Future scheduled demo|Expired demo/)).toHaveCount(0);
  await page.evaluate(()=>{Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"));});
  await page.clock.runFor(20000);
  await expect(page.locator("h1")).toHaveText("NST: Now Stronger at Twelve");
  await page.evaluate(()=>{Object.defineProperty(document,"hidden",{configurable:true,get:()=>false});document.dispatchEvent(new Event("visibilitychange"));});
  await page.clock.runFor(10000);
  await expect(page.locator("h1")).toHaveText("Celebrating Victory: 12th Foundation Winners");
  await request.post("http://127.0.0.1:5055/__tv-feed",{data:{mode:"empty"}});
  await page.goto("/tv");await noOverflow(page,true);
  await expect(page.locator("h1")).toHaveText("No active announcements at this time.");
  await expect(page.getByLabel("Current announcement").locator("img")).toHaveAttribute("src",/m50-shs-12/);
  await page.screenshot({path:"ui-test-results/display/tv-empty.png"});
});

test("TV collects eligible records beyond a single API page",async()=>{
  const feed=Array.from({length:205},(_,id)=>({id,title:"General "+id,content:"Body",type:"general",status:"published",created_at:"2025-01-01T00:00:00Z"}));
  const offsets:number[]=[];
  const all=await loadTvAnnouncements(async offset=>{offsets.push(offset);return {announcements:feed.slice(offset,offset+100),total:feed.length};});
  expect(all).toHaveLength(205);expect(offsets).toEqual([0,100,200]);
});
