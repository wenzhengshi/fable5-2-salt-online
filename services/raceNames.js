'use strict';
const {createHash}=require('node:crypto');
const storage=require('../config/storage');
const contentFilter=require('./contentFilter');
const file='race-names.json';
const MAX_NAME=16;
let cache=null;

function publicId(owner) {
  return 'SL-'+createHash('sha256').update('race:'+owner).digest('hex').slice(0,10).toUpperCase();
}
function cleanName(value) {
  if(typeof value!=='string')return '';
  return value.replace(/[\u0000-\u001f\u007f]/g,'').replace(/[<>]/g,'').trim().slice(0,MAX_NAME);
}
function load() {
  if(cache)return cache;
  cache=new Map();
  const stored=storage.readJson(file);
  if(!stored||typeof stored!=='object'||Array.isArray(stored))return cache;
  for(const [id,value] of Object.entries(stored)) {
    const name=cleanName(value);
    if(/^SL-[0-9A-F]{10}$/.test(id)&&name&&!contentFilter.isBlocked(name))cache.set(id,name);
  }
  return cache;
}
function remember(owner,value) {
  const name=cleanName(value);
  const id=owner?publicId(owner):'';
  if(!id||!name||contentFilter.isBlocked(name))return false;
  const names=load();
  if(names.get(id)===name)return true;
  try {
    storage.updateJson(file,stored=>{
      const data=stored&&typeof stored==='object'&&!Array.isArray(stored)?stored:{};
      data[id]=name;
      return data;
    });
    names.set(id,name);
    return true;
  } catch(error) {
    console.error('[race] player name save failed',error&&error.message);
    return false;
  }
}
function nameOfId(id) {
  return load().get(String(id||''))||'';
}
function nameOfOwner(owner) {
  return owner?nameOfId(publicId(owner)):'';
}
module.exports={publicId,remember,nameOfId,nameOfOwner};
