import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || '/Users/kurosim/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const browser=await chromium.launch();
const url=process.env.TEST_URL || 'http://127.0.0.1:3000';
// Ripe crops, mature trees, the crew in the yard. Each scenario adjusts jobs and stock.
const seed=({rice=0,jobs=['harvest','sweep','chop'],cargo=[0,0,0].map(()=>({rice:0,wood:0})),age=60}={})=>({time:10,rice,wood:0,leaves:3,crops:Array.from({length:12},(_,i)=>({x:260+i%4*49,y:365+Math.floor(i/4)*43,age})),trees:[{x:125,y:395,age:60},{x:160,y:450,age:60},{x:200,y:500,age:60}],agents:['Dale','Rosie','Hank'].map((name,i)=>({name,x:540+i*30,y:300,job:jobs[i],state:'Waiting',work:0,done:0,bubble:'',bubbleUntil:0,cargo:cargo[i]})),log:[],diary:[]});
async function pageWith(data){const page=await browser.newPage();await page.route('**/farm3d.js',r=>r.fulfill({contentType:'text/javascript',body:'export function createFarmView(){return {render(){}}}'}));await page.clock.install();await page.addInitScript(s=>{if(!sessionStorage.seeded){sessionStorage.seeded=1;localStorage.setItem('crew-crop-v1',JSON.stringify(s));}},data);await page.goto(url);return page;}
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('crew-crop-v1')));
const logged=(page,text)=>page.locator('#log').filter({hasText:text}).waitFor();
const start=async(page,kind)=>{await page.selectOption('#farm-event',kind);await page.locator('#event-form button').click();};
const errors=[];
try {
  // A fallen tree blocks Dale; dry run asks Hank, who clears it, and Dale reaches the rice.
  let page=await pageWith(seed({jobs:['harvest','wander','wander']}));page.on('pageerror',e=>errors.push(e.message));
  await start(page,'tree');await logged(page,'You knocked a tree across the paddy path.');
  await page.clock.runFor(1500);await logged(page,'Fallen tree · decided: Dale asks Hank');
  await page.clock.runFor(4000);await logged(page,'Dale: “A tree’s down across the path! Hank, can you help?” (dry run)');await logged(page,'Hank: “On my way.”');
  await page.clock.runFor(20000);let s=await saved(page);
  assert.equal(s.obstacle,null,'Hank cleared the tree');assert.match(await page.locator('#log').innerText(),/Hank cleared the fallen tree/);
  assert(s.agents[0].done>0,'Dale crossed and harvested');assert(s.today.some(t=>/asked Hank to clear it/.test(t)));
  await page.close();

  // Dale and Hank both need the one wheelbarrow; dry run makes the second one wait, then both loads arrive.
  page=await pageWith(seed({jobs:['wander','wander','wander'],cargo:[{rice:3,wood:0},{rice:0,wood:0},{rice:0,wood:3}]}));page.on('pageerror',e=>errors.push(e.message));
  await page.clock.runFor(1000);await logged(page,'Wheelbarrow · decided');
  await page.clock.runFor(30000);s=await saved(page);
  assert.equal(s.rice,3);assert.equal(s.wood,3);assert.equal(s.barrow.holder,null);
  assert(s.today.some(t=>/both needed the wheelbarrow/.test(t)));
  await page.close();

  // The barn fills while Dale harvests; dry run keeps the standing order and Dale waits.
  page=await pageWith(seed({rice:78,jobs:['harvest','wander','wander']}));page.on('pageerror',e=>errors.push(e.message));
  await page.clock.runFor(15000);await logged(page,'Barn full · decided: Keep their standing orders');
  s=await saved(page);assert.equal(s.agents[0].job,'harvest');assert.equal(s.rice+s.agents[0].cargo.rice,80);
  await page.close();

  // Rain: dry run keeps working; crops grow faster while it rains.
  page=await pageWith(seed({jobs:['wander','wander','wander'],age:0}));page.on('pageerror',e=>errors.push(e.message));
  await start(page,'rain');await page.clock.runFor(1000);await logged(page,'Rain · decided: Keep working through the rain');
  await page.clock.runFor(4000);s=await saved(page);assert(s.weather.rain);assert(s.crops[0].age>6,'rain speeds growth');
  await page.clock.runFor(40000);await logged(page,'The rain has passed.');
  await page.close();

  // Crows: dry run sends the second agent; the crows leave before eating.
  page=await pageWith(seed({jobs:['harvest','wander','wander']}));page.on('pageerror',e=>errors.push(e.message));
  await start(page,'pests');await page.clock.runFor(1000);await logged(page,'Crows · decided: Rosie runs over');
  await page.clock.runFor(20000);await logged(page,'Rosie chased the crows off the paddy.');s=await saved(page);assert.equal(s.pests,null);
  await page.close();

  // Guests: dry run has everyone sweep; a tidy yard earns a tip.
  page=await pageWith(seed({jobs:['wander','wander','wander']}));page.on('pageerror',e=>errors.push(e.message));
  await start(page,'guests');await page.clock.runFor(1000);await logged(page,'Guests · decided: Everyone sweeps');
  s=await saved(page);assert(s.agents.every(a=>a.override?.job==='sweep'));
  await page.clock.runFor(31000);await logged(page,'The guests arrived');s=await saved(page);assert(s.coins>=8,'tidy yard tip');
  await page.close();

  // Trader: a half-full barn sells everything in dry run. The stall sells the rest later.
  page=await pageWith(seed({rice:50,jobs:['stop','stop','stop']}));page.on('pageerror',e=>errors.push(e.message));
  await start(page,'trader');await page.clock.runFor(1000);await logged(page,'Trader · decided: Sell everything');
  s=await saved(page);assert.equal(s.rice,0);assert(s.coins>=50);
  await page.clock.runFor(100);assert(await page.locator('#sell').isDisabled(),'nothing left to sell');
  await page.close();
  page=await pageWith(seed({rice:5,jobs:['stop','stop','stop']}));page.on('pageerror',e=>errors.push(e.message));
  await page.clock.runFor(200);await page.locator('#sell').click();await logged(page,'You sold 5 rice and 0 wood at the stall for 10 coins.');
  await page.close();

  // Idle chat: two idle agents next to each other chat once, with labelled lines.
  page=await pageWith(seed({jobs:['wander','wander','stop']}));page.on('pageerror',e=>errors.push(e.message));
  await page.clock.runFor(20000);await logged(page,'(dry run)');s=await saved(page);assert.equal(s.flags.chats,1);
  await page.close();

  assert.deepEqual(errors,[]);
  console.log('PASS: fallen tree, wheelbarrow, full barn, rain, crows, guests, trader, stall sale and idle chat, each with dry-run lines and applied choices.');
} finally {await browser.close();}
