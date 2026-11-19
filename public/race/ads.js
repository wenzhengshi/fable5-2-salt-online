'use strict';
window.SaltRaceAdEditor=(root,shop)=>{
  const ads=window.SaltRaceAds;
  const messages=window.__SALT_I18N__?.messages||{};
  const t=(key,values)=>{
    const value=String(key||'').split('.').reduce(
      (acc,part)=>acc&&typeof acc==='object'?acc[part]:undefined,messages);
    return typeof value==='string'
      ? value.replace(/\{(\w+)\}/g,(match,name)=>values&&Object.prototype.hasOwnProperty.call(values,name)?String(values[name]):match)
      : key;
  };
  const lang=document.documentElement.lang==='en-US'?'en-US':'zh-CN';
  const el=id=>root.querySelector('#'+id);
  const form=el('ad-form'), select=el('ad-slot'), text=el('ad-text'), days=el('ad-days');
  const preview=el('ad-preview'), ctx=preview.getContext('2d');
  const money=value=>(value/1e6).toFixed(6).replace(/\.?0+$/,'');
  const locationName=slot=>t('raceAds.location',{
    km:slot.km.toFixed(2),side:t(slot.side<0?'raceAds.right':'raceAds.left')});
  const colorName=key=>t('raceAds.colors.'+key);
  const expiry=new Intl.DateTimeFormat(lang,{timeZone:'Asia/Shanghai',dateStyle:'short',timeStyle:'short'});
  let busy=false, ready=false, balance=0, occupied=new Map(), previousRequest=null;
  const showStatus=message=>{el('ad-status').textContent=message;};

  for(const slot of ads.slots)select.add(new Option(locationName(slot),slot.id));
  for(const key of Object.keys(ads.colors)){
    const label=document.createElement('label'), input=document.createElement('input');
    input.type='radio';input.name='ad-paint';input.value=key;input.checked=key==='blue';
    label.append(input,document.createTextNode(colorName(key)));
    el('ad-colors').append(label);
  }

  function settings(){
    return {slot:select.value,color:form.elements['ad-paint'].value,days:days.valueAsNumber,text:ads.normalize(text.value)};
  }
  function draw(data){
    const w=preview.width,h=preview.height, style=ads.colors[data.color];
    ctx.fillStyle='#202b32';ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#364047';ctx.fillRect(0,278,w,82);
    ctx.fillStyle='#191e24';ctx.fillRect(55,68,852,221);
    ctx.fillStyle=style.paint;ctx.fillRect(63,75,835,206);
    for(let x=68;x<889;x+=27){
      ctx.fillStyle='#ffffff20';ctx.fillRect(x,84,5,187);
      ctx.fillStyle='#00000038';ctx.fillRect(x+7,84,7,187);
    }
    ctx.strokeStyle='#232b30';ctx.lineWidth=5;ctx.strokeRect(64,76,833,204);
    ctx.save();ctx.translate(72,98);
    ads.drawLettering(ctx,815,155,data.text||t('raceAds.sample'),data.color);
    ctx.restore();
  }
  function refresh(){
    const data=settings(), slot=ads.byId.get(data.slot), booked=occupied.get(data.slot);
    draw(data);
    el('ad-preview-label').textContent=locationName(slot)+' · '+colorName(data.color)+
      (booked?' · '+t('raceAds.current',{time:expiry.format(booked.expiresAt)}):'');
    el('ad-balance').textContent=ready?t('raceAds.balance',{amount:money(balance)}):t('raceAds.loading');
    const validDays=Number.isInteger(data.days)&&data.days>=1&&data.days<=ads.maxDays;
    const perDay=t('raceAds.priceDay',{amount:money(ads.daily)});
    el('ad-total').textContent=validDays
      ?t('raceAds.priceTotal',{perDay,total:money(ads.daily*data.days)}):perDay;
    el('ad-pay').disabled=busy||!ready||!!booked||!validDays||!data.text||Array.from(data.text).length>ads.maxText;
  }
  async function call(path,body){
    const response=await fetch('/api/race/ads/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    return response.json();
  }
  async function load(){
    const data=await call('status',{});
    if(data.error)throw Error(data.error);
    ready=true;balance=data.balance;
    if(root.isConnected)shop.updateBalance(balance);
    occupied=new Map(data.bookings.map(row=>[row.slot,row]));
    for(const option of select.options){
      option.textContent=locationName(ads.byId.get(option.value))+(occupied.has(option.value)?t('raceAds.occupied'):'');
    }
    refresh();
  }
  form.addEventListener('input',refresh);
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(el('ad-pay').disabled)return;
    const data=settings(), cost=ads.daily*data.days;
    if(balance<cost){showStatus(t('raceAds.insufficient'));return;}
    busy=true;refresh();
    try{
      const confirmed=await shop.confirm(t('raceAds.confirmTitle'),t('raceAds.confirmMessage',{
        slot:locationName(ads.byId.get(data.slot)),color:colorName(data.color),
        days:data.days,cost:money(cost)}));
      if(!confirmed)return;
      const signature=JSON.stringify(data);
      if(previousRequest?.signature!==signature){
        const id=Array.from(crypto.getRandomValues(new Uint8Array(18)),n=>n.toString(16).padStart(2,'0')).join('');
        previousRequest={signature,id};
      }
      const result=await call('book',{...data,id:previousRequest.id});
      if(result.error){
        showStatus(t('raceAds.errors.'+(result.error||'default')));
        if(result.error==='occupied'||result.error==='funds')await load();
        return;
      }
      balance=result.balance;
      occupied.set(result.booking.slot,result.booking);
      previousRequest=null;
      const message=t('raceAds.successMessage',{time:expiry.format(result.booking.expiresAt)});
      showStatus(message);
      if(root.isConnected){
        shop.updateBalance(balance);
        shop.notify(t('raceAds.successTitle'),message);
      }
      await load().catch(()=>{});
    }catch(error){showStatus(t('raceAds.pending'));}
    finally{busy=false;refresh();}
  });
  refresh();
  load().catch(()=>showStatus(t('raceAds.loadError')));
};
