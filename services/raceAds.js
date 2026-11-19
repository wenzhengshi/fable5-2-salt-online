'use strict';
const storage=require('../config/storage');
const {isBlocked}=require('./contentFilter');
const ads=require('../public/race/ad-rules');
const file='frontier-inventory.json';
const publicBooking=row=>({slot:row.slot,text:row.text,color:row.color,expiresAt:row.expiresAt});
const openBookings=(data,now)=>Object.values(data.raceAds||{}).filter(row=>row.expiresAt>now).map(publicBooking);
function listings(now=Date.now()) {
  return {bookings:openBookings(storage.readJson(file),now),now};
}
function status(owner,now=Date.now()) {
  const data=storage.readJson(file);
  return {balance:data.gold?.carried?.[owner]||0,daily:ads.daily,bookings:openBookings(data,now),now};
}
function book(owner,input,now=Date.now()) {
  const {slot,color,days,id}=input||{};
  const text=ads.normalize(input?.text);
  if(!ads.byId.has(slot)||typeof color!=='string'||!Object.hasOwn(ads.colors,color)||!Number.isInteger(days)||days<1||days>ads.maxDays||
    typeof id!=='string'||!/^[a-f0-9]{36}$/.test(id)||!text||Array.from(text).length>ads.maxText) return {error:'input'};
  if(isBlocked(text))return {error:'text'};
  const price=ads.daily*days;
  let result;
  storage.updateJson(file,stored=>{
    const data=Array.isArray(stored)?{}:stored;
    const bookings=data.raceAds||={};
    const wallet=(data.gold||={}).carried||={};
    for(const [key,row] of Object.entries(bookings))if(row.expiresAt<=now)delete bookings[key];
    const old=bookings[slot];
    const balance=wallet[owner]||0;
    if(old) {
      result=old.owner===owner&&old.request===id?{booking:publicBooking(old),balance}:{error:'occupied'};
      return data;
    }
    if(balance<price){result={error:'funds'};return data;}
    wallet[owner]=balance-price;
    const row=bookings[slot]={slot,text,color,owner,request:id,expiresAt:now+days*ads.dayMs};
    result={booking:publicBooking(row),balance:wallet[owner]};
    return data;
  });
  return result;
}
module.exports={listings,status,book};
