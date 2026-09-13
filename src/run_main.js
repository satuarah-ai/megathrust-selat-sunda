const fs=require('fs'), C=require('./core.js');
const meta=require('./data/meta.json'); const g=meta.main;
const b=fs.readFileSync('./data/main.i16');
const elev=new Int16Array(b.buffer,b.byteOffset,b.length/2);
const f2=(x,n=2)=>Number(x).toFixed(n);
const tr=meta.trench;

const F=C.buildFault(tr,{dipDeg:13,topDepth:6000,widthKm:200,nSub:44,slipMean:25.7,hypoFrac:0.445});
console.log('=========== SKENARIO: MEGATHRUST SELAT SUNDA Mw 9,5 ===========');
console.log(` rupture ${f2(F.rupLen/1000,0)} km x ${f2(F.W/1000,0)} km | slip rata2 ${f2(F.slipMean,1)} m | puncak ${f2(F.slipMax,1)} m`);
console.log(` M0 = ${F.M0.toExponential(3)} N.m -> Mw ${f2(F.Mw)}`);
console.log(` hiposentrum ${f2(F.hypoLon)} E, ${f2(-F.hypoLat)} S, kedalaman ${f2(F.hypoDepth/1000,0)} km`);
const vRup=2500, rise=45;
const rupDur=Math.max(F.hypoS-F.a,F.b-F.hypoS)/vRup+rise;
console.log(` kecepatan pecah ${vRup/1000} km/s -> durasi pecah ${f2(rupDur,0)} s (${f2(rupDur/60,1)} menit)`);

const S=C.makeSim(g,elev);
const t0=Date.now();
const DC=C.deformCoarse(g,F,4);
console.log(` medan deformasi siap (${f2((Date.now()-t0)/1000,1)} s)`);
const N=S.nx*S.ny, cN=DC.cnx*DC.cny;
let prevC=new Float32Array(cN), curC=new Float32Array(cN);
const dC=new Float32Array(cN), dF=new Float32Array(N);
const dt=4.2, HOURS=8, steps=Math.round(HOURS*3600/dt);
const t1=Date.now();
for(let s=0;s<steps;s++){
  const t=s*dt;
  if(t<=rupDur+dt){
    curC.fill(0);
    for(let m=0;m<F.subs.length;m++){
      const fr=C.rupFrac(F,m,t,vRup,rise); if(fr<=0) continue;
      const fl=DC.fields[m]; for(let k=0;k<cN;k++) curC[k]+=fr*fl[k];
    }
    for(let k=0;k<cN;k++) dC[k]=curC[k]-prevC[k];
    C.coarseToFine(g,DC,dC,dF);
    for(let k=0;k<N;k++) S.eta[k]+=dF[k];
    const tmp=prevC; prevC=curC; curC=tmp;
  }
  S.step(dt);
  if(s%700===0){ let mx=0; for(let k=0;k<N;k++) if(S.eta[k]>mx)mx=S.eta[k];
    process.stdout.write(`\r t=${f2(t/60,0)} mnt eta maks ${f2(mx,1)} m    `); }
}
console.log(`\n ${steps} langkah dalam ${f2((Date.now()-t1)/1000,1)} s`);
// deformasi statis akhir
const uzFinal=new Float32Array(N); C.coarseToFine(g,DC,prevC,uzFinal);
fs.writeFileSync('data/out_etaMax.f32', Buffer.from(S.etaMax.buffer));
fs.writeFileSync('data/out_tArr.f32',  Buffer.from(S.tArr.buffer));
fs.writeFileSync('data/out_uz.f32',    Buffer.from(uzFinal.buffer));
// ringkasan
let mx=0,mk=0; for(let k=0;k<N;k++) if(S.h[k]>0&&S.h[k]<60&&S.etaMax[k]>mx){mx=S.etaMax[k];mk=k;}
console.log(` tinggi pesisir maksimum ${f2(mx,1)} m di lon ${f2(g.lonW+(mk%S.nx+0.5)*g.cs)} lat ${f2(g.latS+(Math.floor(mk/S.nx)+0.5)*g.cs)}`);
let vol=0,area=0; for(let k=0;k<N;k++) if(uzFinal[k]>0.1&&S.h[k]>0){vol+=uzFinal[k]*1.96*1.96e6; area+=3.84e6;}
console.log(` volume air terangkat ${(vol/1e9).toFixed(1)} km3 di atas ${(area/1e6).toFixed(0)} ribu km2 dasar laut`);
let Ep=0; for(let k=0;k<N;k++) if(S.h[k]>0) Ep+=0.5*1025*9.81*uzFinal[k]*uzFinal[k]*3.84e6;
console.log(` energi potensial tsunami awal ${(Ep/1e15).toFixed(2)} PJ (petajoule)`);
const Es=Math.pow(10,1.5*F.Mw+4.8);   // Gutenberg-Richter, joule
console.log(` energi seismik terpancar ${Es.toExponential(2)} J = ${(Es/4.184e15).toFixed(0)} megaton TNT`);
console.log(` setara ${(Es/4.184e15/50).toFixed(0)}x bom Tsar (50 Mt), atau ${(Es/6.0e20*100).toFixed(1)}% konsumsi energi dunia setahun`);
