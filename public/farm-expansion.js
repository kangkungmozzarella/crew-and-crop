import * as THREE from 'three';

export function buildFarmExpansion(h) {
  const {root,box,ball,cylinder,mesh,mat,beam,path,enclosure,field,tree,animal,house,shelter,hay,barrel,trough,flower,lantern}=h;
  let seed=412;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  function grainField(x,z,w,d,gold=true){field(x,z,w,d);const count=Math.round(w*d*12),stemGeometry=new THREE.CylinderGeometry(.018,.025,.85,4),earGeometry=new THREE.SphereGeometry(.065,5,4);
    const stems=new THREE.InstancedMesh(stemGeometry,mat(gold?'#bd9f3c':'#789744'),count),ears=new THREE.InstancedMesh(earGeometry,mat('#e5bc47'),count*3),dummy=new THREE.Object3D();
    for(let i=0;i<count;i++){const px=x+(random()-.5)*(w-.5),pz=z+(random()-.5)*(d-.5),height=.7+random()*.35;dummy.position.set(px,.28+height/2,pz);dummy.rotation.set(0,0,(random()-.5)*.12);dummy.scale.set(1,height/.85,1);dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);for(let k=0;k<3;k++){dummy.position.set(px,.28+height+k*.08,pz);dummy.rotation.set(0,0,0);dummy.scale.set(.8,1.6,.8);dummy.updateMatrix();ears.setMatrixAt(i*3+k,dummy.matrix);}}
    root.add(stems);if(gold)root.add(ears);
  }
  function garden(x,z,w,d,type){field(x,z,w,d);const cols=Math.floor(w/.65),rows=Math.floor(d/.7);for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const px=x-w/2+.4+col*.65,pz=z-d/2+.4+row*.7;if(type==='cabbage'){ball(.22,'#749940',px,.42,pz,root);for(let i=0;i<4;i++){const a=i*Math.PI/2;ball(.16,'#a4bd68',px+Math.cos(a)*.14,.36,pz+Math.sin(a)*.14,root,1,.4,1);}}
      else if(type==='pumpkin'){ball(.25,'#d99138',px,.4,pz,root,1,.8,1);cylinder(.025,.025,.12,'#728b3a',px,.64,pz,root);ball(.15,'#779647',px+.22,.33,pz,root,1.4,.3,1);}
      else{cylinder(.02,.02,.52,'#618834',px,.53,pz,root);for(let i=0;i<3;i++){ball(.13,'#759c43',px+Math.cos(i*2)*.13,.59,pz+Math.sin(i*2)*.13,root,1.5,.3,.8);ball(.09,'#cf5731',px+Math.cos(i*2)*.13,.5,pz+Math.sin(i*2)*.13,root);}}}}
  function crate(x,z,fruit=false){box(.75,.5,.65,'#bb8c4e',x,.45,z,root);for(const y of [.28,.47,.66])for(const side of [-1,1])box(.78,.035,.035,'#8c693c',x,y,z+side*.335,root);if(fruit)for(let i=0;i<8;i++)ball(.095,'#c75330',x-.24+(i%3)*.2,.72,z-.19+Math.floor(i/3)*.18,root);}
  function pine(x,z,scale=1){cylinder(.11,.19,1.5*scale,'#82603d',x,.8*scale,z,root);for(let i=0;i<3;i++){const crown=mesh(new THREE.ConeGeometry((1.05-i*.23)*scale,(1.45-i*.1)*scale,7),i%2?'#61833d':'#4c723e',root);crown.position.set(x,(1.4+i*.66)*scale,z);}}
  function waterShape(points){const shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const m=mesh(new THREE.ShapeGeometry(shape),'#63b2c4',root);m.rotation.x=-Math.PI/2;m.position.y=.27;m.castShadow=false;return m;}
  function lake(x,z,rx,rz){const border=Array.from({length:20},(_,i)=>{const a=i/20*Math.PI*2,r=1+(i%3)*.03;return[x+Math.cos(a)*rx*r,z+Math.sin(a)*rz*r];});waterShape(border);border.forEach(([px,pz],i)=>ball(.32+i%3*.1,i%2?'#b5ae94':'#cec3a1',px,.34,pz,root,1.3,.7,1));for(let i=0;i<9;i++){const px=x+(random()-.5)*rx,pz=z+(random()-.5)*rz;const pad=cylinder(.22,.22,.03,'#90ad5a',px,.31,pz,root);pad.scale.z=.8;ball(.06,'#fff0cf',px,.36,pz,root,1,.7,1);}for(let i=0;i<10;i++){const a=i/10*Math.PI*2,px=x+Math.cos(a)*(rx+.2),pz=z+Math.sin(a)*(rz+.2);for(let n=0;n<3;n++)cylinder(.024,.024,.7+n*.1,'#6d9340',px+n*.08,.55,pz,root);cylinder(.055,.055,.2,'#8f6838',px,.96,pz,root);}}
  function bridge(x,z,length=3.5){for(let i=0;i<Math.ceil(length/.28);i++)box(.28,.11,1.45,'#b88c54',x+i*.28,.52,z,root);for(const zz of [z-.8,z+.8]){for(let i=0;i<3;i++)box(.14,1.2,.14,'#916b3b',x+i*length/2,.6,zz,root);beam([x,1.06,zz],[x+length,1.06,zz],.1,'#c09a65');}}
  function silo(x,z){cylinder(1.05,1.08,4.8,'#ad5139',x,2.6,z,root);for(const y of [.5,1.6,2.8,4,4.9])cylinder(1.09,1.09,.06,'#dabd90',x,y,z,root);const dome=mesh(new THREE.SphereGeometry(1.08,12,8,0,Math.PI*2,0,Math.PI/2),'#e3d7ba',root);dome.position.set(x,5,z);for(const xx of [x-.25,x+.25])box(.04,4.5,.04,'#d9c6a2',xx,2.6,z+1.1,root);for(let i=0;i<14;i++)box(.52,.035,.04,'#d9c6a2',x,.5+i*.3,z+1.12,root);}
  function greenhouse(x,z){const g=new THREE.Group();g.position.set(x,.15,z);root.add(g);box(4,.14,3,'#baac87',0,.05,0,g);const glass=new THREE.MeshPhysicalMaterial({color:'#b9d8c7',transparent:true,opacity:.2,roughness:.15,depthWrite:false});const walls=new THREE.Mesh(new THREE.BoxGeometry(3.8,1.8,2.8),glass);walls.position.y=1;g.add(walls);
    for(const xx of [-1.9,-.95,0,.95,1.9])for(const zz of [-1.4,1.4]){box(.055,1.95,.055,'#806441',xx,1,zz,g);beam([xx,1.95,-1.4],[xx,2.95,0],.055,'#806441',g);beam([xx,2.95,0],[xx,1.95,1.4],.055,'#806441',g);}for(const yy of [.3,1.15,1.95]){box(3.9,.055,.055,'#806441',0,yy,-1.4,g);box(3.9,.055,.055,'#806441',0,yy,1.4,g);}box(3.9,.055,.055,'#806441',0,2.95,0,g);
    for(const side of [-1,1]){const roof=new THREE.Mesh(new THREE.PlaneGeometry(3.8,1.72),glass);roof.position.set(0,2.43,side*.7);roof.rotation.x=side<0?Math.PI*.3:-Math.PI*.3;g.add(roof);}for(let row=0;row<2;row++)for(let i=0;i<5;i++){box(.4,.28,.45,'#ad8151',-1.5+i*.7,.27,-.65+row*1.3,g);ball(.23,'#739b46',-1.5+i*.7,.6,-.65+row*1.3,g);}}
  function windmill(x,z){for(const side of [-1,1])for(const back of [-1,1])beam([x+side*.85,.2,z+back*.65],[x+side*.25,4.4,z+back*.2],.15,'#aa8149');for(let i=0;i<4;i++)box(1.7-i*.3,.08,1.3-i*.2,'#9e7944',x,.7+i*.85,z,root);const wheel=new THREE.Group();wheel.position.set(x,4.3,z+.45);root.add(wheel);cylinder(.17,.17,.2,'#80603a',0,0,0,wheel).rotation.x=Math.PI/2;for(let i=0;i<8;i++){const blade=new THREE.Group();blade.rotation.z=i*Math.PI/4;wheel.add(blade);box(.06,1.5,.05,'#906e42',0,.7,0,blade);box(.33,.63,.055,'#dcc38f',.09,1.18,0,blade);}}
  function tractor(x,z){const g=new THREE.Group();g.position.set(x,.3,z);g.rotation.y=-.35;root.add(g);box(.85,.62,1.7,'#b34f36',0,.85,.25,g);box(.9,.1,.75,'#e3d8b8',0,1.8,-.55,g);for(const xx of [-.38,.38])box(.045,.65,.045,'#6c6550',xx,1.45,-.6,g);box(.62,.42,.07,'#514b3c',0,1.4,-.96,g);cylinder(.045,.045,.8,'#5c5c4a',.25,1.52,.78,g);for(const xx of [-.65,.65])for(const [zz,r] of [[-.55,.5],[.85,.31]]){const wheel=cylinder(r,r,.24,'#3f4438',xx,r,zz,g);wheel.rotation.z=Math.PI/2;const hub=cylinder(r*.45,r*.45,.255,'#e0cbaa',xx,r,zz,g);hub.rotation.z=Math.PI/2;}box(.75,.08,.06,'#e9d9af',0,.92,1.13,g);}
  function picnic(x,z){box(1.8,.1,.85,'#ad8249',x,.9,z,root);for(const xx of [-.55,.55])box(.1,.75,.65,'#916c3e',x+xx,.48,z,root);for(const zz of [-.75,.75]){box(1.85,.1,.28,'#b48c56',x,.55,z+zz,root);for(const xx of [-.6,.6])box(.08,.44,.18,'#916c3e',x+xx,.28,z+zz,root);}}

  path([[-29,10],[-26,10],[-21,10],[-16,9],[-12,8]],2);
  path([[-20,-18],[-20,-9],[-18,-2],[-13,-1]],1.9);
  path([[-25,-8],[-14,-8],[-7,-12],[1,-12],[10,-12],[20,-12],[27,-8]],2);
  path([[12,-2],[17,-2],[21,-2],[28,-2]],1.9);
  path([[4,9],[3,14],[2,18],[8,18],[18,18],[26,16]],2.1);
  path([[1,-1],[1,-9],[1,-12],[1,-17]],1.8);
  path([[-26,10],[-25,16],[-16,18],[-5,18],[2,18]],1.65);
  path([[20,-12],[20,-6],[19,2],[18,10],[18,18]],1.75);

  grainField(-23,4,8.5,7.6);grainField(-23,-4.4,8.5,6.2,false);
  garden(-15,14.5,6.3,4.1,'pumpkin');garden(-22,14.5,5.3,4.1,'cabbage');garden(-8.2,14.5,5.7,4.1,'tomato');
  for(let i=0;i<2;i++)for(let j=0;j<3;j++)hay(-27+i*.8,8.7+j*.6);
  enclosure(-22,-14.5,12.5,7.4,'#be955f');for(let row=0;row<3;row++)for(let col=0;col<5;col++)tree(-27+col*2.4,-17+row*2.5,true);
  for(let i=0;i<5;i++){crate(-27+i*.95,-10.1,true);flower(-27+i*.95,-9.4);}
  greenhouse(-11,-14.8);greenhouse(-16,-19);garden(-11,-19,5,2.5,'tomato');

  house(-3.6,-16.7);house(5.2,-16.9);silo(10.8,-17.3);silo(13.6,-17.3);
  for(let i=0;i<4;i++){picnic(-4+i*2.9,-11);lantern(-5+i*3,-12.2);}
  for(let i=0;i<6;i++){crate(7.7+(i%3)*.9,-13.5+Math.floor(i/3)*.85);barrel(5.6+i*.7,-13.1);}
  shelter(21.8,-16,6,4);tractor(21.4,-15.7);tractor(24,-15.2);for(let i=0;i<9;i++)hay(18+(i%3)*.85,-18.5+Math.floor(i/3)*.65);
  windmill(16.8,-17.2);

  enclosure(25,-5.6,8.2,6.3,'#eee1b6');shelter(25,-7.4,5,2.2);trough(24.8,-3.4,2.5);
  for(let i=0;i<6;i++)animal('cow',22.4+(i%3)*2.1,-6+Math.floor(i/3)*1.7,i*.5,true);
  enclosure(25,3.6,8.2,7.2,'#c5a06c');shelter(25,1.1,5,1.8);trough(23,5.9,2.1);
  for(let i=0;i<9;i++)animal('sheep',22.3+(i%3)*2.1,2.8+Math.floor(i/3)*1.25,i,true);
  enclosure(24.7,11.8,7.2,5.2,'#ede0b4');shelter(25,10.4,3.6,1.8);
  for(let i=0;i<10;i++)animal('chicken',22.2+i%4*1.2,11.3+Math.floor(i/4)*.95,i,true);
  for(const x of [20.4,28.7])for(const z of [-8,0,8,15]){tree(x,z,true);lantern(x-.7,z+.8);}

  lake(10.5,17.4,5.3,3.5);
  waterShape([[8,15],[5.2,13.5],[5.7,10.5],[6.8,9],[8.7,9.5],[7.6,12],[7.5,13.3],[10,15.2]]);
  bridge(5.1,12.2,3.7);
  for(let i=0;i<7;i++)animal('duck',7.7+(i%4)*1.4,16.6+Math.floor(i/4)*1.2,i,true);
  for(let i=0;i<10;i++)box(.28,.12,2.5,'#b78d57',14.6+i*.28,.52,17.6,root);
  for(const x of [14.6,17.1])for(const z of [16.4,18.9])box(.16,.85,.16,'#927346',x,.4,z,root);
  picnic(15,21.5);picnic(19.3,21);barrel(17.5,20.5);

  enclosure(-14.5,20.5,14,3.2,'#c69e68');for(let row=0;row<3;row++)for(let col=0;col<24;col++)flower(-20.9+col*.54,19.5+row*.7,col%4===0);
  for(let i=0;i<35;i++){const a=i/35*Math.PI*2,x=Math.cos(a)*(28.6+(i%3)*.4),z=Math.sin(a)*21.5;if(i%3===0)pine(x,z,.75+random()*.4);else tree(x,z,i%2===0);}
  for(let i=0;i<190;i++){const x=(random()-.5)*58,z=(random()-.5)*42;if(Math.abs(x)>29||Math.abs(z)>21){ball(.14,'#719a3e',x,.3,z,root,1.3,.65,1);flower(x+.15,z+.13);}}
  for(const [x,z] of [[-29,10],[-20,-9],[-14,9],[-3,18],[2,-12],[19,-2],[18,17],[27,16]]){lantern(x,z);barrel(x+.55,z+.4);}
}
