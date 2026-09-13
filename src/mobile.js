/* Uji tampilan HP sungguhan lewat Chrome DevTools Protocol:
   emulasi perangkat, ukur luapan horizontal, lalu tangkap layar penuh. */
const fs=require('fs');
const URL_=process.argv[2]||'http://127.0.0.1:8731/index.html';
const W=+(process.argv[3]||390), H=+(process.argv[4]||844);
const OUT=process.argv[5]||'hp.png';
const PORT=9222;

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let id=0, ws=null; const waiters=new Map();
function send(method,params){
  const i=++id;
  return new Promise((res,rej)=>{ waiters.set(i,{res,rej});
    ws.send(JSON.stringify({id:i,method,params:params||{}})); });
}
(async()=>{
  // cari target
  let v=null;
  for(let i=0;i<40;i++){ try{ v=await (await fetch('http://127.0.0.1:'+PORT+'/json/version')).json(); break; }
    catch(e){ await sleep(500); } }
  if(!v) throw new Error('Chrome debug tidak menyahut di port '+PORT);
  ws=new WebSocket(v.webSocketDebuggerUrl);
  await new Promise(r=>ws.addEventListener('open',r));
  ws.addEventListener('message',ev=>{
    const m=JSON.parse(ev.data);
    if(m.id&&waiters.has(m.id)){ const w=waiters.get(m.id); waiters.delete(m.id);
      m.error?w.rej(new Error(m.error.message)):w.res(m.result); }
  });
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
  const S=(method,params)=>{
    const i=++id;
    return new Promise((res,rej)=>{ waiters.set(i,{res,rej});
      ws.send(JSON.stringify({sessionId,id:i,method,params:params||{}})); });
  };
  await S('Page.enable'); await S('Runtime.enable');
  await S('Emulation.setDeviceMetricsOverride',
    {width:W,height:H,deviceScaleFactor:+(process.env.DSF||2),mobile:true});
  await S('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await S('Page.navigate',{url:URL_});
  await sleep(9000);
  const probe=`(function(){
    var de=document.documentElement,w=de.clientWidth,bad=[];
    function inScroller(el){var p=el.parentElement;
      while(p&&p!==document.body){var s=getComputedStyle(p);
        if(s.overflowX==='auto'||s.overflowX==='scroll'||s.overflowX==='hidden')return true;p=p.parentElement;}
      return false;}
    var all=document.querySelectorAll('body *');
    for(var i=0;i<all.length;i++){var el=all[i],r=el.getBoundingClientRect();
      if(r.width>0&&r.right>w+1&&!inScroller(el))
        bad.push(el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+
          (el.className?'.'+String(el.className).split(' ').join('.'):'')+
          ' [kanan '+Math.round(r.right)+' lebar '+Math.round(r.width)+']');}
    var tbl=[].map.call(document.querySelectorAll('table'),function(t){
      return t.id+' lebar='+Math.round(t.getBoundingClientRect().width);});
    return JSON.stringify({vw:w,sw:de.scrollWidth,bsw:document.body.scrollWidth,
      over:bad.slice(0,15),nover:bad.length,tables:tbl,
      figs:document.querySelectorAll('.fig').length,
      rows:document.querySelectorAll('#jbdTable tbody tr').length,
      tl:document.querySelectorAll('.tlrow').length,
      qual:(document.getElementById('qual')||{}).value,
      loaded:!document.getElementById('loading'),
      docH:document.body.scrollHeight});
  })()`;
  const r=await S('Runtime.evaluate',{expression:probe,returnByValue:true});
  const info=JSON.parse(r.result.value);
  console.log('  viewport CSS      : '+info.vw+' px'+(info.vw===W?'  (benar)':'  (TIDAK SESUAI '+W+')'));
  console.log('  scrollWidth       : '+info.sw+(info.sw>info.vw?'  << MELEYOT':'  (pas)'));
  console.log('  body.scrollWidth  : '+info.bsw);
  console.log('  elemen melewati tepi: '+info.nover);
  info.over.forEach(s=>console.log('      '+s));
  console.log('  data termuat      : '+(info.loaded?'ya':'BELUM'));
  console.log('  mode simulasi     : '+info.qual);
  console.log('  kartu angka       : '+info.figs+' | baris tabel Jabodetabek: '+info.rows+' | baris garis waktu: '+info.tl);
  console.log('  lebar tabel       : '+info.tables.join(' , '));
  console.log('  tinggi halaman    : '+info.docH+' px');
  const CH=+(process.env.CLIPH||0);
  const opt={format:'png',captureBeyondViewport:true};
  if(CH) opt.clip={x:0,y:+(process.env.CLIPY||0),width:W,height:CH,scale:1};
  const shot=await S('Page.captureScreenshot',opt);
  fs.writeFileSync(OUT,Buffer.from(shot.data,'base64'));
  console.log('  tangkapan layar   : '+OUT+' ('+Math.round(fs.statSync(OUT).size/1024)+' KB)');
  await send('Target.closeTarget',{targetId});
  ws.close();
  process.exit(info.sw>info.vw+1||info.nover>0?1:0);
})().catch(e=>{console.error('GAGAL:',e.message);process.exit(2);});
