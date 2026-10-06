import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || '/Users/kurosim/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const browser=await chromium.launch();
const seed=(time=0,rice=0)=>({time,rice,wood:0,leaves:0,crops:Array.from({length:12},(_,i)=>({x:260+i%4*49,y:365+Math.floor(i/4)*43,age:0})),trees:[{x:125,y:395,age:60},{x:160,y:450,age:60},{x:200,y:500,age:60}],agents:['Dale','Rosie','Hank'].map((name,i)=>({name,x:440+i*55,y:290,job:['harvest','plant','wander'][i],state:'Waiting',work:0,done:0,bubble:'',bubbleUntil:0})),log:[],diary:[]});
async function pageWith(data){const page=await browser.newPage();await page.route('**/farm3d.js',r=>r.fulfill({contentType:'text/javascript',body:'export function createFarmView(){return {render(){}}}'}));await page.clock.install();await page.addInitScript(s=>localStorage.setItem('crew-crop-v1',JSON.stringify(s)),data);await page.goto(process.env.TEST_URL || 'http://127.0.0.1:3000');return page;}
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('crew-crop-v1')));
try {
  const errors=[];const initial=seed(),page=await pageWith(initial);page.on('pageerror',e=>errors.push(e.message));
  await page.clock.runFor(7000);let s=await saved(page);
  s.agents.forEach((a,i)=>{assert(a.isIdle);assert(Math.hypot(a.x-initial.agents[i].x,a.y-initial.agents[i].y)>5);assert.equal(a.job,initial.agents[i].job);assert.equal(a.done,0);});assert.equal(s.rice,0);assert.equal(s.wood,0);
  await page.locator('#order-2').fill('stop');await page.locator('.member').nth(2).locator('form button').click();await page.locator('#feedback').filter({hasText:'Hank will stop'}).waitFor();const stopped=(await saved(page)).agents[2];await page.clock.runFor(6500);s=await saved(page);assert.equal(s.agents[2].x,stopped.x);assert.equal(s.agents[2].y,stopped.y);assert.equal(s.agents[2].state,'Resting');
  await page.locator('#pause').click();const clock=await page.locator('#clock').innerText();await page.clock.runFor(2000);assert.equal(await page.locator('#clock').innerText(),clock);await page.locator('#pause').click();
  await page.clock.runFor(80000);s=await saved(page);assert(s.rice>0,'ripe crops interrupt idle and are harvested');assert.equal(s.agents[0].job,'harvest');
  const full=await pageWith(seed(0,80));await full.clock.runFor(7000);s=await saved(full);assert.equal(s.rice,80);assert.equal(s.agents[0].done,0);assert(s.agents[0].isIdle);assert.equal(s.agents[0].job,'harvest');await full.close();
  const night=await pageWith(seed(185));await night.clock.runFor(7000);s=await saved(night);assert(s.agents.every(a=>a.state==='Sleeping at home'));await night.close();assert.deepEqual(errors,[]);
  console.log('PASS: idle movement, retained orders, no fake output, work resumption, stop, pause, full barn and night priority. Gameplay tested independently of the renderer.');
} finally {await browser.close();}
