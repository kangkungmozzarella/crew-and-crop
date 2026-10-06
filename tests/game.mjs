import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/Users/kurosim/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.clock.install();await page.goto(process.env.TEST_URL || 'http://127.0.0.1:3000');
 assert.equal(await page.locator('#farm').getAttribute('data-renderer'),'three-webgl');await page.clock.runFor(100);assert.equal(await page.locator('#view-message').isVisible(),false);
 await page.locator('#pause').click();const first=await page.locator('.world-label.person').first().getAttribute('style');await page.locator('#rotate-left').click();await page.clock.runFor(100);assert.notEqual(await page.locator('.world-label.person').first().getAttribute('style'),first,'camera rotates while paused');await page.locator('#rotate-right').click();await page.locator('#zoom-in').click();await page.locator('#zoom-out').click();await page.locator('#reset-camera').click();await page.locator('#farm').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('+');await page.keyboard.press('Home');await page.locator('#pause').click();
 await page.locator('#crew-order').fill('Harvest rice, sweep the yard and chop mature trees');await page.locator('#crew-form button').click();
 await page.locator('#speed').click();await page.clock.runFor(30000);await page.locator('#speed').click();
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('crew-crop-v1')));
 assert(saved.rice>0,'harvester stores rice');assert(saved.wood>0,'lumberjack stores wood');assert(saved.agents[1].done>0,'sweeper removes leaves');
 await page.locator('#order-2').fill('Plant trees');await page.locator('.member').nth(2).locator('form button').click();await page.clock.runFor(20000);
 saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('crew-crop-v1')));assert(saved.trees.every(t=>t.age>=0),'stumps replanted');
 await page.locator('#order-0').fill('build a spaceship');await page.locator('.member').nth(0).locator('form button').click();assert.match(await page.locator('#feedback').innerText(),/Give one job/);
 await page.locator('#pause').click();let clock=await page.locator('#clock').innerText();await page.clock.runFor(5000);assert.equal(await page.locator('#clock').innerText(),clock);await page.locator('#pause').click();
 await page.locator('#speed').click();assert.equal(await page.locator('#speed').innerText(),'Speed: 3×');await page.locator('#speed').click();
 await page.addInitScript(()=>{const raw=localStorage.getItem('crew-crop-v1');if(raw){let s=JSON.parse(raw);if(!s.diary.length){s.time=239;localStorage.setItem('crew-crop-v1',JSON.stringify(s));}}});await page.reload();await page.clock.runFor(2500);assert.match(await page.locator('#diary').textContent(),/jobs finished/);
 await page.reload();assert.match(await page.locator('#stock').innerText(),/rice/);assert.match(await page.locator('#diary').textContent(),/scripted diary/);
 await page.locator('details').last().locator('summary').click();await page.locator('details').first().locator('summary').click();
 await mkdir('artifacts',{recursive:true});
 for(const width of [375,768,1440]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`artifacts/farm-${width}.png`,fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no overflow at ${width}`);}
 await page.locator('#pause').click();await page.locator('#harvest').evaluate(el=>{if(!el.disabled)el.click();});
 await page.locator('#pause').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#pause').innerText(),'Pause');
 page.once('dialog',d=>d.accept());await page.locator('#reset').click();await page.waitForTimeout(300);assert.match(await page.locator('#stock').innerText(),/0 rice/);
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();assert.equal(errors.length,0,errors.join('\n'));
 const fallback=await browser.newPage();await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:get.call(this,type,...args);};});await fallback.goto(process.env.TEST_URL || 'http://127.0.0.1:3000');assert.match(await fallback.locator('#view-message').innerText(),/could not start/);await fallback.locator('#crew-order').fill('sweep');await fallback.locator('#crew-form button').click();assert.match(await fallback.locator('#feedback').innerText(),/Crew rules saved/);await fallback.close();
 console.log('PASS: WebGL scene, camera buttons/keyboard, jobs, replanting, invalid orders, pause, speed, diary, persistence, reset, reduced motion, WebGL error fallback and three viewport widths.');
}finally{await browser.close();}
