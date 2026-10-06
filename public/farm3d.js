import * as THREE from 'three';
import { buildFarm } from './farm-details.js';
import { OrbitControls } from './vendor/OrbitControls.js';

export function createFarmView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dce6d5');
  const camera = new THREE.OrthographicCamera(-40,40,28,-28,.1,250);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.minDistance = 18;
  controls.minZoom = .65;
  controls.maxZoom = 6;
  controls.maxDistance = 140;
  controls.minPolarAngle = .2;
  controls.maxPolarAngle = Math.PI * .46;
  controls.enablePan = true;
  const areas={overview:{x:0,z:0,zoom:1.05},farmyard:{x:0,z:1,zoom:2.4},fields:{x:-20,z:6,zoom:3},orchard:{x:-20,z:-14,zoom:3.5},village:{x:4,z:-16,zoom:3},livestock:{x:24,z:3,zoom:3},lakeside:{x:10,z:17,zoom:3.5}};
  function focusArea(name){const area=areas[name]||areas.overview;controls.target.set(area.x,0,area.z);camera.position.set(area.x+42,52,area.z+64);camera.zoom=area.zoom;camera.updateProjectionMatrix();controls.update();canvas.dataset.area=name;document.getElementById('camera-area').value=name;}
  const reset=()=>focusArea('overview');
  document.getElementById('camera-area').onchange=e=>focusArea(e.target.value);
  reset();
  const sky = new THREE.HemisphereLight('#fff4df', '#657544', 1.5);
  scene.add(sky);
  const sun = new THREE.DirectionalLight('#fff1ce', 2.5);
  sun.position.set(-26, 50, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 160 });
  sun.shadow.bias = -.001;
  sun.shadow.normalBias = .035;
  scene.add(sun);
  const materials = new Map(), geometries=new Map();
  const geometry=(key,make)=>{if(!geometries.has(key))geometries.set(key,make());return geometries.get(key);};
  const mat = color => { if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .88 })); return materials.get(color); };
  function mesh(geometry, color, parent = scene) { const m = new THREE.Mesh(geometry, mat(color)); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
  function box(w,h,d,color,x,y,z,parent=scene){ const m=mesh(geometry(`box-${w}-${h}-${d}`,()=>new THREE.BoxGeometry(w,h,d)),color,parent);m.position.set(x,y,z);return m; }
  function ball(r,color,x,y,z,parent=scene,sx=1,sy=1,sz=1){const m=mesh(geometry(`ball-${r}`,()=>new THREE.IcosahedronGeometry(r,1)),color,parent);m.position.set(x,y,z);m.scale.set(sx,sy,sz);return m;}
  function cylinder(r1,r2,h,color,x,y,z,parent=scene){const m=mesh(geometry(`cylinder-${r1}-${r2}-${h}`,()=>new THREE.CylinderGeometry(r1,r2,h,10)),color,parent);m.position.set(x,y,z);return m;}
  const world = (x,y) => [(x-500)/30,(y-350)/30+2.5];
  const labels = [];
  function label(text,x,y,z,kind='place') { const el=document.createElement('span');el.className=`world-label ${kind}`;el.textContent=text;document.getElementById('world-labels').append(el);const item={el,pos:new THREE.Vector3(x,y,z)};labels.push(item);return item; }
  const {trees,crops,leaves,animals,windows}=buildFarm(scene,{box,ball,cylinder,mesh,mat,world,label});
  function farmer(name,color){const g=new THREE.Group();scene.add(g);const body=new THREE.Group();g.add(body);const limbs=[];
    for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.095,.38,0);body.add(leg);box(.13,.3,.15,'#5a6145',0,-.13,0,leg);box(.15,.1,.23,'#594632',0,-.29,.04,leg);limbs.push(leg);const arm=new THREE.Group();arm.position.set(side*.23,.75,0);body.add(arm);cylinder(.06,.065,.3,color,0,-.12,0,arm);ball(.06,'#e8bd90',0,-.29,0,arm);limbs.push(arm);}
    cylinder(.21,.17,.43,color,0,.65,0,body);ball(.22,'#e9c298',0,1.05,0,body,1,1.08,1);for(const side of [-1,1])ball(.019,'#3f392c',side*.075,1.08,.2,body);ball(.03,'#d19b73',0,1,.22,body);cylinder(.33,.33,.045,'#caae71',0,1.27,0,body);cylinder(.19,.22,.17,'#dbbe83',0,1.36,0,body);cylinder(.192,.212,.04,'#8b6e47',0,1.3,0,body);
    const tool=new THREE.Group();tool.position.set(.29,.5,.12);body.add(tool);box(.035,.65,.035,'#84633e',0,0,0,tool);box(.3,.12,.07,name==='Hank'?'#8c9490':name==='Rosie'?'#c4a96b':'#a9ae94',0,-.3,0,tool);
    const tag=label(name,0,1.8,0,'person');const bubble=label('',0,2.2,0,'bubble');return {g,body,limbs,tool,tag,bubble,lastX:0,lastZ:0};}
  const farmers=[farmer('Dale','#ebe1be'),farmer('Rosie','#aa5940'),farmer('Hank','#597343')];
  // The shared wheelbarrow faces +z like the farmers; the fallen tree lies across the paddy path.
  const barrow=new THREE.Group();scene.add(barrow);box(.42,.22,.6,'#8a5a32',0,.42,0,barrow);box(.34,.04,.5,'#6b4426',0,.54,0,barrow);cylinder(.17,.17,.07,'#3b3a35',0,.2,.36,barrow).rotation.z=Math.PI/2;box(.04,.04,.5,'#84633e',.16,.42,-.5,barrow);box(.04,.04,.5,'#84633e',-.16,.42,-.5,barrow);
  const fallen=new THREE.Group();scene.add(fallen);cylinder(.2,.26,2.6,'#7a5434',0,.3,0,fallen).rotation.z=Math.PI/2;ball(.55,'#5f8a3c',1.45,.55,0,fallen);ball(.42,'#6f9a45',1.8,.5,.32,fallen);fallen.rotation.y=Math.PI/2;fallen.visible=false;
  // Rain streaks, crows over the paddy, and visitors (two guests, one trader with a cart).
  const drops=Array.from({length:700},()=>[Math.random()*60-30,Math.random()*12,Math.random()*44-22]),rainPos=new Float32Array(drops.length*6),rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:'#eef4f7',transparent:true,opacity:.8}));rain.frustumCulled=false;rain.visible=false;scene.add(rain);
  const crows=new THREE.Group();scene.add(crows);crows.visible=false;const crowBirds=[[-6.8,3.4],[-5.6,4.1],[-4.4,3.6],[-6.1,5.2],[-4.9,5.5]].map(([x,z])=>{const g=new THREE.Group();crows.add(g);g.position.set(x,1.8,z);g.scale.setScalar(1.6);ball(.14,'#26282b',0,0,0,g,1.3,.9,1);ball(.09,'#26282b',0,.08,.16,g);box(.36,.03,.14,'#33363a',0,.03,0,g);return g;});
  function visitor(color){const g=new THREE.Group();scene.add(g);g.visible=false;cylinder(.17,.2,.62,color,0,.5,0,g);ball(.15,'#e6c4a0',0,.95,0,g);cylinder(.2,.2,.05,'#6d5a3c',0,1.08,0,g);return g;}
  const guests=[visitor('#5b78a6'),visitor('#b8765a')],trader=visitor('#7a5c8a'),traderCart=new THREE.Group();scene.add(traderCart);traderCart.visible=false;box(.9,.4,.6,'#9a6b3c',0,.55,0,traderCart);box(.85,.08,.55,'#c9a35c',0,.8,0,traderCart);cylinder(.2,.2,.06,'#3b3a35',0,.22,.33,traderCart).rotation.x=Math.PI/2;cylinder(.2,.2,.06,'#3b3a35',0,.22,-.33,traderCart).rotation.x=Math.PI/2;
  const raycaster=new THREE.Raycaster();let press;
  canvas.addEventListener('pointerdown',e=>press={x:e.clientX,y:e.clientY});
  canvas.addEventListener('pointerup',e=>{if(!press||Math.hypot(e.clientX-press.x,e.clientY-press.y)>6)return;const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hits=raycaster.intersectObjects(farmers.map(f=>f.g),true);if(hits.length){const index=farmers.findIndex(f=>{let o=hits[0].object;while(o){if(o===f.g)return true;o=o.parent;}return false;});if(index>=0)window.dispatchEvent(new CustomEvent('select-farmer',{detail:['Dale','Rosie','Hank'][index]}));}});


  function rotate(amount){const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),amount);camera.position.copy(controls.target).add(offset);controls.update();}
  function zoom(factor){camera.zoom=THREE.MathUtils.clamp(camera.zoom/factor,.65,6);camera.updateProjectionMatrix();controls.update();}
  document.getElementById('rotate-left').onclick=()=>rotate(-.25);
  document.getElementById('rotate-right').onclick=()=>rotate(.25);
  document.getElementById('zoom-in').onclick=()=>zoom(.85);
  document.getElementById('zoom-out').onclick=()=>zoom(1.15);
  document.getElementById('reset-camera').onclick=reset;
  canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home')reset();else if(e.key==='ArrowLeft'||e.key==='ArrowRight')rotate(e.key==='ArrowLeft'?-.15:.15);else zoom(['+','=','ArrowUp'].includes(e.key)?.9:1.1);});
  function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);const aspect=w/h,span=Math.max(52,80/aspect);camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();}
  new ResizeObserver(resize).observe(canvas);resize();
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.getElementById('view-message').hidden=false;document.getElementById('view-message').textContent='3D graphics paused. Reload to restore the farm view.';});
  document.getElementById('view-message').hidden=true;
  canvas.dataset.renderer='three-webgl';
  let lastRender=-Infinity;
  return {render(state,reduced){const now=performance.now();if(now-lastRender<50)return;lastRender=now;const bounds=canvas.getBoundingClientRect();if(bounds.bottom<0||bounds.top>innerHeight)return;
    state.crops.forEach((c,i)=>{const crop=crops[i];crop.g.scale.y=.3+c.age/60*.85;crop.stalks.forEach(({stem,grain})=>{stem.material=mat(c.age>=60?'#c6a83e':'#86a042');grain.visible=c.age>=35;});});
    state.trees.forEach((t,i)=>{trees[i].stump.visible=t.age<0;trees[i].trunk.visible=trees[i].crown.visible=t.age>=0;const s=.25+Math.max(0,t.age)/60*.75;trees[i].crown.scale.setScalar(s);trees[i].trunk.scale.y=s;});
    leaves.forEach((m,i)=>m.visible=i<state.leaves);
    state.agents.forEach((a,i)=>{const f=farmers[i],[x,z]=world(a.x,a.y);const dx=x-f.lastX,dz=z-f.lastZ;if(a.moving&&Math.hypot(dx,dz)>.001)f.g.rotation.y=Math.atan2(dx,dz);f.lastX=x;f.lastZ=z;f.g.position.set(x,.15,z);f.g.visible=a.state!=='Sleeping at home';const walk=a.moving&&!reduced?Math.sin(state.time*10)*.4:0;f.limbs.forEach((l,n)=>l.rotation.x=walk*(n<2?1:-1)*(n%2?1:-1));f.body.position.y=a.moving&&!reduced?Math.abs(Math.sin(state.time*10))*.035:0;f.tool.visible=(!a.isIdle&&['harvest','sweep','chop','plant'].includes(a.job));f.tool.rotation.x=!a.moving&&a.work>0&&!reduced?Math.sin(state.time*8)*.6:0;f.tag.pos.set(x,1.85,z);f.tag.el.hidden=!f.g.visible;f.bubble.pos.set(x,2.35,z);f.bubble.el.hidden=a.bubbleUntil<=state.time||!f.g.visible;f.bubble.el.textContent=a.bubble;});
    const holder=state.barrow?state.agents.findIndex(a=>a.name===state.barrow.holder&&['deliver','unload','return'].includes(a.haul)):-1;
    if(holder>=0){const f=farmers[holder].g;barrow.position.set(f.position.x+Math.sin(f.rotation.y)*.75,.05,f.position.z+Math.cos(f.rotation.y)*.75);barrow.rotation.y=f.rotation.y;}else if(state.barrow){const [bx,bz]=world(state.barrow.x,state.barrow.y);barrow.position.set(bx,.05,bz);}
    fallen.visible=!!state.obstacle;if(state.obstacle){const [ox,oz]=world(state.obstacle.x,state.obstacle.y);fallen.position.set(ox,0,oz);}
    const raining=!!state.weather?.rain;rain.visible=raining;
    if(raining){const fall=reduced?0:state.time*14;drops.forEach(([x,y0,z],i)=>{const y=((y0-fall)%12+12)%12;rainPos.set([x,y,z,x+.08,y+.9,z],i*6);});rainGeo.attributes.position.needsUpdate=true;}
    crows.visible=!!state.pests;crowBirds.forEach((g,i)=>{g.position.y=1.8+(reduced?0:Math.sin(state.time*6+i)*.15);});
    const visiting=!!state.guests?.arrived;guests.forEach((g,i)=>{g.visible=visiting;const [gx,gz]=world(585+i*22,382-i*10);g.position.set(gx,.15,gz);g.rotation.y=-Math.PI*.75;});
    trader.visible=traderCart.visible=!!state.trader;{const [tx,tz]=world(650,300);trader.position.set(tx,.15,tz);traderCart.position.set(tx+.9,0,tz-.2);}
    const phase=state.time%240,night=phase>=180;sun.intensity=night?.35:phase>=150?1.6:2.5;sky.intensity=night?.8:1.5;sun.color.set(phase>=150&&!night?'#ffd6a2':'#fff1ce');scene.background.set(night?'#8c9da0':raining?'#a7b6ba':'#cbe1e7')
if(raining){sun.intensity*=.55;sky.intensity*=.85;};
    animals.forEach((a,i)=>{const sway=reduced?0:Math.sin(state.time*.65+i)*.055;a.g.rotation.y=a.angle+sway;a.g.position.y=.2+(reduced?0:Math.sin(state.time*1.5+i)*.008);});windows.forEach(w=>w.material.emissive.set(night?'#b27624':'#000000'));
    controls.target.x=THREE.MathUtils.clamp(controls.target.x,-30,30);controls.target.z=THREE.MathUtils.clamp(controls.target.z,-22,22);controls.target.y=THREE.MathUtils.clamp(controls.target.y,0,3);controls.update();renderer.render(scene,camera);
    const w=canvas.clientWidth,h=canvas.clientHeight,placed=[];
    const priority=item=>item.el.classList.contains('bubble')?0:item.el.classList.contains('person')?1:2;
    for(const item of [...labels].sort((a,b)=>priority(a)-priority(b))){if(item.el.hidden)continue;const p=item.pos.clone().project(camera),ew=item.el.offsetWidth,eh=item.el.offsetHeight;if(!ew)continue;const x=THREE.MathUtils.clamp((p.x*.5+.5)*w,ew/2+4,w-ew/2-4);let y=(-p.y*.5+.5)*h;const collides=()=>placed.some(r=>Math.abs(r.x-x)<(r.w+ew)/2+3&&Math.abs(r.y-y)<(r.h+eh)/2+3);let attempts=0;while(collides()&&attempts++<6)y-=eh+4;const visible=Math.abs(p.x)<=1&&Math.abs(p.y)<=1&&p.z<=1&&y>=eh/2&&y<=h-eh/2&&!collides();item.el.style.left=`${x}px`;item.el.style.top=`${y}px`;item.el.style.visibility=visible?'visible':'hidden';if(visible)placed.push({x,y,w:ew,h:eh});}
  }};
}
