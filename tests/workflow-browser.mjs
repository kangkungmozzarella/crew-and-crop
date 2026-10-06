import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('/Users/kurosim/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/farm3d.js',route=>route.fulfill({contentType:'text/javascript',body:'export function createFarmView(){document.getElementById("view-message").hidden=true;return {render(){}}}'}));
 const base=process.env.TEST_URL||'http://127.0.0.1:3011';await page.goto(base);await page.waitForFunction(()=>!document.getElementById('work-mode').textContent.includes('Connecting'));const baseline=await page.locator('#result-barn article').count();await page.locator('#goal').fill('Draft a coffee shop opening campaign');await page.locator('#context').fill('Local families. Friendly tone. No invented prices.');await page.locator('#goal-form button').click();
 await page.getByRole('button',{name:'Approve and store in barn'}).waitFor();assert.equal(await page.locator('#result-barn article').count(),baseline);await page.locator('#revision').fill('Make the invitation shorter');await page.getByRole('button',{name:'Request revision',exact:true}).click();await page.waitForFunction(()=>document.querySelector('dialog').textContent.includes('Round 2'));await page.getByRole('button',{name:'Approve and store in barn'}).waitFor();assert.match(await page.locator('dialog').innerText(),/Round 2/);assert.match(await page.locator('dialog').innerText(),/Make the invitation shorter/);
 await page.getByRole('button',{name:'Approve and store in barn'}).click();await page.getByRole('button',{name:'Download result'}).waitFor();const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download result'}).click();const download=await downloadPromise;assert.match(download.suggestedFilename(),/crew-crop/);await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').isVisible(),false);assert.equal(await page.locator('#result-barn article').count(),baseline+1);
 await page.reload();await page.locator('#result-barn article').first().waitFor();await page.getByRole('button',{name:'Read result',exact:true}).first().click();assert.match(await page.locator('dialog').innerText(),/approved/);await page.keyboard.press('Escape');
 await mkdir('artifacts',{recursive:true});for(const width of [375,768,1440]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);await page.screenshot({path:`artifacts/workflow-${width}.png`,fullPage:true});}
 assert.deepEqual(errors,[]);console.log('PASS: goal, handoffs, owner review, revision, approval, download, persistence, Escape and 375/768/1440 layouts.');
}finally{await browser.close();}
