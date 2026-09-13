const GC=require('fs').readFileSync('gc_snippet.html','utf8');
const fs=require('fs'), zlib=require('zlib'), path=require('path');
const meta=require('./data/meta.json');
const jf=JSON.parse(fs.readFileSync('./data/jkt_flood.json','utf8'));
const bundle=JSON.parse(fs.readFileSync('./data/bundle.json','utf8'));
bundle.jkt=jf;

/* ---------- grid: delta per baris lalu gzip ---------- */
const SPEC=[
 ['main','data/main.i16',2,meta.main.nx],
 ['etaMax','data/etaMax.i16',2,meta.main.nx],
 ['tArr','data/tArr.i16',2,meta.main.nx],
 ['deform','data/deform.i16',2,meta.main.nx],
 ['jkt','data/jkt_elev.i16',2,jf.w],
 ['mmi','data/mmi.u8',1,0],
 ['vs30','data/vs30.u8',1,0]
];
function deltaEncode(a,w){const d=new Int16Array(a.length),rows=a.length/w;
  for(let j=0;j<rows;j++){let p=0;const o=j*w;
    for(let i=0;i<w;i++){const v=a[o+i];d[o+i]=(v-p)|0;p=v;}} return d;}
function deltaDecode(d,w){const a=new Int16Array(d.length),rows=d.length/w;
  for(let j=0;j<rows;j++){let p=0;const o=j*w;
    for(let i=0;i<w;i++){p=(p+d[o+i])|0;a[o+i]=p;}} return a;}

const OUT='site', DATA=path.join(OUT,'data');
fs.rmSync(OUT,{recursive:true,force:true});
fs.mkdirSync(DATA,{recursive:true});
const B64={}; let rawTot=0, gzTot=0;
console.log('NAMA         MENTAH      .gz   uji bolak-balik');
for(const [name,src,bytes,w] of SPEC){
  const buf=fs.readFileSync(src);
  let payload, verdict='tanpa delta';
  if(w){
    const a=new Int16Array(buf.buffer,buf.byteOffset,buf.length/2);
    const d=deltaEncode(a,w), back=deltaDecode(d,w);
    let same=true; for(let k=0;k<a.length;k++) if(a[k]!==back[k]){same=false;break;}
    if(!same) throw new Error('delta rusak pada '+name);
    payload=Buffer.from(d.buffer); verdict='lolos';
  } else payload=buf;
  const gz=zlib.gzipSync(payload,{level:9});
  fs.writeFileSync(path.join(DATA,name+'.bin'),payload);
  fs.writeFileSync(path.join(DATA,name+'.gz'),gz);
  B64[name]=gz.toString('base64');
  rawTot+=buf.length; gzTot+=gz.length;
  console.log(' '+name.padEnd(10)+String(Math.round(buf.length/1024)).padStart(6)+' KB'+
              String(Math.round(gz.length/1024)).padStart(7)+' KB   '+verdict);
}
console.log(' TOTAL     '+String(Math.round(rawTot/1024)).padStart(7)+' KB'+
            String(Math.round(gzTot/1024)).padStart(7)+' KB');

/* ---------- fisika ---------- */
const core=fs.readFileSync('core.js','utf8')
  .split('\n').filter(l=>!l.trim().startsWith('module.exports')).join('\n');
if(core.indexOf('</scr'+'ipt')>=0) throw new Error('core.js memuat penutup script');
const EXPORTS='\nwindow.__PHYS={okadaUz:okadaUz,buildFault:buildFault,deformAt:deformAt,rrupKm:rrupKm,'+
 'makeSim:makeSim,deformCoarse:deformCoarse,coarseToFine:coarseToFine,rupFrac:rupFrac,'+
 'vs30Grid:vs30Grid,groundMotion:groundMotion,mmiWorden:mmiWorden,durationSec:durationSec,liqProb:liqProb};\n';
const A=fs.readFileSync('partA.html','utf8'), Bh=fs.readFileSync('partB.html','utf8');
const Ch=fs.readFileSync('partC.html','utf8'), Dh=fs.readFileSync('partD.html','utf8');
const S='</'+'script>';
const physBlock='<script id="phys" type="text/plain">\n'+core+'\n'+S;
const physRun='<script>\n'+core+EXPORTS+S;
const dataBlock=function(withBin){
  return '<script>window.__DATA='+JSON.stringify(bundle)+
    (withBin?';window.__BIN='+JSON.stringify(B64):'')+';'+S;
};

/* ---------- 1. versi Artifact ---------- */
const artifact=[A,Bh,physBlock,physRun,dataBlock(true),Ch,Dh].join('\n');
fs.writeFileSync('megathrust.html',artifact);

/* ---------- 2. versi web ---------- */
const OG=process.env.OGIMG||'og.jpg';
const FAV="data:image/svg+xml,"+encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text y="52" font-size="52">\u{1F30A}</text></svg>');
const HEAD='<!doctype html>\n<html lang="id">\n<head>\n'+
'<meta charset="utf-8">\n'+
'<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'+
'<meta name="description" content="Simulasi fisika gempa megathrust Mw 9,5 di Selat Sunda: rupture, tsunami, guncangan, likuefaksi, dan dampaknya di Jabodetabek. Dihitung di atas batimetri GMRT, penduduk GHSL, dan katalog gempa USGS.">\n'+
'<meta name="theme-color" content="#060f17">\n'+
'<meta property="og:type" content="website">\n'+
'<meta property="og:title" content="Megathrust Selat Sunda — simulasi Mw 9,5">\n'+
'<meta property="og:description" content="Sejauh mana Jabodetabek kena? Simulasi fisika penuh: tsunami, guncangan MMI, likuefaksi, amblesan tanah, paparan 105 juta jiwa.">\n'+
'<meta property="og:image" content="'+OG+'">\n'+
'<meta property="og:locale" content="id_ID">\n'+
'<meta name="twitter:card" content="summary_large_image">\n'+
'<link rel="icon" href="'+FAV+'">\n'+
'<style>:root{color-scheme:light dark}html{-webkit-text-size-adjust:100%}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n';
const web=HEAD+A+'\n</head>\n<body>\n'+[Bh,physBlock,physRun,dataBlock(false),Ch,Dh].join('\n')+GC+'\n</body>\n</html>\n';
fs.writeFileSync(path.join(OUT,'index.html'),web);
fs.writeFileSync(path.join(OUT,'.nojekyll'),'');
if(fs.existsSync('og.jpg')) fs.copyFileSync('og.jpg',path.join(OUT,'og.jpg'));

const kb=x=>(x/1024).toFixed(0)+' KB', mb=x=>(x/1048576).toFixed(2)+' MB';
const idxSize=fs.statSync(path.join(OUT,'index.html')).size;
console.log('\nKELUARAN');
console.log('  megathrust.html (Artifact, tertanam) : '+mb(fs.statSync('megathrust.html').size));
console.log('  site/index.html (web, data terpisah) : '+kb(idxSize));
console.log('  site/data/*.gz                       : '+kb(gzTot));
console.log('  unduhan pertama di HP                : '+kb(idxSize+gzTot));

/* ---------- pemeriksaan ---------- */
function check(name,html,isWeb){
  const body=isWeb?html.replace(/\s*<\/body>\s*<\/html>\s*$/,''):html;
  const t=[
   ['tag script seimbang',(html.match(/<script/g)||[]).length===(html.match(/<\/script>/g)||[]).length],
   ['ada <title>',/<title>/.test(html)],
   ['IIFE tertutup',/\}\)\(\);\s*<\/script>\s*$/.test(body.trim())],
   ['__PHYS terdefinisi',html.indexOf('window.__PHYS=')>=0],
   ['__DATA terdefinisi',html.indexOf('window.__DATA=')>=0],
   ['start(B) ada',html.indexOf('function start(B)')>=0],
   ['loadAll dipanggil',html.indexOf('loadAll(function')>=0],
   [isWeb?'ada doctype':'tanpa doctype', isWeb?/^<!doctype html>/i.test(html):!/<!doctype/i.test(html)],
   [isWeb?'ambil berkas (__BIN kosong)':'__BIN tertanam',
     isWeb?html.indexOf('window.__BIN=')<0:html.indexOf('window.__BIN=')>=0]
  ];
  let bad=0; console.log('\n'+name);
  for(const r of t){ console.log('  '+(r[1]?'OK   ':'GAGAL')+'  '+r[0]); if(!r[1])bad++; }
  return bad;
}
const bad=check('megathrust.html',artifact,false)+check('site/index.html',web,true);

/* ---------- sintaksis tiap blok skrip ---------- */
const vm=require('vm');
let sbad=0, n=0;
const re=/<script(?![^>]*text\/plain)[^>]*>([\s\S]*?)<\/script>/g;
let m; while((m=re.exec(web))){ n++;
  try{ new vm.Script(m[1]); }catch(e){ sbad++; console.log('  blok '+n+' GAGAL: '+e.message); } }
try{ new vm.Script(core); }catch(e){ sbad++; console.log('  core GAGAL: '+e.message); }
console.log('\nsintaksis: '+n+' blok diperiksa, '+(sbad?sbad+' gagal':'semua valid'));
console.log(bad+sbad? '\n>>> '+(bad+sbad)+' masalah' : '\n>>> SEMUA PEMERIKSAAN LOLOS');
