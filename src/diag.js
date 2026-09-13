const fs=require('fs'), C=require('./core.js');
const meta=require('./data/meta.json');
const buf=fs.readFileSync('./data/main.i16');
const elev=new Int16Array(buf.buffer,buf.byteOffset,buf.length/2);
const g=meta.main;

function probe(S,label,steps,dt){
  const N=S.nx*S.ny;
  for(let s=0;s<steps;s++){
    S.step(dt);
    if(s%25===0||s===steps-1){
      let mx=0,kk=0; for(let k=0;k<N;k++){const a=Math.abs(S.eta[k]); if(a>mx){mx=a;kk=k;}}
      const j=Math.floor(kk/S.nx), i=kk%S.nx;
      const lon=(g.lonW+(i+0.5)*g.cs).toFixed(2), lat=(g.latS+(j+0.5)*g.cs).toFixed(2);
      console.log('  %s t=%ss |eta|maks=%s m di (i=%d,j=%d) lon %s lat %s  h=%s m',
        label, (s*dt).toFixed(0).padStart(5), mx.toExponential(2), i,j, lon,lat, S.h[kk].toFixed(0));
      if(mx>1e4){console.log('  >>> MELEDAK'); return false;}
    }
  }
  return true;
}
// ---- UJI A1: cekungan datar buatan, kedalaman seragam 4000 m, tanpa darat ----
console.log('UJI A1: kedalaman seragam 4000 m (tanpa darat, tanpa gesekan darat)');
{
  const flat=new Int16Array(g.nx*g.ny).fill(-4000);
  const S=C.makeSim(g,flat);
  // pulsa Gauss di tengah
  const ci=Math.floor(g.nx/2), cj=Math.floor(g.ny/2);
  for(let j=0;j<g.ny;j++)for(let i=0;i<g.nx;i++){
    const r=Math.hypot((i-ci)*1.96,(j-cj)*1.96);
    S.eta[j*g.nx+i]=5*Math.exp(-(r*r)/(2*40*40));
  }
  probe(S,'A1',300,3.5);
}
// ---- UJI A2: batimetri asli, TANPA darat (darat dijadikan laut 10 m) ----
console.log('\nUJI A2: batimetri asli, darat diganti laut dangkal 10 m');
{
  const e2=new Int16Array(elev.length);
  for(let k=0;k<elev.length;k++) e2[k]= elev[k]>=0 ? -10 : elev[k];
  const S=C.makeSim(g,e2);
  const ci=Math.floor(g.nx*0.45), cj=Math.floor(g.ny*0.30);
  for(let j=0;j<g.ny;j++)for(let i=0;i<g.nx;i++){
    const r=Math.hypot((i-ci)*1.96,(j-cj)*1.96);
    S.eta[j*g.nx+i]=5*Math.exp(-(r*r)/(2*40*40));
  }
  probe(S,'A2',300,3.5);
}
// ---- UJI A3: batimetri asli PENUH dengan darat ----
console.log('\nUJI A3: batimetri asli penuh (darat sungguhan, basah-kering aktif)');
{
  const S=C.makeSim(g,elev);
  const ci=Math.floor(g.nx*0.45), cj=Math.floor(g.ny*0.30);
  for(let j=0;j<g.ny;j++)for(let i=0;i<g.nx;i++){
    const r=Math.hypot((i-ci)*1.96,(j-cj)*1.96);
    if(S.h[j*g.nx+i]>0) S.eta[j*g.nx+i]=5*Math.exp(-(r*r)/(2*40*40));
  }
  probe(S,'A3',300,3.5);
}
