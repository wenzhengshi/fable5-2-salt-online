'use strict';
const precision=.002;
const fixed=1/90;

// Recreate the player's submitted step. Dynamic traffic can shorten movement or
// slow the player between steps, while the track, gears and boosts stay fixed.
function checkStep(P,car,input) {
  const [previousSpeed,x,z,speed,heading]=input.trace;
  if(Math.abs(previousSpeed)>Math.abs(car.speed)+precision||
      previousSpeed*car.speed<0)return false;
  const predicted={...car,speed:previousSpeed};
  if(input.ignition&&!input.wasIgnition){predicted.stalled=false;predicted.lugTime=0;}
  P.selectGear(predicted,input.gear);
  P.drive(predicted,input.ignition&&input.throttle&&!predicted.stalled?1:0,input.steer,input.brake,fixed,[]);
  const angleError=Math.abs(Math.atan2(Math.sin(heading-predicted.heading),Math.cos(heading-predicted.heading)));
  if(Math.hypot(x-predicted.x,z-predicted.z)>precision||
      Math.abs(speed-predicted.speed)>precision||angleError>precision){
    if(speed!==0)return false;
    const dx=predicted.x-car.x,dz=predicted.z-car.z,run=Math.hypot(dx,dz);
    const mx=x-car.x,mz=z-car.z,moved=Math.hypot(mx,mz);
    if(moved>run+precision||angleError>.025||
        (run>precision&&(mx*dx+mz*dz<-.0001||Math.abs(mx*dz-mz*dx)>run*.014))||
        (moved>precision&&P.obstruction(car,{...car,x,z,heading},[])))return false;
    predicted.wheelAngle=car.wheelAngle+Math.sign(predicted.speed||previousSpeed)*moved/.345;
  }
  Object.assign(car,predicted,{x,z,speed,heading});
  return true;
}
module.exports={checkStep};
