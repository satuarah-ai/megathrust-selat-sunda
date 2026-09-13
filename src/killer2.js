/* KILLER 2 — audit halaman utama: kecocokan angka tertulis vs data hitungan,
   konsistensi antar halaman, dan kewarasan tabel. */
const fs=require('fs');
const impact=JSON.parse(fs.readFileSync('data/impact.json','utf8'));
const pov=JSON.parse(fs.readFileSync('data/pov.json','utf8'));
const bundle=JSON.parse(fs.readFileSync('data/bundle.json','utf8'));
const jkt=JSON.parse(fs.readFileSync('data/jkt_flood.json','utf8'));
const pB=fs.readFileSync('partB.html','utf8');
const pD=fs.readFileSync('partD.html','utf8');
const halaman=pB+pD;
const F=[]; let n=0;
const ok=()=>n++;
const bad=(kat,p)=>F.push([kat,p]);
const num=s=>Number(String(s).replace(/\./g,'').replace(',','.'));
function cek(nama,tertulis,dihitung,tol,satuan){
  const d=Math.abs(tertulis-dihitung);
  const rel=dihitung?d/Math.abs(dihitung):d;
  const lolos=(tol.abs!=null? d<=tol.abs : rel<=tol.rel);
  if(lolos){ ok(); console.log('  OK    '+nama.padEnd(42)+String(tertulis).padStart(11)+'  (hitung '+
    (typeof dihitung==='number'?dihitung.toFixed(2):dihitung)+' '+(satuan||'')+')'); }
  else { console.log('  SALAH '+nama.padEnd(42)+String(tertulis).padStart(11)+'  (hitung '+
    (typeof dihitung==='number'?dihitung.toFixed(2):dihitung)+' '+(satuan||'')+')');
    bad('angka',nama+': halaman menulis '+tertulis+', data menghitung '+
      (typeof dihitung==='number'?dihitung.toFixed(2):dihitung)+' '+(satuan||'')); }
}
const IR=bundle.impact;   // sumber yang benar-benar dipakai halaman
const byName={}; IR.forEach(r=>byName[r.n]=r);
const JBD=['Kota JakartaUtara','Kota JakartaPusat','Kota JakartaBarat','Kota JakartaTimur',
 'Kota JakartaSelatan','Kabupaten KepulauanSeribu','Kota KotaTangerang','Kota TangerangSelatan',
 'Kabupaten Tangerang','Kota KotaBekasi','Kabupaten Bekasi','Kota Depok','Kota KotaBogor','Kabupaten Bogor'];
const jb=JBD.map(x=>byName[x]).filter(Boolean);
const sum=(a,f)=>a.reduce((z,r)=>z+f(r),0);

console.log('=== A. ANGKA UTAMA DI KEPALA HALAMAN ===');
const jbPop=sum(jb,r=>r.pop), jbM8=sum(jb,r=>r.m8), jbLiq=sum(jb,r=>r.liq), jbTp=sum(jb,r=>r.tp);
cek('Jabodetabek juta jiwa', 36.85, jbPop/1e6, {abs:0.05}, 'juta');
cek('juta jiwa di MMI VIII+', 29.98, jbM8/1e6, {abs:0.05}, 'juta');
cek('juta jiwa zona likuefaksi', 5.80, jbLiq/1e6, {abs:0.05}, 'juta');
cek('jiwa zona genangan Jabodetabek', 54460, jbTp, {abs:60}, 'jiwa');
cek('total penduduk domain (juta)', 105, bundle.totals.pop/1e6, {abs:0.6}, 'juta');
cek('korban tanpa evakuasi', 959019, bundle.totals.shakeDead+bundle.totals.tsuDead, {abs:900}, 'jiwa');
cek('korban dengan peringatan', 170248, bundle.totals.shakeDead+bundle.totals.tsuDeadEvac, {abs:900}, 'jiwa');
cek('jiwa di zona genangan (total)', 1.46, bundle.totals.popTsu/1e6, {abs:0.02}, 'juta');

console.log('\n=== B. ANGKA JAKARTA YANG DIKUTIP DI PROSA ===');
const ju=byName['Kota JakartaUtara'];
cek('Rrup Jakarta (prosa: 137 km)', 137, ju.rr, {abs:1}, 'km');
cek('amblesan Jakarta (0,51 m)', 0.51, Math.abs(ju.uz), {abs:0.015}, 'm');
cek('tsunami Teluk Jakarta (2,0 m)', 2.0, ju.th, {abs:0.05}, 'm');
cek('tiba Teluk Jakarta (menit 201)', 201, ju.ta/60, {abs:1}, 'menit');
cek('durasi guncangan Jakarta (78 dtk)', 78,
    Math.exp(-5.6+1.02*9.5+0.0013*ju.rr)+0.05*ju.rr, {abs:1.2}, 'detik');

console.log('\n=== C. KONSISTENSI ANTAR HALAMAN (index vs pov) ===');
const povJ=pov.site.find(s=>s.key==='jakut');
const bedaRrup=Math.abs(povJ.rrup-ju.rr);
const bedaTinggi=Math.abs(povJ.puncak-ju.th);
const bedaTiba=Math.abs(povJ.tTiba/60-ju.ta/60);
const bedaUz=Math.abs(Math.abs(povJ.uz)-Math.abs(ju.uz));
console.log('  Jakarta Utara — index vs pov:');
console.log('    Rrup      : '+ju.rr+' km  vs  '+povJ.rrup+' km   (beda '+bedaRrup+')');
console.log('    gelombang : '+ju.th.toFixed(2)+' m  vs  '+povJ.puncak.toFixed(2)+' m   (beda '+bedaTinggi.toFixed(2)+')');
console.log('    tiba      : '+Math.round(ju.ta/60)+' mnt vs  '+Math.round(povJ.tTiba/60)+' mnt  (beda '+Math.round(bedaTiba)+')');
console.log('    amblesan  : '+ju.uz.toFixed(2)+' m  vs  '+povJ.uz.toFixed(2)+' m   (beda '+bedaUz.toFixed(2)+')');
const adaBeda=(bedaRrup>3||bedaTinggi>0.3||bedaTiba>15||bedaUz>0.06);
const povB=fs.readFileSync('povB.html','utf8');
const dijelaskanIndex=/terberat di dalam wilayah itu/.test(halaman)&&/simulasi 3D/.test(halaman);
const dijelaskanPov=/di satu titik koordinat/.test(povB)&&/terberat se-kabupaten/.test(povB);
if(adaBeda&&!(dijelaskanIndex&&dijelaskanPov)){
  bad('konsistensi','Angka berbeda untuk tempat yang sama, dan perbedaannya TIDAK dijelaskan di '+
   (dijelaskanIndex?'':'halaman utama ')+(dijelaskanPov?'':'halaman POV ')+'- pembaca akan mengira salah satunya salah.');
} else { ok();
  console.log('  catatan penjelas di halaman utama: '+(dijelaskanIndex?'ADA':'TIDAK ADA'));
  console.log('  catatan penjelas di halaman POV  : '+(dijelaskanPov?'ADA':'TIDAK ADA'));
  if(adaBeda) console.log('  -> beda nilai memang ada, tapi kedua halaman menjelaskan sebabnya');
}
// gelombang harus sama, karena definisinya kini satu
if(bedaTinggi>0.3) bad('konsistensi','Tinggi air masih berbeda antar halaman meski definisi disatukan');
else ok();

console.log('\n=== D. KEWARASAN TABEL ===');
for(const r of IR.slice(0,25)){
  if(r.m8>r.pop+1){ bad('tabel',r.n+': warga MMI VIII+ ('+Math.round(r.m8)+') melebihi penduduk ('+Math.round(r.pop)+')'); }
  else ok();
  if(r.liq>r.pop+1){ bad('tabel',r.n+': warga zona likuefaksi melebihi penduduk'); } else ok();
  if(r.tp>r.pop+1){ bad('tabel',r.n+': warga zona genangan melebihi penduduk'); } else ok();
  if(r.ta>0 && r.th<0.3){ bad('tabel',r.n+': ada waktu tiba tapi gelombang <0,3 m'); } else ok();
  if(r.sd+r.td>r.pop){ bad('tabel',r.n+': korban melebihi penduduk'); } else ok();
}

console.log('\n=== E. GELOMBANG TERTINGGI: dua definisi berbeda? ===');
let maxTab=0,maxNm='';
for(const r of IR) if(r.th>maxTab){maxTab=r.th;maxNm=r.n;}
console.log('  kartu kepala menulis : 38,6 m');
console.log('  nilai tertinggi tabel: '+maxTab.toFixed(1)+' m ('+maxNm+')');
if(Math.abs(38.6-maxTab)>2){
  bad('angka','Kartu "gelombang tertinggi" menulis 38,6 m (maksimum pada sel perairan pesisir), '+
   'sementara tabel menampilkan '+maxTab.toFixed(1)+' m di '+maxNm+' (maksimum termasuk sel darat tergenang). '+
   'Dua definisi berbeda dipakai di satu halaman tanpa penjelasan.');
} else ok();

console.log('\n=== F. KURVA GENANGAN JAKARTA ===');
const c=jkt.curve;
for(let i=1;i<c.length;i++){
  if(c[i][1]<c[i-1][1]){ bad('kurva','Luas genangan menurun saat muka air naik: '+c[i-1][0]+' m -> '+c[i][0]+' m'); }
  else ok();
  if(c[i][2]<c[i-1][2]){ bad('kurva','Penduduk terdampak menurun saat muka air naik'); } else ok();
}
const teksKurva=[[3,94.9,52215],[5,561.8,805717],[2,52.1,19734]];
for(const [lv,luas,jiwa] of teksKurva){
  const row=c.find(r=>Math.abs(r[0]-lv)<0.01);
  if(!row){ bad('kurva','Tinggi '+lv+' m tidak ada di kurva'); continue; }
  cek('kurva '+lv+' m luas (km2)', luas, row[1], {abs:0.5}, 'km2');
  cek('kurva '+lv+' m jiwa', jiwa, row[2], {abs:5}, 'jiwa');
}

console.log('\n=== G. KLAIM PROSA ===');
const klaim=[
 ['amblesan memperbesar genangan 45%', 45, (52.1-35.9)/35.9*100, {abs:1.5}, '%'],
 ['penduduk naik 64% karena amblesan', 64, (19734-12062)/12062*100, {abs:2}, '%'],
 ['3 m -> 5 m naik 15x lipat', 15, 805717/52215, {abs:1.2}, 'kali'],
];
for(const [nm,tul,hit,tol,st] of klaim) cek(nm,tul,hit,tol,st);

console.log('\n================ HASIL KILLER 2 ================');
console.log('pemeriksaan lolos: '+n+'  |  temuan: '+F.length);
F.forEach((f,i)=>console.log('\n  ['+(i+1)+'] ('+f[0]+') '+f[1]));
fs.writeFileSync('killer2_out.json',JSON.stringify(F,null,1));
