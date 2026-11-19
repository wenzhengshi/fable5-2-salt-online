'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const tempRoot=path.join(__dirname,'..','.jicreate-tmp');
fs.mkdirSync(tempRoot,{recursive:true});
const dataDir=fs.mkdtempSync(path.join(tempRoot,'race-result-'));
process.env.JICREATE_DATA_DIR=dataDir;

try {
  const storage=require('../config/storage');
  const race=require('../services/race');
  const raceNames=require('../services/raceNames');
  const firstOwner='a'.repeat(64);
  const secondOwner='c'.repeat(64);
  const thirdOwner='e'.repeat(64);
  raceNames.remember(firstOwner,'风驰');
  raceNames.remember(secondOwner,'追风');
  raceNames.remember(thirdOwner,'行者');

  storage.updateJson('frontier-inventory.json',stored=>{
    const data=stored&&typeof stored==='object'&&!Array.isArray(stored)?stored:{};
    const wallet=(data.gold||={}).carried||={};
    wallet[firstOwner]=500000;
    wallet[secondOwner]=500000;
    wallet[thirdOwner]=500000;
    return data;
  });

  const initial=race.history(firstOwner);
  assert.equal(initial.pot,2000000);
  assert.equal(initial.boss.serial,1);
  const firstStatus=race.status(firstOwner);
  assert.equal(firstStatus.pot,2000000);
  assert.equal(firstStatus.balance,500000);
  assert.deepEqual(firstStatus.boss,initial.boss);

  const firstKey='b'.repeat(36);
  const firstEntry=race.enter(firstOwner,firstKey,Date.now());
  assert.equal(firstEntry.error,undefined);
  assert.equal(firstEntry.name,'风驰');
  race.start(firstOwner,firstEntry.ticket.id,firstKey,Date.now(),true);
  const firstPodium=[
    {id:race.publicId(firstOwner),ms:100000},
    {id:'SL-SECOND',ms:120000},
    {id:'SL-THIRD',ms:140000}
  ];
  const winner=race.finishLive(firstOwner,firstEntry.ticket.id,firstKey,110000,Date.now(),false,{
    finishPlace:1,podium:firstPodium
  });
  assert.equal(winner.error,undefined);
  assert.equal(winner.winning,true);
  assert.equal(winner.finishPlace,1);
  assert.equal(winner.pot,2500000);
  assert.equal(winner.boss.active,true);
  assert.equal(winner.boss.serial,2);
  assert.equal(winner.boss.amount,2500000);
  assert.equal(winner.bossClaim.serial,1);
  assert.equal(winner.bossSpawned.serial,2);
  assert.equal(winner.balance,2500000);
  assert.deepEqual(winner.podium.map(row=>row.rank),[1,2,3]);
  assert.equal(winner.podium[1].id,'SL-SECOND');
  assert.equal(winner.podium[0].name,'风驰');
  assert.equal(winner.podium[2].ms,140000);
  assert.deepEqual(race.finish(firstOwner,firstEntry.ticket.id,[],Date.now()),winner);
  raceNames.remember(firstOwner,'闪电');
  const renamedReceipt=race.finish(firstOwner,firstEntry.ticket.id,[],Date.now());
  assert.equal(renamedReceipt.name,'闪电');
  assert.equal(renamedReceipt.podium[0].name,'闪电');

  const secondKey='d'.repeat(36);
  const secondEntry=race.enter(secondOwner,secondKey,Date.now());
  assert.equal(secondEntry.error,undefined);
  race.start(secondOwner,secondEntry.ticket.id,secondKey,Date.now(),true);
  const secondPodium=[
    firstPodium[0],
    {id:race.publicId(secondOwner),ms:130000}
  ];
  const runnerUp=race.finishLive(secondOwner,secondEntry.ticket.id,secondKey,130000,Date.now(),false,{
    finishPlace:2,podium:secondPodium
  });
  assert.equal(runnerUp.error,undefined);
  assert.equal(runnerUp.winning,false);
  assert.equal(runnerUp.finishPlace,2);
  assert.equal(runnerUp.pot,2525000);
  assert.equal(runnerUp.boss.serial,2);
  assert.equal(runnerUp.podium.length,2);
  assert.equal(runnerUp.podium[1].id,race.publicId(secondOwner));
  assert.equal(runnerUp.podium[1].name,'追风');
  assert.equal(runnerUp.podium[1].ms,130000);

  const thirdKey='f'.repeat(36);
  const thirdEntry=race.enter(thirdOwner,thirdKey,Date.now());
  assert.equal(thirdEntry.error,undefined);
  race.abandon(thirdOwner,thirdEntry.ticket.id,Date.now());

  const archive=race.history(thirdOwner);
  assert.equal(archive.ok,true);
  assert.equal(archive.totals.races,3);
  assert.equal(archive.totals.finished,2);
  assert.equal(archive.totals.participants,5);
  assert.equal(archive.totals.prizes,2100000);
  assert.equal(archive.you,race.publicId(thirdOwner));
  assert.equal(archive.top5.length,4);
  assert.equal(archive.top5[0].id,race.publicId(firstOwner));
  assert.equal(archive.top5[0].name,'闪电');
  assert.equal(archive.top5[0].bestMs,100000);
  assert.equal(archive.top5[0].wins,1);
  assert.equal(archive.top5[0].winnings,2100000);
  assert.deepEqual(archive.top5.map(row=>row.bestMs),[100000,120000,130000,140000]);
  assert.ok(archive.participants.some(row=>row.id===race.publicId(thirdOwner)&&row.races===1&&row.bestMs===0));
  assert.ok(archive.participants.some(row=>row.id===race.publicId(thirdOwner)&&row.name==='行者'));

  const bossKey='9'.repeat(36);
  const bossEntry=race.enter(thirdOwner,bossKey,Date.now());
  assert.equal(bossEntry.error,undefined);
  race.start(thirdOwner,bossEntry.ticket.id,bossKey,Date.now(),true);
  const bossWin=race.finishLive(thirdOwner,bossEntry.ticket.id,bossKey,90000,Date.now(),false,{
    finishPlace:1,podium:[{id:race.publicId(thirdOwner),ms:90000}]
  });
  assert.equal(bossWin.error,undefined);
  assert.equal(bossWin.winning,true);
  assert.equal(bossWin.bossClaim.serial,2);
  assert.equal(bossWin.bossClaim.amount,2500000);
  assert.equal(bossWin.bossSpawned.serial,3);
  assert.equal(bossWin.bossSpawned.amount,3000000);
  assert.equal(bossWin.reward,2600000);
  assert.equal(bossWin.pot,3000000);
  assert.equal(bossWin.balance,3000000);
  const bossArchive=race.history(thirdOwner);
  assert.equal(bossArchive.boss.active,true);
  assert.equal(bossArchive.boss.serial,3);
  assert.equal(bossArchive.totals.bossSpawns,2);
  assert.equal(bossArchive.totals.bossRewards,4500000);
  assert.equal(bossArchive.totals.prizes,4700000);

  storage.updateJson('frontier-inventory.json',data=>{
    data.racing.pot=0;
    data.racing.receipts[firstEntry.ticket.id].response.pot=0;
    return data;
  });
  const repairedReceipt=race.finish(firstOwner,firstEntry.ticket.id,[]);
  assert.equal(repairedReceipt.pot,3000000);
  assert.deepEqual(repairedReceipt.boss,bossArchive.boss);
  assert.equal(repairedReceipt.reward,winner.reward);
  assert.equal(race.status(firstOwner).balance,2550000);
  storage.updateJson('frontier-inventory.json',data=>{
    data.racing.pot=0;
    data.racing.boss.claimed=true;
    return data;
  });
  const respawned=race.history(firstOwner);
  assert.equal(respawned.pot,3500000);
  assert.equal(respawned.boss.serial,4);
  assert.deepEqual(race.status(secondOwner).boss,respawned.boss);

  console.log('race finish result self-test passed');
} finally {
  fs.rmSync(dataDir,{recursive:true,force:true});
}
