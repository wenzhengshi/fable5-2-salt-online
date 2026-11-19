((root,factory)=>{
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.SaltRaceAds=factory();
})(typeof globalThis==='object'?globalThis:this,()=>{
  'use strict';
  const daily=100000, dayMs=86400000, maxDays=365, maxText=36;
  const colors={
    red:{name:'砖红',paint:'#843e34',ink:'#fff5dc'},
    blue:{name:'港湾蓝',paint:'#3f5c72',ink:'#f7f4e8'},
    teal:{name:'海松绿',paint:'#35646a',ink:'#fff7dc'},
    green:{name:'橄榄绿',paint:'#545d40',ink:'#fff3d6'},
    orange:{name:'锈橙',paint:'#a56639',ink:'#fff7e6'},
    grey:{name:'钢灰',paint:'#64696b',ink:'#fff4df'}
  };
  const rows=[0,3,8,15,28,49,70,100,133,158];
  const slots=rows.flatMap(row=>[-1,1].map(side=>({id:row+(side<0?'R':'L'),row,side,
    km:row*12.19*6/1000})));
  const byId=new Map(slots.map(slot=>[slot.id,slot]));
  const normalize=text=>typeof text==='string'?text.normalize('NFC').replace(/[\p{C}]/gu,' ').replace(/\s+/gu,' ').trim():'';
  function drawLettering(ctx,width,height,message,color){
    const style=colors[color];
    if(!style||!message)return;
    const chars=Array.from(message);
    const lineWidth=chars.length>18?Math.ceil(chars.length/2):chars.length;
    const lines=chars.length>18?[chars.slice(0,lineWidth).join(''),chars.slice(lineWidth).join('')]:[message];
    const size=Math.floor(height*(lines.length===2?.31:.54));
    ctx.save();
    ctx.font='900 '+size+'px "Noto Sans SC","Microsoft YaHei","PingFang SC",sans-serif';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.lineJoin='round';
    ctx.lineWidth=Math.max(2,size*.038);
    ctx.strokeStyle='#151719';
    ctx.fillStyle=style.ink;
    lines.forEach((line,index)=>{
      const y=height/2+(index-(lines.length-1)/2)*size*1.12;
      ctx.strokeText(line,width/2,y,width*.87);
      ctx.fillText(line,width/2,y,width*.87);
    });
    ctx.restore();
  }
  return {daily,dayMs,maxDays,maxText,colors,slots,byId,normalize,drawLettering,
    at:(row,side)=>byId.get(row+(side<0?'R':'L'))};
});
