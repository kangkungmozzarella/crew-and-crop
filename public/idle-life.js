const routes = {
  Dale: [{x:470,y:260,label:'Taking a coffee break'},{x:540,y:350,label:'Watching the crops grow'},{x:585,y:455,label:'Stretching by the farm path'}],
  Rosie: [{x:390,y:320,label:'Checking the garden border'},{x:530,y:380,label:'Looking around the yard'},{x:585,y:455,label:'Taking a little breather'}],
  Hank: [{x:230,y:430,label:'Checking the orchard'},{x:480,y:275,label:'Resting near the house'},{x:550,y:390,label:'Inspecting the farm path'}]
};

export function idleDestination(agent, time) {
  const stops=routes[agent.name] || routes.Dale;
  agent.idleIndex ??= 0;
  if(agent.idleUntil !== undefined && time >= agent.idleUntil){agent.idleIndex=(agent.idleIndex+1)%stops.length;delete agent.idleUntil;}
  return stops[agent.idleIndex % stops.length];
}
