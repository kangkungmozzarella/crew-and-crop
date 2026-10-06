import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || '/Users/kurosim/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:375,height:700}});
  await page.clock.install();
  await page.addInitScript(()=>localStorage.setItem('crew-crop-v1',JSON.stringify({time:15,rice:7,wood:3,leaves:2,crops:Array.from({length:12},(_,i)=>({x:260+i%4*49,y:365+Math.floor(i/4)*43,age:45})),trees:[{x:695,y:300,age:60},{x:775,y:335,age:-1},{x:820,y:420,age:20}],agents:['Dale','Rosie','Hank'].map((name,i)=>({name,x:440+i*55,y:290,job:'stop',state:'Resting',work:0,done:2,bubble:'',bubbleUntil:0})),log:['Saved work'],diary:['Saved diary']})));
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:3000');
  await page.locator('#reset').scrollIntoViewIfNeeded();
  await page.clock.runFor(6500);
  const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('crew-crop-v1')));
  assert.equal(s.rice,7);assert.equal(s.wood,3);assert.equal(s.trees[1].age,-1);assert(s.trees.every(t=>t.x<500&&t.y>350),'lumber trees moved into the new left orchard');assert(s.crops.every(c=>c.age>=45));assert(s.agents.every(a=>a.job==='stop'&&a.done===2));assert.deepEqual(s.diary,['Saved diary']);assert.deepEqual(s.log,['Saved work']);
  console.log('PASS: old save moves trees without losing stock, stump state, crop growth, orders, job counts, diary or log.');
} finally {await browser.close();}
