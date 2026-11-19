'use strict';
const express=require('express');
const signs=require('../services/roadSigns');
const race=require('../services/race');
const raceNames=require('../services/raceNames');
const ads=require('../services/raceAds');
const multiplayer=require('../realtime/multiplayer');
const router=express.Router();
router.get('/ads',(req,res)=>{
  res.set('Cache-Control','no-store');
  res.json(ads.listings());
});
router.use(express.json({limit:'512kb'}));
router.use((req,res,next)=>{
  const headers=req.headers;
  // Browsers can omit Origin on same-origin requests. Fetch Metadata still attributes that request to this origin.
  const source=!headers.origin&&headers['sec-fetch-site']==='same-origin'
    ?{headers:{...headers,origin:'http://'+headers.host}}:req;
  req.raceOwner=signs.ownerFromRequest(source);
  res.set('Cache-Control','no-store');
  if(!req.raceOwner)return res.status(403).json({error:'identity'});
  next();
});
router.get('/plaza-ranking',(req,res)=>res.json(race.plazaRanking()));
router.get('/history',(req,res)=>res.json(race.history(req.raceOwner)));
router.post('/ads/status',(req,res)=>res.json(ads.status(req.raceOwner)));
router.post('/ads/book',(req,res)=>{
  const result=ads.book(req.raceOwner,req.body);
  if(!result.error)multiplayer.refreshRaceWallets();
  res.status(result.error?409:200).json(result);
});
for(const action of ['status','enter','start','abandon','finish']) {
  router.post('/'+action,async(req,res,next)=>{
    try{
    const id=typeof req.body?.id==='string'&&/^[a-f0-9-]{36}$/.test(req.body.id)?req.body.id:'';
    if(typeof req.body?.name==='string')raceNames.remember(req.raceOwner,req.body.name);
    const invoke=action==='finish'?race.finishAsync:race[action];
    const key=String(req.body?.key||'').slice(0,37);
    const args={finish:[id,req.body?.log],abandon:[id],enter:[key],start:[id,key,Date.now(),req.body?.online===true],status:[]};
    const result=await invoke(req.raceOwner,...args[action]);
    if(action==='abandon'&&!result.error)require('../realtime/race').drop(req.raceOwner,id);
    if(action==='finish'&&result.bossSpawned?.active)require('../realtime/race').broadcastBoss(result.bossSpawned);
    if((action==='enter'||action==='finish'||action==='abandon')&&!result.error)multiplayer.refreshRaceWallets();
    res.status(result.error?409:200).json(result);
    }catch(error){next(error);}
  });
}
module.exports=router;
