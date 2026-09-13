/* Cari lapisan yang membuat tanah hitam pada pandangan mata */
const fs=require('fs'); const PORT=+(process.env.PORT||9223);
const URL_='http://127.0.0.1:8742/pov.html';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let id=0,ws=null; const w8=new Map();
function raw(m){const i=++id;return new Promise((res,rej)=>{w8.set(i,{res,rej});ws.send(JSON.stringify(Object.assign({id:i},m)));});}
(async()=>{
  const v=await (await fetch('http://127.0.0.1:'+PORT+'/json/version')).json();
  ws=new WebSocket(v.webSocketDebuggerUrl); await new Promise(r=>ws.addEventListener('open',r));
  const errs=[];
  ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);
    if(m.id&&w8.has(m.id)){const x=w8.get(m.id);w8.delete(m.id);m.error?x.rej(new Error(m.error.message)):x.res(m.result);return;}
    if(m.method==='Runtime.consoleAPICalled'&&(m.params.type==='error'||m.params.type==='warning')){
      errs.push(m.params.type+': '+(m.params.args||[]).map(a=>a.value||a.description||'').join(' ').slice(0,300));}});
  const {targetId}=await raw({method:'Target.createTarget',params:{url:'about:blank'}});
  const {sessionId}=await raw({method:'Target.attachToTarget',params:{targetId,flatten:true}});
  const S=(m,p)=>raw({sessionId,method:m,params:p||{}});
  await S('Page.enable');await S('Runtime.enable');
  await S('Network.enable'); await S('Network.setCacheDisabled',{cacheDisabled:true});
  await S('Emulation.setDeviceMetricsOverride',{width:430,height:860,deviceScaleFactor:1,mobile:true});
  await S('Page.navigate',{url:URL_}); await sleep(9000);
  const ev=async(js)=>{const r=await S('Runtime.evaluate',{expression:js,returnByValue:true,awaitPromise:true});return r.result.value;};
  await ev("document.getElementById('go').click()"); await sleep(500);
  await ev("window.__STEP(0,{t:2,cam:'mata'})"); await sleep(300);
  const cases=[
    ['bawaan',''],
    ['tanah_hilang',"window.__SCENE.ground().visible=false"],
    ['air_dekat_hilang',"window.__SCENE.ground().visible=true; window.__SCENE.nearWater.visible=false"],
    ['pecahan_hilang',"window.__SCENE.nearWater.visible=true; window.__SCENE.frag().visible=false"],
    ['tanah_lambert',"window.__SCENE.frag().visible=true; window.__SCENE.ground().material=new THREE.MeshLambertMaterial({vertexColors:true})"],
  ];
  for(const [nm,js] of cases){
    if(js) await ev(js);
    await ev("window.__STEP(0.001)"); await sleep(250);
    const sh=await S('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync('blk_'+nm+'.png',Buffer.from(sh.data,'base64'));
  }
  const info=await ev("JSON.stringify({groundPos:window.__SCENE.ground().position.toArray(),worldY:window.__SCENE.world.position.y,camY:window.__SCENE.camera.position.y,groundVisible:window.__SCENE.ground().visible,groundBS:(window.__SCENE.ground().geometry.boundingSphere||{}).radius,frustum:window.__SCENE.ground().frustumCulled})");
  console.log('  info: '+info);
  console.log('  peringatan/galat konsol: '+(errs.length||'nihil')); errs.slice(0,6).forEach(e=>console.log('     '+e));
  await raw({method:'Target.closeTarget',params:{targetId}}); ws.close(); process.exit(0);
})().catch(e=>{console.error('GAGAL:',e.message);process.exit(2);});
