const fs=require('fs'), C=require('./core.js');
const meta=require('./data/meta.json'); const g=meta.main;
const buf=fs.readFileSync('./data/main.i16');
const elev=new Int16Array(buf.buffer,buf.byteOffset,buf.length/2);
const f2=(x,n=2)=>Number(x).toFixed(n);

function run(F,o){
  const {hours=3,dt=3.5,vRup=2500,rise=40,gauges=[],label='',quiet=false}=o;
  const S=C.makeSim(g,elev);
  const DC=C.deformCoarse(g,F,4);
  const N=S.nx*S.ny, cN=DC.cnx*DC.cny;
  let prevC=new Float32Array(cN), curC=new Float32Array(cN);
  const dC=new Float32Array(cN), dF=new Float32Array(N);
  const rupDur=Math.max(F.hypoS-F.a,F.b-F.hypoS)/vRup+rise;
  const steps=Math.round(hours*3600/dt);
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
    if(!quiet && s%600===0){
      let mx=0; for(let k=0;k<N;k++) if(S.eta[k]>mx)mx=S.eta[k];
      process.stdout.write(`\r  t=${f2(t/60,0)} mnt  eta maks ${f2(mx,1)} m      `);
    }
  }
  if(!quiet) console.log(`\n  ${steps} langkah / ${f2((Date.now()-t1)/1000,1)} s`);
  return S;
}
// tinggi gelombang pesisir: eta maks tertinggi pada sel laut dangkal dalam radius r km
function coastal(S,lon,lat,rkm=12){
  const ci=Math.round((lon-g.lonW)/g.cs-0.5), cj=Math.round((lat-g.latS)/g.cs-0.5);
  const rad=Math.ceil(rkm/1.96); let best=0,bt=-1,bd=0;
  for(let dj=-rad;dj<=rad;dj++)for(let di=-rad;di<=rad;di++){
    const i=ci+di,j=cj+dj; if(i<0||j<0||i>=S.nx||j>=S.ny) continue;
    if(Math.hypot(di,dj)>rad) continue;
    const k=j*S.nx+i; if(S.h[k]<=0||S.h[k]>60) continue;   // hanya perairan pesisir
    if(S.etaMax[k]>best){best=S.etaMax[k];bt=S.tArr[k];bd=S.h[k];}
  }
  return {h:best,t:bt,depth:bd};
}
module.exports={run,coastal,g,elev,meta,C};

if(require.main===module){
  const tr=meta.trench,SS=meta.trenchS,tot=meta.trenchLenKm*1000;
  let sEpi=0; for(let i=0;i<tr.length;i++) if(tr[i][0]>=107.3){ sEpi=SS[i]*1000; break; }
  const F=C.buildFault(tr,{dipDeg:11,topDepth:4000,widthKm:50,nSub:14,
    sLo:(sEpi-100000)/tot,sHi:(sEpi+100000)/tot,slipMean:1.49,hypoFrac:0.5});
  console.log('=================================================================');
  console.log(' UJI KILLER — rekonstruksi GEMPA & TSUNAMI PANGANDARAN 17 Juli 2006');
  console.log('=================================================================');
  console.log(` model: L=${f2(F.rupLen/1000,0)} km  W=${f2(F.W/1000,0)} km  slip=${f2(F.slipMean)} m  -> Mw ${f2(F.Mw)}`);
  console.log(` nyata: Mw 7.7, "tsunami earthquake", slip dangkal, pecah lambat (~1,5 km/s)\n`);
  const S=run(F,{hours:2.5,dt:3.5,vRup:1500,rise:30,label:'2006'});
  const pts=[['Pangandaran',108.653,-7.688,'5-7 m (maks lokal ~10 m)'],
             ['Cilacap / Nusakambangan',108.999,-7.727,'hingga 21 m (maks tercatat)'],
             ['Pameungpeuk (Garut)',107.690,-7.650,'3-5 m'],
             ['Pelabuhan Ratu',106.550,-6.985,'<1-2 m (jauh dari pusat)']];
  console.log('\n LOKASI                   | MODEL (pesisir) | TIBA    | TERAMATI 2006');
  console.log(' -------------------------|-----------------|---------|------------------------');
  for(const [n,lo,la,obs] of pts){
    const c=coastal(S,lo,la,15);
    console.log(` ${n.padEnd(24)}| ${(f2(c.h,1)+' m').padStart(12)}    | ${(c.t<0?'-':f2(c.t/60,0)+' mnt').padStart(7)} | ${obs}`);
  }
  let mx=0,mk=0; for(let k=0;k<S.nx*S.ny;k++) if(S.h[k]>0&&S.h[k]<60&&S.etaMax[k]>mx){mx=S.etaMax[k];mk=k;}
  console.log(`\n tinggi pesisir maksimum di seluruh model: ${f2(mx,1)} m`);
  console.log(` (di lon ${f2(g.lonW+(mk%S.nx+0.5)*g.cs)} lat ${f2(g.latS+(Math.floor(mk/S.nx)+0.5)*g.cs)})`);
  console.log('\n CATATAN: sel grid 1,96 km tak bisa memodelkan run-up naik ke darat.');
  console.log(' Nilai model = amplitudo di perairan pesisir. Run-up teramati lazimnya 1,5-3x nilai ini.');
}
