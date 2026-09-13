/* tangkap beberapa saat penting pada halaman POV */
const fs=require('fs'); const PORT=9223;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let id=0,ws=null; const w8=new Map();
function raw(m){const i=++id;return new Promise((res,rej)=>{w8.set(i,{res,rej});ws.send(JSON.stringify(Object.assign({id:i},m)));});}
(async()=>{
  const v=await (await fetch('http://127.0.0.1:'+PORT+'/json/version')).json();
  ws=new WebSocket(v.webSocketDebuggerUrl);
  await new Promise(r=>ws.addEventListener('open',r));
  ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);
    if(m.id&&w8.has(m.id)){const x=w8.get(m.id);w8.delete(m.id);m.error?x.rej(new Error(m.error.message)):x.res(m.result);}});
  const {targetId}=await raw({method:'Target.createTarget',params:{url:'about:blank'}});
  const {sessionId}=await raw({method:'Target.attachToTarget',params:{targetId,flatten:true}});
  const S=(m,p)=>raw({sessionId,method:m,params:p||{}});
  await S('Page.enable');await S('Runtime.enable');
  await S('Emulation.setDeviceMetricsOverride',{width:430,height:860,deviceScaleFactor:1,mobile:true});
  await S('Page.navigate',{url:'http://127.0.0.1:8742/pov.html'});
  await sleep(9000);
  await S('Runtime.evaluate',{expression:"document.getElementById('go').click()"});
  await sleep(1500);
  const shots=[['guncangan',45],['surut',4300],['puncak',4760],['tergenang',5400]];
  for(const [name,t] of shots){
    await S('Runtime.evaluate',{expression:
      "(function(){var s=document.getElementById('scrub');s.value="+Math.round(t/28800*1000)+";"+
      "s.dispatchEvent(new Event('input',{bubbles:true}));})()"});
    await sleep(1400);
    const sh=await S('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync('pov_'+name+'.png',Buffer.from(sh.data,'base64'));
    const r=await S('Runtime.evaluate',{expression:
      "document.getElementById('clock').textContent+' | '+document.getElementById('phase').textContent+' | air '+document.getElementById('roSea').textContent+' | kaki '+document.getElementById('roDepth').textContent",
      returnByValue:true});
    console.log('  '+name.padEnd(10)+r.result.value);
  }
  await raw({method:'Target.closeTarget',params:{targetId}}); ws.close(); process.exit(0);
})().catch(e=>{console.error('GAGAL:',e.message);process.exit(1);});
