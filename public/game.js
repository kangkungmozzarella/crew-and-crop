const $ = id => document.getElementById(id);
import { createFarmView } from './farm3d.js';
import { treeSites } from './farm-layout.js';
let view;
try { view = createFarmView($('farm')); } catch (error) { $('view-message').textContent = '3D view could not start. Enable WebGL in your browser, then reload. Farm orders remain available.'; console.error(error); }
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const names = ['Dale', 'Rosie', 'Hank'];
const roles = ['Harvester · always makes time for coffee', 'Sweeper · every leaf counts', 'Lumberjack · needs a planting reminder'];
const defaults = () => ({time:0,rice:0,wood:0,leaves:7,crops:Array.from({length:12},(_,i)=>({x:260+(i%4)*49,y:365+Math.floor(i/4)*43,age:i*3})),trees:treeSites.map((site,i)=>({...site,age:i===2?20:60})),agents:names.map((name,i)=>({name,x:440+i*55,y:290,job:'wander',state:'Waiting for an order',work:0,done:0,bubble:'',bubbleUntil:0})),log:[],diary:[]});
let state = defaults(), paused=false, speed=1, savedAt=0;
try { const saved=JSON.parse(localStorage.getItem('crew-crop-v1')); if(saved && Number.isFinite(saved.time) && Array.isArray(saved.agents) && saved.agents.length===3 && Array.isArray(saved.crops) && Array.isArray(saved.trees) && Array.isArray(saved.log) && Array.isArray(saved.diary)) state=saved; } catch { $('feedback').textContent='Saved farm could not be read. A fresh farm is ready.'; }
state.trees.forEach((tree,i)=>Object.assign(tree,treeSites[i]));
function save(){try{localStorage.setItem('crew-crop-v1',JSON.stringify(state));}catch{$('feedback').textContent='Browser storage is unavailable. Progress will last for this visit.';}}
function note(text){state.log.unshift(text);state.log=state.log.slice(0,12);renderLog();}
function renderLog(){ $('log').replaceChildren(...state.log.map(s=>{let li=document.createElement('li');li.textContent=s;return li;}));$('diary').replaceChildren(...(state.diary.length?state.diary:['The crew writes here at the end of the day.']).map(s=>{let p=document.createElement('p');p.textContent=s;return p;})); }
function parse(text){const s=text.toLowerCase();if(/\b(stop|rest|wait)\b/.test(s))return ['stop'];return [...new Set([...s.matchAll(/\b(harvest|sweep|chop|plant|wander)\b/g)].map(m=>m[1]))];}
function order(agent,job){agent.job=job;agent.work=0;delete agent.target;agent.bubble=({harvest:'Rice duty. Coffee after!',sweep:'Every last leaf.',chop:'Timber! Remind me to replant.',plant:'A tree for tomorrow.',wander:'Taking the scenic route.',stop:'Taking a breather.'})[job];agent.bubbleUntil=state.time+8;note(`${agent.name}: ${agent.bubble} (scripted)`);}
const crew = $('crew');
state.agents.forEach((a,i)=>{const el=document.createElement('article');el.className='member';el.innerHTML=`<div class="member-head"><span class="portrait">${a.name[0]}</span><div><h3>${a.name}</h3><p class="hint">${roles[i]}</p></div></div><p class="status" id="status-${i}"></p><form><label for="order-${i}">Standing order for ${a.name}</label><input id="order-${i}" placeholder="${['Harvest rice when ready','Sweep the yard','Chop mature trees'][i]}" required maxlength="300"><button>Send</button></form>`;el.querySelector('form').addEventListener('submit',e=>{e.preventDefault();let jobs=parse(el.querySelector('input').value);if(jobs.length!==1){$('feedback').textContent='Give one job per person: harvest, sweep, chop, plant, wander or stop.';return;}order(a,jobs[0]);$('feedback').textContent=`${a.name} will ${jobs[0]}. Dry-run rule saved.`;save();});crew.append(el);});
$('crew-form').addEventListener('submit',e=>{e.preventDefault();const jobs=parse($('crew-order').value);if(!jobs.length){$('feedback').textContent='Try: harvest rice, sweep the yard and chop mature trees.';return;}state.agents.forEach((a,i)=>{const preferred=['harvest','sweep','chop'][i];order(a,jobs.includes(preferred)?preferred:jobs[Math.min(i,jobs.length-1)]);});$('feedback').textContent='Crew rules saved. These orders repeat until you change them.';save();});
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Resume':'Pause';};
$('speed').onclick=()=>{speed=speed===1?3:1;$('speed').textContent=`Speed: ${speed}×`;};
function collect(c,a){if(state.rice+state.wood>=80){if(a)a.state='Barn full. Waiting for space.';return false;}state.rice++;c.age=0;if(a){a.done++;a.bubble='Harvest stored. Replanting!';a.bubbleUntil=state.time+4;}return true;}
$('harvest').onclick=()=>{let count=0;for(const c of state.crops)if(c.age>=60&&collect(c))count++;note(count?`You harvested ${count} rice and replanted the paddy.`:'No harvest collected. Rice must be ripe and the barn must have space.');save();};
$('reset').onclick=()=>{if(!confirm('Reset this farm and its saved orders?'))return;state=defaults();save();location.reload();};
function targetFor(a){if(a.job==='harvest')return state.crops.find(c=>c.age>=60);if(a.job==='chop')return state.trees.find(t=>t.age>=60);if(a.job==='plant')return state.trees.find(t=>t.age<0);if(a.job==='sweep'&&state.leaves>0)return{x:565,y:410};return null;}
function update(dt){const beforeDay=Math.floor(state.time/240);state.time+=dt;for(const c of state.crops)c.age=Math.min(60,c.age+dt);for(const t of state.trees)if(t.age>=0)t.age=Math.min(60,t.age+dt*.25);if(Math.floor(state.time/9)>Math.floor((state.time-dt)/9))state.leaves=Math.min(20,state.leaves+1);
 const phase=state.time%240, night=phase>=180;
 if(Math.floor(state.time/240)>beforeDay){state.diary=state.agents.map(a=>`${a.name}, day ${beforeDay+1}: ${a.done} jobs finished. ${a.name==='Dale'?'Coffee made the work sweeter.':a.name==='Rosie'?'There is always another leaf.':'Tomorrow, remember the saplings.'} (scripted diary)`);state.agents.forEach(a=>a.done=0);note(`Day ${beforeDay+2}: a new morning on the farm.`);}
 for(const a of state.agents){a.moving=false;let task=night?{x:445,y:170}:targetFor(a);if(!task&&a.job==='wander'&&!night){if(!a.target||Math.hypot(a.x-a.target.x,a.y-a.target.y)<4)a.target={x:390+Math.random()*260,y:270+Math.random()*230};task=a.target;}
  if(!task){a.state=a.job==='stop'?'Resting':({harvest:'Waiting for ripe rice',chop:'Waiting for mature trees',plant:'All trees are planted',sweep:'The yard is clean',wander:'Exploring'})[a.job];a.work=0;continue;}
  const dx=task.x-a.x,dy=task.y-a.y,d=Math.hypot(dx,dy);a.moving=d>5;
  if(d>5){let amount=Math.min(d,dt*65);a.x+=dx/d*amount;a.y+=dy/d*amount;a.state=night?'Walking home':`Walking to ${a.job==='harvest'?'the rice':a.job==='sweep'?'the yard':a.job==='wander'?'a quiet spot':'the trees'}`;a.work=0;}
  else if(night){a.state='Sleeping at home';a.moving=false;}
  else{a.state={harvest:'Harvesting rice',sweep:'Sweeping leaves',chop:'Chopping a tree',plant:'Planting a sapling',wander:'Exploring'}[a.job];a.work+=dt;if(a.work>=2){a.work=0;if(a.job==='harvest')collect(task,a);if(a.job==='sweep'){state.leaves=Math.max(0,state.leaves-1);a.done++;}if(a.job==='chop'){if(state.rice+state.wood<80){state.wood++;task.age=-1;a.done++;note(`${a.name} stored wood. A stump needs replanting.`);}else a.state='Barn full. Waiting for space.';}if(a.job==='plant'){task.age=0;a.done++;note(`${a.name} planted a sapling.`);}}}
 }
 if(state.time-savedAt>5){savedAt=state.time;save();}
}
function draw(){
 const phase=state.time%240;
 view?.render(state, reduced);
 const hour=Math.floor((state.time%240)/240*24+6)%24;const minute=Math.floor((state.time%10)/10*60);$('clock').textContent=`Day ${Math.floor(state.time/240)+1} · ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
 $('stock').textContent=`Barn: ${state.rice} rice · ${state.wood} wood / 80`;
 state.agents.forEach((a,i)=>$('status-'+i).textContent=a.state);
 $('scene-status').textContent=state.rice+state.wood>=80?'Barn full. Stored goods are kept; more storage is planned.':phase>=180?'The crew is sleeping. Crops keep growing.':`${state.crops.filter(c=>c.age>=60).length} ripe rice plots · ${state.leaves} leaves in the yard`;
 $('harvest').disabled=state.rice+state.wood>=80||!state.crops.some(c=>c.age>=60);
}
renderLog();let last=performance.now();function frame(now){const dt=Math.max(0,Math.min((now-last)/1000,.1));last=now;if(!paused)update(dt*speed);draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);window.addEventListener('pagehide',save);
