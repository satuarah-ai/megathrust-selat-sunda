const fs=require('fs'), C=require('./core.js');
const meta=require('./data/meta.json'), g=meta.main;
const rd=(p,T)=>{const b=fs.readFileSync(p);return new T(b.buffer,b.byteOffset,b.length/T.BYTES_PER_ELEMENT);};
const elev=rd('./data/main.i16',Int16Array);
const etaMax=rd('./data/out_etaMax.f32',Float32Array);
const tArr=rd('./data/out_tArr.f32',Float32Array);
const uz=rd('./data/out_uz.f32',Float32Array);
// populasi & pemilik dari numpy (float32 / int32, urutan C, baris 0 = selatan? -> POPg dibuat dgn latS di j=0)
const POPg=rd('./data/POPg.f32',Float32Array);
const owner=rd('./data/owner.i32',Int32Array);
const kab=JSON.parse(fs.readFileSync('./data/kabnames.json','utf8'));
const N=g.nx*g.ny, f2=(x,n=2)=>Number(x).toFixed(n);

const F=C.buildFault(meta.trench,{dipDeg:13,topDepth:6000,widthKm:200,nSub:44,slipMean:25.7,hypoFrac:0.445});
const M=F.Mw;
const vs30=C.vs30Grid(g,elev);
// jarak ke pantai (km) untuk model likuefaksi — transformasi jarak sederhana
const dcoast=new Float32Array(N).fill(1e9);
{ const q=new Int32Array(N); let qh=0,qt=0;
  for(let k=0;k<N;k++) if(elev[k]<0){dcoast[k]=0;q[qt++]=k;}
  const stepKm=1.96;
  while(qh<qt){ const k=q[qh++]; const j=(k/g.nx)|0, i=k%g.nx;
    for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const ni=i+di,nj=j+dj; if(ni<0||nj<0||ni>=g.nx||nj>=g.ny) continue;
      const nk=nj*g.nx+ni; if(dcoast[nk]>dcoast[k]+stepKm){dcoast[nk]=dcoast[k]+stepKm; q[qt++]=nk;} } } }

// --- per sel: guncangan, likuefaksi, paparan tsunami ---
const MMI=new Float32Array(N), PGAg=new Float32Array(N), PGVg=new Float32Array(N), LIQ=new Float32Array(N);
const RR=new Float32Array(N);
for(let j=0;j<g.ny;j++){
  const lat=g.latS+(j+0.5)*g.cs;
  for(let i=0;i<g.nx;i++){
    const k=j*g.nx+i, lon=g.lonW+(i+0.5)*g.cs;
    const R=C.rrupKm(F,lon,lat); RR[k]=R;
    const gm=C.groundMotion(M,R,vs30[k]);
    PGAg[k]=gm.pga; PGVg[k]=gm.pgv;
    MMI[k]=C.mmiWorden(gm.pga,gm.sa1,gm.pgv);
    if(elev[k]>=0) LIQ[k]=C.liqProb(gm.pgv,vs30[k],dcoast[k],1900,M);
  }
}
// --- model korban ---
// guncangan: PAGER (Jaiswal & Wald 2010), koefisien Indonesia
const erf=(x)=>{const s=x<0?-1:1;x=Math.abs(x);const t=1/(1+0.3275911*x);
  const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return s*y;};
const Phi=(z)=>0.5*(1+erf(z/Math.SQRT2));
const THETA=13.249, BETA=0.151;
const fatalRate=(mmi)=> mmi<5.5?0:Phi(Math.log(mmi/THETA)/BETA);
// tsunami: laju kematian vs kedalaman aliran (kalibrasi 2004 & 2011, tanpa evakuasi)
const tsuRate=(d)=> d<0.5?0 : d<1?0.02 : d<2?0.08 : d<3?0.20 : d<4?0.35 : d<6?0.55 : 0.75;

const agg={};
let totPop=0, totShakeDead=0, totTsuDead=0, totTsuDeadEvac=0, popTsu=0;
for(let k=0;k<N;k++){
  const o=owner[k]; const p=POPg[k]; if(p<=0) continue;
  totPop+=p;
  const key=o>=0? o : -1;
  if(!agg[key]) agg[key]={pop:0,mmiW:0,mmi8:0,mmi7:0,liqPop:0,tsuPop:0,tsuMax:0,tsuLand:0,tArr:1e9,uzMin:0,shakeDead:0,tsuDead:0,tsuDeadE:0,rr:1e9};
  const a=agg[key];
  a.pop+=p; a.mmiW+=p*MMI[k];
  if(MMI[k]>=8)a.mmi8+=p; if(MMI[k]>=7)a.mmi7+=p;
  a.liqPop+=p*LIQ[k];
  if(RR[k]<a.rr)a.rr=RR[k];
  if(uz[k]<a.uzMin)a.uzMin=uz[k];
  const sd=p*fatalRate(MMI[k]); a.shakeDead+=sd; totShakeDead+=sd;
  // paparan tsunami: sel darat yang tergenang (etaMax > elevasi + amblesan)
  const ground=elev[k]+uz[k];
  const depth=etaMax[k]-Math.max(ground,0);
  if(elev[k]>=0 && etaMax[k]>0.3 && depth>0.3){
    a.tsuPop+=p; popTsu+=p;
    const td=p*tsuRate(depth); a.tsuDead+=td; totTsuDead+=td;
    const late=(tArr[k]>0&&tArr[k]<1800);            // <30 menit = sulit evakuasi
    const te=td*(late?0.45:0.12); a.tsuDeadE+=te; totTsuDeadEvac+=te;
  }
  // SATU definisi: tinggi muka air maksimum di perairan pesisir (laut 0-60 m).
  // Nilai di daratan tergenang dicatat terpisah, tidak dicampur.
  if(elev[k]<0 && elev[k]>=-60 && etaMax[k]>a.tsuMax) a.tsuMax=etaMax[k];
  if(elev[k]>=0 && depth>0.3 && etaMax[k]>a.tsuLand) a.tsuLand=etaMax[k];
  if(tArr[k]>0 && tArr[k]<a.tArr && etaMax[k]>1) a.tArr=tArr[k];
}
const rows=Object.entries(agg).filter(([k])=>k>=0).map(([k,a])=>({
  prov:kab[k][0], nama:(kab[k][2]||'')+' '+kab[k][1], ...a, mmi:a.mmiW/a.pop }));
rows.sort((a,b)=>(b.shakeDead+b.tsuDead)-(a.shakeDead+a.tsuDead));
console.log('=================== DAMPAK M9,5 SELAT SUNDA ===================');
console.log('populasi dalam domain model: %s juta', f2(totPop/1e6,1));
console.log('\n--- 22 WILAYAH TERDAMPAK TERBERAT ---');
console.log('WILAYAH                        PROV        PENDUDUK  MMI  Rrup  P.MMI8+  LIKUEF  TSU-TERPAPAR  TINGGI  TIBA   AMBLES');
for(const r of rows.slice(0,22)){
  console.log('%s %s %s %s %s %s %s %s %s %s',
   r.nama.slice(0,29).padEnd(30), (r.prov||'').slice(0,10).padEnd(11),
   (f2(r.pop/1e6,2)+'jt').padStart(8), f2(r.mmi,1).padStart(4), f2(r.rr,0).padStart(5),
   (f2(100*r.mmi8/r.pop,0)+'%').padStart(8), (f2(100*r.liqPop/r.pop,0)+'%').padStart(7),
   (r.tsuPop>1000?f2(r.tsuPop/1000,0)+'rb':f2(r.tsuPop,0)).padStart(13),
   (f2(r.tsuMax,1)+'m').padStart(7), (r.tArr<1e9?f2(r.tArr/60,0)+'mnt':'-').padStart(7)+(f2(r.uzMin,1)+'m').padStart(8));
}
console.log('\n--- JABODETABEK RINCI ---');
const JBD=['Jakarta','Bekasi','Bogor','Depok','Tangerang'];
const jb=rows.filter(r=>JBD.some(x=>r.nama.includes(x))&&['JakartaRaya','Jakarta Raya','Jawa Barat','Banten'].includes(r.prov));
let jbPop=0,jbDead=0,jbMmi8=0,jbLiq=0;
console.log('WILAYAH                       PENDUDUK   MMI  Rrup  DURASI  %MMI8+  LIKUEFAKSI  AMBLES  TSUNAMI');
for(const r of jb){ jbPop+=r.pop; jbDead+=r.shakeDead+r.tsuDead; jbMmi8+=r.mmi8; jbLiq+=r.liqPop;
  console.log('%s %s %s %s %s %s %s %s %s', r.nama.slice(0,28).padEnd(29),
   (f2(r.pop/1e6,2)+' jt').padStart(9), f2(r.mmi,1).padStart(5), f2(r.rr,0).padStart(5),
   (f2(C.durationSec(M,r.rr),0)+'s').padStart(7), (f2(100*r.mmi8/r.pop,0)+'%').padStart(7),
   (f2(100*r.liqPop/r.pop,0)+'%').padStart(11), (f2(r.uzMin,2)+'m').padStart(8),
   (r.tsuMax>0.3?f2(r.tsuMax,1)+'m':'-').padStart(8)); }
console.log('TOTAL JABODETABEK             %s jt  |  %s jt jiwa di MMI VIII+  |  %s jt di zona likuefaksi',
  f2(jbPop/1e6,2), f2(jbMmi8/1e6,2), f2(jbLiq/1e6,2));
console.log('\n--- PERKIRAAN KORBAN (model empiris, ketidakpastian ~x10) ---');
console.log(' korban guncangan (PAGER, Indonesia)      : %s jiwa', Math.round(totShakeDead).toLocaleString('id-ID'));
console.log(' penduduk di zona genangan tsunami        : %s jiwa', Math.round(popTsu).toLocaleString('id-ID'));
console.log(' korban tsunami TANPA evakuasi            : %s jiwa', Math.round(totTsuDead).toLocaleString('id-ID'));
console.log(' korban tsunami DENGAN peringatan efektif : %s jiwa', Math.round(totTsuDeadEvac).toLocaleString('id-ID'));
console.log(' TOTAL tanpa evakuasi                     : %s jiwa', Math.round(totShakeDead+totTsuDead).toLocaleString('id-ID'));
console.log(' TOTAL dengan evakuasi efektif            : %s jiwa', Math.round(totShakeDead+totTsuDeadEvac).toLocaleString('id-ID'));
fs.writeFileSync('data/impact.json', JSON.stringify({rows,totPop,totShakeDead,totTsuDead,totTsuDeadEvac,popTsu},null,1));
