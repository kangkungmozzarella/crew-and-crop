import * as THREE from 'three';
import { treeSites } from './farm-layout.js';
import { buildFarmExpansion } from './farm-expansion.js';

export function buildFarm(scene, helpers) {
  const {box,ball,cylinder,mesh,mat,world,label}=helpers;
  let seed=73;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const staticGroup=new THREE.Group();scene.add(staticGroup);
  const root=staticGroup;
  function beam(a,b,width,color,parent=root){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const m=box(width,delta.length(),width,color,0,0,0,parent);m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
  function patch(x,z,w,d,color='#7ca54b',y=.14){return box(w,.08,d,color,x,y,z,root);}
  const outline=[[-30,-20],[-25,-23],[-8,-24],[15,-24],[30,-21],[32,-12],[32,10],[28,22],[12,24],[-7,24],[-25,22],[-32,14],[-33,0],[-32,-13]];
  const shape=new THREE.Shape();outline.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  const land=mesh(new THREE.ExtrudeGeometry(shape,{depth:1.1,bevelEnabled:true,bevelSize:.32,bevelThickness:.2,bevelSegments:1,steps:1}),'#ae8550',root);land.rotation.x=-Math.PI/2;land.position.y=-1.18;
  const turf=mesh(new THREE.ExtrudeGeometry(shape,{depth:.13,bevelEnabled:true,bevelSize:.2,bevelThickness:.12,bevelSegments:1,steps:1}),'#8caf4e',root);turf.rotation.x=-Math.PI/2;turf.position.y=-.06;
  for(let i=0;i<outline.length;i++){const [x,z]=outline[i];for(let j=0;j<7;j++){const a=j/7,b=outline[(i+1)%outline.length];const px=x+(b[0]-x)*a,pz=z+(b[1]-z)*a;box(.05,.8,.04,j%2?'#b88f58':'#997445',px,-.63,pz,root);}}
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshBasicMaterial({color:'#cbe1e7'}));scene.add(ground);ground.rotation.x=-Math.PI/2;ground.position.y=-1.6;ground.castShadow=false;const groundShadow=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.12}));groundShadow.rotation.x=-Math.PI/2;groundShadow.position.y=-1.59;groundShadow.receiveShadow=true;scene.add(groundShadow);
  function path(points,width=1.7){for(let i=1;i<points.length;i++){const [x,z]=points[i-1],[xx,zz]=points[i];const m=box(width,.045,Math.hypot(xx-x,zz-z),'#dfc18a',(x+xx)/2,.17,(z+zz)/2,root);m.rotation.y=Math.atan2(xx-x,zz-z);cylinder(width/2,width/2,.045,'#dfc18a',xx,.17,zz,root);}}
  path([[-13,-1],[-8,-1],[-3,-1],[1,-1],[4,-2],[12,-2]],1.9);
  path([[1,-1],[1,3],[2,6],[4,9],[9,10]],1.65);
  path([[-3,-1],[-3,-5]],1.3);
  path([[-13,8],[-9,8],[-1,9],[4,9]],1.3);
  function fenceSegment(x,z,xx,zz,color='#ede1b5',gate=false){const count=Math.ceil(Math.hypot(xx-x,zz-z)/1.05);for(let i=0;i<=count;i++){const a=i/count,px=x+(xx-x)*a,pz=z+(zz-z)*a;box(.14,.9,.14,color,px,.57,pz,root);cylinder(.105,.08,.1,color,px,1.06,pz,root);if(i<count&&!(gate&&i===Math.floor(count/2))){const b=(i+1)/count;for(const y of [.47,.82])beam([px,y,pz],[x+(xx-x)*b,y,z+(zz-z)*b],.09,color);}}}
  function enclosure(x,z,w,d,color='#d5b27d',gate=true){fenceSegment(x-w/2,z-d/2,x+w/2,z-d/2,color);fenceSegment(x-w/2,z-d/2,x-w/2,z+d/2,color);fenceSegment(x+w/2,z-d/2,x+w/2,z+d/2,color);fenceSegment(x-w/2,z+d/2,x+w/2,z+d/2,color,gate);}
  function roof(g,w,d,y,rise,color,gambrel=false){const profile=gambrel?[[-w/2-.2,0],[-w*.3,rise*.75],[0,rise],[w*.3,rise*.75],[w/2+.2,0]]:[[-w/2-.2,0],[0,rise],[w/2+.2,0]];const s=new THREE.Shape();profile.forEach(([x,yy],i)=>i?s.lineTo(x,yy):s.moveTo(x,yy));s.closePath();const r=mesh(new THREE.ExtrudeGeometry(s,{depth:d+.5,bevelEnabled:false}),color,g);r.position.set(0,y,-d/2-.25);
    for(let side=0;side<profile.length-1;side++){const a=profile[side],b=profile[side+1];for(let row=0;row<5;row++){const t=row/5;beam([a[0]+(b[0]-a[0])*t,y+a[1]+(b[1]-a[1])*t+.015,-d/2-.27],[a[0]+(b[0]-a[0])*t,y+a[1]+(b[1]-a[1])*t+.015,d/2+.27],.027,color==='#5e7566'?'#4e6655':'#854b36',g);}}
    for(const z of [-d/2-.27,d/2+.27])for(let i=1;i<profile.length;i++)beam([profile[i-1][0],y+profile[i-1][1],z],[profile[i][0],y+profile[i][1],z],.12,'#f8e5b8',g);
  }
  const windows=[];
  function window(g,x,y,z,side=false,size=.65){const frame=box(size,.84,.1,'#efdbab',x,y,z,g);const pane=box(size-.13,.68,.11,'#dfaf56',x,y,z+.04,g);windows.push(pane);const cross=box(.065,.72,.12,'#faf0c8',x,y,z+.11,g);const cross2=box(size-.08,.065,.12,'#faf0c8',x,y,z+.11,g);if(side){for(const m of [frame,pane,cross,cross2])m.rotation.y=Math.PI/2;}}
  function house(x,z,barn=false){const g=new THREE.Group();g.position.set(x,0,z);root.add(g);const w=barn?4.2:3.6,d=barn?3.7:3.1,h=barn?3.5:2.6;
    box(w+.18,.25,d+.2,'#c1ad80',0,.2,0,g);box(w,h,d,barn?'#b64e38':'#f4e1b2',0,h/2+.3,0,g);
    for(let i=-w/2;i<w/2;i+=.26){box(.025,h,.035,barn?'#a14431':'#d6c39a',i,h/2+.3,d/2+.02,g);box(.025,h,.035,barn?'#a14431':'#d6c39a',i,h/2+.3,-d/2-.02,g);}
    if(!barn)for(let y=.5;y<h;y+=.27)box(w,.025,.035,'#dfc99e',0,y,d/2+.035,g);
    roof(g,w,d,h+.3,barn?2.0:1.65,barn?'#984e39':'#5e7566',barn);
    const gableShape=new THREE.Shape();const gablePoints=barn?[[-w/2,0],[-w*.28,1.4],[0,1.87],[w*.28,1.4],[w/2,0]]:[[-w/2,0],[0,1.51],[w/2,0]];gablePoints.forEach(([xx,yy],i)=>i?gableShape.lineTo(xx,yy):gableShape.moveTo(xx,yy));gableShape.closePath();const gable=mesh(new THREE.ShapeGeometry(gableShape),barn?'#b64e38':'#f4e1b2',g);gable.position.set(0,h+.3,d/2+.27);
    for(const zz of [-.75,.6])window(g,w/2+.07,1.6,zz,true,.65);
    if(barn){for(let zz=-d/2+.12;zz<d/2;zz+=.26)box(.035,h,.025,'#a14431',w/2+.03,h/2+.3,zz,g);}else{for(let yy=.5;yy<h;yy+=.27)box(.035,.025,d,'#dfc99e',w/2+.03,yy,0,g);}

    for(const xx of [-w/2,w/2])for(const zz of [-d/2,d/2])box(.13,h,.13,'#f8e4b8',xx,h/2+.3,zz,g);
    if(barn){box(2.35,2.35,.14,'#88412e',0,1.49,d/2+.08,g);for(const xx of [-.58,.58]){box(1.08,2.12,.12,'#b7553a',xx,1.5,d/2+.18,g);for(const sign of [-1,1])beam([xx-.43,sign>0?.55:2.42,d/2+.28],[xx+.43,sign>0?2.42:.55,d/2+.28],.1,'#fff1c8',g);box(.08,2.22,.08,'#fff1c8',xx-.53,1.5,d/2+.3,g);box(.08,2.22,.08,'#fff1c8',xx+.53,1.5,d/2+.3,g);box(1.12,.1,.1,'#fff1c8',xx,2.58,d/2+.3,g);}
      window(g,0,4.05,d/2+.33,false,.76);window(g,-1.5,1.9,d/2+.06,false,.55);
      const vane=new THREE.Group();vane.position.set(0,h+2.65,0);g.add(vane);cylinder(.025,.025,.75,'#4f4834',0,-.3,0,vane);beam([-.42,-.35,0],[.42,-.35,0],.025,'#4f4834',vane);ball(.17,'#433e2b',0,.15,0,vane,1.4,.9,.6);ball(.08,'#433e2b',.18,.35,0,vane);mesh(new THREE.ConeGeometry(.07,.15,5),'#c69041',vane).position.set(.27,.35,0);ball(.15,'#433e2b',-.19,.28,0,vane,.5,1.4,.65);
    }else{box(.85,1.6,.14,'#82603c',0,1.15,d/2+.1,g);for(let i=0;i<4;i++)box(.03,1.53,.05,'#695034',-.3+i*.2,1.15,d/2+.2,g);ball(.04,'#c3a051',.25,1.14,d/2+.23,g);window(g,-1.15,1.55,d/2+.07);window(g,1.15,1.55,d/2+.07);window(g,0,3.47,d/2+.33,false,.65);
      box(1.25,.1,.7,'#5e7566',0,2.05,d/2+.32,g);for(let i=0;i<3;i++)box(1.4,.16,.32,'#d8cbb0',0,.13+i*.15,d/2+.85-i*.25,g);
      box(.48,1.3,.5,'#bd8862',.9,h+1.5,-.6,g);box(.64,.14,.65,'#edd5ad',.9,h+2.18,-.6,g);
    }
    return g;
  }
  const homePoint=world(445,170);house(homePoint[0],homePoint[1]-1.2);house(4.5,-6.25,true);
  function tree(x,z,fruit=false){const g=new THREE.Group();g.position.set(x,.1,z);root.add(g);const trunk=cylinder(.15,.28,1.85,'#8c6438',0,.94,0,g);beam([0,1.25,0],[-.5,2,0],.12,'#8c6438',g);const crown=new THREE.Group();g.add(crown);ball(1.05,'#739e36',0,2.6,0,crown,1.1,1,1);ball(.82,'#91b642',-.6,2.38,.2,crown);ball(.78,'#638e31',.65,2.43,.1,crown);ball(.75,'#a2bd49',-.12,3.25,0,crown);ball(.7,'#83a939',.16,2.5,-.65,crown);
    if(fruit)for(let i=0;i<9;i++){const a=i*2.4;ball(.17,i%3?'#d45b30':'#eab33f',Math.cos(a)*1.17,2.1+(i%3)*.33,Math.sin(a)*1.05,crown);}
    const stump=cylinder(.24,.28,.4,'#bb9055',0,.2,0,g);stump.visible=false;return {g,trunk,crown,stump};}
  const trees=treeSites.map(t=>tree(...world(t.x,t.y),true));trees.forEach(t=>t.g.userData.dynamic=true);
  for(const [x,z] of [[-13,-7],[-10,-8],[-6,-9],[0,-9],[9,-9],[13,-7],[-14,2],[-13,5],[-10,9],[-6,10],[14,6]])tree(x,z,true);
  function hay(x,z,scale=1){const g=new THREE.Group();g.position.set(x,.2,z);g.scale.setScalar(scale);root.add(g);box(.9,.55,.65,'#e5b847',0,.28,0,g);for(const xx of [-.25,.25])box(.035,.58,.68,'#bda34f',xx,.28,0,g);for(let i=0;i<6;i++)box(.83,.018,.018,'#efcd64',0,.07+i*.075,.335,g);return g;}
  for(let i=0;i<7;i++)hay(2.05+(i%3)*.8,-4.45-Math.floor(i/3)*.6,.95);
  for(let i=0;i<5;i++)hay(7.3+(i%2)*.8,-5.7+Math.floor(i/2)*.65);
  function barrel(x,z){cylinder(.28,.24,.58,'#997040',x,.48,z,root);for(const y of [.27,.66])cylinder(.285,.285,.04,'#514d35',x,y,z,root);cylinder(.21,.21,.03,'#665232',x,.79,z,root);}
  for(const [x,z] of [[-4,-2.5],[6.9,-4],[11,-.5],[-10,1],[5,7]])barrel(x,z);
  function trough(x,z,w=1.25){box(w,.38,.52,'#ad7c43',x,.35,z,root);box(w-.14,.045,.36,'#89b2b0',x,.55,z,root);}
  function shelter(x,z,w=3,d=2){const g=new THREE.Group();g.position.set(x,.1,z);root.add(g);for(const xx of [-w/2,w/2])for(const zz of [-d/2,d/2])box(.15,1.8,.15,'#9d723e',xx,.9,zz,g);box(w,.65,.12,'#b68b52',0,.5,-d/2,g);roof(g,w,d,1.95,.35,'#975b3b');for(const xx of [-w/2,w/2])beam([xx,1.6,0],[xx*.5,1.95,0],.1,'#b68b52',g);}
  patch(9,-3.2,5.7,4.8,'#b89c58');enclosure(9,-3.2,5.7,4.8,'#eee3bd');shelter(9,-4.5,3.8,1.8);trough(9,-1.5,1.7);hay(10.5,-3.8);hay(10.5,-4.5);
  patch(13,.2,4.2,3.5,'#b99e61');enclosure(13,.2,4.2,3.5,'#c6a16a');shelter(13,-.7,2.7,1.4);trough(13.1,1.35);
  patch(-11.2,-2.2,4.8,4.5,'#c8a867');enclosure(-11.2,-2.2,4.8,4.5,'#eee2b7');
  const coop=new THREE.Group();coop.position.set(-11.5,.75,-3.2);root.add(coop);box(1.7,1.2,1.3,'#dfba7c',0,.6,0,coop);roof(coop,1.7,1.3,1.2,.7,'#b9653d');box(.58,.65,.06,'#5d4930',0,.35,.68,coop);const ramp=box(.7,.06,1.5,'#a27a42',0,-.23,1.18,coop);ramp.rotation.x=-.3;for(let i=0;i<5;i++)box(.7,.04,.05,'#e1bd83',-11.5,.3+i*.1,-1.5-i*.25,root);trough(-9.8,-2.3,.8);
  const animals=[];
  function animal(kind,x,z,angle=0,stationary=false){const g=new THREE.Group();g.position.set(x,.2,z);g.rotation.y=angle;root.add(g);const cow=kind==='cow',sheep=kind==='sheep',bird=kind==='chicken'||kind==='duck';
    if(bird){ball(.23,'#fff5da',0,.3,0,g,1,1.1,1.3);ball(.15,'#fff4d5',0,.56,.19,g);const beak=mesh(new THREE.ConeGeometry(.065,.16,5),'#e8aa38',g);beak.rotation.x=Math.PI/2;beak.position.set(0,.54,.36);ball(.015,'#473f30',-.065,.58,.3,g);ball(.015,'#473f30',.065,.58,.3,g);if(kind==='chicken')ball(.075,'#bd4933',0,.73,.17,g,.5,1,.8);for(const xx of [-.08,.08])cylinder(.02,.02,.17,'#ca963c',xx,.08,.05,g);}
    else{ball(cow?.58:.43,'#f1ead8',0,cow?.85:.65,0,g,cow?1.35:1.2,1,.85);for(const xx of [-.38,.38])for(const zz of [-.22,.22]){cylinder(.065,.07,cow?.58:.4,'#6c5840',xx,cow?.35:.26,zz,g);ball(.075,'#443d30',xx,.08,zz,g,1,.7,1.2);}
      ball(cow?.25:.19,cow?'#f4e9d4':'#76614b',.55,cow?.95:.74,.03,g,1.1,1.15,1);ball(cow?.22:.13,cow?'#e8b7a5':'#65523d',.72,cow?.8:.66,.13,g,1,.6,1.1);for(const zz of [-.2,.23])ball(.11,cow?'#f1e5ce':'#756049',.51,cow?1.1:.87,zz,g,1.2,.5,.7);ball(.025,'#3d382d',.7,cow?1.01:.8,.22,g);
      if(cow){for(const [xx,yy,zz] of [[-.35,.96,.41],[.13,.92,-.43],[.25,1.3,.07],[-.43,.83,-.4]])ball(.2,'#3e3b30',xx,yy,zz,g,1.5,.65,.8);for(const zz of [-.12,.16])cylinder(.035,.07,.17,'#bfa77b',.45,1.24,zz,g);}
      else for(let i=0;i<10;i++){const a=i*2.4;ball(.19,'#fff2dc',Math.cos(a)*.36,.7+(i%3)*.13,Math.sin(a)*.27,g);}
    }
    g.userData.dynamic=!stationary;if(!stationary)animals.push({g,x,z,angle,kind});return g;
  }
  animal('cow',8,-2.8,.5);animal('cow',10,-2.2,-.5);animal('sheep',12.2,.1,.4);animal('sheep',13.8,.6,-.3);
  for(let i=0;i<6;i++)animal('chicken',-12.7+(i%3)*1.05,-1.8+Math.floor(i/3)*1.1,i);
  function field(x,z,w,d){patch(x,z,w,d,'#a87a43',.23);enclosure(x,z,w+.3,d+.3,'#b68e55');for(let i=0;i<4;i++)box(w-.25,.09,.07,'#795e39',x,.29,z-d/2+.4+i*(d-.8)/3,root);}
  field(-5.6,5.2,7.1,5.3);field(-5.8,.5,7,2.4);
  const crops=[];
  const stalkGeometry=new THREE.CylinderGeometry(.018,.025,.9,5);
  const grainGeometry=new THREE.SphereGeometry(.066,5,4);
  const stemMat=mat('#af9838'),grainMat=mat('#edc453');
  for(let i=0;i<12;i++){const [x,z]=world(260+(i%4)*49,365+Math.floor(i/4)*43);const g=new THREE.Group();g.position.set(x,.29,z);root.add(g);const stalks=[];
    const stems=new THREE.InstancedMesh(stalkGeometry,stemMat,36),ears=new THREE.InstancedMesh(grainGeometry,grainMat,108);const dummy=new THREE.Object3D();
    for(let n=0;n<36;n++){const px=(random()-.5)*1.55,pz=(random()-.5)*1.8;dummy.position.set(px,.45,pz);dummy.rotation.set(0,0,(random()-.5)*.16);dummy.scale.set(1,1,1);dummy.updateMatrix();stems.setMatrixAt(n,dummy.matrix);for(let k=0;k<3;k++){dummy.position.set(px+(k%2?.025:-.025),.92+k*.08,pz);dummy.rotation.set(0,0,0);dummy.scale.set(.8,1.6,.8);dummy.updateMatrix();ears.setMatrixAt(n*3+k,dummy.matrix);}}
    g.add(stems,ears);g.userData.dynamic=true;stalks.push({stem:stems,grain:ears});crops.push({g,stalks});}
  for(let row=0;row<3;row++)for(let col=0;col<9;col++){const x=-8.8+col*.72,z=-.25+row*.7;const g=new THREE.Group();g.position.set(x,.3,z);root.add(g);if(col<3){ball(.2,'#79973d',0,.12,0,g);for(let i=0;i<5;i++){const a=i*1.26;ball(.15,'#9fb453',Math.cos(a)*.13,.1,Math.sin(a)*.13,g,1,.45,1);}}
    else{cylinder(.025,.025,.65,'#577f32',0,.33,0,g);for(let i=0;i<4;i++){const a=i*1.7;ball(.15,'#699543',Math.cos(a)*.13,.35+i*.06,Math.sin(a)*.13,g,1.5,.4,.8);ball(.1,col<6?'#e69435':'#d64b29',Math.cos(a)*.14,.3+i*.045,Math.sin(a)*.14,g);}}}
  const pondShape=new THREE.Shape();for(let i=0;i<14;i++){const a=i/14*Math.PI*2,r=1+(i%3)*.08;const x=10.2+Math.cos(a)*3*r,z=7.3+Math.sin(a)*2.2*r;i?pondShape.lineTo(x,-z):pondShape.moveTo(x,-z);}pondShape.closePath();const water=mesh(new THREE.ShapeGeometry(pondShape),'#66b4c4',root);water.rotation.x=-Math.PI/2;water.position.y=.27;water.castShadow=false;
  for(let i=0;i<18;i++){const a=i/18*Math.PI*2;ball(.38+i%3*.08,i%2?'#a6a18b':'#c9c1a6',10.2+Math.cos(a)*3.15,.31,7.3+Math.sin(a)*2.4,root,1.2,.8,1);}
  for(let i=0;i<6;i++){const x=10+(random()-.5)*3,z=7+(random()-.5)*2;const lily=cylinder(.22,.22,.02,'#89ad54',x,.3,z,root);lily.scale.z=.8;ball(.06,'#fff5da',x,.35,z,root,1,.6,1);}
  for(let i=0;i<13;i++){const a=i*.8,x=10.2+Math.cos(a)*3.35,z=7.3+Math.sin(a)*2.6;for(let j=0;j<3;j++){const reed=cylinder(.025,.025,.7+j*.1,'#739742',x+j*.07,.48,z,root);reed.rotation.z=(j-1)*.17;}cylinder(.07,.07,.25,'#8d6236',x,.9,z,root);}
  animal('duck',10,7,1);animal('duck',11.1,7.6,-.6);
  for(let i=0;i<8;i++){box(.36,.12,1.0,'#ab7b43',7.1+i*.36,.43,6.6,root);if(i===0||i===7)for(const z of [6.05,7.15])box(.13,.9,.13,'#9b6f3e',7.1+i*.36,.55,z,root);}for(const z of [6.05,7.15])beam([7.1,.92,z],[9.62,.92,z],.1,'#b78d56');
  function flower(x,z,sunflower=false){if(sunflower){cylinder(.025,.025,1.25,'#5e8234',x,.8,z,root);for(let i=0;i<9;i++){const a=i/9*Math.PI*2;ball(.095,'#edbc36',x+Math.cos(a)*.19,1.45+Math.sin(a)*.19,z,root,.8,1,.4);}ball(.15,'#78602e',x,1.45,z+.02,root,1,1,.45);ball(.18,'#6e9138',x+.12,.6,z,root,1.2,.3,.5);}else{for(let i=0;i<4;i++){const a=i*1.57;ball(.06,'#f4edd2',x+Math.cos(a)*.07,.3,z+Math.sin(a)*.07,root,1,.5,1);}ball(.035,'#daba46',x,.32,z,root);}}
  for(let i=0;i<13;i++)flower(-13.7+(i%4)*.45,-.2+Math.floor(i/4)*.55,true);
  for(const [cx,cz,w,d] of [[-1.83,-4.8,4.4,3.8],[-11.2,-2.2,5.2,4.8],[9,-3.2,6.3,5.2],[13,.2,4.7,4],[-5.6,5.2,7.8,5.9]]){for(let i=0;i<28;i++){const a=i/28*Math.PI*2,x=cx+Math.cos(a)*w/2,z=cz+Math.sin(a)*d/2;if(i%2===0)ball(.12,'#759f3e',x,.26,z,root,1.2,.8,1);flower(x+.1,z+.07);}}
  for(let i=0;i<12;i++){const [x,z]=[-12.4+i*.18,4.1+(i%3)*.17];ball(.14,'#85ad3d',x,.3,z,root);flower(x,z+.12);}
  const flowers=[];
  for(let i=0;i<150;i++){const x=(random()-.5)*29,z=(random()-.5)*20;const atBorder=Math.abs(x)>13||z<-8||z>9;const byHouse=x>-5&&x<1&&z>-6&&z<-2;if(atBorder||byHouse){flowers.push([x,z]);flower(x,z);}}
  for(let i=0;i<110;i++){const x=(random()-.5)*29,z=(random()-.5)*20;if(Math.abs(x)>12||z<-8||z>9){ball(.12,'#7d9f42',x,.22,z,root,1,.5,1);const tuft=mesh(new THREE.ConeGeometry(.07,.26,3),'#7b9e39',root);tuft.position.set(x+.15,.28,z);}}
  for(const [x,z] of [[-4,-2.3],[.1,-3.2],[2,-4],[6,-4],[12,2],[-9,2]]){cylinder(.21,.15,.32,'#aa7443',x,.32,z,root);ball(.22,'#6c9839',x,.62,z,root,1,.7,1);flower(x,z);}
  function lantern(x,z){cylinder(.06,.08,1.55,'#8c673a',x,.86,z,root);box(.38,.045,.045,'#8c673a',x+.14,1.63,z,root);box(.21,.32,.21,'#554d30',x+.3,1.37,z,root);box(.13,.22,.13,'#eed081',x+.3,1.38,z+.02,root);mesh(new THREE.ConeGeometry(.19,.15,4),'#554d30',root).position.set(x+.3,1.6,z);}
  lantern(-1,1.8);lantern(4,6);lantern(-9,-.4);
  const cart=new THREE.Group();cart.position.set(-.5,.25,9);cart.rotation.y=-.35;root.add(cart);box(1.3,.13,.8,'#996c3a',0,.4,0,cart);box(1.3,.43,.08,'#bd9055',0,.65,-.44,cart);for(const x of [-.72,.72]){box(.1,.45,.85,'#bd9055',x,.65,0,cart);const wheel=mesh(new THREE.TorusGeometry(.27,.045,6,10),'#634d2c',cart);wheel.position.set(x,.26,0);wheel.rotation.y=Math.PI/2;for(let i=0;i<4;i++){const spoke=box(.03,.5,.03,'#8f703e',x,.26,0,cart);spoke.rotation.x=i*Math.PI/4;}beam([x*.5,.42,.1],[x*.5,.42,1.55],.065,'#916c3a',cart);}box(.85,.5,.6,'#e5b847',0,.72,0,cart);
  const leaves=[];for(let i=0;i<20;i++){const [x,z]=world(530+(i*31)%105,365+(i*27)%98);const m=ball(.09,i%2?'#b79545':'#937139',x,.19,z,root,1.5,.2,.65);m.rotation.y=i;m.userData.dynamic=true;leaves.push(m);}
  label('Rice paddy',-5.8,.2,8.3);label('Crew house',homePoint[0],.2,homePoint[1]+.85);label('Barn',4.5,.2,-3.75);label('Orchard',-12,.2,6);
  buildFarmExpansion({root,box,ball,cylinder,mesh,mat,beam,path,enclosure,field,tree,animal,house,shelter,hay,barrel,trough,flower,lantern});
  root.updateMatrixWorld(true);
  const batches=new Map();const originals=[];
  root.traverse(object=>{if(!object.isMesh||object.material.transparent)return;let parent=object;while(parent&&parent!==root){if(parent.userData.dynamic)return;parent=parent.parent;}const key=object.geometry.uuid+object.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(object);});
  for(const objects of batches.values()){if(objects.length<8)continue;const instanced=new THREE.InstancedMesh(objects[0].geometry,objects[0].material,objects.length);objects.forEach((o,i)=>{instanced.setMatrixAt(i,o.matrixWorld);originals.push(o);});instanced.castShadow=true;instanced.receiveShadow=true;scene.add(instanced);}
  originals.forEach(o=>o.parent.remove(o));
  return {trees,crops,leaves,animals,windows};
}
