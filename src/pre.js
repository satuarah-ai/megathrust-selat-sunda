const fs=require('fs'), C=require('./core.js');
const meta=require('./data/meta.json'), g=meta.main, N=g.nx*g.ny;
const b=fs.readFileSync('data/main.i16');
const elev=new Int16Array(b.buffer,b.byteOffset,b.length/2);
const F=C.buildFault(meta.trench,{dipDeg:13,topDepth:6000,widthKm:200,nSub:44,slipMean:25.7,hypoFrac:0.445});
console.log('menghitung medan deformasi ...');
let t0=Date.now();
const DC=C.deformCoarse(g,F,4), cN=DC.cnx*DC.cny, tot=new Float32Array(cN);
for(const f of DC.fields) for(let k=0;k<cN;k++) tot[k]+=f[k];
const uz=C.coarseToFine(g,DC,tot,new Float32Array(N));
const DI=new Int16Array(N);
for(let k=0;k<N;k++) DI[k]=Math.max(-32000,Math.min(32000,Math.round(uz[k]*100)));
fs.writeFileSync('data/deform.i16',Buffer.from(DI.buffer));
console.log('  deform.i16 %d KB (%.1f s)',DI.byteLength/1024,(Date.now()-t0)/1000);

console.log('menghitung medan guncangan MMI ...');
t0=Date.now();
const VS=C.vs30Grid(g,elev);
const MI=new Uint8Array(N);
for(let j=0;j<g.ny;j++){ const lat=g.latS+(j+0.5)*g.cs;
  for(let i=0;i<g.nx;i++){ const k=j*g.nx+i;
    const R=C.rrupKm(F,g.lonW+(i+0.5)*g.cs,lat);
    const gm=C.groundMotion(9.5,R,elev[k]<0?600:VS[k]);
    MI[k]=Math.max(0,Math.min(255,Math.round(C.mmiWorden(gm.pga,gm.sa1,gm.pgv)*10)));}}
fs.writeFileSync('data/mmi.u8',Buffer.from(MI.buffer));
console.log('  mmi.u8 %d KB (%.1f s)',MI.byteLength/1024,(Date.now()-t0)/1000);
// juga simpan Vs30 (untuk info titik) sebagai uint8 dibagi 4
const VU=new Uint8Array(N); for(let k=0;k<N;k++) VU[k]=Math.min(255,Math.round(VS[k]/4));
fs.writeFileSync('data/vs30.u8',Buffer.from(VU.buffer));
console.log('  vs30.u8 %d KB',VU.byteLength/1024);
// ringkas: berapa besar setelah gzip
