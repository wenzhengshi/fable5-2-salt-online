'use strict';
const {randomUUID}=require('node:crypto');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {Worker,isMainThread,parentPort,workerData}=require('node:worker_threads');
const storage=require('../config/storage');
const raceNames=require('./raceNames');
const raceBoss=require('./raceBoss');
const goldSupply=require('./goldSupply');
const file='frontier-inventory.json';
const fee=50000, tickRate=90, duration=30*60*1000, historyLimit=500;
let physics;

function rules() {
  if(physics)return physics;
  const html=readFileSync(path.join(__dirname,'../views/race.html'),'utf8');
  const scripts=Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/g),match=>match[1]);
  const engine=scripts.find(script=>script.includes('globalThis.TrackThree=lt;globalThis.PortContainers'));
  const course=scripts.find(script=>script.startsWith('const COURSE_LENGTH='));
  if(!engine||!course)throw Error('Race physics scripts missing');
  const context=vm.createContext({console,URL,Blob,performance,AbortController});
  context.window=context;
  for(const script of [engine,course])vm.runInContext(script,context);
  return physics=context.TrackPhysics;
}
const publicId=raceNames.publicId;
const order=(a,b)=>a.ticks-b.ticks||a.at-b.at||a.id.localeCompare(b.id);
const ranking=race=>Object.entries(race.records).sort((a,b)=>order(a[1],b[1]));
const leaderboard=race=>ranking(race).slice(0,3).map(([,row],index)=>({
  rank:index+1,id:row.id,name:raceNames.nameOfId(row.id)||'',ms:Math.round(row.ticks*1000/tickRate)
}));
const cleanId=value=>typeof value==='string'&&value.trim()?value.trim().slice(0,64):'';
const displayName=(id,name)=>{
  const clean=typeof name==='string'?name.trim().slice(0,16):'';
  return raceNames.nameOfId(cleanId(id))||clean||'';
};
const withNames=row=>row?{...row,name:displayName(row.id,row.name)}:row;
const hasPool=value=>Number.isSafeInteger(Number(value))&&Number(value)>0;
const refreshReceipt=(response,owner,race)=>{
  if(!response||typeof response!=='object')return response;
  const pool=hasPool(response.pot)?{}:{pot:race.pot,boss:raceBoss.publicState(race.boss)};
  return {...response,...pool,name:raceNames.nameOfOwner(owner)||response.name||'',
    ranking:Array.isArray(response.ranking)?response.ranking.map(withNames):response.ranking,
    podium:Array.isArray(response.podium)?response.podium.map(withNames):response.podium};
};
function recordHistory(race,entry) {
  if(!Array.isArray(race.history))race.history=[];
  if(race.history.some(row=>row.id===entry.id))return;
  race.history.push(entry);
  if(race.history.length>historyLimit)race.history.splice(0,race.history.length-historyLimit);
}
function exitHistory(owner,id,now,status,race,wallet) {
  const potBefore=race.pot;
  const championOwner=lost(race,wallet);
  const ownerId=publicId(owner);
  recordHistory(race,{
    id,at:now,status,ownerId,fee,potBefore,potAfter:race.pot,
    winning:false,reward:0,retainedReward:championOwner?fee/2:0,
    championId:championOwner?publicId(championOwner):'',
    winnerId:'',ms:0,finishPlace:0,
    participants:[{id:ownerId,name:raceNames.nameOfOwner(owner),ms:0,rank:0}]
  });
}
function collectParticipants(input,podium,selfId,selfName,ms,finishPlace) {
  const rows=[];
  const seen=new Set();
  const add=(value,time,rank,name)=>{
    const id=cleanId(value);
    if(!id||seen.has(id))return;
    seen.add(id);
    const place=podium.find(row=>row.id===id)?.rank||(Number(rank)>0?Math.floor(rank):0);
    const result=Number(time)>0?Math.round(Number(time)):0;
    rows.push({id,name:displayName(id,name),ms:result,rank:place});
  };
  if(Array.isArray(input)&&input.length)for(const row of input)add(row?.id,row?.ms,row?.rank,row?.name);
  else for(const row of podium)add(row.id,row.ms,row.rank,row.name);
  add(selfId,ms,finishPlace,selfName);
  const self=rows.find(row=>row.id===selfId);
  if(self){self.ms=self.ms||ms;self.rank=self.rank||finishPlace;}
  return rows;
}
function summarize(race,you) {
  const entries=Array.isArray(race?.history)?race.history:[];
  const buckets=new Map();
  const bucket=id=>{
    const key=cleanId(id);
    if(!key)return null;
    if(!buckets.has(key))buckets.set(key,{id:key,races:0,wins:0,winnings:0,bestMs:0,lastAt:0});
    return buckets.get(key);
  };
  let prizes=0;
  let finished=0;
  let bossSpawns=0;
  let bossRewards=0;
  for(const entry of entries) {
    if(!entry||typeof entry!=='object')continue;
    const ownerId=cleanId(entry.ownerId);
    const reward=Math.max(0,Number(entry.reward)||0);
    const retained=Math.max(0,Number(entry.retainedReward)||0);
    prizes+=reward+retained;
    if(entry.bossSpawn)bossSpawns++;
    if(entry.bossClaim)bossRewards+=Math.max(0,Number(entry.bossClaim.amount)||0);
    if(entry.status==='finished')finished++;
    const participants=new Map();
    if(Array.isArray(entry.participants))for(const row of entry.participants) {
      const id=cleanId(row?.id);
      if(id)participants.set(id,{ms:Number(row?.ms)>0?Math.round(Number(row.ms)):0});
    }
    if(ownerId&&!participants.has(ownerId))participants.set(ownerId,{ms:entry.status==='finished'&&Number(entry.ms)>0?Math.round(entry.ms):0});
    for(const [id,row] of participants) {
      const item=bucket(id);
      if(!item)continue;
      item.races++;
      item.lastAt=Math.max(item.lastAt,Number(entry.at)||0);
      if(row.ms>0)item.bestMs=item.bestMs?Math.min(item.bestMs,row.ms):row.ms;
    }
    if(entry.winning) {
      const winner=bucket(ownerId||entry.winnerId);
      if(winner){winner.wins++;winner.winnings+=reward;}
    }
    if(retained) {
      const champion=bucket(entry.championId);
      if(champion)champion.winnings+=retained;
    }
  }
  for(const row of Object.values(race?.records||{})) {
    const item=bucket(row?.id);
    if(!item)continue;
    const ms=Number(row?.ticks)>0?Math.round(Number(row.ticks)*1000/tickRate):0;
    if(ms>0)item.bestMs=item.bestMs?Math.min(item.bestMs,ms):ms;
    item.lastAt=Math.max(item.lastAt,Number(row?.at)||0);
  }
  const all=[...buckets.values()].filter(row=>row.races>0||row.bestMs>0);
  const top5=all.filter(row=>row.bestMs>0)
    .sort((a,b)=>a.bestMs-b.bestMs||b.wins-a.wins||a.id.localeCompare(b.id))
    .slice(0,5)
    .map((row,index)=>({rank:index+1,id:row.id,name:raceNames.nameOfId(row.id)||'',bestMs:row.bestMs,wins:row.wins,winnings:row.winnings,races:row.races}));
  const participants=all.sort((a,b)=>b.lastAt-a.lastAt||b.races-a.races||a.id.localeCompare(b.id))
    .map(row=>({id:row.id,name:raceNames.nameOfId(row.id)||'',races:row.races,wins:row.wins,winnings:row.winnings,bestMs:row.bestMs,lastAt:row.lastAt}));
  return {ok:true,you:cleanId(you),pot:Number(race?.pot)||0,boss:raceBoss.publicState(race?.boss),
    totals:{races:entries.length,finished,participants:all.length,prizes,bossSpawns,bossRewards},
    top5,participants};
}
function change(now,update) {
  let result;
  storage.updateJson(file,stored=>{
    const data=Array.isArray(stored)?{}:stored;
    goldSupply.init(data,now);
    const gold=data.gold;
    const wallet=gold.carried||={};
    const race=data.racing||={records:{},active:{},receipts:{},history:[],pot:0};
    if(!Array.isArray(race.history))race.history=[];
    const ensurePool=()=>{
      const spawned=raceBoss.ensurePool(race,now);
      if(spawned)goldSupply.issue(gold,spawned.amount);
      return spawned;
    };
    ensurePool();
    result=update(race,wallet,ensurePool);
    return data;
  });
  return result;
}
const credit=(wallet,owner,amount)=>{wallet[owner]=(wallet[owner]||0)+amount;};
function lost(race,wallet) {
  const champion=ranking(race)[0]?.[0];
  const reward=champion?fee/2:0;
  if(champion)credit(wallet,champion,reward);
  race.pot+=fee-reward;
  return champion;
}
function clean(race,wallet,now) {
  for(const [owner,ticket] of Object.entries(race.active)) {
    if(ticket.expiresAt<=now){
      exitHistory(owner,ticket.id,now,'expired',race,wallet);
      delete race.active[owner];
    }
  }
  for(const [id,row] of Object.entries(race.receipts)) {
    if(now-row.at>24*60*60*1000)delete race.receipts[id];
  }
}
function state(owner,race,wallet) {
  const entry=race.active[owner];
  return {fee,balance:wallet[owner]||0,pot:race.pot,ranking:leaderboard(race),id:publicId(owner),name:raceNames.nameOfOwner(owner),
    boss:raceBoss.publicState(race.boss),
    entry:entry?{id:entry.id,started:!!entry.startAt}:null};
}
function status(owner,now=Date.now()) {
  return change(now,(race,wallet)=>{clean(race,wallet,now);return state(owner,race,wallet);});
}
function plazaRanking() {
  const records=storage.readJson(file)?.racing?.records;
  return records?leaderboard({records}):[];
}
function history(owner,now=Date.now()) {
  const race=storage.readJson(file)?.racing;
  const you=owner?publicId(owner):null;
  if(hasPool(race?.pot))return summarize(race,you);
  return change(now,current=>summarize(current,you));
}
function enter(owner,key,now=Date.now()) {
  return change(now,(race,wallet)=>{
    clean(race,wallet,now);
    if(!/^[a-f0-9-]{36}$/.test(key))return {...state(owner,race,wallet),error:'ticket'};
    if(race.active[owner]?.startAt)return {...state(owner,race,wallet),error:'active',ticket:race.active[owner].id};
    if(!race.active[owner]) {
      if((wallet[owner]||0)<fee)return {...state(owner,race,wallet),error:'funds'};
      wallet[owner]-=fee;
      race.active[owner]={id:randomUUID(),key,startAt:null,expiresAt:now+10*60*1000};
    }
    return {...state(owner,race,wallet),ticket:race.active[owner]};
  });
}
function canLoad(owner,id,now=Date.now()) {
  const entry=storage.readJson(file).racing?.active?.[owner];
  return !!entry&&entry.id===id&&!entry.startAt&&entry.expiresAt>now;
}
function start(owner,id,key,now=Date.now(),online=false) {
  return change(now,(race,wallet)=>{
    clean(race,wallet,now);
    const entry=race.active[owner];
    if(!entry||entry.id!==id||!/^[a-f0-9]{36}$/.test(key)||(entry.startAt&&entry.loadKey!==key))return {error:'ticket'};
    if(!entry.startAt) {
      entry.loadKey=key;
      entry.online=online===true;
      entry.startAt=now;
      entry.expiresAt=now+duration;
    }
    return {...state(owner,race,wallet),startedAt:entry.startAt};
  });
}
function abandon(owner,id,now=Date.now()) {
  return change(now,(race,wallet)=>{
    clean(race,wallet,now);
    if(race.active[owner]?.id===id){
      exitHistory(owner,id,now,'abandoned',race,wallet);
      delete race.active[owner];
    }
    return state(owner,race,wallet);
  });
}

function replay(log,maxTicks) {
  if(!Array.isArray(log)||log.length>18000)return 0;
  const P=rules(), car={...P.start}, traffic=P.createTraffic();
  let ticks=0, oldThrottle=0;
  for(const part of log) {
    if(!Array.isArray(part)||part.length!==4||!part.every(Number.isInteger))return 0;
    const [count,gear,steer,flags]=part;
    if(count<1||count>27000||gear< -1||gear>5||Math.abs(steer)>100||flags<0||flags>3||ticks+count>maxTicks)return 0;
    if(P.selectGear(car,gear))return 0;
    const throttle=flags&1;
    if(throttle&&!oldThrottle&&car.stalled){car.stalled=false;car.lugTime=0;}
    oldThrottle=throttle;
    for(let i=0;i<count;i++) {
      P.drive(car,throttle,steer/100,!!(flags&2),1/tickRate,traffic);
      P.advanceTraffic(traffic,car,1/tickRate);
      ticks++;
      if(car.z>=P.length)return ticks;
    }
  }
  return 0;
}
function prepare(owner,id,now) {
  const saved=storage.readJson(file).racing;
  if(saved?.receipts?.[id]?.owner===owner){
    const read=race=>({result:refreshReceipt(race.receipts[id].response,owner,race)});
    if(hasPool(saved.receipts[id].response?.pot)||hasPool(saved.pot))return read(saved);
    return change(now,race=>race.receipts[id]?.owner===owner?read(race):{result:{error:'ticket'}});
  }
  const ticket=saved?.active?.[owner];
  if(!ticket||ticket.id!==id||!ticket.startAt||ticket.expiresAt<=now)return {result:{error:'ticket'}};
  if(ticket.online)return {result:{error:'pending'}};
  const elapsed=now-ticket.startAt;
  return {maxTicks:Math.floor((elapsed+600)*tickRate/1000),wallTicks:Math.round(elapsed*tickRate/1000)};
}
function settle(owner,id,ticks,wallTicks,now,placement) {
  if(!ticks)return {error:'run'};
  ticks=Math.max(ticks,wallTicks);
  return change(now,(race,wallet,ensurePool)=>{
    if(race.receipts[id]?.owner===owner)return refreshReceipt(race.receipts[id].response,owner,race);
    if(race.active[owner]?.id!==id)return {error:'ticket'};
    delete race.active[owner];
    const before=ranking(race)[0];
    const winning=!before||ticks<before[1].ticks;
    const potBefore=race.pot;
    const best=race.records[owner];
    if(!best||ticks<best.ticks)race.records[owner]={id:publicId(owner),ticks,at:now};
    let reward=0;
    let retainedReward=0;
    let championId='';
    let bossClaim=null;
    let bossSpawn=null;
    if(winning){
      bossClaim=raceBoss.claim(race,now,publicId(owner));
      reward=fee+race.pot;
      credit(wallet,owner,reward);
      race.pot=0;
      bossSpawn=ensurePool();
    } else {
      const championOwner=lost(race,wallet);
      if(championOwner){
        retainedReward=fee/2;
        championId=publicId(championOwner);
      }
    }
    const ms=Math.round(ticks*1000/tickRate);
    const finishPlace=Number.isInteger(placement?.finishPlace)&&placement.finishPlace>0?placement.finishPlace:1;
    const rows=Array.isArray(placement?.podium)&&placement.podium.length
      ? placement.podium
      : [{id:publicId(owner),ms}];
    const podium=rows.slice(0,3).map((row,index)=>({
      rank:index+1,
      id:String(row?.id||''),
      name:displayName(row?.id,row?.name),
      ...(row?.unit?{unit:row.unit}:{}),
      ms:Number(row?.ms)||0
    }));
    const participants=collectParticipants(placement?.participants,podium,publicId(owner),raceNames.nameOfOwner(owner),ms,finishPlace);
    const response={...state(owner,race,wallet),reward,winning,ms,finishPlace,podium,bossClaim,bossSpawned:bossSpawn};
    race.receipts[id]={owner,at:now,response};
    recordHistory(race,{
      id,at:now,status:'finished',ownerId:publicId(owner),ownerName:raceNames.nameOfOwner(owner),winnerId:winning?publicId(owner):'',
      fee,potBefore,potAfter:race.pot,winning,reward,retainedReward,championId,
      ms,finishPlace,podium,participants,bossClaim,bossSpawn:bossSpawn
    });
    return response;
  });
}
function liveEntry(owner,id,key,now=Date.now()) {
  const entry=storage.readJson(file).racing?.active?.[owner];
  return entry?.online&&entry.id===id&&entry.loadKey===key&&entry.expiresAt>now?entry:null;
}
function finishLive(owner,id,key,ticks,now=Date.now(),buffered=false,placement) {
  const entry=liveEntry(owner,id,key,now);
  if(!entry)return {error:'ticket'};
  return settle(owner,id,ticks,buffered?0:Math.round((now-entry.startAt)*tickRate/1000),now,placement);
}
function finish(owner,id,log,now=Date.now()) {
  const plan=prepare(owner,id,now);
  return plan.result||settle(owner,id,replay(log,plan.maxTicks),plan.wallTicks,now);
}
let verifying=0;
async function finishAsync(owner,id,log,now=Date.now()) {
  const plan=prepare(owner,id,now);
  if(plan.result)return plan.result;
  if(verifying>=2)return {error:'busy'};
  verifying++;
  const worker=new Worker(__filename,{workerData:{log,maxTicks:plan.maxTicks}});
  try {
    const ticks=await new Promise(resolve=>{
      const timer=setTimeout(()=>resolve(0),20000);
      const end=value=>{clearTimeout(timer);resolve(value);};
      worker.once('message',end);
      worker.once('error',()=>end(0));
      worker.once('exit',()=>end(0));
    });
    return settle(owner,id,ticks,plan.wallTicks,now);
  } finally {
    await worker.terminate();
    verifying--;
  }
}
if(!isMainThread)parentPort.postMessage(replay(workerData.log,workerData.maxTicks));
module.exports={status,history,plazaRanking,enter,canLoad,start,abandon,finish,finishAsync,replay,rules,liveEntry,finishLive,publicId,withNames};
