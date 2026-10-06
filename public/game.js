const $ = id => document.getElementById(id);
import { createFarmView } from './farm3d.js';
import { treeSites } from './farm-layout.js';
import { idleDestination } from './idle-life.js';
let view;
try { view = createFarmView($('farm')); } catch (error) { $('view-message').textContent = '3D view could not start. Enable WebGL in your browser, then reload. Farm orders remain available.'; console.error(error); }
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const names = ['Dale', 'Rosie', 'Hank'];
const roles = ['Harvester · never skips a coffee stop', 'Sweeper · one leaf is one too many', 'Lumberjack · forgets the saplings'];
// Farm coordinates. The fallen tree lies across the path between the yard and the paddy.
const CAPACITY=80, BARN={x:635,y:178}, BARROW_HOME={x:520,y:245}, HOME={x:445,y:170}, TREE_FALL={x:497,y:335}, PADDY={x:330,y:405}, LOAD_LIMIT=3, PLAN_TIME=45;
const PRICES={rice:2,wood:4};
// From day 2, the game schedules happenings by time of day. Random slots pick rain, crows or guests.
const SCHEDULE=[{phase:45,kind:'tree'},{phase:75,kind:'random',chance:.7},{phase:100,kind:'trader'},{phase:135,kind:'random',chance:.5}];
const defaults = () => ({time:0,rice:0,wood:0,leaves:7,crops:Array.from({length:12},(_,i)=>({x:260+(i%4)*49,y:365+Math.floor(i/4)*43,age:i*3})),trees:treeSites.map((site,i)=>({...site,age:i===2?20:60})),agents:names.map((name,i)=>({name,x:440+i*55,y:290,job:'wander',state:'Waiting for an order',work:0,done:0,bubble:'',bubbleUntil:0,cargo:{rice:0,wood:0}})),coins:0,barrow:{holder:null,...BARROW_HOME},obstacle:null,weather:{rain:false},pests:null,guests:null,trader:null,talk:[],today:[],flags:{},log:[],diary:[]});
let state = defaults(), paused=false, speed=1, savedAt=0, crewMode='dry-run', pending=null, chatting=null;
try { const saved=JSON.parse(localStorage.getItem('crew-crop-v1')); if(saved && Number.isFinite(saved.time) && Array.isArray(saved.agents) && saved.agents.length===3 && Array.isArray(saved.crops) && Array.isArray(saved.trees) && Array.isArray(saved.log) && Array.isArray(saved.diary)) state=saved; } catch { $('feedback').textContent='Saved farm could not be read. A fresh farm is ready.'; }
state.trees.forEach((tree,i)=>Object.assign(tree,treeSites[i]));
// Older saves lack the hauling and event fields. Trips and unanswered events do not survive a reload.
state.barrow ??= {holder:null,...BARROW_HOME}; state.barrow.holder=null; state.obstacle ??= null; state.talk=[]; state.today ??= []; state.flags ??= {};
state.coins ??= 0; state.weather ??= {rain:false}; state.pests ??= null; state.guests ??= null; state.trader ??= null;
if(state.obstacle && !state.obstacle.helper) state.obstacle.asked=false;
for(const happening of [state.weather,state.pests,state.guests,state.trader]) if(happening?.asked && !happening.decided) happening.asked=false;
state.agents.forEach(a=>{a.cargo ??= {rice:0,wood:0}; a.haul=null;});
function save(){try{localStorage.setItem('crew-crop-v1',JSON.stringify(state));}catch{$('feedback').textContent='Browser storage is unavailable. Progress will last for this visit.';}}
function note(text){state.log.unshift(text);state.log=state.log.slice(0,12);renderLog();}
function renderLog(){ $('log').replaceChildren(...state.log.map(s=>{let li=document.createElement('li');li.textContent=s;return li;}));$('diary').replaceChildren(...(state.diary.length?state.diary:['The crew writes here at the end of the day.']).map(s=>{let p=document.createElement('p');p.textContent=s;return p;})); }
const cargo=a=>(a.cargo?.rice||0)+(a.cargo?.wood||0);
const stored=()=>state.rice+state.wood+state.agents.reduce((n,a)=>n+cargo(a),0);
const barnFull=()=>stored()>=CAPACITY;
// A temporary job from a decision (sheltering, tidying for guests) overrides the standing order until it expires.
const jobOf=a=>a.override&&a.override.until>state.time?a.override.job:a.job;
const clockAt=t=>{const h=Math.floor((t%240)/240*24+6)%24;return `${String(h).padStart(2,'0')}:00`;};
function farmFacts(){return {ripeRice:state.crops.filter(c=>c.age>=60).length,leaves:state.leaves,matureTrees:state.trees.filter(t=>t.age>=60).length,stumps:state.trees.filter(t=>t.age<0).length,barnUsed:stored(),barnCapacity:CAPACITY,night:state.time%240>=180};}
async function ask(path,data){let r;try{r=await fetch(path,data?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)}:{});}catch{throw Error('The crew server is not running. Start it with npm start.');}const result=await r.json().catch(()=>({}));if(!r.ok)throw Error(result.error||'The crew server could not answer.');return result;}
function order(agent,job,reply,source){if(job!=='keep'){agent.job=job;agent.work=0;delete agent.target;}agent.bubble=reply;agent.bubbleUntil=state.time+8;note(`${agent.name}: “${reply}” · ${job==='keep'?'kept current job':'rule: '+job} (${source})`);}
async function sendOrder(to,text,button){const asked=to==='crew'?state.agents:state.agents.filter(a=>a.name===to);button.disabled=true;asked.forEach(a=>{a.bubble='…';a.bubbleUntil=state.time+30;});$('feedback').textContent=crewMode==='live'?'The crew is thinking it over…':'Reading the order…';
 try{const result=await ask('/api/orders',{to,text,jobs:Object.fromEntries(state.agents.map(a=>[a.name,a.job])),farm:farmFacts()});for(const r of result.assignments){const a=state.agents.find(a=>a.name===r.agent);if(a)order(a,r.job,r.reply,result.source);}
  const first=result.assignments[0];$('feedback').textContent=to==='crew'?`Crew rules saved (${result.source}). These orders repeat until you change them.`:first.job==='keep'?`${to} kept the current job (${result.source}).`:`${to} will ${first.job}. Rule saved (${result.source}).`;save();}
 catch(e){asked.forEach(a=>{if(a.bubble==='…')a.bubbleUntil=0;});$('feedback').textContent=e.message;}finally{button.disabled=false;}}
async function writeDiary(day,agents,events){state.diary=['The crew is writing tonight’s diary…'];renderLog();try{const result=await ask('/api/diary',{day,agents,events,farm:farmFacts()});state.diary=result.entries.map(e=>`${e.agent}: ${e.text} (${result.source==='dry run'?'dry run · scripted diary':result.source})`);}catch(e){state.diary=[`Tonight’s diary could not be written. ${e.message}`];}renderLog();save();}
ask('/api/status').then(s=>{crewMode=s.mode;$('ai-mode').textContent=s.mode==='live'?`Live AI · ${s.model} reads orders and settles problems, ${s.chatModel} writes the diary. Each order or problem is one request.`:'Dry run · no AI. Orders are matched by keyword (harvest, sweep, chop, plant, wander, stop), problems take the game’s default choice, and lines are scripted. Add an API key in .env for real AI.';}).catch(e=>{$('ai-mode').textContent=e.message;});

// Events: the game describes a situation the standing rules cannot handle and
// offers valid options, default first. The AI (or dry run) picks one and writes
// the exchange; the game applies the choice. One event is in flight at a time.
const eventTitles={'barn-full':'Barn full','path-blocked':'Fallen tree','wheelbarrow':'Wheelbarrow',rain:'Rain',pests:'Crows',guests:'Guests',trader:'Trader'};
function raise(type,agents,situation,options,apply){
 if(pending)return false;
 // Only the deciding agent and the one they talk to stop while the crew thinks.
 pending=agents.map(a=>a.name);agents.slice(0,2).forEach(a=>{a.bubble='…';a.bubbleUntil=state.time+60;});
 (async()=>{let result;
  try{result=await ask('/api/events',{type,situation,agents:pending,options,farm:farmFacts()});}
  catch(e){result={source:'game default',choice:options[0].id,lines:[]};note(`${e.message} The game used its default.`);}
  const option=options.find(o=>o.id===result.choice)||options[0];
  pending=null;agents.forEach(a=>{if(a.bubble==='…')a.bubbleUntil=0;});
  apply(option.id);note(`${eventTitles[type]} · decided: ${option.label} (${result.source})`);
  result.lines.forEach((l,i)=>state.talk.push({agent:l.agent,text:l.text,at:state.time+i*3,source:result.source}));
  state.talk.sort((a,b)=>a.at-b.at);save();})();
 return true;
}
function askAboutBarn(stuck){
 const who=stuck.map(a=>a.name).join(' and ');
 const options=[{id:'wait',label:'Keep their standing orders and wait for space'},{id:'sweep',label:'Switch to sweeping the yard'},{id:'plant',label:'Switch to planting saplings on stumps'},{id:'rest',label:'Stop and rest'}];
 return raise('barn-full',stuck,`The barn is full (${stored()} of ${CAPACITY}). ${who} cannot store more. Only the owner (farm stall) or a visiting trader can sell stock; the crew cannot sell on their own.`,options,choice=>{
  if(choice!=='wait')stuck.forEach(a=>{a.job={sweep:'sweep',plant:'plant',rest:'stop'}[choice];a.work=0;});
  state.today.push(`The barn filled up; ${who} chose to ${options.find(o=>o.id===choice).label.toLowerCase()}.`);});
}
function askForHelp(a){
 const others=state.agents.filter(o=>o!==a).sort((x,y)=>(y.name==='Hank')-(x.name==='Hank'));
 const options=[...others.map(o=>({id:`ask-${o.name}`,label:`${a.name} asks ${o.name} to clear it${o.name==='Hank'?' (Hank has an axe and clears it twice as fast)':''}`})),{id:'clear-myself',label:`${a.name} drags it aside alone, slowly`}];
 return raise('path-blocked',[a,...others],`A fallen tree blocks the path between the yard and the rice paddy. ${a.name} (${a.job}) needs to get across. Current jobs: ${others.map(o=>`${o.name} ${o.job}`).join(', ')}.`,options,choice=>{
  if(!state.obstacle)return;
  const helper=choice==='clear-myself'?a.name:choice.slice(4);state.obstacle.helper=helper;
  state.today.push(helper===a.name?`A tree fell across the paddy path; ${a.name} cleared it alone.`:`A tree fell across the paddy path; ${a.name} asked ${helper} to clear it.`);});
}
function askForBarrow(a){
 const holder=state.agents.find(o=>o.name===state.barrow.holder);if(!holder)return false;
 const options=[{id:'wait',label:`${a.name} waits for ${holder.name} to bring the wheelbarrow back`},{id:'keep-working',label:`${a.name} keeps working and hauls later (up to ${LOAD_LIMIT*2} items)`},{id:'carry-by-hand',label:`${a.name} carries the load to the barn by hand, at half speed`}];
 return raise('wheelbarrow',[a,holder],`The farm has one wheelbarrow. ${a.name} is carrying ${cargo(a)} items and needs it, but ${holder.name} is using it to haul to the barn.`,options,choice=>{
  a.plan={choice,until:state.time+PLAN_TIME};
  state.today.push(`${a.name} and ${holder.name} both needed the wheelbarrow; ${options.find(o=>o.id===choice).label.charAt(0).toLowerCase()+options.find(o=>o.id===choice).label.slice(1)}.`);});
}
function sell(fraction,prices){const rice=Math.floor(state.rice*fraction),wood=Math.floor(state.wood*fraction),coins=rice*prices.rice+wood*prices.wood;state.rice-=rice;state.wood-=wood;state.coins+=coins;return {rice,wood,coins};}
function askRain(){
 const options=[{id:'keep-working',label:'Keep working through the rain'},{id:'shelter',label:'Shelter under the barn roof until it passes'}];
 return raise('rain',state.agents,`Rain started and will last about ${Math.round(state.weather.until-state.time)} farm seconds. Rice grows faster in the rain and more leaves fall in the yard. The crew can keep working or shelter by the barn.`,options,choice=>{
  state.weather.decided=true;
  if(choice==='shelter'&&state.weather.rain)state.agents.forEach(a=>{a.override={job:'shelter',until:state.weather.until};a.work=0;});
  state.today.push(choice==='shelter'?'The crew sheltered from the rain by the barn.':'The crew kept working through the rain.');});
}
function askPests(){
 const first=state.agents.find(a=>a.job==='harvest')||state.agents[0],others=state.agents.filter(a=>a!==first),ripe=state.crops.filter(c=>c.age>=60).length;
 const options=[...others.map(o=>({id:`shoo-${o.name}`,label:`${o.name} runs over to chase the crows off`})),{id:`shoo-${first.name}`,label:`${first.name} chases them off`},{id:'ignore',label:'Leave them; they may eat some rice'}];
 return raise('pests',[first,...others],`Crows landed on the rice paddy. In about ${Math.round(state.pests.eatAt-state.time)} farm seconds they will eat up to four plots (${ripe} are ripe now). Current jobs: ${state.agents.map(a=>`${a.name} ${jobOf(a)}`).join(', ')}.`,options,choice=>{
  if(!state.pests)return;state.pests.decided=true;
  if(choice==='ignore'){state.today.push('Crows landed on the paddy; the crew left them alone.');return;}
  state.pests.helper=choice.slice(5);state.today.push(`Crows landed on the paddy; ${state.pests.helper} went to chase them off.`);});
}
function askGuests(){
 const g=state.guests,rosie=state.agents[1],others=state.agents.filter(a=>a!==rosie);
 const options=[{id:'tidy',label:'Everyone sweeps the yard until the guests arrive'},{id:'tidy-rosie',label:'Rosie sweeps; the others keep their jobs'},{id:'carry-on',label:'Carry on as usual'}];
 return raise('guests',[rosie,...others],`Guests arrive in about ${Math.round(g.arriveAt-state.time)} farm seconds (around ${clockAt(g.arriveAt)}). There are ${state.leaves} leaves in the yard; a tidier yard earns a bigger tip.`,options,choice=>{
  if(!state.guests)return;g.decided=true;
  const sweepers=choice==='tidy'?state.agents:choice==='tidy-rosie'?[rosie]:[];
  sweepers.forEach(a=>{a.override={job:'sweep',until:g.arriveAt};a.work=0;});
  state.today.push(`Guests were expected; ${options.find(o=>o.id===choice).label.toLowerCase()}.`);});
}
function askTrader(){
 const t=state.trader,dale=state.agents[0],hank=state.agents[2];
 const all={id:'sell-all',label:`Sell everything at the trader’s price (${t.rice} per rice, ${t.wood} per wood)`},half={id:'sell-half',label:'Sell half and keep the rest'},haggle={id:'haggle',label:'Haggle for one coin more on each; the trader may walk away'},decline={id:'decline',label:`Decline; the farm stall always pays ${PRICES.rice} per rice and ${PRICES.wood} per wood`};
 const options=(state.rice+state.wood)/CAPACITY>=.5?[all,half,haggle,decline]:[decline,all,half,haggle];
 return raise('trader',[dale,hank,state.agents[1]],`A travelling trader offers ${t.rice} coins per rice and ${t.wood} per wood. The barn holds ${state.rice} rice and ${state.wood} wood (${stored()} of ${CAPACITY}). The farm has ${state.coins} coins.`,options,choice=>{
  if(!state.trader)return;t.decided=true;t.leaveAt=state.time+8;
  let sold=null;
  if(choice==='sell-all')sold=sell(1,t);
  else if(choice==='sell-half')sold=sell(.5,t);
  else if(choice==='haggle'){if(Math.random()<.5){sold=sell(1,{rice:t.rice+1,wood:t.wood+1});note('The trader grumbled, then agreed to the higher price.');}else note('The trader shook their head and moved on.');}
  if(sold){note(`Sold ${sold.rice} rice and ${sold.wood} wood to the trader for ${sold.coins} coins.`);state.today.push(`The crew sold ${sold.rice} rice and ${sold.wood} wood to a trader for ${sold.coins} coins.`);}
  else state.today.push('A trader visited; the crew kept their stock.');});
}
// Starts a happening. The decision is requested from update(), so it waits if another one is in flight.
function happen(kind,byPlayer){
 const busy=text=>{if(byPlayer)note(text);return false;};
 if(kind==='tree')return dropTree(byPlayer?'You knocked a tree across the paddy path.':'Wind knocked a tree across the paddy path.')||busy('A fallen tree is already blocking the path.');
 if(kind==='rain'){if(state.weather.rain)return busy('It is already raining.');state.weather={rain:true,until:state.time+40,asked:false,decided:false};note('Rain rolls in over the farm.');state.today.push('A rain shower passed over the farm.');return true;}
 if(kind==='pests'){if(state.pests)return busy('Crows are already on the paddy.');state.pests={eatAt:state.time+25,asked:false,decided:false,helper:null};note('Crows landed on the rice paddy.');return true;}
 if(kind==='guests'){if(state.guests)return busy('Guests are already on their way.');state.guests={arriveAt:state.time+30,leaveAt:state.time+55,arrived:false,asked:false,decided:false};note(`Guests are coming to visit around ${clockAt(state.guests.arriveAt)}.`);return true;}
 if(kind==='trader'){if(state.trader)return busy('The trader is already here.');if(!state.rice&&!state.wood){note('A trader passed by, but the barn was empty.');return false;}state.trader={rice:1+Math.floor(Math.random()*4),wood:3+Math.floor(Math.random()*5),leaveAt:state.time+30,asked:false,decided:false};note(`A trader arrived: ${state.trader.rice} coins per rice, ${state.trader.wood} per wood.`);return true;}
 return false;
}
function shoo(a,dt){
 if(blockedBy(a,PADDY,dt))return;
 if(!moveTo(a,PADDY,dt)){a.state='Running to chase the crows';return;}
 a.state='Chasing the crows off';a.work+=dt;
 if(a.work<2)return;
 a.work=0;state.pests=null;a.done++;note(`${a.name} chased the crows off the paddy.`);state.today.push(`${a.name} chased the crows off the paddy.`);
}
// Two idle agents who meet may chat; at most two chats per farm day. Chats are optional, so failures are silent.
function maybeChat(night){
 const f=state.flags,day=Math.floor(state.time/240);
 if(f.chatDay!==day){f.chatDay=day;f.chats=0;}
 if(night||pending||chatting||f.chats>=2||state.time-(f.lastChat??-999)<40)return;
 const idle=state.agents.filter(a=>a.isIdle&&!a.moving);
 for(let i=0;i<idle.length;i++)for(let j=i+1;j<idle.length;j++)if(Math.hypot(idle[i].x-idle[j].x,idle[i].y-idle[j].y)<60)return startChat(idle[i],idle[j]);
}
function startChat(a,b){
 chatting=[a.name,b.name];state.flags.chats++;state.flags.lastChat=state.time;state.flags.chatIndex=(state.flags.chatIndex||0)+1;
 (async()=>{try{const r=await ask('/api/chat',{agents:chatting,index:state.flags.chatIndex,facts:{today:state.today.slice(-6),doing:[a.state,b.state],weather:state.weather.rain?'rain':'clear',coins:state.coins},farm:farmFacts()});
  r.lines.forEach((l,i)=>state.talk.push({agent:l.agent,text:l.text,at:state.time+i*3,source:r.source}));state.talk.sort((x,y)=>x.at-y.at);}catch{}chatting=null;})();
}
function dropTree(message){if(state.obstacle)return false;state.obstacle={...TREE_FALL,asked:false,helper:null};note(message);state.today.push('A tree fell across the paddy path.');return true;}

const crew = $('crew');
state.agents.forEach((a,i)=>{const el=document.createElement('article');el.className='member';el.innerHTML=`<div class="member-head"><span class="portrait">${a.name[0]}</span><div><h3>${a.name}</h3><p class="hint">${roles[i]}</p></div></div><p class="status" id="status-${i}"></p><form><label for="order-${i}">Standing order for ${a.name}</label><input id="order-${i}" placeholder="${['Harvest rice when ready','Sweep the yard','Chop mature trees'][i]}" required maxlength="300"><button>Send</button></form>`;el.querySelector('form').addEventListener('submit',e=>{e.preventDefault();sendOrder(a.name,el.querySelector('input').value,e.submitter);});crew.append(el);});
window.addEventListener('select-farmer',e=>{const input=$(`order-${names.indexOf(e.detail)}`);if(input){input.scrollIntoView({block:'center',behavior:reduced?'auto':'smooth'});input.focus({preventScroll:true});}});
$('crew-form').addEventListener('submit',e=>{e.preventDefault();sendOrder('crew',$('crew-order').value,e.submitter);});
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Resume':'Pause';};
$('speed').onclick=()=>{speed=speed===1?3:1;$('speed').textContent=`Speed: ${speed}×`;};
$('event-form').addEventListener('submit',e=>{e.preventDefault();happen($('farm-event').value,true);save();});
$('sell').onclick=()=>{const sold=sell(1,PRICES);note(sold.coins?`You sold ${sold.rice} rice and ${sold.wood} wood at the stall for ${sold.coins} coins.`:'The barn is empty. Nothing to sell.');if(sold.coins)state.today.push(`The owner sold ${sold.rice} rice and ${sold.wood} wood at the stall.`);save();};
function collect(c,a){if(barnFull()){if(a)a.state='Barn full. Waiting for space.';return false;}c.age=0;if(a){a.cargo.rice++;a.done++;}else state.rice++;return true;}
$('harvest').onclick=()=>{let count=0;for(const c of state.crops)if(c.age>=60&&collect(c))count++;note(count?`You harvested ${count} rice and replanted the paddy.`:'No harvest collected. Rice must be ripe and the barn must have space.');save();};
$('reset').onclick=()=>{if(!confirm('Reset this farm and its saved orders?'))return;state=defaults();save();location.reload();};
function targetFor(a){const job=jobOf(a);if(job==='shelter')return{x:BARN.x-40+names.indexOf(a.name)*25,y:BARN.y+35};if(barnFull()&&['harvest','chop'].includes(job))return null;if(job==='harvest')return state.crops.find(c=>c.age>=60);if(job==='chop')return state.trees.find(t=>t.age>=60);if(job==='plant')return state.trees.find(t=>t.age<0);if(job==='sweep'&&state.leaves>0)return{x:565,y:410};return null;}
function moveTo(a,t,dt,pace=1){const dx=t.x-a.x,dy=t.y-a.y,d=Math.hypot(dx,dy);if(d<=5){a.moving=false;return true;}const step=Math.min(d,dt*65*pace);a.x+=dx/d*step;a.y+=dy/d*step;a.moving=true;a.work=0;return false;}
// The fallen tree splits the farm into a west side (paddy, lumber trees) and an east side (yard, barn).
const across=(a,t)=>!!state.obstacle&&(a.x-state.obstacle.x)*(t.x-state.obstacle.x)<0;
const besideTree=a=>({x:state.obstacle.x+(a.x>state.obstacle.x?28:-28),y:state.obstacle.y});
function blockedBy(a,t,dt){
 if(!across(a,t))return false;
 if(!moveTo(a,besideTree(a),dt)){a.state='Walking to the paddy path';return true;}
 a.state='Path blocked by a fallen tree';
 if(!state.obstacle.asked&&askForHelp(a))state.obstacle.asked=true;
 return true;
}
function clearTree(a,dt){
 if(!moveTo(a,besideTree(a),dt)){a.state='Going to clear the fallen tree';return;}
 a.state='Clearing the fallen tree';a.work+=dt;
 if(a.work<(a.name==='Hank'?3:6))return;
 a.work=0;state.obstacle=null;a.done++;if(!barnFull())a.cargo.wood++;
 note(`${a.name} cleared the fallen tree from the path.`);state.today.push(`${a.name} cleared the fallen tree.`);
}
function deposit(a){const parts=[a.cargo.rice&&`${a.cargo.rice} rice`,a.cargo.wood&&`${a.cargo.wood} wood`].filter(Boolean).join(' and ');state.rice+=a.cargo.rice;state.wood+=a.cargo.wood;a.cargo={rice:0,wood:0};note(`${a.name} unloaded ${parts} into the barn.`);}
// Returns true while the agent is hauling or waiting for the wheelbarrow.
function haul(a,dt){
 const b=state.barrow;
 if(!a.haul){
  if(!(cargo(a)>=LOAD_LIMIT||(cargo(a)>0&&!targetFor(a))))return false;
  const plan=a.plan&&a.plan.until>state.time?a.plan.choice:null;
  if(!b.holder){b.holder=a.name;a.haul='fetch';}
  else if(plan==='carry-by-hand')a.haul='hand';
  else if(plan==='keep-working'&&cargo(a)<LOAD_LIMIT*2&&targetFor(a))return false;
  else{
   if(!plan&&!pending)askForBarrow(a);
   if(blockedBy(a,BARROW_HOME,dt))return true;
   a.state=moveTo(a,{x:BARROW_HOME.x+30,y:BARROW_HOME.y+25},dt)?'Waiting for the wheelbarrow':'Walking to the wheelbarrow';
   return true;
  }
 }
 const goal=a.haul==='fetch'?b:a.haul==='return'?BARROW_HOME:BARN;
 if(a.haul==='unload'){a.state='Unloading at the barn';a.work+=dt;if(a.work>=2){a.work=0;deposit(a);a.haul=b.holder===a.name?'return':null;}return true;}
 if(blockedBy(a,goal,dt))return true;
 const arrived=moveTo(a,goal,dt,a.haul==='hand'?.5:1);
 if(b.holder===a.name&&a.haul!=='fetch'){b.x=a.x;b.y=a.y;}
 a.state={fetch:'Fetching the wheelbarrow',deliver:'Wheeling the load to the barn',return:'Returning the wheelbarrow',hand:'Carrying the load by hand'}[a.haul];
 if(arrived){if(a.haul==='fetch')a.haul='deliver';else if(a.haul==='return'){b.holder=null;Object.assign(b,BARROW_HOME);a.haul=null;}else{a.haul='unload';a.work=0;}}
 return true;
}
function update(dt){const beforeDay=Math.floor(state.time/240),rain=state.weather.rain,leafEvery=rain?5:9;state.time+=dt;for(const c of state.crops)c.age=Math.min(60,c.age+dt*(rain?1.5:1));for(const t of state.trees)if(t.age>=0)t.age=Math.min(60,t.age+dt*.25);if(Math.floor(state.time/leafEvery)>Math.floor((state.time-dt)/leafEvery))state.leaves=Math.min(20,state.leaves+1);
 const phase=state.time%240, night=phase>=180, day=Math.floor(state.time/240);
 if(day>beforeDay){const stats=state.agents.map(a=>({name:a.name,done:a.done,job:a.job}));state.agents.forEach(a=>a.done=0);writeDiary(beforeDay+1,stats,state.today);state.today=[];note(`Day ${beforeDay+2}: a new morning on the farm.`);}
 if(day>=1&&!night){const plan=state.flags.schedule?.day===day?state.flags.schedule:(state.flags.schedule={day,next:0});
  // A slot passed long ago (for example while the tab was closed) is skipped.
  while(plan.next<SCHEDULE.length&&phase>=SCHEDULE[plan.next].phase){const slot=SCHEDULE[plan.next++];if(phase-slot.phase>15)continue;if(slot.kind!=='random')happen(slot.kind,false);else if(Math.random()<slot.chance)happen(['rain','pests','guests'][Math.floor(Math.random()*3)],false);}}
 if(rain&&state.time>=state.weather.until){state.weather={rain:false};note('The rain has passed.');}
 if(state.pests&&state.time>=state.pests.eatAt){const eaten=state.crops.filter(c=>c.age>=60).slice(0,4);(eaten.length?eaten:state.crops.slice(0,4)).forEach(c=>c.age=eaten.length?0:Math.max(0,c.age-20));note(eaten.length?`The crows ate ${eaten.length} ripe rice plots and flew off.`:'The crows pecked at young rice and flew off.');state.today.push(eaten.length?`Crows ate ${eaten.length} ripe rice plots.`:'Crows pecked at young rice.');state.pests=null;}
 if(state.guests&&!state.guests.arrived&&state.time>=state.guests.arriveAt){const tip=state.leaves<=2?15:state.leaves<=6?8:2;state.guests.arrived=true;state.coins+=tip;note(`The guests arrived, counted ${state.leaves} leaves in the yard and left a ${tip}-coin tip.`);state.today.push(`Guests visited, saw ${state.leaves} leaves in the yard and tipped ${tip} coins.`);}
 if(state.guests&&state.time>=state.guests.leaveAt){state.guests=null;note('The guests waved goodbye.');}
 if(state.trader&&state.time>=state.trader.leaveAt){if(!state.trader.decided)note('The trader left before the crew decided.');state.trader=null;}
 if(!night&&!pending){const open=[[state.weather.rain&&state.weather,askRain],[state.pests,askPests],[state.guests&&!state.guests.arrived&&state.guests,askGuests],[state.trader,askTrader]].find(([h])=>h&&!h.asked);if(open&&open[1]())open[0].asked=true;}
 while(state.talk.length&&state.talk[0].at<=state.time){const l=state.talk.shift(),a=state.agents.find(a=>a.name===l.agent);if(a){a.bubble=l.text;a.bubbleUntil=state.time+3.5;}note(`${l.agent}: “${l.text}” (${l.source})`);}
 if(!barnFull())state.flags.barnFullAsked=false;
 else if(!state.flags.barnFullAsked&&!night){const stuck=state.agents.filter(a=>jobOf(a)==='harvest'&&state.crops.some(c=>c.age>=60)||jobOf(a)==='chop'&&state.trees.some(t=>t.age>=60));if(stuck.length&&askAboutBarn(stuck))state.flags.barnFullAsked=true;}
 for(const a of state.agents){a.moving=false;
  if(chatting?.includes(a.name)){a.state='Chatting';continue;}
  if(pending?.slice(0,2).includes(a.name)){a.isIdle=false;a.state='Talking it over…';continue;}
  if(night){if(state.barrow.holder===a.name)state.barrow.holder=null;a.haul=null;a.isIdle=false;delete a.idleUntil;a.state=moveTo(a,HOME,dt)?'Sleeping at home':'Walking home';continue;}
  if(state.obstacle?.helper===a.name){a.isIdle=false;clearTree(a,dt);continue;}
  if(state.pests?.helper===a.name){a.isIdle=false;shoo(a,dt);continue;}
  if(haul(a,dt)){a.isIdle=false;delete a.idleUntil;continue;}
  const task=targetFor(a),job=jobOf(a);
  if(task){a.isIdle=false;delete a.idleUntil;if(blockedBy(a,task,dt))continue;
   if(!moveTo(a,task,dt)){a.state=job==='shelter'?'Running for cover':`Walking to ${job==='harvest'?'the rice':job==='sweep'?'the yard':'the trees'}`;continue;}
   if(job==='shelter'){a.state='Sheltering from the rain';a.work=0;continue;}
   a.state={harvest:'Harvesting rice',sweep:'Sweeping leaves',chop:'Chopping a tree',plant:'Planting a sapling'}[job]+(rain?' in the rain':'');a.work+=dt;if(a.work<2)continue;a.work=0;
   if(job==='harvest')collect(task,a);
   else if(job==='sweep'){state.leaves=Math.max(0,state.leaves-1);a.done++;}
   else if(job==='chop'){task.age=-1;a.cargo.wood++;a.done++;note(`${a.name} felled a tree. A stump needs replanting.`);}
   else if(job==='plant'){task.age=0;a.done++;note(`${a.name} planted a sapling.`);}
   continue;}
  a.work=0;
  if(a.job==='stop'){a.isIdle=false;a.state='Resting';continue;}
  a.isIdle=true;const spot=idleDestination(a,state.time);
  if(!moveTo(a,spot,dt))a.state='Strolling between jobs';else{a.idleUntil ??= state.time+7;a.state=spot.label+(barnFull()&&['harvest','chop'].includes(a.job)?' · barn full':'');}
 }
 maybeChat(night);
 if(state.time-savedAt>5){savedAt=state.time;save();}
}
function draw(){
 const phase=state.time%240;
 view?.render(state, reduced);
 const hour=Math.floor((state.time%240)/240*24+6)%24;const minute=Math.floor((state.time%10)/10*60);$('clock').textContent=`Day ${Math.floor(state.time/240)+1} · ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
 const carried=stored()-state.rice-state.wood;
 $('stock').textContent=`Barn: ${state.rice} rice · ${state.wood} wood / ${CAPACITY}${carried?` · ${carried} being carried`:''} · ${state.coins} coins`;
 state.agents.forEach((a,i)=>$('status-'+i).textContent=a.state+(cargo(a)?` · carrying ${cargo(a)}`:''));
 $('scene-status').textContent=barnFull()?'Barn full. Stored goods are kept; more storage is planned.':phase>=180?'The crew is sleeping. Crops keep growing.':[`${state.crops.filter(c=>c.age>=60).length} ripe rice plots · ${state.leaves} leaves in the yard`,state.weather.rain&&'raining',state.obstacle&&'a fallen tree blocks the paddy path',state.pests&&'crows on the paddy',state.guests&&(state.guests.arrived?'guests visiting':`guests expected at ${clockAt(state.guests.arriveAt)}`),state.trader&&'a trader is at the gate'].filter(Boolean).join(' · ');
 $('harvest').disabled=barnFull()||!state.crops.some(c=>c.age>=60);
 $('sell').disabled=!state.rice&&!state.wood;
}
renderLog();let last=performance.now();function frame(now){const dt=Math.max(0,Math.min((now-last)/1000,.1));last=now;if(!paused)update(dt*speed);draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);window.addEventListener('pagehide',save);
