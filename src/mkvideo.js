/* Render video bingkai-demi-bingkai lewat CDP + window.__STEP (deterministik, 24 fps).
   Keluaran: folder frames/NNNNN.jpg, lalu dirakit oleh mkvideo.py (OpenCV). */
const fs=require('fs'), path=require('path');
const PORT=+(process.env.PORT||9223);
const URL_=process.argv[2]||'http://127.0.0.1:8742/pov.html';
const SITE=process.argv[3]||'labuan';
const W=+(process.env.VW||720), H=+(process.env.VH||1280), FPS=24;
const OUT=path.resolve('frames_'+SITE); fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let id=0,ws=null; const w8=new Map();
function raw(m){const i=++id;return new Promise((res,rej)=>{w8.set(i,{res,rej});ws.send(JSON.stringify(Object.assign({id:i},m)));});}
(async()=>{
  const v=await (await fetch('http://127.0.0.1:'+PORT+'/json/version')).json();
  ws=new WebSocket(v.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r));
  ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);
    if(m.id&&w8.has(m.id)){const x=w8.get(m.id);w8.delete(m.id);m.error?x.rej(new Error(m.error.message)):x.res(m.result);}});
  const {targetId}=await raw({method:'Target.createTarget',params:{url:'about:blank'}});
  const {sessionId}=await raw({method:'Target.attachToTarget',params:{targetId,flatten:true}});
  const S=(m,p)=>raw({sessionId,method:m,params:p||{}});
  await S('Page.enable');await S('Runtime.enable');
  await S('Network.enable'); await S('Network.setCacheDisabled',{cacheDisabled:true});
  await S('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:true});
  await S('Page.navigate',{url:URL_}); await sleep(9000);
  const ev=async(js)=>{const r=await S('Runtime.evaluate',{expression:js,returnByValue:true,awaitPromise:true});return r.result.value;};
  await ev("document.getElementById('site').value='"+SITE+"'; document.getElementById('site').dispatchEvent(new Event('change'))");
  await sleep(800);
  await ev("document.getElementById('go').click(); document.getElementById('sound').click();"); // bisu saat render
  await sleep(600);
  const site=JSON.parse(await ev("JSON.stringify((function(){var s=window.__POV.site.find(function(x){return x.key==='"+SITE+"'});return {rrup:s.rrup,dur:s.durasi,tTiba:s.tTiba,tPuncak:s.tPuncak};})())"));
  const tS=site.rrup/3.6;
  /* naskah adegan: [t_mulai, t_akhir, detik video, kamera] */
  const shots=[
    [0,            tS-2,            3,  'mata' ],   // tenang
    [tS-2,         tS+site.dur+6,   16, 'mata' ],   // guncangan (dipercepat ~4x)
    [tS+site.dur+6,tS+site.dur+40,  4,  'udara'],   // sesudah guncangan, dari udara
    [site.tTiba-150, site.tTiba+40, 14, 'udara'],   // laut surut -> air datang
    [site.tTiba+40, site.tPuncak+120, 14, 'udara'], // menerjang kota
    [site.tPuncak+120, site.tPuncak+124, 4, 'mata'] // pandangan mata di tengah banjir
  ];
  let n=0; const t0=Date.now();
  for(const [a,b,secs,cam] of shots){
    const frames=Math.round(secs*FPS), dt=(b-a)/frames;
    await ev("window.__STEP(0,{t:"+a+",cam:'"+cam+"'})");
    for(let f=0;f<frames;f++){
      await ev("window.__STEP("+dt+")");
      const sh=await S('Page.captureScreenshot',{format:'jpeg',quality:88});
      fs.writeFileSync(path.join(OUT,String(n).padStart(5,'0')+'.jpg'),Buffer.from(sh.data,'base64'));
      n++;
      if(n%48===0) process.stdout.write('\r  bingkai '+n+'  ('+Math.round((Date.now()-t0)/1000)+' s)   ');
    }
  }
  console.log('\r  '+n+' bingkai ditulis ke '+OUT+' dalam '+Math.round((Date.now()-t0)/1000)+' s');
  await raw({method:'Target.closeTarget',params:{targetId}}); ws.close(); process.exit(0);
})().catch(e=>{console.error('GAGAL:',e.message);process.exit(2);});
