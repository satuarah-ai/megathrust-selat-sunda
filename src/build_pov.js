const fs=require('fs'), path=require('path');
const pov=JSON.parse(fs.readFileSync('data/pov.json','utf8'));
const A=fs.readFileSync('povA.html','utf8');
const B=fs.readFileSync('povB.html','utf8');
const C=fs.readFileSync('povC.html','utf8');
const Dd=fs.readFileSync('povD.html','utf8');
const S='</'+'script>';
const THREE_URL='https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js';
const FAV="data:image/svg+xml,"+encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text y="52" font-size="52">\u{1F30A}</text></svg>');
const HEAD='<!doctype html>\n<html lang="id">\n<head>\n'+
'<meta charset="utf-8">\n'+
'<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">\n'+
'<meta name="description" content="Berdiri di lokasi kejadian: guncangan 3D orang pertama dari percepatan tanah hasil perhitungan, dan air naik mengikuti mareogram solver tsunami. Skenario megathrust Mw 9,5 Selat Sunda.">\n'+
'<meta name="theme-color" content="#060f17">\n'+
'<meta property="og:type" content="website">\n'+
'<meta property="og:title" content="Berdiri di sana saat itu terjadi — Megathrust Selat Sunda">\n'+
'<meta property="og:description" content="Guncangan MMI VIII selama 78 detik, lalu air datang. Sudut pandang orang pertama, dibangkitkan dari fisika yang sama dengan petanya.">\n'+
'<meta property="og:image" content="og.jpg">\n'+
'<meta property="og:locale" content="id_ID">\n'+
'<meta name="twitter:card" content="summary_large_image">\n'+
'<link rel="icon" href="'+FAV+'">\n';
const html=HEAD+A+'\n</head>\n<body>\n'+B+'\n'+
  '<script src="'+THREE_URL+'"></'+'script>\n'+
  '<script>window.__POV='+JSON.stringify(pov)+';'+S+'\n'+
  C+'\n'+Dd+'\n</body>\n</html>\n';
const OUT=path.join('site','pov.html');
fs.writeFileSync(OUT,html);

/* ---- pemeriksaan ---- */
const t=[
 ['tag script seimbang',(html.match(/<script/g)||[]).length===(html.match(/<\/script>/g)||[]).length],
 ['ada doctype',/^<!doctype html>/i.test(html)],
 ['ada <title>',/<title>/.test(html)],
 ['Three.js dimuat sebelum aplikasi', html.indexOf(THREE_URL)<html.indexOf('window.__POVLIB')],
 ['__POV terdefinisi',html.indexOf('window.__POV=')>=0],
 ['__POVLIB terdefinisi',html.indexOf('window.__POVLIB=')>=0],
 ['8 lokasi',pov.site.length===8],
 ['mareogram terisi',pov.site.every(s=>s.ts&&s.ts.length>600)],
];
let bad=0;
for(const r of t){ console.log('  '+(r[1]?'OK   ':'GAGAL')+'  '+r[0]); if(!r[1])bad++; }

/* sintaksis tiap blok skrip inline */
const vm=require('vm');
const re=/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g;
let m,n=0,sbad=0;
while((m=re.exec(html))){ n++;
  try{ new vm.Script(m[1]); }catch(e){ sbad++; console.log('  GAGAL sintaksis blok '+n+': '+e.message); } }
console.log('  sintaksis: '+n+' blok inline, '+(sbad?sbad+' gagal':'semua valid'));
console.log('\npov.html  '+Math.round(fs.statSync(OUT).size/1024)+' KB');
console.log(bad+sbad? '>>> '+(bad+sbad)+' masalah' : '>>> SEMUA PEMERIKSAAN LOLOS');
