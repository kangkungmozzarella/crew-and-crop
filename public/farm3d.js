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
  const camera = new THREE.OrthographicCamera(-22,22,16,-16,.1,150);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.minDistance = 18;
  controls.minZoom = .65;
  controls.maxZoom = 3.5;
  controls.maxDistance = 80;
  controls.minPolarAngle = .2;
  controls.maxPolarAngle = Math.PI * .46;
  controls.enablePan = true;
  const reset = () => { camera.position.set(23, 28, 36); camera.zoom=1.12;camera.updateProjectionMatrix(); controls.target.set(0, 0, 0); controls.update(); };
  reset();
  const sky = new THREE.HemisphereLight('#fff4df', '#657544', 1.5);
  scene.add(sky);
  const sun = new THREE.DirectionalLight('#fff1ce', 2.5);
  sun.position.set(-12, 24, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 70 });
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

  function rotate(amount){const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),amount);camera.position.copy(controls.target).add(offset);controls.update();}
  function zoom(factor){camera.zoom=THREE.MathUtils.clamp(camera.zoom/factor,.65,3.5);camera.updateProjectionMatrix();controls.update();}
  document.getElementById('rotate-left').onclick=()=>rotate(-.25);
  document.getElementById('rotate-right').onclick=()=>rotate(.25);
  document.getElementById('zoom-in').onclick=()=>zoom(.85);
  document.getElementById('zoom-out').onclick=()=>zoom(1.15);
  document.getElementById('reset-camera').onclick=reset;
  canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home')reset();else if(e.key==='ArrowLeft'||e.key==='ArrowRight')rotate(e.key==='ArrowLeft'?-.15:.15);else zoom(['+','=','ArrowUp'].includes(e.key)?.9:1.1);});
  function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);const aspect=w/h,span=Math.max(29,43/aspect);camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();}
  new ResizeObserver(resize).observe(canvas);resize();
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.getElementById('view-message').hidden=false;document.getElementById('view-message').textContent='3D graphics paused. Reload to restore the farm view.';});
  document.getElementById('view-message').hidden=true;
  canvas.dataset.renderer='three-webgl';
  let lastRender=-Infinity;
  return {render(state,reduced){const now=performance.now();if(now-lastRender<50)return;lastRender=now;const bounds=canvas.getBoundingClientRect();if(bounds.bottom<0||bounds.top>innerHeight)return;
    state.crops.forEach((c,i)=>{const crop=crops[i];crop.g.scale.y=.3+c.age/60*.85;crop.stalks.forEach(({stem,grain})=>{stem.material=mat(c.age>=60?'#c6a83e':'#86a042');grain.visible=c.age>=35;});});
    state.trees.forEach((t,i)=>{trees[i].stump.visible=t.age<0;trees[i].trunk.visible=trees[i].crown.visible=t.age>=0;const s=.25+Math.max(0,t.age)/60*.75;trees[i].crown.scale.setScalar(s);trees[i].trunk.scale.y=s;});
    leaves.forEach((m,i)=>m.visible=i<state.leaves);
    state.agents.forEach((a,i)=>{const f=farmers[i],[x,z]=world(a.x,a.y);const dx=x-f.lastX,dz=z-f.lastZ;if(a.moving&&Math.hypot(dx,dz)>.001)f.g.rotation.y=Math.atan2(dx,dz);f.lastX=x;f.lastZ=z;f.g.position.set(x,.15,z);f.g.visible=a.state!=='Sleeping at home';const walk=a.moving&&!reduced?Math.sin(state.time*10)*.4:0;f.limbs.forEach((l,n)=>l.rotation.x=walk*(n<2?1:-1)*(n%2?1:-1));f.body.position.y=a.moving&&!reduced?Math.abs(Math.sin(state.time*10))*.035:0;f.tool.visible=!a.isIdle&&['harvest','sweep','chop','plant'].includes(a.job);f.tool.rotation.x=!a.moving&&a.work>0&&!reduced?Math.sin(state.time*8)*.6:0;f.tag.pos.set(x,1.85,z);f.tag.el.hidden=!f.g.visible;f.bubble.pos.set(x,2.35,z);f.bubble.el.hidden=a.bubbleUntil<=state.time||!f.g.visible;f.bubble.el.textContent=a.bubble;});
    const phase=state.time%240,night=phase>=180;sun.intensity=night?.35:phase>=150?1.6:2.5;sky.intensity=night?.8:1.5;sun.color.set(phase>=150&&!night?'#ffd6a2':'#fff1ce');scene.background.set(night?'#8c9da0':'#cbe1e7');
    animals.forEach((a,i)=>{const sway=reduced?0:Math.sin(state.time*.65+i)*.055;a.g.rotation.y=a.angle+sway;a.g.position.y=.2+(reduced?0:Math.sin(state.time*1.5+i)*.008);});windows.forEach(w=>w.material.emissive.set(night?'#b27624':'#000000'));
    controls.target.x=THREE.MathUtils.clamp(controls.target.x,-12,12);controls.target.z=THREE.MathUtils.clamp(controls.target.z,-9,9);controls.target.y=THREE.MathUtils.clamp(controls.target.y,0,3);controls.update();renderer.render(scene,camera);
    const w=canvas.clientWidth,h=canvas.clientHeight,placed=[];
    const priority=item=>item.el.classList.contains('bubble')?0:item.el.classList.contains('person')?1:2;
    for(const item of [...labels].sort((a,b)=>priority(a)-priority(b))){if(item.el.hidden)continue;const p=item.pos.clone().project(camera),ew=item.el.offsetWidth,eh=item.el.offsetHeight;if(!ew)continue;const x=THREE.MathUtils.clamp((p.x*.5+.5)*w,ew/2+4,w-ew/2-4);let y=(-p.y*.5+.5)*h;const collides=()=>placed.some(r=>Math.abs(r.x-x)<(r.w+ew)/2+3&&Math.abs(r.y-y)<(r.h+eh)/2+3);let attempts=0;while(collides()&&attempts++<6)y-=eh+4;const visible=Math.abs(p.x)<=1&&Math.abs(p.y)<=1&&p.z<=1&&y>=eh/2&&y<=h-eh/2&&!collides();item.el.style.left=`${x}px`;item.el.style.top=`${y}px`;item.el.style.visibility=visible?'visible':'hidden';if(visible)placed.push({x,y,w:ew,h:eh});}
  }};
}
