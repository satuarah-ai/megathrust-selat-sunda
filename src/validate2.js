const fs=require('fs'), V=require('./validate.js'), C=require('./core.js');
const {g,meta,coastal,elev}=V; const f2=(x,n=2)=>Number(x).toFixed(n);
const tr=meta.trench,SS=meta.trenchS,tot=meta.trenchLenKm*1000;
let sEpi=0; for(let i=0;i<tr.length;i++) if(tr[i][0]>=107.3){ sEpi=SS[i]*1000; break; }

console.log('== UJI C1: 2006 dengan rigiditas rendah (mu=1e10, khas tsunami earthquake) ==');
const F=C.buildFault(tr,{dipDeg:11,topDepth:4000,widthKm:50,nSub:14,
  sLo:(sEpi-100000)/tot,sHi:(sEpi+100000)/tot,slipMean:4.47,hypoFrac:0.5});
console.log(` slip ${f2(F.slipMean)} m (M0 sama, mu 1e10 bukan 3e10)`);
const S1=V.run(F,{hours:2.5,dt:3.5,vRup:1500,rise:30,quiet:true});
console.log('\n LOKASI              | MODEL pesisir | x2 run-up | TERAMATI 2006');
[['Pangandaran',108.653,-7.688,'5-7 m'],['Cilacap/Nusakambangan',108.999,-7.727,'hingga 21 m'],
 ['Pameungpeuk',107.690,-7.650,'3-5 m']].forEach(([n,lo,la,o])=>{
  const c=coastal(S1,lo,la,15);
  console.log(` ${n.padEnd(20)}| ${(f2(c.h,1)+' m').padStart(10)}    | ${(f2(c.h*2,1)+' m').padStart(7)}   | ${o}`);
});

console.log('\n\n== UJI C2: JALUR SELAT SUNDA -> TELUK JAKARTA (analog Krakatau 1883) ==');
console.log(' Sumber: simpangan air awal +30 m radius 7 km di Krakatau (105.42 E, 6.10 S)');
const S2=C.makeSim(g,elev);
{ const clon=105.423, clat=-6.102;
  for(let j=0;j<g.ny;j++)for(let i=0;i<g.nx;i++){
    const lon=g.lonW+(i+0.5)*g.cs, lat=g.latS+(j+0.5)*g.cs;
    const d=Math.hypot((lon-clon)*111.32*Math.cos(lat*Math.PI/180),(lat-clat)*110.57);
    const k=j*g.nx+i;
    if(S2.h[k]>0) S2.eta[k]=30*Math.exp(-(d*d)/(2*4.0*4.0));
  } }
const dt=3.5, steps=Math.round(6*3600/dt);
for(let s=0;s<steps;s++) S2.step(dt);
const obs={'Merak':'40 m','Anyer':'15-30 m','Labuan':'20-30 m','Bakauheni/Lampung Sel.':'20-30 m',
           'Tanjung Priok (Jakarta)':'1,8-2,4 m (pasang surut) / 3,8 m (simulasi)','Kepulauan Seribu':'~2 m'};
const pts=[['Merak',106.00,-5.933],['Anyer',105.898,-6.058],['Labuan',105.828,-6.377],
           ['Bakauheni/Lampung Sel.',105.752,-5.868],['Kepulauan Seribu',106.55,-5.70],
           ['Tanjung Priok (Jakarta)',106.880,-6.095]];
console.log('\n LOKASI                       | MODEL    | TIBA     | TERAMATI 1883');
console.log(' -----------------------------|----------|----------|--------------------------------');
let merak=0;
for(const [n,lo,la] of pts){ const c=coastal(S2,lo,la,12);
  if(n==='Merak') merak=c.h;
  console.log(` ${n.padEnd(29)}| ${(f2(c.h,1)+' m').padStart(7)}  | ${(c.t<0?'-':f2(c.t/60,0)+' mnt').padStart(8)} | ${obs[n]}`); }
const jkt=coastal(S2,106.880,-6.095,12);
console.log(`\n NISBAH REDAMAN Jakarta/Merak: model ${f2(100*jkt.h/Math.max(merak,0.01),1)}%  |  nyata 1883: ${f2(100*2.1/40,1)}% (2,1 m / 40 m)`);
console.log(' -> menguji apakah penyempitan Selat Sunda + Laut Jawa dangkal meredam dengan benar');
