// Okada (1985) — perpindahan permukaan akibat dislokasi persegi. z=0.
// Dipakai untuk deformasi dasar laut = kondisi awal tsunami.
const A = 0.5; // mu/(lambda+mu) untuk benda Poisson (lambda=mu)

function chinnery(f, x, p, L, W, q, dip){
  return f(x,   p,   q, dip) - f(x,   p-W, q, dip)
       - f(x-L, p,   q, dip) + f(x-L, p-W, q, dip);
}
function terms(xi, eta, q, dip){
  const sd=Math.sin(dip), cd=Math.cos(dip);
  const R=Math.sqrt(xi*xi+eta*eta+q*q);
  const yt=eta*cd+q*sd, dt=eta*sd-q*cd, X=Math.sqrt(xi*xi+q*q);
  const Re=R+eta, Rx=R+xi, Rd=R+dt;
  const lnRe = (Re<1e-9)? -Math.log(R-eta) : Math.log(Re);
  let I5;
  if(Math.abs(cd)<1e-9){ I5 = -A*xi*sd/Rd; }
  else I5 = A*(2/cd)*Math.atan((eta*(X+q*cd)+X*(R+X)*sd)/(xi*(R+X)*cd));
  let I4 = (Math.abs(cd)<1e-9)? -A*q/Rd : A*(1/cd)*(Math.log(Rd)-sd*lnRe);
  let I3 = (Math.abs(cd)<1e-9)? A*0.5*(eta/Rd + yt*q/(Rd*Rd) - lnRe)
                              : A*((1/cd)*(yt/Rd) - lnRe) + Math.tan(dip)*I4;
  let I1 = (Math.abs(cd)<1e-9)? -A*0.5*(xi*q)/(Rd*Rd)
                              : A*((-1/cd)*xi/Rd) - Math.tan(dip)*I5;
  const th = (Math.abs(q)<1e-9)? 0 : Math.atan(xi*eta/(q*R));
  return {R,yt,dt,Re,Rx,I1,I3,I4,I5,th,sd,cd,lnRe};
}
// komponen vertikal
function uzSS(xi,eta,q,dip){ const t=terms(xi,eta,q,dip);
  return t.dt*q/(t.R*t.Re) + q*t.sd/t.Re + t.I4*t.sd; }
function uzDS(xi,eta,q,dip){ const t=terms(xi,eta,q,dip);
  return t.dt*q/(t.R*t.Rx) + t.sd*t.th - t.I5*t.sd*t.cd; }
function uxDS(xi,eta,q,dip){ const t=terms(xi,eta,q,dip);
  return q/t.R - t.I3*t.sd*t.cd; }
function uyDS(xi,eta,q,dip){ const t=terms(xi,eta,q,dip);
  return t.yt*q/(t.R*t.Rx) + t.cd*t.th - t.I1*t.sd*t.cd; }
function uxSS(xi,eta,q,dip){ const t=terms(xi,eta,q,dip);
  return xi*q/(t.R*t.Re) + t.th + t.I1*t.sd; }
function uySS(xi,eta,q,dip){ const t=terms(xi,eta,q,dip);
  return t.yt*q/(t.R*t.Re) + q*t.cd/t.Re + t.I2!==undefined?0:0; }

// x,y relatif terhadap sudut bawah-kiri jejak patahan; d = kedalaman tepi bawah
function okadaSurface(x,y,d,dip,L,W,U1,U2){
  const sd=Math.sin(dip), cd=Math.cos(dip);
  const p = y*cd + d*sd;
  const q = y*sd - d*cd;
  const out={ux:0,uy:0,uz:0};
  if(U1!==0){
    out.ux += -(U1/(2*Math.PI))*chinnery(uxSS,x,p,L,W,q,dip);
    out.uz += -(U1/(2*Math.PI))*chinnery(uzSS,x,p,L,W,q,dip);
  }
  if(U2!==0){
    out.ux += -(U2/(2*Math.PI))*chinnery(uxDS,x,p,L,W,q,dip);
    out.uy += -(U2/(2*Math.PI))*chinnery(uyDS,x,p,L,W,q,dip);
    out.uz += -(U2/(2*Math.PI))*chinnery(uzDS,x,p,L,W,q,dip);
  }
  return out;
}
module.exports={okadaSurface};

if(require.main===module){
  // ---- UJI 1: kasus verifikasi Okada (1985) ----
  // x=2, y=3, d=4, dip=70deg, L=3, W=2, slip=1
  const dip=70*Math.PI/180;
  const ds=okadaSurface(2,3,4,dip,3,2,0,1);
  const ss=okadaSurface(2,3,4,dip,3,2,1,0);
  console.log('UJI1 dip-slip  ux,uz =', ds.ux.toExponential(4), ds.uy.toExponential(4), ds.uz.toExponential(4));
  console.log('   acuan Okada85 ~ -4.682e-3, -3.527e-2, -3.564e-2');
  console.log('UJI1 strike-slip ux,uz =', ss.ux.toExponential(4), ss.uz.toExponential(4));
  console.log('   acuan Okada85 ~ -8.689e-3, -2.747e-3');

  // ---- UJI 2: sanity fisika. Patahan naik landai pecah sampai permukaan ----
  // offset vertikal di jejak patahan harus ~ slip*sin(dip)
  const dip2=12*Math.PI/180, slip=25, W=200e3, L=1500e3, d=W*Math.sin(dip2);
  console.log('\nUJI2 patahan: L=1500km W=200km dip=12deg slip=25m, kedalaman tepi bawah=%.0f km',d/1000);
  let maxU=-9e9,minU=9e9,argmax=0;
  for(let y=-300e3;y<=400e3;y+=5e3){
    const u=okadaSurface(L/2,y,d,dip2,L,W,0,slip).uz;
    if(u>maxU){maxU=u;argmax=y;}
    if(u<minU)minU=u;
  }
  console.log('  angkatan maks = %.2f m (pada y=%.0f km dari jejak palung)', maxU, argmax/1000);
  console.log('  penurunan maks = %.2f m', minU);
  console.log('  slip*sin(dip) = %.2f m (patokan offset di jejak patahan)', slip*Math.sin(dip2));
}
