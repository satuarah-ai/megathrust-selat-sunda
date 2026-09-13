/* Uji halaman POV di peramban sungguhan: galat konsol, WebGL, isi adegan, HUD. */
const fs=require('fs');
const URL_=process.argv[2]||'http://127.0.0.1:8742/pov.html';
const W=+(process.argv[3]||390), H=+(process.argv[4]||844);
const OUT=process.argv[5]||'pov_shot.png';
const PORT=+(process.env.PORT||9223);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let id=0, ws=null; const w8=new Map();
function raw(msg){const i=++id;
  return new Promise((res,rej)=>{w8.set(i,{res,rej});ws.send(JSON.stringify(Object.assign({id:i},msg)));});}
(async()=>{
  let v=null;
  for(let i=0;i<50;i++){ try{ v=await (await fetch('http://127.0.0.1:'+PORT+'/json/version')).json(); break; }
    catch(e){ await sleep(500); } }
  if(!v) throw new Error('Chrome debug tidak menyahut di port '+PORT);
  ws=new WebSocket(v.webSocketDebuggerUrl);
  await new Promise(r=>ws.addEventListener('open',r));
  const errs=[], warns=[];
  ws.addEventListener('message',ev=>{
    const m=JSON.parse(ev.data);
    if(m.id&&w8.has(m.id)){const x=w8.get(m.id);w8.delete(m.id);
      m.error?x.rej(new Error(m.error.message)):x.res(m.result);return;}
    if(m.method==='Runtime.exceptionThrown'){
      const d=m.params.exceptionDetails;
      errs.push((d.exception&&d.exception.description||d.text||'').split('\n')[0].slice(0,180)); }
    if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error'){
      errs.push((m.params.args||[]).map(a=>a.value||a.description||'').join(' ').slice(0,180)); }
    if(m.method==='Log.entryAdded'&&m.params.entry.level==='error'){
      errs.push((m.params.entry.text||'').slice(0,180)); }
  });
  const {targetId}=await raw({method:'Target.createTarget',params:{url:'about:blank'}});
  const {sessionId}=await raw({method:'Target.attachToTarget',params:{targetId,flatten:true}});
  const S=(method,params)=>raw({sessionId,method,params:params||{}});
  await S('Page.enable'); await S('Runtime.enable'); await S('Log.enable');
  await S('Network.enable'); await S('Network.setCacheDisabled',{cacheDisabled:true});
  await S('Emulation.setDeviceMetricsOverride',
    {width:W,height:H,deviceScaleFactor:+(process.env.DSF||1),mobile:W<700});
  await S('Page.navigate',{url:URL_});
  await sleep(9000);
  // tekan tombol mulai lalu biarkan berjalan
  await S('Runtime.evaluate',{expression:"(document.getElementById('go')||{click(){}}).click()"});
  await sleep(2500);
  // maju ke saat air datang supaya adegan air ikut teruji
  await S('Runtime.evaluate',{expression:"(document.getElementById('toWave')||{click(){}}).click()"});
  await sleep(6000);
  const probe=`(function(){
    var de=document.documentElement;
    var cv=document.getElementById('stage');
    var gl=null; try{ gl=cv.getContext('webgl2')||cv.getContext('webgl'); }catch(e){}
    function txt(id){var e=document.getElementById(id);return e?e.textContent.trim():'(tak ada)';}
    return JSON.stringify({
      vw:de.clientWidth, sw:de.scrollWidth,
      kanvas: cv? (cv.width+'x'+cv.height):'tak ada',
      webgl: !!gl,
      renderer: gl? (function(){var d=gl.getExtension('WEBGL_debug_renderer_info');
        return d? String(gl.getParameter(d.UNMASKED_RENDERER_WEBGL)).slice(0,60):'?';})():'-',
      intro: !!document.getElementById('intro'),
      jam: txt('clock'), fase: txt('phase'), mmi: txt('roMmi'),
      acc: txt('roAcc'), laut: txt('roSea'), dalam: txt('roDepth'), eta: txt('roEta'),
      lokasi: txt('locName'),
      opsiLokasi: document.getElementById('site').options.length,
      audio: (function(){try{return typeof (window.AudioContext||window.webkitAudioContext)==='function';}catch(e){return false;}})(),
      tutup: (function(){
        var H=de.clientHeight, W=de.clientWidth, m=[];
        ['.topbar','.strip','.dock','#intro'].forEach(function(sel){
          var e=document.querySelector(sel); if(!e||e.offsetParent===null) return;
          var r=e.getBoundingClientRect(); if(r.height>0) m.push([r.top,r.bottom]);});
        var tot=0; m.forEach(function(a){tot+=Math.min(a[1],H)-Math.max(a[0],0);});
        return Math.round(100*tot/H);})(),
      panel: !!(document.getElementById('panel')&&!document.getElementById('panel').hidden)
    });})()`;
  const r=await S('Runtime.evaluate',{expression:probe,returnByValue:true});
  const info=JSON.parse(r.result.value);
  console.log('  viewport          : '+info.vw+' px (scrollWidth '+info.sw+')'+(info.sw>info.vw?'  << MELEYOT':''));
  console.log('  kanvas / WebGL    : '+info.kanvas+'  |  WebGL '+(info.webgl?'aktif':'MATI')+'  |  '+info.renderer);
  console.log('  panel pembuka     : '+(info.intro?'MASIH ADA (tombol mulai gagal)':'tertutup'));
  console.log('  lokasi            : '+info.lokasi+'  ('+info.opsiLokasi+' pilihan)');
  console.log('  jam / fase        : '+info.jam+'  |  '+info.fase);
  console.log('  MMI / percepatan  : '+info.mmi+'  |  '+info.acc);
  console.log('  muka air / kaki   : '+info.laut+'  |  '+info.dalam+'  |  '+info.eta);
  console.log('  Web Audio         : '+(info.audio?'tersedia':'tidak ada'));
  console.log('  layar tertutup HUD: '+info.tutup+'%  (pemandangan '+(100-info.tutup)+'%)');
  console.log('  panel tambahan    : '+(info.panel?'terbuka':'tertutup'));
  console.log('  galat konsol      : '+(errs.length?errs.length:'nihil'));
  errs.slice(0,8).forEach(e=>console.log('      ! '+e));
  const shot=await S('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync(OUT,Buffer.from(shot.data,'base64'));
  console.log('  tangkapan layar   : '+OUT+' ('+Math.round(fs.statSync(OUT).size/1024)+' KB)');
  await raw({method:'Target.closeTarget',params:{targetId}});
  ws.close();
  process.exit(errs.length||!info.webgl||info.sw>info.vw+1?1:0);
})().catch(e=>{console.error('GAGAL:',e.message);process.exit(2);});
