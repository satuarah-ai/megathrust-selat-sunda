/* Rekam mareogram (tinggi muka air vs waktu) di titik-titik POV,
   plus parameter guncangan di titik yang sama. Keluaran: data/pov.json */
const fs=require('fs'), C=require('./core.js');
const meta=require('./data/meta.json'), g=meta.main, N=g.nx*g.ny;
const b=fs.readFileSync('data/main.i16');
const elev=new Int16Array(b.buffer,b.byteOffset,b.length/2);
const f2=(x,n=2)=>Number(x).toFixed(n);

const F=C.buildFault(meta.trench,{dipDeg:13,topDepth:6000,widthKm:200,nSub:44,slipMean:25.7,hypoFrac:0.445});
const MW=F.Mw;
const VS=C.vs30Grid(g,elev);

// titik POV: [kunci, nama tampil, lon, lat, deskripsi tempat]
const PTS=[
 ['jakut','Jakarta Utara',106.880,-6.095,'Kampung nelayan Tanjung Priok, 1 km dari garis pantai'],
 ['labuan','Labuan, Pandeglang',105.828,-6.377,'Pasar ikan pesisir, 200 m dari bibir pantai'],
 ['anyer','Anyer, Serang',105.898,-6.058,'Kawasan wisata pantai Anyer'],
 ['merak','Merak, Cilegon',106.000,-5.933,'Dekat pelabuhan penyeberangan Merak'],
 ['pelabuhanratu','Pelabuhan Ratu',106.550,-6.985,'Teluk Pelabuhan Ratu, pesisir selatan Jawa'],
 ['bakauheni','Bakauheni, Lampung',105.752,-5.868,'Ujung selatan Sumatra'],
 ['seribu','Kepulauan Seribu',106.570,-5.700,'Pulau permukiman di utara Jakarta'],
 ['cilegon','Kota Cilegon',106.054,-6.017,'Kawasan industri pesisir Cilegon']
];
function nearestSea(lon,lat,maxr){
  const i0=Math.round((lon-g.lonW)/g.cs-0.5), j0=Math.round((lat-g.latS)/g.cs-0.5);
  let best=-1,bd=1e9;
  for(let dj=-maxr;dj<=maxr;dj++)for(let di=-maxr;di<=maxr;di++){
    const i=i0+di,j=j0+dj; if(i<0||j<0||i>=g.nx||j>=g.ny)continue;
    const k=j*g.nx+i; if(elev[k]<-1&&elev[k]>-500){const d=di*di+dj*dj; if(d<bd){bd=d;best=k;}}}
  return {k:best, jarakKm:Math.sqrt(bd)*1.96};
}
function landCell(lon,lat){
  const i0=Math.round((lon-g.lonW)/g.cs-0.5), j0=Math.round((lat-g.latS)/g.cs-0.5);
  let best=j0*g.nx+i0,bd=1e9;
  for(let dj=-5;dj<=5;dj++)for(let di=-5;di<=5;di++){
    const i=i0+di,j=j0+dj; if(i<0||j<0||i>=g.nx||j>=g.ny)continue;
    const k=j*g.nx+i; if(elev[k]>=0){const d=di*di+dj*dj; if(d<bd){bd=d;best=k;}}}
  return best;
}
const site=PTS.map(p=>{
  const sea=nearestSea(p[2],p[3],8), land=landCell(p[2],p[3]);
  const R=C.rrupKm(F,p[2],p[3]);
  const vs30=VS[land];
  const gm=C.groundMotion(MW,R,vs30);
  const mmi=C.mmiWorden(gm.pga,gm.sa1,gm.pgv);
  const dur=C.durationSec(MW,R);
  const uz=C.deformAt(F,p[2],p[3]);
  // jarak ke pantai kasar untuk likuefaksi
  const liq=C.liqProb(gm.pgv,vs30,Math.max(sea.jarakKm,0.5),1900,MW);
  return {key:p[0],nama:p[1],lon:p[2],lat:p[3],tempat:p[4],
    k:sea.k, kland:land, rrup:+R.toFixed(0), vs30:Math.round(vs30),
    elev:elev[land], pga:+gm.pga.toFixed(3), pgv:+gm.pgv.toFixed(1),
    sa1:+gm.sa1.toFixed(3), sa30:+gm.sa30.toFixed(3),
    mmi:+mmi.toFixed(1), durasi:Math.round(dur), uz:+uz.toFixed(2), liq:+liq.toFixed(2), ts:[]};
});
console.log('TITIK            Rrup  Vs30  elev  PGA(g)  PGV  MMI  durasi  ambles  likuef');
for(const s of site) console.log(' %s %s %s %s %s %s %s %s %s %s',
  s.nama.padEnd(18), String(s.rrup).padStart(4), String(s.vs30).padStart(5), String(s.elev).padStart(4)+'m',
  f2(s.pga,3).padStart(6), f2(s.pgv,0).padStart(4), f2(s.mmi,1).padStart(5),
  (s.durasi+'s').padStart(6), (f2(s.uz,2)+'m').padStart(8), (Math.round(s.liq*100)+'%').padStart(6));

// ---- jalankan simulasi, rekam mareogram ----
console.log('\nmenjalankan solver 8 jam, merekam tinggi muka air tiap 42 detik ...');
const S=C.makeSim(g,elev), DC=C.deformCoarse(g,F,4), cN=DC.cnx*DC.cny;
let prevC=new Float32Array(cN), curC=new Float32Array(cN);
const dC=new Float32Array(cN), dF=new Float32Array(N);
const dt=4.2, vR=2500, rise=45;
const rupDur=Math.max(F.hypoS-F.a,F.b-F.hypoS)/vR+rise;
const steps=Math.round(8*3600/dt), every=10;
const t0=Date.now();
for(let s=0;s<steps;s++){
  const t=s*dt;
  if(t<=rupDur+dt){
    curC.fill(0);
    for(let m=0;m<F.subs.length;m++){const fr=C.rupFrac(F,m,t,vR,rise); if(fr<=0)continue;
      const fl=DC.fields[m]; for(let k=0;k<cN;k++) curC[k]+=fr*fl[k];}
    for(let k=0;k<cN;k++) dC[k]=curC[k]-prevC[k];
    C.coarseToFine(g,DC,dC,dF);
    for(let k=0;k<N;k++) S.eta[k]+=dF[k];
    const tm=prevC; prevC=curC; curC=tm;
  }
  S.step(dt);
  if(s%every===0) for(const q of site) q.ts.push(Math.round(S.eta[q.k]*100)); // cm
  if(s%1400===0) process.stdout.write('\r  '+Math.round(100*s/steps)+'%   ');
}
console.log('\r  selesai dalam '+f2((Date.now()-t0)/1000,0)+' s');

console.log('\nTITIK            puncak  waktu puncak  tiba(>0,3m)  cacah sampel');
for(const q of site){
  let mx=-1e9,im=0; for(let i=0;i<q.ts.length;i++) if(q.ts[i]>mx){mx=q.ts[i];im=i;}
  let ia=-1; for(let i=0;i<q.ts.length;i++) if(q.ts[i]>30){ia=i;break;}
  q.puncak=+(mx/100).toFixed(2);
  q.tPuncak=Math.round(im*every*dt);
  q.tTiba=ia<0?-1:Math.round(ia*every*dt);
  q.dtSampel=every*dt;
  delete q.k; delete q.kland;
  console.log(' %s %s %s %s %s', q.nama.padEnd(18), (f2(q.puncak,1)+'m').padStart(7),
    (Math.round(q.tPuncak/60)+' mnt').padStart(13), (q.tTiba<0?'-':Math.round(q.tTiba/60)+' mnt').padStart(12),
    String(q.ts.length).padStart(13));
}
fs.writeFileSync('data/pov.json',JSON.stringify({
  mw:+MW.toFixed(2), rupDur:Math.round(rupDur), dtSampel:every*dt,
  hypoLon:+F.hypoLon.toFixed(3), hypoLat:+F.hypoLat.toFixed(3),
  hypoDepth:Math.round(F.hypoDepth/1000), site
}));
console.log('\n-> data/pov.json  '+Math.round(fs.statSync('data/pov.json').size/1024)+' KB');
