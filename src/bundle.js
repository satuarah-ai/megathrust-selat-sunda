const fs=require('fs');
const meta=require('./data/meta.json');
const impact=require('./data/impact.json');
const jf=require('./data/jkt_flood.json');
const b64=p=>fs.readFileSync(p).toString('base64');

// kota & titik pantau
const CITIES=[
 // [nama, lon, lat, penduduk(jiwa), kelompok]  kelompok: J=Jabodetabek B=Banten L=Lampung S=SelatanJawa X=lain
 ['Jakarta Pusat',106.836,-6.186,1056000,'J'],['Jakarta Utara',106.880,-6.121,1840000,'J'],
 ['Jakarta Barat',106.759,-6.168,2600000,'J'],['Jakarta Selatan',106.810,-6.261,2300000,'J'],
 ['Jakarta Timur',106.900,-6.225,3100000,'J'],['Kota Bekasi',106.989,-6.238,2600000,'J'],
 ['Kab. Bekasi',107.153,-6.262,3150000,'J'],['Kota Depok',106.794,-6.402,2130000,'J'],
 ['Kota Bogor',106.816,-6.595,1130000,'J'],['Kab. Bogor',106.854,-6.482,5570000,'J'],
 ['Kota Tangerang',106.630,-6.178,1900000,'J'],['Tangerang Selatan',106.711,-6.294,1420000,'J'],
 ['Kab. Tangerang',106.475,-6.212,3470000,'J'],['Kep. Seribu',106.570,-5.700,28000,'J'],
 ['Merak',105.999,-5.933,60000,'B'],['Kota Cilegon',106.054,-6.017,450000,'B'],
 ['Anyer',105.898,-6.058,50000,'B'],['Carita',105.832,-6.313,30000,'B'],
 ['Labuan',105.828,-6.377,55000,'B'],['Tanjung Lesung',105.655,-6.480,12000,'B'],
 ['Kota Serang',106.150,-6.120,720000,'B'],['Ujung Kulon',105.375,-6.745,9000,'B'],
 ['Bakauheni',105.752,-5.868,25000,'L'],['Kalianda',105.578,-5.750,90000,'L'],
 ['Bandar Lampung',105.258,-5.425,1170000,'L'],['Krui',103.930,-5.180,40000,'L'],
 ['Pelabuhan Ratu',106.550,-6.985,110000,'S'],['Pameungpeuk',107.690,-7.650,40000,'S'],
 ['Pangandaran',108.653,-7.688,60000,'S'],['Cilacap',108.999,-7.727,280000,'S'],
 ['Kota Bengkulu',102.266,-3.800,440000,'X'],['Bandung',107.619,-6.917,2500000,'X'],
 ['Sukabumi',106.928,-6.923,350000,'X'],['Yogyakarta',110.370,-7.797,420000,'X'],
];
// gempa nyata: ringkas
const Q=meta.quakes.filter(q=>q[3]>=5.0).map(q=>[q[0],q[1],q[2],q[3],q[4]]);
const out={
  main:meta.main, zoom:meta.zoom, trench:meta.trench, trenchLenKm:meta.trenchLenKm,
  trenchS:meta.trenchS, cities:CITIES, quakes:Q,
  impact:impact.rows.map(r=>({n:r.nama,p:r.prov,pop:Math.round(r.pop),mmi:+r.mmi.toFixed(2),
     rr:+r.rr.toFixed(0),m8:Math.round(r.mmi8),liq:Math.round(r.liqPop),
     tp:Math.round(r.tsuPop),th:+r.tsuMax.toFixed(1),tl:+(r.tsuLand||0).toFixed(1),ta:r.tArr<1e9?Math.round(r.tArr):-1,
     uz:+r.uzMin.toFixed(2),sd:Math.round(r.shakeDead),td:Math.round(r.tsuDead),tde:Math.round(r.tsuDeadE)})),
  totals:{pop:impact.totPop,shakeDead:impact.totShakeDead,tsuDead:impact.totTsuDead,
          tsuDeadEvac:impact.totTsuDeadEvac,popTsu:impact.popTsu},
  jkt:jf,
};
fs.writeFileSync('data/bundle.json',JSON.stringify(out));
const B={
  main:b64('data/main.i16'), zoom:b64('data/zoom.i16'), jkt:b64('data/jkt_flood.u8'),
};
fs.writeFileSync('data/bin.json',JSON.stringify(B));
const kb=x=>(x/1024).toFixed(0)+' KB';
console.log('bundle.json', kb(fs.statSync('data/bundle.json').size));
console.log('  main b64  ', kb(B.main.length));
console.log('  zoom b64  ', kb(B.zoom.length));
console.log('  jkt  b64  ', kb(B.jkt.length));
console.log('TOTAL', kb(fs.statSync('data/bundle.json').size+B.main.length+B.zoom.length+B.jkt.length));
console.log('kota:',CITIES.length,'| gempa nyata M5+:',Q.length,'| wilayah:',out.impact.length);
