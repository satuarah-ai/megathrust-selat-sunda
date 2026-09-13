/* Buat gambar pratinjau 1200x630 untuk tautan yang dibagikan (WhatsApp, X, FB). */
const fs=require('fs');
const PORT=9222, URL_='http://127.0.0.1:8731/index.html';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let id=0, ws=null; const w8=new Map();
function raw(msg){ const i=++id;
  return new Promise((res,rej)=>{ w8.set(i,{res,rej}); ws.send(JSON.stringify(Object.assign({id:i},msg))); }); }
(async()=>{
  let v=null;
  for(let i=0;i<40;i++){ try{ v=await (await fetch('http://127.0.0.1:'+PORT+'/json/version')).json(); break; }catch(e){ await sleep(500); } }
  if(!v) throw new Error('Chrome debug tidak menyahut');
  ws=new WebSocket(v.webSocketDebuggerUrl);
  await new Promise(r=>ws.addEventListener('open',r));
  ws.addEventListener('message',ev=>{ const m=JSON.parse(ev.data);
    if(m.id&&w8.has(m.id)){ const x=w8.get(m.id); w8.delete(m.id);
      m.error?x.rej(new Error(m.error.message)):x.res(m.result); } });
  const {targetId}=await raw({method:'Target.createTarget',params:{url:'about:blank'}});
  const {sessionId}=await raw({method:'Target.attachToTarget',params:{targetId,flatten:true}});
  const S=(method,params)=>raw({sessionId,method,params:params||{}});
  await S('Page.enable'); await S('Runtime.enable');
  await S('Emulation.setDeviceMetricsOverride',{width:1240,height:900,deviceScaleFactor:1,mobile:false});
  // paksa tema gelap supaya peta menyatu dengan panelnya
  await S('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});
  await S('Page.navigate',{url:URL_});
  await sleep(11000);
  const r=await S('Runtime.evaluate',{expression:
    "(function(){var e=document.querySelector('.mapbox').getBoundingClientRect();"+
    "return JSON.stringify({x:e.left+scrollX,y:e.top+scrollY,w:e.width,h:e.height});})()",
    returnByValue:true});
  const b=JSON.parse(r.result.value);
  // ambil pita 1200x630 berpusat pada peta
  const W=1200,H=630;
  const cx=b.x+b.w/2, cy=b.y+b.h/2;
  const clip={x:Math.max(0,Math.round(cx-W/2)),y:Math.max(0,Math.round(cy-H/2)),width:W,height:H,scale:1};
  const shot=await S('Page.captureScreenshot',{format:'jpeg',quality:84,captureBeyondViewport:true,clip});
  fs.writeFileSync('og.jpg',Buffer.from(shot.data,'base64'));
  console.log('og.png '+Math.round(fs.statSync('og.jpg').size/1024)+' KB  ('+W+'x'+H+')');
  await raw({method:'Target.closeTarget',params:{targetId}});
  ws.close(); process.exit(0);
})().catch(e=>{console.error('GAGAL:',e.message);process.exit(1);});
