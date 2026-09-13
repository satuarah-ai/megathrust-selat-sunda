const fs=require('fs'); const PORT=9223; const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let id=0,ws=null; const w8=new Map();
function raw(m){const i=++id;return new Promise((res,rej)=>{w8.set(i,{res,rej});ws.send(JSON.stringify(Object.assign({id:i},m)));});}
(async()=>{
  const v=await (await fetch('http://127.0.0.1:'+PORT+'/json/version')).json();
  ws=new WebSocket(v.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r));
  ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);if(m.id&&w8.has(m.id)){const x=w8.get(m.id);w8.delete(m.id);m.error?x.rej(new Error(m.error.message)):x.res(m.result);}});
  const {targetId}=await raw({method:'Target.createTarget',params:{url:'about:blank'}});
  const {sessionId}=await raw({method:'Target.attachToTarget',params:{targetId,flatten:true}});
  const S=(m,p)=>raw({sessionId,method:m,params:p||{}});
  await S('Page.enable');await S('Runtime.enable');await S('Network.enable');await S('Network.setCacheDisabled',{cacheDisabled:true});
  await S('Emulation.setDeviceMetricsOverride',{width:430,height:860,deviceScaleFactor:1,mobile:true});
  await S('Page.navigate',{url:'http://127.0.0.1:8742/pov.html'}); await sleep(9000);
  const ev=async(js)=>{const r=await S('Runtime.evaluate',{expression:js,returnByValue:true,awaitPromise:true});return r.result.value;};
  await ev("document.getElementById('go').click()"); await sleep(400);
  await ev("window.__STEP(0,{t:19.4,cam:'mata'})");
  for(let i=0;i<24*30;i++) await ev("window.__STEP(1/24)");     // 30 detik guncangan pada 1x
  let sh=await S('Page.captureScreenshot',{format:'png'}); fs.writeFileSync('eye_shake.png',Buffer.from(sh.data,'base64'));
  console.log('  '+await ev("document.getElementById('clock').textContent+' | runtuh '+document.getElementById('roRuin').textContent"));
  await raw({method:'Target.closeTarget',params:{targetId}}); ws.close(); process.exit(0);
})().catch(e=>{console.error('GAGAL:',e.message);process.exit(2);});
