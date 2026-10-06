import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || '/Users/kurosim/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:3000');await page.waitForTimeout(700);await page.locator('#pause').click();
  assert.equal(await page.locator('#farm').getAttribute('data-renderer'),'three-webgl');
  await mkdir('artifacts',{recursive:true});
  const overview=await page.locator('.viewport').screenshot({path:'artifacts/farm-large-overview.png'});
  for(const area of ['farmyard','fields','orchard','village','livestock','lakeside']){
    await page.locator('#camera-area').selectOption(area);await page.waitForTimeout(200);
    assert.equal(await page.locator('#farm').getAttribute('data-area'),area);
    const shot=await page.locator('.viewport').screenshot({path:`artifacts/farm-large-${area}.png`});assert(!shot.equals(overview),`${area} changes the view while paused`);
  }
  await page.locator('#reset-camera').click();assert.equal(await page.locator('#camera-area').inputValue(),'overview');
  await page.locator('#zoom-in').click();await page.locator('#zoom-out').click();await page.locator('#rotate-left').click();await page.locator('#rotate-right').click();
  await page.locator('#farm').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('+');await page.keyboard.press('Home');assert.equal(await page.locator('#farm').getAttribute('data-area'),'overview');
  for(const width of [375,768,1440]){await page.setViewportSize({width,height:1100});await page.locator('#camera-area').selectOption('livestock');await page.waitForTimeout(200);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`artifacts/farm-large-${width}.png`,fullPage:true});}
  assert.deepEqual(errors,[]);console.log('PASS: six area views, overview/reset, camera buttons, keyboard, paused navigation, actual image changes and responsive layouts.');
} finally {await browser.close();}
