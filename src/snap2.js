/* Tangkap momen kunci dengan MEMBIARKAN simulasi berjalan (bukan melompat),
   supaya pecahan sempat jatuh dan air sempat mengalir. */
const fs=require('fs'); const PORT=+(process.env.PORT||9223);
const URL_=process.argv[2]||'http://127.0.0.1:8742/pov.html';
const W=+(process.argv[3]||430), H=+(process.argv[4]||860);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let id=0,ws=null; const w8=new Map();
function raw(m){const i=++id;return new Promise((res,rej)=>{w8.set(i,{res,rej});ws.send(JSON.stringify(Object.assign({id:i},m)));});}
(async()=>{
  const v=await (await fetch('http://127.0.0.1:'+PORT+'/json/version')).json();
  ws=new WebSocket(v.webSocketDebuggerUrl);
  await new Promise(r=>ws.addEventListener('open',r));
  const errs=[];
  ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);
    if(m.id&&w8.has(m.id)){const x=w8.get(m.id);w8.delete(m.id);m.error?x.rej(new Error(m.error.message)):x.res(m.result);return;}
    if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;errs.push((d.exception&&d.exception.description||d.text||'').split('\n')[0].slice(0,160));}});
  const {targetId}=await raw({method:'Target.createTarget',params:{url:'about:blank'}});
  const {sessionId}=await raw({method:'Target.attachToTarget',params:{targetId,flatten:true}});
  const S=(m,p)=>raw({sessionId,method:m,params:p||{}});
  await S('Page.enable');await S('Runtime.enable');
  await S('Network.enable'); await S('Network.setCacheDisabled',{cacheDisabled:true});
  await S('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:W<700});
  await S('Page.navigate',{url:URL_});
  await sleep(9000);
  const ev=async(js)=>{const r=await S('Runtime.evaluate',{expression:js,returnByValue:true,awaitPromise:true});return r.result.value;};
  const state=async()=>await ev("document.getElementById('clock').textContent+' | '+document.getElementById('phase').textContent+' | runtuh '+document.getElementById('roRuin').textContent+' | air '+document.getElementById('roSea').textContent+' | kaki '+document.getElementById('roDepth').textContent+' | spanduk: '+(document.getElementById('banner').hidden?'-':document.getElementById('bannerT').textContent)");
  const shot=async(name)=>{const sh=await S('Page.captureScreenshot',{format:'png'});fs.writeFileSync('v3_'+name+'.png',Buffer.from(sh.data,'base64'));console.log('  '+name.padEnd(14)+await state());};
  // mulai sinematik
  await ev("document.getElementById('go').click()");
  // guncangan Labuan mulai T+19 s (kecepatan 60x sampai T+7 s lalu 1x). tunggu sampai runtuh terlihat
  await sleep(20000); await shot('guncang_awal');
  await sleep(22000); await shot('guncang_puncak');
  await sleep(30000); await shot('guncang_akhir');
  // lompat ke air datang (kamera sinematik pindah ke udara saat surut/tiba)
  await ev("document.getElementById('toWave').click()");
  await sleep(12000); await shot('surut');
  await sleep(26000); await shot('air_tiba');
  await sleep(30000); await shot('air_puncak');
  // pandangan mata di tengah banjir
  await ev("document.getElementById('view').click()"); await sleep(1200); await shot('mata_banjir');
  // metrik kinerja: fps kasar
  const fps=await ev("(function(){return new Promise(function(res){var n=0,t0=performance.now();function f(){n++;if(performance.now()-t0<2000)requestAnimationFrame(f);else res(Math.round(n/2));}requestAnimationFrame(f);});})()").catch(()=>'?');
  console.log('  fps (2 dtk)   '+JSON.stringify(fps));
  console.log('  galat konsol  '+(errs.length?errs.length:'nihil'));
  errs.slice(0,6).forEach(e=>console.log('     ! '+e));
  await raw({method:'Target.closeTarget',params:{targetId}}); ws.close(); process.exit(errs.length?1:0);
})().catch(e=>{console.error('GAGAL:',e.message);process.exit(2);});
