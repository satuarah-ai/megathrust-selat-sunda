/* KILLER — periksa logika fisika, angka, dan visual pada halaman POV */
const fs=require('fs');
const pov=JSON.parse(fs.readFileSync('data/pov.json','utf8'));
const d=fs.readFileSync('povD.html','utf8');
let n=0; const F=[];
const fail=(kat,pesan)=>{F.push([kat,pesan]);};
const ok=()=>n++;

console.log('=== A. LOGIKA ANGKA ===');
for(const s of pov.site){
  // kecepatan gelombang S ~3,6 km/s -> waktu tiba guncangan
  const tS=s.rrup/3.6;
  if(tS<5||tS>90) fail('angka','tiba guncangan '+s.nama+' = '+tS.toFixed(0)+' s, di luar nalar');
  else ok();
  // puncak harus >= tiba
  if(s.tTiba>0 && s.tPuncak<s.tTiba) fail('angka',s.nama+': puncak ('+s.tPuncak+'s) sebelum tiba ('+s.tTiba+'s)');
  else ok();
  // mareogram harus memuat surut sebelum puncak di lokasi dekat
  const i0=Math.max(0,Math.floor((s.tTiba-600)/pov.dtSampel));
  const i1=Math.floor(s.tTiba/pov.dtSampel);
  let minPre=1e9; for(let i=i0;i<=i1&&i<s.ts.length;i++) minPre=Math.min(minPre,s.ts[i]);
  if(s.tTiba>0 && minPre>0) fail('fisika',s.nama+': tidak ada surut sebelum gelombang (min '+(minPre/100).toFixed(2)+' m)');
  else ok();
  // PGA vs MMI harus sejalan
  if(s.mmi>8.5 && s.pga<0.2) fail('fisika',s.nama+': MMI '+s.mmi+' tapi PGA hanya '+s.pga+' g');
  else ok();
  // durasi masuk akal untuk M9.5
  if(s.durasi<50||s.durasi>140) fail('angka',s.nama+': durasi '+s.durasi+' s tak wajar untuk Mw 9,5');
  else ok();
}
console.log('  '+n+' pemeriksaan angka dijalankan');

console.log('\n=== B. LOGIKA VISUAL & FISIKA DALAM KODE ===');
const cek=[
 ['bangunan runtuh saat guncangan', /runtuh|collapse|fragility|hancur/i.test(d),
  'Tidak ada model kerusakan bangunan sama sekali. Pada MMI VIII-IX, 15-45% rumah non-rekayasa runtuh (HAZUS/Koshimura). Bangunan berdiri kokoh = tidak realistis.'],
 ['bangunan tersapu tsunami', /b\.st=3; b\.t0=t; fragSpawn/.test(d)&&/capD/.test(d),
  'Tidak ada model bangunan hanyut. Kedalaman aliran >2 m merobohkan rumah kayu, >4-6 m merobohkan pasangan bata (Koshimura dkk. 2009, Banda Aceh).'],
 ['tampilan dari udara (bird eye)', /udara|birdEye|camMode/i.test(d),
  'Tidak ada mode pandangan dari atas. Pengguna tidak bisa melihat gelombang menggulung dari laut ke darat.'],
 ['isyarat saat laut jauh di bawah', /diBawah|bawahmu|jauh di bawah/i.test(d),
  'Saat berdiri di 28 m, air +0,72 m tidak terlihat dan HUD hanya menulis "kering" - pengguna mengira simulasi rusak.'],
 ['puing / serpihan terbawa air', /puing|debris|serpih/i.test(d),
  'Air datang bersih tanpa puing. Tsunami nyata membawa reruntuhan, perahu, kendaraan.'],
 ['buih di muka gelombang', /0\.93,0\.95,0\.95/.test(d)&&/vF/.test(d),
  'Muka gelombang tidak berbuih, sehingga dinding air tidak terbaca sebagai gelombang.'],
];
for(const [nama,ada,pesan] of cek){
  if(ada){ console.log('  OK    '+nama); ok(); }
  else { console.log('  GAGAL '+nama); fail('visual',pesan); }
}

console.log('\n=== C. JEBAKAN DALAM KODE ===');
const jebakan=[
 [!/clamp\(v\/0\.45,-1,1\)/.test(d),
  'Jejak akselerogram tidak memakai tanda percepatan sebenarnya (harus clamp(v/0.45,-1,1)).'],
 [!/cBore=Math\.sqrt\(G\*hNear\)/.test(d),
  'Kecepatan muka gelombang tidak memakai c = sqrt(g*h) perairan dangkal.'],
 [!/roar=clamp\(Math\.max\(near\*clamp\(boreH\/3/.test(d),
  'Kerasnya deru tsunami tidak terikat tinggi muka gelombang dan kedalaman aliran.'],
 [!/camMode==='udara'/.test(d),
  'Tidak ada jalan keluar dari pandangan bawah air (mode udara).'],
];
const pesanJebakan=['jejak akselerogram palsu','kecepatan bore tidak fisis','skala suara sembarang','tenggelam tanpa jalan keluar'];
jebakan.forEach(([ada,pesan],i)=>{ if(ada){ console.log('  TEMUAN '+pesanJebakan[i]); fail('kode',pesan);} else ok(); });

console.log('\n================ HASIL KILLER ================');
console.log('pemeriksaan lolos: '+n+'  |  temuan: '+F.length);
F.forEach((f,i)=>console.log('\n  ['+(i+1)+'] ('+f[0]+') '+f[1]));
fs.writeFileSync('killer_out.json',JSON.stringify(F,null,1));
