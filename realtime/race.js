'use strict';
const {randomUUID}=require('node:crypto');
const {WebSocketServer,WebSocket}=require('ws');
const signs=require('../services/roadSigns');
const transfers=require('../services/vehicleTransfer');
const sedanRules=require('../public/js/sedan-rules');
const race=require('../services/race');
const raceNames=require('../services/raceNames');
const multiplayer=require('./multiplayer');
const {checkStep}=require('./race-trace');
const outfits=require('../public/js/soldier-outfits');
const airspace=require('../public/race/airspace');
const weaponRules=require('../public/js/frontier-rules');
const storage=require('../config/storage');
const sessions=new Map(), rooms=new Set(), plaza=new Set();
const plazaViewRange=310;
const destinations=['port','qingyun','bayhaven','mothlight','dustfall','lunar'];
let nextPlazaAt=0, nextRosterAt=0, nextPingAt=0, nextPlazaSlot=0, nextPresenceAt=0;
const fixed=1/90, reconnectMs=90000;
const grid=[0,-5.25,-10.5].flatMap(z=>[-2.5,2.5,-7.5,7.5].map(x=>({x,z})));
const emptyInput={steer:0,gear:1,throttle:false,brake:true,ignition:false,active:false};
let serverRef,wss,upgrade,timer,last=0,accumulator=0,steps=0;

function send(driver,message) {
  if(driver.socket?.readyState!==WebSocket.OPEN||driver.socket.bufferedAmount>75000)return;
  driver.socket.send(typeof message==='string'?message:JSON.stringify(message));
}
function broadcast(message) {
  for(const driver of sessions.values())send(driver,message);
}
function locate(P) {
  for(const room of rooms) {
    if(room.drivers.size>=grid.length||[...room.drivers].every(driver=>driver.done))continue;
    const spot=grid.find(({x,z})=>[...room.drivers].every(({car,done})=>
      done||Math.abs(car.x-x)>3||Math.abs(car.z-z)>5.15));
    if(spot)return {room,spot};
  }
  const room={drivers:new Set(),podium:[],finishedCount:0,traffic:P.createTraffic()};
  rooms.add(room);
  return {room,spot:grid[0]};
}
function admit(owner,entry,key,socket,mode,unit) {
  let driver=sessions.get(entry.id);
  if(driver) {
    if(driver.socket?.readyState===WebSocket.OPEN)driver.socket.close(4001,'Race connected elsewhere');
    driver.socket=socket;
    driver.disconnectAt=0;
    driver.lastInput=0;
    return driver;
  }
  const P=race.rules(), {room,spot}=locate(P);
  driver={id:entry.id,key,owner,publicId:race.publicId(owner),name:raceNames.nameOfOwner(owner)||'',entry,
    room,car:{...P.start,...spot},traceCar:{...P.start,...spot},socket,input:emptyInput,lastInput:0,
    unit,buffered:mode!=='0',traced:mode==='2',inputs:[],accepted:0,disconnectAt:0,ticks:0,ignitionRequested:false,lastHit:0,lastCollision:0};
  room.drivers.add(driver);
  sessions.set(driver.id,driver);
  return driver;
}
function remove(driver) {
  sessions.delete(driver.id);
  driver.room.drivers.delete(driver);
  if(!driver.room.drivers.size)rooms.delete(driver.room);
  driver.socket?.close();
}
function body(car,id) {
  return {x:car.x,z:car.z,heading:car.heading,w:2.28,d:4.86,kind:'player',id};
}
function submit(driver,now) {
  const room=driver.room;
  const finishPlace=room.finishedCount+1;
  const podium=[...room.podium,{id:driver.publicId,name:driver.name,unit:driver.unit,ms:Math.round(driver.ticks*1000/90)}].slice(0,3);
  const participants=[...room.drivers].map(peer=>({
    id:peer.publicId,
    name:peer.name,
    ms:peer.finishAt?Math.round(peer.ticks*1000/90):0,
    rank:podium.findIndex(row=>row.id===peer.publicId)+1||0
  }));
  const result=race.finishLive(driver.owner,driver.id,driver.key,driver.ticks,driver.finishAt,driver.buffered,{finishPlace,podium,participants});
  if(!result.error){
    room.finishedCount=finishPlace;
    room.podium=podium;
    for(const peer of room.drivers)if(peer!==driver)send(peer,{type:'podium',rows:podium});
  }
  driver.result=result;
  driver.done=true;
  if(!result.error)multiplayer.refreshRaceWallets();
  if(result.bossSpawned?.active)broadcast({type:'boss',boss:result.bossSpawned});
  send(driver,{type:'finish',result});
  driver.removeAt=now+120000;
}
function stepDriver(P,room,driver,active,input,now) {
  const {car}=driver;
  const canTrace=driver.traced&&!driver.traceFailed;
  if(canTrace){
    input.wasIgnition=driver.ignitionRequested;
    if(!checkStep(P,driver.traceCar,input)){
      driver.traceFailed=true;
      send(driver,{type:'traceRejected'});
    }
  }
  if(input.ignition&&!driver.ignitionRequested){car.stalled=false;car.lugTime=0;}
  driver.ignitionRequested=input.ignition;
  if(input.active)P.selectGear(car,input.gear);
  const obstacles=room.traffic.filter(npc=>Math.abs(npc.z-car.z)<16);
  for(const peer of active){
    if(peer!==driver&&!peer.done&&Math.abs(peer.car.z-car.z)<16)obstacles.push(body(peer.car,peer.id));
  }
  for(const visitor of plaza){
    if(visitor.car&&!visitor.landingAt&&Math.abs(visitor.car.z-car.z)<16)obstacles.push(body(visitor.car,visitor.id));
  }
  const speedBefore=Math.abs(car.speed);
  const throttle=input.active&&input.ignition&&input.throttle&&!car.stalled?1:0;
  const hit=P.drive(car,throttle,input.steer,!!input.brake,fixed,obstacles);
  driver.ticks++;
  if(hit&&speedBefore>1&&now-driver.lastHit>=280) {
    driver.lastHit=now;
    if(!driver.buffered)send(driver,{type:'hit',kind:hit,speed:speedBefore});
    if(hit==='player'){
      const peer=sessions.get(car.contactPeer);
      if(peer&&!peer.done&&now-peer.lastCollision>300){
        peer.lastCollision=now;
        if(!peer.traced||peer.traceFailed)peer.car.speed*=.45;
        send(peer,{type:'hit',kind:'player',speed:speedBefore,received:true});
      }
    }
  }
  delete car.contactPeer;
  if(canTrace&&!driver.traceFailed)Object.assign(car,driver.traceCar);
  if(car.z>=P.length){
    car.speed=0;
    driver.finishAt=now;
    driver.settleAt=now;
  }
}
function stepRoom(P,room,now) {
  const active=[...room.drivers].filter(d=>!d.done&&!d.finishAt);
  if(!active.length)return;
  for(const driver of active) {
    if(!driver.buffered){
      stepDriver(P,room,driver,active,now-driver.lastInput<600?driver.input:emptyInput,now);
      continue;
    }
    // Cumulative limits let delayed packets catch up without processing more simulation than the race clock.
    const allowed=Math.floor((now-driver.entry.startAt)*90/1000)+9;
    const count=Math.min(driver.arrivalTick?12:4,driver.inputs.length,Math.max(0,allowed-driver.ticks));
    for(let i=0;i<count&&!driver.finishAt;i++)stepDriver(P,room,driver,active,driver.inputs.shift(),now);
  }
  P.advanceTraffic(room.traffic,active.filter(driver=>!driver.done).map(driver=>driver.car),fixed);
}
function queue(driver,message) {
  const {from,frames}=message||{};
  if(!Number.isSafeInteger(from)||from<0||from>driver.accepted||!Array.isArray(frames)||frames.length>90)return;
  const skip=driver.accepted-from;
  if(frames.length<=skip||driver.inputs.length+frames.length-skip>420)return;
  const commands=[];
  for(let i=skip;i<frames.length;i++){
    const [gear,steer,flags]=Array.isArray(frames[i])?frames[i]:[];
    const trace=driver.traced&&Array.isArray(frames[i])?frames[i].slice(3):[];
    if(driver.traced&&(trace.length!==5||!trace.every(Number.isFinite)))return;
    if(!Number.isInteger(gear)||gear<-1||gear>5||!Number.isInteger(steer)||Math.abs(steer)>100||
        !Number.isInteger(flags)||flags<0||flags>7)return;
    commands.push({gear,steer:steer/100,throttle:!!(flags&1),brake:!!(flags&2),ignition:!!(flags&4),active:true,trace});
  }
  driver.inputs.push(...commands);
  driver.accepted+=commands.length;
  if(Number.isSafeInteger(message.arrival)&&message.arrival<=driver.accepted&&message.arrival>driver.ticks)driver.arrivalTick=message.arrival;
}
function pose(driver) {
  const {car}=driver;
  return {id:driver.publicId,name:driver.name,x:car.x,z:car.z,heading:car.heading,gear:car.gear,
    speed:car.speed,steering:car.steering,wheelAngle:car.wheelAngle,stalled:car.stalled};
}
function freeVehiclePose(visitor) {
  return {...pose({car:visitor.car,publicId:visitor.id,name:visitor.name}),free:true,
    y:visitor.car.y, driving:visitor.driving, airborne:!!visitor.landingAt};
}
function sendVehicle(visitor) {
  send(visitor,{type:'freeVehicle',car:freeVehiclePose(visitor)});
}
function handleVehicle(visitor,message,now) {
  const {car}=visitor;
  if(message.type==='vehicleBoard'){
    if(!visitor.driving&&visitor.pose&&sedanRules.near(car,visitor.pose)){
      visitor.driving=true;
      sendVehicle(visitor);
    }
  }else if(message.type==='vehicleExit'){
    if(visitor.driving&&!visitor.landingAt&&Math.abs(car.speed)<2){
      visitor.driving=false;
      visitor.input=null;
      car.speed=0;
      const exit=sedanRules.point(car,car.x>8?2.35:-2.35,0,0);
      visitor.pose={id:visitor.id,name:visitor.name,unit:visitor.unit,outfit:visitor.outfit,
        x:sedanRules.clamp(exit.x,-10,10),y:0,z:sedanRules.clamp(exit.z,0,race.rules().length+18),
        heading:car.heading,pitch:0,shot:visitor.shot,weapon:'pac9'};
      sendVehicle(visitor);
    }
  }else if(message.type==='vehicleTravel'){
    if(!visitor.driving||visitor.landingAt||visitor.transferring)return;
    const index=destinations.indexOf(message.map);
    if(index<0)return;
    const x=(index-2.5)*2.85, z=race.rules().length+17.5;
    const bumper=sedanRules.point(car,0,0,car.speed<-.3?-2.45:2.45);
    if(Math.min(Math.hypot(x-car.x,z-car.z),Math.hypot(x-bumper.x,z-bumper.z))>1.85)return;
    const transfer=transfers.issue(visitor.owner,message.map,car.heading,now);
    if(!transfer)return;
    visitor.transferring=transfer;
    car.speed=0;
    send(visitor,{type:'vehicleTravel',map:message.map,transfer});
  }else if(message.type==='vehicleCancelTravel'){
    if(visitor.transferring===message.transfer&&transfers.cancel(visitor.owner,message.transfer)){
      visitor.transferring=false;
      sendVehicle(visitor);
    }
  }else if(message.type==='vehicleInput'&&visitor.driving){
    const {steer,gear}=message;
    if(now-visitor.lastDriveInput<40||!Number.isFinite(steer)||Math.abs(steer)>1||!Number.isInteger(gear)||gear< -1||gear>5)return;
    visitor.input={steer,gear,throttle:message.throttle===true,brake:message.brake===true};
    visitor.lastDriveInput=now;
  }
}
function stepFreeVehicles(P,now) {
  for(const visitor of plaza){
    if(!visitor.driving||visitor.transferring)continue;
    const {car}=visitor;
    if(visitor.landingAt){
      const progress=Math.min(1,Math.max(0,1-(visitor.landingAt-now)/2100));
      car.y=32*(1-progress**2);
      if(progress===1)visitor.landingAt=0;
      continue;
    }
    const input=now-visitor.lastDriveInput<400?visitor.input:null;
    if(input&&(Math.abs(car.speed)<1||Math.sign(car.gear)===Math.sign(input.gear)))car.gear=input.gear;
    const obstacles=[];
    for(const driver of sessions.values()){
      if(!driver.done&&!driver.finishAt&&Math.abs(driver.car.z-car.z)<16)obstacles.push(body(driver.car,driver.id));
    }
    for(const peer of plaza){
      if(peer!==visitor&&peer.car&&!peer.landingAt&&Math.abs(peer.car.z-car.z)<16)obstacles.push(body(peer.car,peer.id));
    }
    if(!input&&Math.abs(car.speed)<.001)continue;
    const speed=Math.abs(car.speed);
    const hit=P.drive(car,input?.throttle?1:0,input?.steer||0,!input||input.brake,fixed,obstacles);
    if(hit==='player'&&speed>1&&now-(visitor.lastHit||0)>300){
      const driver=sessions.get(car.contactPeer);
      if(driver&&!driver.done){
        if(!driver.traced||driver.traceFailed)driver.car.speed*=.45;
        send(driver,{type:'hit',kind:'player',speed,received:true});
      }
      visitor.lastHit=now;
    }
    delete car.contactPeer;
  }
}
function joinPlaza(owner,url,ws) {
  const kind=url.searchParams.get('unit');
  const units=['male','female','hound','drone','classic'];
  let unit=units.includes(kind)?kind:'male';
  const visitor={id:randomUUID(),name:raceNames.nameOfOwner(owner)||race.publicId(owner),
    owner,unit,outfit:outfits.normalize(url.searchParams.get('outfit')),socket:ws,lastInput:0,lastDriveInput:0,lastVehicleAction:0,lastShotAt:0,shotToken:0,shot:0,alive:true};
  const slot=nextPlazaSlot++ % 15;
  const P=race.rules(), length=P.length;
  const transferred=transfers.take(owner,'race',url.searchParams.get('vehicle'));
  visitor.car={...P.start,free:true,gear:1,x:(slot%5-2)*4.3,z:length-1-Math.floor(slot/5)*6,
    heading:Math.PI,y:transferred?32:0};
  visitor.driving=!!transferred;
  visitor.landingAt=transferred?Date.now()+2100:0;
  const inventory=weaponRules.normalize(storage.readJson('frontier-inventory.json')?.[owner]);
  plaza.add(visitor);
  nextRosterAt=0;
  send(visitor,{type:'plazaJoined',id:visitor.id,inventory,spawn:{x:(slot%5-2)*2.2,z:length+4+Math.floor(slot/5)*2}});
  sendVehicle(visitor);
  ws.on('pong',()=>{visitor.alive=true;});
  ws.on('message',data=>{
    const now=Date.now();
    let pose;
    try{pose=JSON.parse(data);}catch{return;}
    if(pose?.type){
      if(pose.type==='vehicleTravel'){
        if(now-visitor.lastVehicleAction<100)return;
        visitor.lastVehicleAction=now;
      }
      handleVehicle(visitor,pose,now);
      return;
    }
    if(visitor.driving||now-visitor.lastInput<45||!pose||![pose.x,pose.y,pose.z,pose.heading].every(Number.isFinite))return;
    visitor.lastInput=now;
    const {x,y,z,heading}=pose;
    const nextUnit=units.includes(pose.unit)?pose.unit:unit;
    const maxY=nextUnit==='drone'?airspace.maxAltitude:2.6;
    if(Math.abs(x)>airspace.halfWidth+.01||y<0||y>maxY||z<0||z>length+19.11||Math.abs(heading)>Math.PI*2)return;
    if(Number.isSafeInteger(pose.shot)&&pose.shot>visitor.shotToken){
      visitor.shotToken=pose.shot;
      if(now-visitor.lastShotAt>=100){
        visitor.lastShotAt=now;
        visitor.shot++;
      }
    }
    unit=nextUnit;
    const weapon=weaponRules.canEquip(inventory,pose.weapon,'race')?pose.weapon:'pac9';
    const pitch=Number.isFinite(pose.pitch)?Math.max(-1.5,Math.min(1.5,pose.pitch)):0;
    visitor.pose={id:visitor.id,name:visitor.name,unit,outfit:visitor.outfit,x,y,z,heading,pitch,weapon,shot:visitor.shot,
      moving:pose.moving===true,sprinting:pose.sprinting===true,airborne:pose.airborne===true};
  });
  ws.on('close',()=>{
    plaza.delete(visitor);
    if(!plaza.size)nextPlazaSlot=0;
  });
}
function plazaWalkers(){
  return [...plaza].flatMap(visitor=>!visitor.driving&&visitor.pose&&visitor.socket.readyState===WebSocket.OPEN?[visitor.pose]:[]);
}
function updatePlaza(now) {
  if(!plaza.size||now<nextPlazaAt)return;
  nextPlazaAt=now+100;
  if(now>=nextPingAt){
    nextPingAt=now+15000;
    for(const visitor of plaza){
      if(!visitor.alive){visitor.socket.terminate();continue;}
      visitor.alive=false;
      if(visitor.socket.readyState===WebSocket.OPEN)visitor.socket.ping();
    }
  }
  const length=race.rules().length;
  const challengers=[...sessions.values()].filter(driver=>!driver.done&&!driver.finishAt&&driver.socket?.readyState===WebSocket.OPEN);
  const cars=challengers.map(pose).concat([...plaza].map(freeVehiclePose));
  const walkers=plazaWalkers();
  const roster=now>=nextRosterAt?challengers.map(driver=>({id:driver.publicId,name:driver.name,
    remaining:Math.ceil(length-driver.car.z)})).sort((a,b)=>a.remaining-b.remaining):undefined;
  if(roster)nextRosterAt=now+1000;
  for(const visitor of plaza){
    const center=visitor.driving?visitor.car.z:visitor.pose?.z??length;
    sendVehicle(visitor);
    const nearby=entry=>Math.abs(entry.z-center)<plazaViewRange;
    send(visitor,{type:'plazaState',walkers:walkers.filter(nearby),cars:cars.filter(nearby),
      visitorCount:plaza.size,challengerCount:challengers.length,challengers:roster});
  }
}
function sendPresence(now) {
  if(now<nextPresenceAt||!sessions.size&&!plaza.size)return;
  nextPresenceAt=now+1000;
  const drivers=[...sessions.values()].filter(driver=>!driver.done&&!driver.finishAt&&driver.socket?.readyState===WebSocket.OPEN);
  const visitors=[...plaza].filter(visitor=>visitor.socket.readyState===WebSocket.OPEN);
  if(!drivers.length&&!visitors.length)return;
  const roster=new Map();
  for(const {owner,id,name,status,map} of multiplayer.getBattlePresence()){
    roster.set(owner||id,{id,name,status,map});
  }
  for(const driver of drivers){
    roster.set(driver.owner,{id:driver.publicId,name:driver.name,status:'racing',map:'race'});
  }
  for(const visitor of visitors){
    const id=race.publicId(visitor.owner);
    roster.set(visitor.owner,{id,name:visitor.name,status:visitor.driving?'free':'plaza',map:'race'});
  }
  const rows=[...roster.values()];
  const message=JSON.stringify({type:'presence',online:rows.length,
    local:rows.filter(row=>row.map==='race').length,rows});
  for(const player of [...drivers,...visitors])send(player,message);
}
function tick() {
  const now=Date.now();
  accumulator+=Math.min(.08,(now-last)/1000);
  last=now;
  for(const driver of sessions.values()){
    if(!driver.done&&driver.finishAt&&now>=driver.settleAt){
      try{submit(driver,now);}catch(error){
        driver.settleAt=now+1000;
        console.error('[race live] settlement retry',error.message);
      }
    }
    if(driver.entry.expiresAt<=now||driver.removeAt&&driver.removeAt<=now||driver.disconnectAt&&driver.disconnectAt<=now){
      if(!driver.done&&driver.disconnectAt&&driver.disconnectAt<=now){
        try{race.abandon(driver.owner,driver.id,now);multiplayer.refreshRaceWallets();}catch(error){console.error('[race live] disconnect',error.message);}
      }
      remove(driver);
    }
  }
  updatePlaza(now);
  sendPresence(now);
  if(!sessions.size&&!plaza.size){accumulator=0;return;}
  const P=race.rules();
  while(accumulator>=fixed) {
    accumulator-=fixed;
    stepFreeVehicles(P,now);
    for(const room of rooms)stepRoom(P,room,now);
    if(++steps%6!==0)continue;
    const walkers=plaza.size?plazaWalkers():[];
    for(const room of rooms) {
      const active=[...room.drivers].filter(d=>!d.done);
      const freeCars=[...plaza].map(freeVehiclePose);
      for(const driver of active)send(driver,{type:'state',self:pose(driver),tick:driver.ticks,accepted:driver.accepted,count:active.length,
        peers:active.filter(peer=>peer!==driver&&Math.abs(peer.car.z-driver.car.z)<310).map(pose).concat(freeCars.filter(peer=>!peer.airborne&&Math.abs(peer.z-driver.car.z)<310)),
        walkers:walkers.filter(walker=>Math.abs(walker.z-driver.car.z)<plazaViewRange),
        traffic:room.traffic.filter(npc=>Math.abs(npc.z-driver.car.z)<345).map(({id,x,z,w,d,direction,wheelAngle,speed})=>({id,x,z,w,d,direction,wheelAngle,speed}))});
    }
  }
}
function attach(server) {
  if(wss)return;
  serverRef=server;
  wss=new WebSocketServer({noServer:true,maxPayload:16384,perMessageDeflate:false});
  upgrade=(req,socket,head)=>{
    const url=new URL(req.url,'http://saltline.invalid');
    if(url.pathname!=='/ws'||url.searchParams.get('race')!=='1')return;
    const owner=signs.ownerFromRequest(req);
    if(url.searchParams.get('plaza')==='1'){
      if(!owner){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
      raceNames.remember(owner,url.searchParams.get('name')||'');
      wss.handleUpgrade(req,socket,head,ws=>{
        ws.on('error',()=>{});
        joinPlaza(owner,url,ws);
      });
      return;
    }
    const id=url.searchParams.get('ticket'), key=url.searchParams.get('key');
    const entry=owner&&race.liveEntry(owner,id,key);
    if(!entry){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
    raceNames.remember(owner,url.searchParams.get('name')||'');
    wss.handleUpgrade(req,socket,head,ws=>{
      ws.on('error',()=>{});
      const unit=url.searchParams.get('unit');
      const driver=admit(owner,entry,key,ws,['1','2'].includes(url.searchParams.get('local'))?url.searchParams.get('local'):'0',
        ['male','female','hound','drone'].includes(unit)?unit:'classic');
      send(driver,{type:'joined',self:pose(driver),tick:driver.ticks,accepted:driver.accepted,podium:driver.room.podium});
      if(driver.result)send(driver,{type:'finish',result:driver.result});
      ws.on('message',data=>{
        if(driver.socket!==ws||driver.done)return;
        let m;
        try{m=JSON.parse(data);}catch{return;}
        if(driver.buffered){queue(driver,m);return;}
        if(!m||!Number.isInteger(m.gear)||m.gear< -1||m.gear>5||!Number.isFinite(m.steer)||Math.abs(m.steer)>1)return;
        driver.input={gear:m.gear,steer:m.steer,throttle:m.throttle===true,brake:m.brake===true,
          ignition:m.ignition===true,active:m.active===true};
        driver.lastInput=Date.now();
      });
      ws.on('close',()=>{
        if(driver.socket!==ws)return;
        driver.socket=null;
        driver.input=emptyInput;
        driver.disconnectAt=Date.now()+reconnectMs;
      });
    });
  };
  server.on('upgrade',upgrade);
  last=Date.now();
  timer=setInterval(tick,1000/60);
  timer.unref();
}
function close() {
  clearInterval(timer);
  if(upgrade)serverRef.removeListener('upgrade',upgrade);
  for(const driver of sessions.values())remove(driver);
  for(const visitor of plaza)visitor.socket.terminate();
  plaza.clear();
  nextPlazaAt=nextRosterAt=nextPingAt=nextPlazaSlot=nextPresenceAt=0;
  wss?.close();
  wss=null;
}
module.exports={attach,close,broadcastBoss(boss){broadcast({type:'boss',boss});},drop(owner,id){const driver=sessions.get(id);if(driver?.owner===owner)remove(driver);}};
