const fs=require('fs'), C=require('./core.js');
const meta=require('./data/meta.json'); const g=meta.main;
const buf=fs.readFileSync('./data/main.i16');
const elev=new Int16Array(buf.buffer,buf.byteOffset,buf.length/2);
const mode=process.argv[2]||'A3';
let e=elev;
if(mode==='A1'){ e=new Int16Array(g.nx*g.ny).fill(-4000); }
if(mode==='A2'){ e=new Int16Array(elev.length); for(let k=0;k<elev.length;k++) e[k]=elev[k]>=0?-10:elev[k]; }
const S=C.makeSim(g,e);
const ci=Math.floor(g.nx*0.45), cj=Math.floor(g.ny*0.30);
for(let j=0;j<g.ny;j++)for(let i=0;i<g.nx;i++){
  const r=Math.hypot((i-ci)*1.96,(j-cj)*1.96);
  if(S.h[j*g.nx+i]>0) S.eta[j*g.nx+i]=5*Math.exp(-(r*r)/(2*40*40));
}
const N=S.nx*S.ny, dt=3.5;
for(let s=0;s<2600;s++){
  S.step(dt);
  if(s%100===0){
    let mx=0,kk=0; for(let k=0;k<N;k++){const a=Math.abs(S.eta[k]); if(a>mx){mx=a;kk=k;}}
    const j=Math.floor(kk/S.nx), i=kk%S.nx;
    console.log('%s t=%s mnt |eta|maks=%s m (i=%d,j=%d) lon %s lat %s h=%s m',
      mode,(s*dt/60).toFixed(0).padStart(3), mx.toExponential(2), i,j,
      (g.lonW+(i+0.5)*g.cs).toFixed(2),(g.latS+(j+0.5)*g.cs).toFixed(2), S.h[kk].toFixed(0));
    if(mx>1e3){ console.log('>>> MELEDAK di menit '+(s*dt/60).toFixed(0)); 
      // tetangga
      /* neighbor dump dihapus */
      break; }
  }
}
