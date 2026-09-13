const fs=require('fs'),C=require('./core.js');
const meta=require('./data/meta.json'),g=meta.main;
const b=fs.readFileSync('data/main.i16');
const elev=new Int16Array(b.buffer,b.byteOffset,b.length/2);
const N=g.nx*g.ny, f2=(x,n=2)=>Number(x).toFixed(n);
const tr=meta.trench,SS=meta.trenchS,tot=meta.trenchLenKm*1000;

function run(F,hours,vRup){
  const S=C.makeSim(g,elev), DC=C.deformCoarse(g,F,4), cN=DC.cnx*DC.cny;
  let pC=new Float32Array(cN),cC=new Float32Array(cN);
  const dC=new Float32Array(cN),dF=new Float32Array(N), dt=4.2, rise=45;
  const rupDur=Math.max(F.hypoS-F.a,F.b-F.hypoS)/vRup+rise;
  const steps=Math.round(hours*3600/dt);
  for(let s=0;s<steps;s++){ const t=s*dt;
    if(t<=rupDur+dt){ cC.fill(0);
      for(let m=0;m<F.subs.length;m++){const fr=C.rupFrac(F,m,t,vRup,rise); if(fr<=0)continue;
        const fl=DC.fields[m]; for(let k=0;k<cN;k++) cC[k]+=fr*fl[k];}
      for(let k=0;k<cN;k++) dC[k]=cC[k]-pC[k];
      C.coarseToFine(g,DC,dC,dF);
      for(let k=0;k<N;k++) S.eta[k]+=dF[k];
      const tm=pC;pC=cC;cC=tm; }
    S.step(dt); }
  const uz=C.coarseToFine(g,DC,pC,new Float32Array(N));
  return {S,uz};
}
// amplitudo laut dalam pada cincin jarak dari hiposentrum
function deepRing(S,F,r0,r1){
  const a=[];
  for(let j=0;j<g.ny;j++){const lat=g.latS+(j+0.5)*g.cs;
    for(let i=0;i<g.nx;i++){const k=j*g.nx+i; if(elev[k]>-3000) continue;
      const lon=g.lonW+(i+0.5)*g.cs;
      const d=Math.hypot((lon-F.hypoLon)*111.32*Math.cos(lat*Math.PI/180),(lat-F.hypoLat)*110.57);
      if(d>=r0&&d<=r1) a.push(S.etaMax[k]);}}
  a.sort((x,y)=>x-y);
  return {n:a.length, med:a[a.length>>1], p90:a[Math.floor(a.length*0.9)], max:a[a.length-1]};
}
function volumeKm3(uz){let v=0;for(let k=0;k<N;k++) if(uz[k]>0&&elev[k]<0) v+=uz[k]*3.84e6; return v/1e9;}
function peakUz(uz){let m=0,n=0;for(let k=0;k<N;k++){if(uz[k]>m)m=uz[k]; if(uz[k]<n)n=uz[k];}return [m,n];}

console.log('=============== KALIBRASI LAWAN TOHOKU 2011 ===============');
console.log('Tohoku nyata: Mw 9,0 | L~450 km W~200 km | slip rata2 14,4 m | puncak ~50 m');
console.log('              DART laut dalam ~1,8 m pada jarak ~600 km');
console.log('              angkatan dasar laut ~7-10 m | volume tergeser ~100-180 km3\n');
let sM=0; for(let i=0;i<tr.length;i++) if(tr[i][0]>=105.3){sM=SS[i]*1000;break;}
const FT=C.buildFault(tr,{dipDeg:13,topDepth:6000,widthKm:200,nSub:16,
  sLo:(sM-225000)/tot, sHi:(sM+225000)/tot, slipMean:14.4, hypoFrac:0.5});
console.log('model Tohoku-analog: Mw %s | L %s km | slip %s m', f2(FT.Mw), f2(FT.rupLen/1000,0), f2(FT.slipMean,1));
const RT=run(FT,3,2500);
const [pu,nu]=peakUz(RT.uz);
console.log('  angkatan dasar laut puncak: %s m   (nyata 7-10 m)  %s', f2(pu,1), pu>12?'<< TERLALU BESAR':'ok');
console.log('  volume air tergeser: %s km3        (nyata 100-180) %s', f2(volumeKm3(RT.uz),0), volumeKm3(RT.uz)>260?'<< TERLALU BESAR':'ok');
for(const [a,b2] of [[400,800],[800,1200]]){ const r=deepRing(RT.S,FT,a,b2);
  console.log('  laut dalam %s-%s km: median %s m, p90 %s m   (DART ~1,8 m) %s',a,b2,f2(r.med),f2(r.p90), r.med>3?'<< TERLALU BESAR':'ok'); }
