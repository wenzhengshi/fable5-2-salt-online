'use strict';
const raceSession=(()=>{
  const messages=(window.__SALT_I18N__||{}).messages||{};
  const t=(key,values,fallback)=>{
    const value=String(key||'').split('.').reduce(
      (entry,part)=>entry&&typeof entry==='object'?entry[part]:undefined,messages);
    if(typeof value!=='string')return fallback||key;
    return value.replace(/\{(\w+)\}/g,(match,name)=>
      values&&Object.prototype.hasOwnProperty.call(values,name)?String(values[name]):match);
  };
  const deployment=messages.deployment||{};
  const maps=(messages.expedition||{}).maps||{};
  const destinations=[
    ['port',deployment.port||'盐港'],['qingyun',deployment.qingyun||'青云宗'],['bayhaven',maps.bayhaven||'湾城'],
    ['mothlight',maps.mothlight||'霓虹雨城'],['dustfall',maps.dustfall||'西部荒原'],['lunar',maps.lunar||'月球战区']
  ];
  const el=id=>document.getElementById(id);
  const visiting=document.body.dataset.plazaVisit==='true';
  let prefetchStarted=false;
  function prefetchQingyun() {
    if(prefetchStarted||navigator.connection?.saveData)return;
    prefetchStarted=true;
    for(const url of ['/maps/qingyun-renderer.js?v=8','/maps/qingyun-models.glb','/maps/qingyun-models.json']){
      const link=document.createElement('link');
      link.rel='prefetch';
      link.href=url;
      document.head.append(link);
    }
  }
  const NAME_STORAGE='saltline.multiplayer.name';
  let unit=(()=>{
    try{
      const value=localStorage.getItem('saltline.multiplayer.soldier');
      if(['male','female','hound','drone','classic'].includes(value))return value;
    }catch{ /* storage unavailable */ }
    return 'male';
  })();
  const currentName=()=>{
    try{
      const value=localStorage.getItem(NAME_STORAGE);
      return typeof value==='string'?value.replace(/[\u0000-\u001f\u007f<>]/g,'').trim().slice(0,16):'';
    }catch(error){return '';}
  };
  const coins=n=>((n||0)/1e6).toFixed(6).replace(/0+$/,'').replace(/\.$/,'');
  const time=ms=>t('raceResult.seconds',{n:((ms||0)/1000).toFixed(3)});
  const errorText=key=>t('raceResult.errors.'+key,{},t('raceResult.errors.default'));
  let ticket=null, finished=visiting, busy=false, change=()=>{};
  let socket, previous, current, result, hit, launch;
  let localReady=false, crossed=visiting, historyLost=false, traceRejected=false;
  let arrivalAt=0, nextReceipt=0, portalRequest=null;
  let localTicks=0, verified=0, accepted=0, sentUntil=0, cursor=0;
  const pending=[];
  let receivedAt=0, sentAt=-Infinity, retryAt=0, connected=false;
  let historyBusy=false, historyLoaded=false, historyFocus=null;
  const badge=()=>el('race-online');
  const paidId=new URLSearchParams(location.search).get('ticket');
  const loadKey=Array.from(crypto.getRandomValues(new Uint8Array(18)),n=>n.toString(16).padStart(2,'0')).join('');
  setInterval(()=>{
    if(visiting||document.hidden)return;
    const lobby=el('race-lobby');
    if(!finished&&lobby?.hidden!==false)return;
    call('status').then(data=>{show(data);}).catch(()=>{});
  },15000);
  function showBoss(boss) {
    const panel=el('race-boss');
    if(!panel)return;
    const active=!!boss?.active&&Number(boss.amount)>0;
    panel.hidden=!active;
    if(!active)return;
    el('race-boss-amount').textContent=t('raceBoss.amount',{amount:coins(boss.amount)});
    el('race-boss-hint').textContent=t('raceBoss.hint',{serial:boss.serial||1});
  }
  function show(data) {
    el('race-wallet').textContent=t('raceResult.wallet',{
      fee:coins(data.fee),balance:coins(data.balance),pot:coins(data.pot)
    });
    showBoss(data.boss);
    el('race-identity').textContent=data.name||data.id||'—';
    for(let i=0;i<3;i++){
      const row=data.ranking?.[i];
      el('race-rank-'+(i+1)).textContent=row?(row.name||row.id)+' · '+time(row.ms):t('raceResult.vacant');
    }
    if(data.podium)change(data.podium);
  }
  function showFinish(receipt) {
    const panel=el('race-finish');
    if(!panel)return;
    panel.hidden=false;
    el('race-history-open').hidden=false;
    const bossLine=el('race-finish-boss');
    if(bossLine){
      bossLine.hidden=!Number(receipt.bossClaim?.amount);
      if(!bossLine.hidden)bossLine.textContent=t('raceBoss.defeated',{amount:coins(receipt.bossClaim.amount)});
    }
    el('race-finish-pot').textContent=t('raceResult.newPot',{amount:coins(receipt.pot)});
    const rows=Array.isArray(receipt.podium)?receipt.podium.slice(0,3):[];
    const subtitle=el('race-finish-subtitle');
    subtitle.hidden=rows.length<2;
    subtitle.textContent=t('raceResult.subtitle');
    const list=el('race-finish-podium');
    list.replaceChildren();
    for(const [index,row] of rows.entries()) {
      if(index===0)continue;
      const item=document.createElement('li');
      if(row?.id&&row.id===receipt.id)item.classList.add('is-you');
      const rank=document.createElement('span');
      rank.className='race-finish-rank';
      rank.textContent=t('raceResult.rank'+(index+1));
      const id=document.createElement('span');
      id.className='race-finish-id';
      id.textContent=(row?.name||row?.id||'—')+(row?.id===receipt.id?t('raceResult.you'):'');
      const result=document.createElement('span');
      result.className='race-finish-time';
      result.textContent=time(row?.ms||0);
      item.append(rank,id,result);
      list.append(item);
    }
  }
  function historyCell(row,text,className) {
    const cell=document.createElement('td');
    if(className)cell.className=className;
    cell.textContent=text;
    row.append(cell);
  }
  function historyDate(value) {
    if(!value)return '—';
    try{return new Intl.DateTimeFormat(messages.lang||'zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));}
    catch(error){return '—';}
  }
  function renderHistory(data) {
    el('race-history-summary').textContent=t('raceHistory.summary',{
      races:data.totals.races,players:data.totals.participants,prizes:coins(data.totals.prizes),
      bossSpawns:data.totals.bossSpawns||0,bossRewards:coins(data.totals.bossRewards)
    });
    const topBody=el('race-history-top-body');
    topBody.replaceChildren();
    if(!data.top5.length){
      const row=document.createElement('tr'), cell=document.createElement('td');
      cell.colSpan=5;cell.className='race-history__empty';cell.textContent=t('raceHistory.empty');
      row.append(cell);topBody.append(row);
    }
    for(const item of data.top5){
      const row=document.createElement('tr');
      if(item.id===data.you)row.className='is-you';
      historyCell(row,String(item.rank),'race-history__rank');
      historyCell(row,(item.name||item.id)+(item.id===data.you?t('raceResult.you'):''));
      historyCell(row,time(item.bestMs));
      historyCell(row,String(item.wins));
      historyCell(row,t('raceHistory.coins',{amount:coins(item.winnings)}));
      topBody.append(row);
    }
    const listBody=el('race-history-list-body');
    listBody.replaceChildren();
    if(!data.participants.length){
      const row=document.createElement('tr'), cell=document.createElement('td');
      cell.colSpan=5;cell.className='race-history__empty';cell.textContent=t('raceHistory.empty');
      row.append(cell);listBody.append(row);
    }
    for(const item of data.participants){
      const row=document.createElement('tr');
      if(item.id===data.you)row.className='is-you';
      historyCell(row,(item.name||item.id)+(item.id===data.you?t('raceResult.you'):''));
      historyCell(row,String(item.races));
      historyCell(row,item.bestMs?time(item.bestMs):'—');
      historyCell(row,t('raceHistory.coins',{amount:coins(item.winnings)}));
      historyCell(row,historyDate(item.lastAt));
      listBody.append(row);
    }
  }
  async function loadHistory(force=false) {
    if(historyBusy||(!force&&historyLoaded))return;
    historyBusy=true;
    const open=el('race-history-open'), refresh=el('race-history-refresh'), error=el('race-history-error');
    const openLabel=open.textContent, refreshLabel=refresh.textContent, loading=t('raceHistory.loading');
    open.disabled=true;refresh.disabled=true;
    open.textContent=loading;refresh.textContent=loading;
    error.hidden=true;
    try{
      const response=await fetch('/api/race/history',{cache:'no-store',signal:AbortSignal.timeout?.(5000)});
      const data=await response.json();
      if(!response.ok||!data.ok)throw Error(t('raceHistory.errors.load'));
      renderHistory(data);
      historyLoaded=true;
    }catch(errorValue){
      error.textContent=errorValue.message||t('raceHistory.errors.load');
      error.hidden=false;
    }finally{
      open.disabled=false;refresh.disabled=false;
      open.textContent=openLabel;refresh.textContent=refreshLabel;
      historyBusy=false;
    }
  }
  function openHistory() {
    historyFocus=document.activeElement;
    el('race-history').hidden=false;
    el('race-history-close').focus();
    loadHistory(false);
  }
  function closeHistory() {
    el('race-history').hidden=true;
    if(historyFocus&&typeof historyFocus.focus==='function')historyFocus.focus();
  }
  el('race-history-open').addEventListener('click',openHistory);
  el('race-history-close').addEventListener('click',closeHistory);
  el('race-history-done').addEventListener('click',closeHistory);
  el('race-history-refresh').addEventListener('click',()=>loadHistory(true));
  el('race-history').addEventListener('click',event=>{if(event.target===el('race-history'))closeHistory();});
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape'||el('race-history').hidden)return;
    event.preventDefault();
    event.stopPropagation();
    closeHistory();
  });
  async function call(action,body={}) {
    const payload={...body,name:currentName()};
    const response=await fetch('/api/race/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout?.(5000)});
    const data=await response.json();
    if(data.ranking)show(data);
    if(data.error){
      throw Error(errorText(data.error));
    }
    if(!response.ok)throw Error('赛车服务暂不可用。');
    return data;
  }
  const tell=text=>{el('race-status').textContent=text;};
  async function run(task) {
    if(busy)return;
    busy=true;
    el('race-enter').disabled=true;
    try{await task();}
    catch(error){tell(error.message||'网络请求失败，请重试。');}
    finally{busy=false;el('race-enter').disabled=false;}
  }
  function displayConnection(message) {
    if(badge().textContent!==message)badge().textContent=message;
    badge().hidden=!message;
  }
  function acknowledge(message) {
    accepted=message.accepted;
    verified=message.tick;
    if(verified>cursor)pending.splice(0,verified-cursor);
    cursor=Math.max(cursor,verified);
  }
  function connect() {
    if(!ticket||finished||result||socket?.readyState===WebSocket.OPEN||socket?.readyState===WebSocket.CONNECTING)return;
    const url=new URL('/ws',location.href);
    url.protocol=location.protocol==='https:'?'wss:':'ws:';
    url.search=new URLSearchParams({race:'1',ticket,key:loadKey,local:'2',name:currentName(),unit});
    const ws=new WebSocket(url);
    socket=ws;
    const timeout=setTimeout(()=>{if(!connected)ws.close();},7500);
    ws.addEventListener('message',({data})=>{
      if(socket!==ws)return;
      const message=JSON.parse(data);
      if(message.type==='joined'){
        clearTimeout(timeout);
        connected=true;
        retryAt=0;
        receivedAt=performance.now();
        previous=null;
        current=null;
        if(!localReady){
          launch=message.self;
          localReady=true;
          el('race-lobby').hidden=true;
          tell('');
        }
        acknowledge(message);
        if(message.podium)change(message.podium);
        sentUntil=accepted;
        displayConnection(crossed?'':'同场 1 人');
      } else if(message.type==='state'){
        previous=current;
        current=message;
        receivedAt=performance.now();
        acknowledge(message);
        displayConnection(crossed?'':'同场 '+message.count+' 人');
      } else if(message.type==='podium')change(message.rows);
      else if(message.type==='boss'){
        showBoss(message.boss);
        if(message.boss?.active)tell(t('raceBoss.spawned',{amount:coins(message.boss.amount)}));
      }
      else if(message.type==='traceRejected'){
        traceRejected=true;
        if(crossed)tell('本地轨迹和联机状态不一致，正在核对成绩。');
      } else if(message.type==='hit'&&message.received)hit=message;
      else if(message.type==='finish'&&!finished)result=message.result;
    });
    ws.addEventListener('close',()=>{
      clearTimeout(timeout);
      if(socket!==ws||finished||result)return;
      connected=false;
      if(!localReady){
        tell('暂时无法连接赛道，请重试。');
        return;
      }
      displayConnection(crossed?'已抵达 · 联机中断，等待确认':'联机中断 · 仍可驾驶');
      retryAt ||= performance.now()+87000;
      if(crossed)call('finish',{id:ticket}).then(receipt=>{result=receipt;}).catch(()=>{});
      if(performance.now()<retryAt)setTimeout(connect,1000);
      else {
        historyLost=true;
        displayConnection(crossed?'未能同步成绩 · 可返回首页':'联机已超时 · 仍可驾驶');
        if(crossed)showExit();
      }
    });
  }
  function showExit() {
    const panel=el('race-finish');
    if(panel)panel.hidden=true;
    el('race-history-open').hidden=true;
    el('race-lobby').hidden=false;
    el('race-title').textContent='终点 · 成绩未同步';
    el('race-enter').hidden=false;
    el('race-enter').textContent='返回报名';
    tell('连接超时，这次成绩未能上传。');
    finished=true;
  }
  async function activate() {
    if(socket?.readyState===WebSocket.CONNECTING||connected)return;
    await call('start',{id:paidId,key:loadKey,online:true});
    ticket=paidId;
    tell('正在连接赛道…');
    connect();
  }
  if(visiting){
    el('race-title').textContent=document.documentElement.lang==='en-US'?'Finish Plaza':'赛车场终点';
    el('race-enter').hidden=true;
    el('race-exit-panel').hidden=false;
    el('race-history-open').hidden=false;
  }
  el('race-enter').addEventListener('click',()=>run(async()=>{
    if(finished){location.assign('/?raceEntry=1');return;}
    await activate();
  }));
  for(const [id,label] of destinations){
    const link=document.createElement('a');
    link.href='/race/transfer/'+id;
    link.addEventListener('click',event=>{event.preventDefault();travel(id);});
    link.textContent=label;
    el('race-exits').append(link);
  }
  function travel(id) {
    if(!crossed||portalRequest)return;
    const target='/race/transfer/'+id;
    if(id==='qingyun')prefetchQingyun();
    if(finished){location.assign(target);return;}
    portalRequest=target;
    // Give the last input batch and receipt a short opportunity to arrive before navigating.
    tell('传送门已启动，正在提交最后一段成绩…');
    setTimeout(()=>{if(portalRequest)location.assign(portalRequest);},3500);
  }
  let plazaSocket, plazaId, plazaPrevious, plazaCurrent, plazaSpawn;
  let plazaReceivedAt=0, plazaSentAt=-Infinity, plazaOutfit;
  let plazaRetry=1000, gotPlazaSpawn=false, leavingPlaza=false;
  window.addEventListener('pagehide',()=>{
    leavingPlaza=true;
    plazaSocket?.close();
  });
  window.addEventListener('pageshow',event=>{
    if(event.persisted&&plazaOutfit!==undefined){
      leavingPlaza=false;
      connectPlaza();
    }
  });
  let plazaInventory = null;
  function connectPlaza(){
    if(leavingPlaza||plazaSocket)return;
    const summary=el('race-plaza-summary');
    const format=meters=>new Intl.NumberFormat(document.documentElement.lang,{
      style:'unit',unit:meters>=1000?'kilometer':'meter',maximumFractionDigits:1
    }).format(meters>=1000?meters/1000:meters);
    const url=new URL('/ws',location.href);
    url.protocol=location.protocol==='https:'?'wss:':'ws:';
    url.search=new URLSearchParams({race:'1',plaza:'1',name:currentName(),unit,outfit:plazaOutfit});
    const ws=new WebSocket(url);
    plazaSocket=ws;
    summary.textContent=t('raceResult.plazaConnecting');
    const timeout=setTimeout(()=>ws.close(),7500);
    ws.addEventListener('message',({data})=>{
      if(plazaSocket!==ws)return;
      let message;
      try{message=JSON.parse(data);}catch{return;}
      if(message.type==='plazaJoined'){
        clearTimeout(timeout);
        plazaId=message.id;
        plazaInventory=message.inventory;
        plazaRetry=1000;
        if(visiting&&!gotPlazaSpawn)plazaSpawn=message.spawn;
        gotPlazaSpawn=true;
      }else if(message.type==='plazaState'){
        plazaPrevious=plazaCurrent;
        plazaCurrent=message;
        plazaReceivedAt=performance.now();
        const count=message.visitorCount??message.walkers.length;
        const label=t('raceResult.plazaCounts',{people:count,drivers:message.challengerCount});
        if(summary.textContent!==label)summary.textContent=label;
        if(message.challengers){
          const items=message.challengers.map(challenger=>{
            const item=document.createElement('li');
            item.textContent=t('raceResult.plazaDriver',{
              driver:challenger.name||challenger.id,distance:format(challenger.remaining)
            });
            return item;
          });
          if(!items.length){
            const item=document.createElement('li');
            item.textContent=t('raceResult.plazaNoDrivers');
            items.push(item);
          }
          el('race-plaza-drivers').replaceChildren(...items);
        }
      }
    });
    ws.addEventListener('close',()=>{
      clearTimeout(timeout);
      if(plazaSocket!==ws)return;
      plazaSocket=null;
      plazaPrevious=plazaCurrent=null;
      plazaId=null;
      if(leavingPlaza)return;
      summary.textContent=t('raceResult.plazaDisconnected');
      el('race-plaza-drivers').replaceChildren();
      setTimeout(connectPlaza,plazaRetry);
      plazaRetry=Math.min(6000,plazaRetry*2);
    });
  }
  const lerp=(from,to,t)=>from+(to-from)*t;
  function blend(from,to,t,lead) {
    if(!from)return to;
    const pose={...to,x:lerp(from.x,to.x,t),z:lerp(from.z,to.z,t)};
    if(lead>0&&to.speed){
      pose.x+=Math.sin(to.heading||0)*to.speed*lead;
      pose.z+=Math.cos(to.heading||0)*to.speed*lead*(to.direction||1);
    }
    const angle=(a,b)=>lerp(a,a+Math.atan2(Math.sin(b-a),Math.cos(b-a)),t);
    if(to.wheelAngle!==undefined)pose.wheelAngle=angle(from.wheelAngle,to.wheelAngle);
    if(to.y!==undefined)pose.y=lerp(from.y,to.y,t);
    if(to.heading!==undefined)pose.heading=angle(from.heading,to.heading);
    return pose;
  }
  function blendList(from,to,t,lead) {
    const index=new Map(from.map(car=>[car.id,car]));
    return to.map(car=>blend(index.get(car.id),car,t,lead));
  }
  return {
    get active(){return localReady&&!finished;},
    get hasFreshTraffic(){return !!current&&connected&&performance.now()-receivedAt<600;},
    get elapsed(){return localTicks/90;},
    get settled(){return finished;},
    get arrived(){return crossed;},
    travel,
    onRanking(callback){
      change=callback;
      if(!visiting){run(activate);return;}
      fetch('/api/race/plaza-ranking',{signal:AbortSignal.timeout?.(5000)})
        .then(response=>response.ok?response.json():[])
        .then(change).catch(error=>console.warn('[race] plaza ranking unavailable',error));
    },
    get plazaInventory(){return plazaInventory;},
    joinPlaza(outfit){
      plazaOutfit=outfit;
      el('race-plaza-roster').hidden=false;
      connectPlaza();
    },
    takePlazaSpawn(){
      const spawn=plazaSpawn;
      plazaSpawn=null;
      return spawn;
    },
    publishPlaza(pose){
      const now=performance.now();
      if(plazaSocket?.readyState!==WebSocket.OPEN||!plazaId||now-plazaSentAt<80||
        plazaSocket.bufferedAmount>4096)return;
      plazaSentAt=now;
      plazaSocket.send(JSON.stringify(pose));
    },
    samplePlaza(){
      if(!plazaCurrent)return null;
      const delta=performance.now()-plazaReceivedAt;
      if(delta>5000){
        plazaSocket?.close();
        return null;
      }
      const mix=Math.min(1,delta/100);
      const lead=Math.min(.15,Math.max(0,(delta-100)/1000));
      return {
        walkers:blendList(plazaPrevious?.walkers||[],plazaCurrent.walkers,mix,0).filter(peer=>peer.id!==plazaId),
        peers:blendList(plazaPrevious?.cars||[],plazaCurrent.cars,mix,lead)
      };
    },
    takeLaunch(){const pose=launch;launch=null;return pose;},
    record(command,car,previousSpeed){
      localTicks++;
      if(!historyLost)pending.push([...command,previousSpeed,car.x,car.z,car.speed,car.heading]);
    },
    flush(force=false){
      const now=performance.now();
      if(crossed&&!finished&&now>=nextReceipt){
        nextReceipt=now+2000;
        call('finish',{id:ticket}).then(receipt=>{if(!finished)result=receipt;}).catch(()=>{});
        if(now-arrivalAt>8000&&!portalRequest){
          tell(traceRejected?'轨迹同步有差异，成绩仍在核对。可以先选择传送门。':'成绩仍在同步，可以先选择传送门。');
        }
      }
      if(finished||!connected||socket?.readyState!==WebSocket.OPEN)return;
      if(now-receivedAt>5000){socket.close();return;}
      if((!force&&now-sentAt<50)||socket.bufferedAmount>8192)return;
      if(!force&&accepted<sentUntil&&now-sentAt<250)return;
      const from=Math.max(cursor,accepted);
      const length=Math.min(pending.length-(from-cursor),90,verified+270-from);
      if(length<=0)return;
      sentAt=now;
      sentUntil=from+length;
      socket.send(JSON.stringify({from,frames:pending.slice(from-cursor,from-cursor+length),
        arrival:crossed&&sentUntil>=localTicks?localTicks:undefined}));
    },
    sample(){
      if(!current||performance.now()-receivedAt>1000)return null;
      if(!previous)return current;
      const delta=performance.now()-receivedAt;
      const t=Math.min(1,delta/67),lead=Math.min(.15,Math.max(0,(delta-67)/1000));
      return {peers:blendList(previous.peers,current.peers,t,lead),traffic:blendList(previous.traffic,current.traffic,t,0),
        walkers:blendList(previous.walkers||[],current.walkers||[],t,0)};
    },
    crossed(){
      if(crossed)return;
      crossed=true;
      arrivalAt=performance.now();
      nextReceipt=arrivalAt+600;
      el('race-lobby').hidden=false;
      el('race-title').textContent='已抵达终点';
      el('race-exit-panel').hidden=false;
      el('race-enter').hidden=true;
      tell('已下车 · 本地用时 '+time(Math.round(localTicks*1000/90))+' · 正在记录');
      displayConnection('');
      if(historyLost)showExit();
      else this.flush(true);
    },
    consumeHit(){const latest=hit;hit=null;return latest;},
    takeResult(){const latest=result;result=null;return latest;},
    finish(receipt) {
      finished=true;
      connected=false;
      displayConnection('');
      el('race-lobby').hidden=false;
      el('race-enter').hidden=false;
      el('race-enter').textContent='再跑一场';
      if(receipt.error){
        el('race-title').textContent='成绩确认失败';
        const panel=el('race-finish');
        if(panel)panel.hidden=true;
        el('race-history-open').hidden=true;
        tell(errorText(receipt.error));
        return;
      }
      show(receipt);
      showFinish(receipt);
      el('race-title').textContent=t('raceResult.title');
      const segments=[];
      if(receipt.finishPlace)segments.push(t('raceResult.place',{place:receipt.finishPlace}));
      segments.push(time(receipt.ms));
      if(receipt.winning)segments.push(t('raceResult.recordReward',{amount:coins(receipt.reward)}));
      if(receipt.bossClaim?.amount)segments.push(t('raceBoss.defeatedShort',{amount:coins(receipt.bossClaim.amount)}));
      if(receipt.bossSpawned?.active)segments.push(t('raceBoss.spawned',{amount:coins(receipt.bossSpawned.amount)}));
      tell(segments.join(' · '));
      if(portalRequest)location.assign(portalRequest);
      el('race-exit-panel').hidden=false;
    },
    restart(){
      if(busy||!ticket||finished)return;
      run(async()=>{
        const confirmed=await window.SaltModal.confirm({
          title:'放弃本场比赛？',message:'报名费会按挑战失败结算。',confirmText:'放弃比赛',cancelText:'继续比赛'
        });
        if(!confirmed||finished)return;
        await call('abandon',{id:ticket});
        location.assign('/?raceEntry=1');
      });
    },
    get unit(){return unit;},
    selectUnit(next){
      if(!['male','female','hound','drone','classic'].includes(next))return;
      unit=next;
      try{localStorage.setItem('saltline.multiplayer.soldier',next);}catch{}
    },
    destinations, visiting, prefetchQingyun
  };
})();
