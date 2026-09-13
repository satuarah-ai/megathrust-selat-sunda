/* ============================================================
   INTI SIMULASI GEMPA MEGATHRUST + TSUNAMI
   Dipakai identik di Node (validasi) dan di browser (animasi).
   ============================================================ */
const R_E = 6371000, G = 9.81, DEG = Math.PI/180;

/* ---------- 1. OKADA (1985) : deformasi dasar laut ---------- */
const AK = 0.5;
function okTerms(xi,eta,q,dip){
  const sd=Math.sin(dip), cd=Math.cos(dip);
  const R=Math.sqrt(xi*xi+eta*eta+q*q);
  const yt=eta*cd+q*sd, dt=eta*sd-q*cd, X=Math.sqrt(xi*xi+q*q);
  const Re=R+eta, Rx=R+xi, Rd=R+dt;
  const lnRe = Math.log(Math.max(Re,1e-9));
  const I5 = AK*(2/cd)*Math.atan((eta*(X+q*cd)+X*(R+X)*sd)/(xi*(R+X)*cd));
  const I4 = AK*(1/cd)*(Math.log(Math.max(Rd,1e-9))-sd*lnRe);
  const I3 = AK*((1/cd)*(yt/Rd) - lnRe) + Math.tan(dip)*I4;
  const I1 = AK*((-1/cd)*xi/Rd) - Math.tan(dip)*I5;
  const th = (Math.abs(q)<1e-9)?0:Math.atan(xi*eta/(q*R));
  return {R,yt,dt,Re,Rx,I1,I3,I5,th,sd,cd};
}
function uzDS(xi,eta,q,dip){const t=okTerms(xi,eta,q,dip);
  return t.dt*q/(t.R*t.Rx) + t.sd*t.th - t.I5*t.sd*t.cd;}
function chin(f,x,p,L,W,q,dip){
  return f(x,p,q,dip)-f(x,p-W,q,dip)-f(x-L,p,q,dip)+f(x-L,p-W,q,dip);
}
/* x sepanjang strike (0..L), y tegak lurus (0 = proyeksi tepi DALAM, +y ke arah palung)
   d = kedalaman tepi dalam (m). Mengembalikan perpindahan vertikal (m). */
function okadaUz(x,y,d,dip,L,W,slip){
  const p=y*Math.cos(dip)+d*Math.sin(dip);
  const q=y*Math.sin(dip)-d*Math.cos(dip);
  return -(slip/(2*Math.PI))*chin(uzDS,x,p,L,W,q,dip);
}

/* ---------- 2. GEOMETRI PATAHAN sepanjang palung ---------- */
function buildFault(trench, opt){
  // trench: [[lon,lat],...] urut dari barat laut ke tenggara
  const {dipDeg=13, topDepth=6000, widthKm=200, nSub=44,
         sLo=0, sHi=1, slipPeak, slipMean, hypoFrac=0.5} = opt;
  const dip=dipDeg*DEG, W=widthKm*1000;
  // panjang busur
  const S=[0];
  for(let i=1;i<trench.length;i++){
    const dx=(trench[i][0]-trench[i-1][0])*Math.cos(0.5*(trench[i][1]+trench[i-1][1])*DEG)*111320;
    const dy=(trench[i][1]-trench[i-1][1])*110570;
    S.push(S[i-1]+Math.hypot(dx,dy));
  }
  const total=S[S.length-1];
  const a=sLo*total, b=sHi*total, rupLen=b-a;
  const at=(s)=>{ // interpolasi lon/lat pada jarak busur s
    let i=1; while(i<S.length-1 && S[i]<s) i++;
    const f=(s-S[i-1])/Math.max(S[i]-S[i-1],1e-6);
    return [trench[i-1][0]+f*(trench[i][0]-trench[i-1][0]),
            trench[i-1][1]+f*(trench[i][1]-trench[i-1][1])];
  };
  // pembagian arah dalam (down-dip): slip besar di bagian dangkal, mengecil ke dalam
  //  -> meniru pola slip megathrust nyata (Tohoku 2011, Sumatra 2004)
  const STRIP_W=[0.42, 0.82, 1.00, 0.94, 0.72, 0.44, 0.20]; // dari palung ke tepi dalam, meruncing di kedua ujung
  const nStrip=STRIP_W.length, wSum=STRIP_W.reduce((a,b)=>a+b,0)/nStrip;
  const subs=[], dL=rupLen/nSub;
  for(let k=0;k<nSub;k++){
    const s0=a+k*dL, s1=a+(k+1)*dL, sm=0.5*(s0+s1);
    const P0=at(s0), P1=at(s1), Pm=at(sm);
    // arah strike (satuan, dalam meter lokal)
    const ex=(P1[0]-P0[0])*Math.cos(Pm[1]*DEG)*111320, ey=(P1[1]-P0[1])*110570;
    const el=Math.hypot(ex,ey)||1; const sx=ex/el, sy=ey/el;
    // normal ke arah DARAT = strike diputar -90 derajat  (palung BL->TG, darat di timur laut)
    const nx=-sy, ny=sx;
    // taper slip: kosinus pangkat -> nol di kedua ujung, puncak di tengah rupture
    const u=(sm-a)/rupLen;
    const taper=Math.pow(Math.sin(Math.PI*u), 0.6);
    const dW=W/nStrip;
    const strips=[];
    for(let m=0;m<nStrip;m++){
      // m=0 paling dangkal (di palung). tepi bawah strip:
      const top = topDepth + m*dW*Math.sin(dip);
      strips.push({top, bot: top+dW*Math.sin(dip), dW,
                   offLand: m*dW*Math.cos(dip), w:STRIP_W[m]});
    }
    subs.push({s0,s1,sm,lon:Pm[0],lat:Pm[1],sx,sy,nx,ny,L:dL,W,dip,
               topDepth, botDepth: topDepth+W*Math.sin(dip), taper, u,
               strips, p0:P0,p1:P1});
  }
  // normalisasi slip
  const sumT=subs.reduce((z,s)=>z+s.taper,0)/nSub;
  const scale = slipMean/(sumT*wSum);
  subs.forEach(s=>{ s.slip=s.taper*scale;            // slip acuan subpatahan
                    s.slipEff=s.slip*wSum; });       // rata-rata sepanjang lebar
  const area=rupLen*W;
  const mu=3.0e10;
  const M0=subs.reduce((z,s)=>z+mu*s.L*s.W*s.slipEff,0);
  const Mw=(Math.log10(M0)-9.1)/1.5;
  const hypo=at(a+hypoFrac*rupLen);
  return {subs, rupLen, W, area, M0, Mw, mu,
          slipMean: subs.reduce((z,s)=>z+s.slipEff,0)/nSub,
          slipMax: Math.max(...subs.map(s=>s.slip))*Math.max(...STRIP_W),
          nStrip, stripW:STRIP_W,
          hypoLon:hypo[0], hypoLat:hypo[1],
          hypoDepth: topDepth + (W*0.45)*Math.sin(dip),
          hypoS: a+hypoFrac*rupLen, a, b, total, at};
}

/* deformasi vertikal di (lon,lat) dari SEMUA subpatahan yang sudah pecah pada waktu t */
function deformAt(F, lon, lat, tRup, vRup, riseTime){
  let uz=0;
  for(const s of F.subs){
    let frac=1;
    if(tRup!==undefined){
      const tArr=Math.abs(s.sm-F.hypoS)/vRup;
      frac=Math.min(1,Math.max(0,(tRup-tArr)/riseTime));
      if(frac<=0) continue;
    }
    // koordinat lokal terhadap titik awal subpatahan
    const dx=(lon-s.p0[0])*Math.cos(lat*DEG)*111320;
    const dy=(lat-s.p0[1])*110570;
    const x = dx*s.sx + dy*s.sy;                 // sepanjang strike
    const yl= dx*s.nx + dy*s.ny;                 // ke arah darat (positif)
    // Okada: y=0 di proyeksi tepi DALAM, +y menuju palung.
    // tepi dalam berada W*cos(dip) ke arah darat dari sumbu palung.
    for(const st of s.strips){
      // untuk tiap strip: tepi dalamnya berada (offLand + dW cos dip) dari palung
      const yEdge = st.offLand + st.dW*Math.cos(s.dip);
      const y = yEdge - yl;
      uz += okadaUz(x, y, st.bot, s.dip, s.L, st.dW, s.slip*st.w);
    }
  }
  return uz;
}

/* jarak terdekat titik permukaan ke BIDANG patahan 3D (Rrup, km) */
function rrupKm(F, lon, lat){
  let best=1e18;
  for(const s of F.subs){
    const dx=(lon-s.p0[0])*Math.cos(lat*DEG)*111320;
    const dy=(lat-s.p0[1])*110570;
    const x=dx*s.sx+dy*s.sy;
    const yl=dx*s.nx+dy*s.ny;              // jarak ke arah darat dari sumbu palung
    // bidang patahan: dari (y=0,z=topDepth) menurun ke (y=W cos dip, z=botDepth)
    const xc=Math.min(Math.max(x,0),s.L);
    const t=Math.min(Math.max(yl/(s.W*Math.cos(s.dip)),0),1);
    const py=t*s.W*Math.cos(s.dip), pz=s.topDepth+t*s.W*Math.sin(s.dip);
    const d=Math.sqrt((x-xc)*(x-xc)+(yl-py)*(yl-py)+pz*pz);
    if(d<best) best=d;
  }
  return best/1000;
}
module.exports={okadaUz,buildFault,deformAt,rrupKm,R_E,G,DEG};

/* ============================================================
   3. SOLVER TSUNAMI — persamaan air dangkal 2D, koordinat bola
   Grid Arakawa-C, skema loncat-katak (leapfrog), batas basah-kering.
   Baris j=0 = paling SELATAN.
   ============================================================ */
function makeSim(g, elev){
  const {nx,ny,cs,lonW,latS}=g;
  const N=nx*ny;
  const h=new Float32Array(N);            // kedalaman diam (m), + di laut, - di darat
  for(let k=0;k<N;k++) h[k]=-elev[k];
  const eta=new Float32Array(N);          // simpangan muka air (m)
  const M=new Float32Array(N), Nf=new Float32Array(N);   // fluks m^2/s
  const etaMax=new Float32Array(N).fill(0);
  const etaMin=new Float32Array(N).fill(0);
  const tArr=new Float32Array(N).fill(-1);               // waktu tiba (detik)
  const dlam=cs*DEG, dphi=cs*DEG;
  const cosP=new Float32Array(ny), cosF=new Float32Array(ny);
  for(let j=0;j<ny;j++){
    cosP[j]=Math.cos((latS+(j+0.5)*cs)*DEG);
    cosF[j]=Math.cos((latS+(j+1)*cs)*DEG);
  }
  const dyM=R_E*dphi;
  const MAN2=0.025*0.025, EPS=0.02, VMAX=25;
  // lapisan peredam di keempat tepi: menyerap gelombang keluar tanpa pantulan
  const SPW=20, SPMAX=0.055;
  const spng=new Float32Array(N); const spIdx=[], spVal=[];
  for(let j=0;j<ny;j++) for(let i=0;i<nx;i++){
    const q=Math.min(i,j,nx-1-i,ny-1-j);
    if(q<SPW){ const u=(SPW-q)/SPW; const c=SPMAX*u*u;
      spng[j*nx+i]=c; spIdx.push(j*nx+i); spVal.push(1-c); }
  }
  const SPI=new Int32Array(spIdx), SPV=new Float32Array(spVal);
  let t=0, nStep=0;
  // kecepatan maks & batas CFL
  let hmax=0; for(let k=0;k<N;k++) if(h[k]>hmax) hmax=h[k];
  const dxMin=R_E*Math.min(...cosP)*dlam;
  const dtCFL=1/(Math.sqrt(G*hmax)*Math.sqrt(1/(dxMin*dxMin)+1/(dyM*dyM)));

  function step(dt){
    // --- kekekalan massa ---
    for(let j=1;j<ny-1;j++){
      const o=j*nx, cp=R_E*cosP[j], cf=cosF[j], cfm=cosF[j-1];
      for(let i=1;i<nx-1;i++){
        const k=o+i;
        const dM=(M[k]-M[k-1])/dlam;
        const dN=(Nf[k]*cf-Nf[k-nx]*cfm)/dphi;
        eta[k]-=dt*(dM+dN)/cp;
      }
    }
    // --- momentum ---
    for(let j=1;j<ny-1;j++){
      const o=j*nx, cx=R_E*cosP[j]*dlam, cy=dyM;
      for(let i=1;i<nx-1;i++){
        const k=o+i;
        // arah x
        let Da=h[k]+eta[k], Db=h[k+1]+eta[k+1], D;
        if(Da<=EPS&&Db<=EPS){ M[k]=0; }
        else{
          if(Da>EPS&&Db<=EPS)      D=(eta[k]>-h[k+1])? eta[k]+h[k+1] : 0;
          else if(Db>EPS&&Da<=EPS) D=(eta[k+1]>-h[k])? eta[k+1]+h[k] : 0;
          else                     D=0.5*(Da+Db);
          if(D<=EPS) M[k]=0;
          else{
            let m=M[k]-dt*G*D*(eta[k+1]-eta[k])/cx;
            const sp=Math.abs(m)/D;
            if(sp>VMAX) m=Math.sign(m)*VMAX*D;
            m/= (1+dt*G*MAN2*Math.abs(m)/(D*D*Math.cbrt(D)));
            M[k]=m;
          }
        }
        // arah y
        let Ea=h[k]+eta[k], Eb=h[k+nx]+eta[k+nx], E;
        if(Ea<=EPS&&Eb<=EPS){ Nf[k]=0; }
        else{
          if(Ea>EPS&&Eb<=EPS)      E=(eta[k]>-h[k+nx])? eta[k]+h[k+nx] : 0;
          else if(Eb>EPS&&Ea<=EPS) E=(eta[k+nx]>-h[k])? eta[k+nx]+h[k] : 0;
          else                     E=0.5*(Ea+Eb);
          if(E<=EPS) Nf[k]=0;
          else{
            let n=Nf[k]-dt*G*E*(eta[k+nx]-eta[k])/cy;
            const sp=Math.abs(n)/E;
            if(sp>VMAX) n=Math.sign(n)*VMAX*E;
            n/= (1+dt*G*MAN2*Math.abs(n)/(E*E*Math.cbrt(E)));
            Nf[k]=n;
          }
        }
      }
    }
    // --- batas terbuka: lapisan peredam (sponge) ---
    for(let z=0;z<SPI.length;z++){ const k=SPI[z], f=SPV[z];
      eta[k]*=f; M[k]*=f; Nf[k]*=f; }
    t+=dt; nStep++;
    // --- rekam maksimum & waktu tiba (tiap 4 langkah, cukup) ---
    if(nStep%4===0) for(let k=0;k<N;k++){
      const e=eta[k];
      if(e>etaMax[k]) etaMax[k]=e;
      if(e<etaMin[k]) etaMin[k]=e;
      if(tArr[k]<0 && h[k]>0 && e>0.10) tArr[k]=t;
    }
  }
  function idxOf(lon,lat){
    const i=Math.round((lon-lonW)/cs-0.5), j=Math.round((lat-latS)/cs-0.5);
    if(i<0||j<0||i>=nx||j>=ny) return -1;
    return j*nx+i;
  }
  function volume(){ let v=0; for(let k=0;k<N;k++) if(h[k]+eta[k]>0) v+=eta[k]; return v; }
  return {h,eta,M,N:Nf,spng,etaMax,etaMin,tArr,nx,ny,cs,lonW,latS,idxOf,step,volume,
          dtCFL, hmax, get t(){return t;}, setT(v){t=v;}};
}
module.exports.makeSim=makeSim;

/* ---------- 4. Medan deformasi pada grid (kasar lalu diinterpolasi) ---------- */
function deformCoarse(g, F, stride){
  const {nx,ny,cs,lonW,latS}=g;
  const cnx=Math.ceil(nx/stride)+1, cny=Math.ceil(ny/stride)+1;
  const fields=[];                       // satu medan per subpatahan
  const CUT=700000;                      // abaikan subpatahan >700 km
  for(let s=0;s<F.subs.length;s++){
    const sub=F.subs[s], f=new Float32Array(cnx*cny);
    const cosd=Math.cos(sub.dip);
    for(let cj=0;cj<cny;cj++){
      const lat=latS+(Math.min(cj*stride,ny-1)+0.5)*cs, cl=Math.cos(lat*DEG);
      for(let ci=0;ci<cnx;ci++){
        const lon=lonW+(Math.min(ci*stride,nx-1)+0.5)*cs;
        const dx=(lon-sub.p0[0])*cl*111320, dy=(lat-sub.p0[1])*110570;
        const x=dx*sub.sx+dy*sub.sy, yl=dx*sub.nx+dy*sub.ny;
        if(Math.abs(x-sub.L/2)>CUT) continue;
        let uz=0;
        for(const st of sub.strips){
          const y=st.offLand+st.dW*cosd-yl;
          uz+=okadaUz(x,y,st.bot,sub.dip,sub.L,st.dW,sub.slip*st.w);
        }
        f[cj*cnx+ci]=uz;
      }
    }
    fields.push(f);
  }
  return {cnx,cny,stride,fields};
}
function coarseToFine(g,DC,coarse,out){
  const {nx,ny}=g, {cnx,stride}=DC;
  for(let j=0;j<ny;j++){
    const cj=j/stride, j0=Math.floor(cj), fy=cj-j0, j1=j0+1;
    for(let i=0;i<nx;i++){
      const ci=i/stride, i0=Math.floor(ci), fx=ci-i0, i1=i0+1;
      const a=coarse[j0*cnx+i0], b=coarse[j0*cnx+i1],
            c=coarse[j1*cnx+i0], d=coarse[j1*cnx+i1];
      out[j*nx+i]=(a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy;
    }
  }
  return out;
}
function rupFrac(F,s,t,vRup,rise){
  const tA=Math.abs(F.subs[s].sm-F.hypoS)/vRup;
  return Math.min(1,Math.max(0,(t-tA)/rise));
}
module.exports.deformCoarse=deformCoarse;
module.exports.coarseToFine=coarseToFine;
module.exports.rupFrac=rupFrac;

/* ============================================================
   5. MODEL GUNCANGAN
   - Vs30 dari kemiringan topografi (Wald & Allen 2007) — cara USGS ShakeMap
   - GMPE BC Hydro / Abrahamson dkk. (2016) untuk gempa antarmuka subduksi
   - MMI dari Worden dkk. (2012)
   - Likuefaksi dari Zhu dkk. (2017), model pesisir
   ============================================================ */
function vs30Grid(g, elev){
  const {nx,ny,cs}=g, N=nx*ny, V=new Float32Array(N);
  const dy=110570*cs;
  for(let j=0;j<ny;j++){
    const lat=g.latS+(j+0.5)*cs, dx=111320*cs*Math.cos(lat*DEG);
    for(let i=0;i<nx;i++){
      const k=j*nx+i;
      if(elev[k]<0){ V[k]=600; continue; }              // dasar laut: tak dipakai
      const i0=Math.max(0,i-1), i1=Math.min(nx-1,i+1);
      const j0=Math.max(0,j-1), j1=Math.min(ny-1,j+1);
      const gx=(elev[j*nx+i1]-elev[j*nx+i0])/((i1-i0)*dx);
      const gy=(elev[j1*nx+i]-elev[j0*nx+i])/((j1-j0)*dy);
      const sl=Math.hypot(gx,gy);
      V[k]= sl<3.0e-4?180: sl<3.5e-3?240: sl<0.010?300:
            sl<0.018?360: sl<0.050?490: sl<0.10?620:760;
    }
  }
  return V;
}
/* Koefisien resmi BC Hydro (Abrahamson dkk. 2015/2016), antarmuka subduksi.
   Diambil dari tabel COEFFS OpenQuake (openquake.hazardlib.gsim.abrahamson_2015). */
const BCH_C={
//  T      vlin      b       th1      th2     th6      th12     th13     dc1
  PGA :[ 865.1, -1.186,  4.2203, -1.350, -0.0012,  0.980, -0.0135, 0.2],
  T02 :[ 748.2, -2.188,  5.2684, -1.400, -0.0018,  2.076, -0.0162, 0.2],
  T03 :[ 587.1, -2.518,  4.7945, -1.280, -0.0027,  2.348, -0.0183, 0.2],
  T05 :[ 456.6, -2.669,  4.0181, -1.080, -0.0044,  2.399, -0.0231, 0.1],
  T10 :[ 400.0, -1.955,  2.7981, -0.850, -0.0062,  1.470, -0.0363, 0.0],
  T20 :[ 400.0, -0.299,  1.4128, -0.710, -0.0064, -0.401, -0.0610,-0.1],
  T30 :[ 400.0,  0.000,  0.6443, -0.640, -0.0064, -0.673, -0.0798,-0.2],
  T50 :[ 400.0,  0.000, -0.4624, -0.540, -0.0064, -0.596, -0.0980,-0.2],
};
const BK={n:1.18, c:1.88, th3:0.1, th4:0.9, th5:0.0, th9:0.4, c4:10.0, C1:7.8};
function bchTerm(C,M,R){                       // suku magnitudo + jarak (tanpa tapak)
  const [vlin,b,th1,th2,th6,th12,th13,dc1]=C;
  const dmag=BK.C1+dc1;
  const fmag = M>dmag ? BK.th5*(M-dmag) : BK.th4*(M-dmag);
  return th1 + BK.th4*dc1 + fmag + th13*Math.pow(10-M,2)
       + (th2 + BK.th3*(M-BK.C1))*Math.log(R + BK.c4*Math.exp(BK.th9*(M-6)))
       + th6*R;
}
function bchSite(C,vs30,pga1000){
  const [vlin,b,,,,th12]=C;
  const vss=Math.min(vs30,1000), arg=vss/vlin;
  if(vs30>=vlin) return th12*Math.log(arg) + b*BK.n*Math.log(arg);
  return th12*Math.log(arg) - b*Math.log(pga1000+BK.c)
       + b*Math.log(pga1000 + BK.c*Math.pow(arg,BK.n));
}
function bcHydro(key,M,R,vs30){
  const CP=BCH_C.PGA;
  const pga1000=Math.exp(bchTerm(CP,M,R) + (CP[5]+CP[1]*BK.n)*Math.log(1000/CP[0]));
  const C=BCH_C[key];
  return Math.exp(bchTerm(C,M,R) + bchSite(C,vs30,pga1000));   // satuan g
}
/* keluaran lengkap: percepatan (g), kecepatan (cm/s) */
function groundMotion(M,Rrup,vs30){
  const R=Math.max(Rrup,5);
  const pga=bcHydro('PGA',M,R,vs30);
  const sa03=bcHydro('T03',M,R,vs30);
  const sa10=bcHydro('T10',M,R,vs30);
  const sa20=bcHydro('T20',M,R,vs30);
  const sa30=bcHydro('T30',M,R,vs30);
  const pgv=sa10*981/(2*Math.PI);          // PGV ~ pseudo-kecepatan spektral di T=1 s
  return {pga,sa03,sa1:sa10,sa20,sa30,pgv};
}
function mmiWorden(pga_g,sa1_g,pgv){
  const pga=pga_g*981, sa1=sa1_g*981;
  const lp=Math.log10(Math.max(pga,1e-3)), ls=Math.log10(Math.max(sa1,1e-3)), lv=Math.log10(Math.max(pgv,1e-3));
  const m1 = lp<=1.57 ? 1.78+1.55*lp : -1.60+3.70*lp;
  const m2 = ls<=1.50 ? 2.50+1.01*ls : -2.35+3.70*ls;
  const m3 = lv<=0.53 ? 3.78+1.47*lv :  2.89+3.16*lv;
  return Math.min(10.5, Math.max(1, Math.max(m1,m2,m3)));
}
// durasi guncangan kuat (Bommer dkk. 2009, disederhanakan) — detik
function durationSec(M,Rrup){
  return Math.exp(-5.6 + 1.02*M + 0.0013*Rrup) + 0.05*Rrup;
}
// peluang likuefaksi (Zhu dkk. 2017, model pesisir)
function liqProb(pgv,vs30,dcKm,precipMm,M){
  if(pgv<3||vs30>620) return 0;
  const X = 12.435 + 0.301*Math.log(pgv) - 2.615*Math.log(vs30)
          + 0.0005556*precipMm - 0.0287*Math.sqrt(Math.max(dcKm,0));
  let p = 1/(1+Math.exp(-X));
  const Mf = 1/(1+Math.exp(-2*(M-6)));     // koreksi magnitudo
  return Math.min(1, p*Mf);
}
module.exports.vs30Grid=vs30Grid;
module.exports.groundMotion=groundMotion;
module.exports.bcHydro=bcHydro;
module.exports.mmiWorden=mmiWorden;
module.exports.durationSec=durationSec;
module.exports.liqProb=liqProb;
