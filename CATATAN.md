# Catatan Proyek — Megathrust Selat Sunda

Catatan lengkap pembahasan 13–14 September 2026. Ditulis agar siapa pun (termasuk saya
sendiri di sesi berikutnya) bisa melanjutkan tanpa mengulang dari nol.

## Alamat

| Apa | Di mana |
|---|---|
| Peta & angka (publik) | https://satuarah-ai.github.io/megathrust-selat-sunda/ |
| Simulasi 3D POV (publik) | https://satuarah-ai.github.io/megathrust-selat-sunda/pov.html |
| Video 55 detik (H.264) | https://satuarah-ai.github.io/megathrust-selat-sunda/megathrust_labuan.mp4 |
| Repositori | https://github.com/satuarah-ai/megathrust-selat-sunda |
| Analitik | https://satuarah.goatcounter.com (akun kanindraofficial@gmail.com) |
| Artifact claude.ai (privat) | https://claude.ai/code/artifact/30fb8611-434b-4da5-8091-2a4c6684c609 |
| Folder lokal | `C:\Users\Legion\Projects\megathrust-selat-sunda` |

Akun GitHub: `satuarah-ai` (nama tampilan "satuarah"; nama `satuarah` polos sebenarnya
masih kosong bila suatu saat ingin diganti — ganti nama akan mematikan link github.io lama).

## Tujuan dan batasan

Simulasi visual skenario gempa megathrust **Mw 9,5** berpusat di segmen Selat Sunda, untuk
bahan pertimbangan mitigasi, dengan fokus dampak Jabodetabek. **Bukan prakiraan**: BMKG dan
Pusgen menaksir magnitudo maksimum segmen Selat Sunda 8,7; Mw 9,5 mengandaikan pecahnya
beberapa segmen (Enggano–Selat Sunda–Jawa Barat/Tengah) sekaligus. Yang nyata adalah datanya.

Prinsip kerja yang diminta pemilik: **Builder → Killer → Solver** — bangun, jatuhkan sendiri
dengan pengujian, perbaiki temuannya. Angka tidak boleh asal-asalan; setiap angka tertulis harus
bisa ditelusuri ke data hitungan.

## Rantai perhitungan

| Tahap | Metode / sumber |
|---|---|
| Batimetri & topografi | GMRT ~1 km → grid 684×512, sel 1,96 km (lon 100–112, lat 3,5–12,5 S) |
| Palung | titik terdalam per kolom bujur dari batimetri, dihaluskan — 1.454 km |
| Patahan | 44 subpatahan × 7 lajur down-dip, dip 13°, lebar 200 km, atas 6 km, slip meruncing |
| Deformasi dasar laut | Okada (1985) — lolos kasus uji terbitan sampai 4 angka penting |
| Tsunami | air dangkal 2D koordinat bola, Arakawa-C, Δt 4,2 s × 5.143 langkah, lapisan peredam |
| Vs30 | kemiringan topografi (Wald & Allen 2007) |
| Guncangan | BC Hydro / Abrahamson dkk. 2016, koefisien resmi dari tabel OpenQuake → MMI Worden 2012 |
| Likuefaksi | Zhu dkk. 2017 model pesisir |
| Penduduk | GHSL GHS-POP 2025 (100 m) × batas GADM 4.1 — 116 kabupaten/kota, 105,3 juta jiwa |
| Korban | PAGER Jaiswal & Wald 2010, koefisien Indonesia; tsunami: laju kematian vs kedalaman |
| Genangan Jakarta | topografi GMRT 61 m, banjir tersambung ke laut, amblesan koseismik disertakan |
| POV 3D | akselerogram sintetis Kanai–Tajimi + Jennings–Housner diskalakan ke PGA/PGV titik; mareogram solver 686 sampel/lokasi; kurva rapuh lognormal per bangunan; solver aliran lokal 96×96 sel (8 m) |

## Angka kunci hasil hitungan

- Rupture 1.454 × 200 km, slip rata-rata 25,7 m, puncak 54 m, M0 2,24×10²³ N·m, Mw 9,50
- Durasi pecah 368 s; energi 1,12×10¹⁹ J = 2.686 Mt TNT; air terangkat 1.245 km³
- Air tertinggi di perairan pesisir 38,6 m (Garut); di daratan tergenang 54,3 m
- Jakarta: Rrup 137 km, MMI VIII selama 78 s, PGA 0,19 g, likuefaksi 54–66%, ambles 0,51 m,
  air Teluk Jakarta 2,0 m tiba menit ke-201
- Jabodetabek: 36,85 juta jiwa, 29,98 juta (81%) di MMI VIII+, 5,80 juta zona likuefaksi
- Korban model: 959.019 tanpa evakuasi vs 170.248 dengan peringatan efektif (ketidakpastian ~×10)
- Genangan Jakarta pada 2,0 m: 52,1 km², 19.734 jiwa; amblesan memperbesar 45% / 64%;
  3 m → 5 m: 52.215 → 805.717 jiwa

**Dua definisi tinggi air** (dipisah tegas setelah audit): "pesisir" = sel laut 0–60 m;
"di darat" = sel darat tergenang. Nilai per wilayah di tabel = **terberat se-kabupaten**;
halaman POV memakai **satu titik**. Keduanya benar, dijelaskan di kedua halaman.

## Validasi yang lolos

Okada 1985 (kasus terbitan) · Tohoku 2011: DART laut dalam 2,05 m vs ~1,8 m, angkatan 10,2 m
vs 7–10 m, Sendai PGA 0,363 g/PGV 72 vs 0,3–1,0 g/50–100 · Pangandaran 2006: 6,0 m vs 5–7 m,
tiba 25–50 mnt vs 30–45 · Krakatau 1883 jalur ke Jakarta: 164 mnt vs ~2,5 jam, redaman 10,6% vs
5,3% · GHSL 119 jt vs BPS · kurva rapuh: simulasi vs teori < 0,9 pp di 8 lokasi.

Kegagalan yang pernah terjadi dan diperbaiki: solver meledak 1.099 m di tepi domain (syarat
batas radiasi → diganti lapisan peredam); koefisien GMPE tebakan salah (θ2 −1,414 vs −0,85 →
ambil tabel OpenQuake); rigiditas 2006 (tsunami earthquake, μ 1e10).

## Riwayat bug halaman POV (killer → solver)

1. Runtuh 14% vs teori 41% → pakai puncak percepatan yang pernah dialami, bukan sesaat
2. Air tak terlihat → air keruh dirender cokelat = warna tanah
3. Pandangan udara bubur → kabut badai terlalu pekat + orbit kamera ke atas laut
4. Kota tenggelam sebelum gelombang → ketinggian bawaan 0 m (artefak grid 2 km) + amblesan
5. Sapuan 4% pada 6 m → kedalaman dibaca di dalam sel rintangan sendiri
6. Amblesan tak masuk kedalaman kaki
7. Tanah hitam dari mata → kamera di tengah jalan 18 m + FOV HP tegak 35°
8. Rumah tak terlihat → 160 rumah tersebar 580×500 m; ditambah deret rumah tepi jalan
9. Panel "⋯" tampil meski `hidden` → halaman mandiri tak punya aturan `[hidden]`
10. Pengukuran live tercemar cache profil uji Chrome → matikan cache lewat CDP

## Keputusan desain

- Situs statis di GitHub Pages; data grid delta-encoded + gzip (3,8 MB → 869 KB), dibongkar
  `DecompressionStream`, cadangan `.bin`; HTML 174 KB muncul seketika
- Mode cepat otomatis di layar ≤ 820 px (grid separuh, 8× lebih ringan)
- Analitik GoatCounter tanpa cookie + pelacakan tombol (`peta/…`, `3d/…`); **tidak** dipasang
  di versi Artifact (CSP memblokir gc.zgo.at)
- Video dirender bingkai-demi-bingkai lewat `window.__STEP` (deterministik), dirakit ffmpeg
  dari `imageio-ffmpeg` (libx264, yuv420p, faststart)
- Rupa sengaja geometri sederhana; ketelitian ditaruh di fisika (kapan, seberapa tinggi,
  berapa persen hancur), bukan tekstur

## Cara memperbarui situs

```
cd C:\Users\Legion\Projects\megathrust-selat-sunda\src
node build2.js      # rakit index.html + data (memanggil build_pov.js di akhir)
node build_pov.js   # (bila hanya POV) rakit pov.html
node killer.js      # audit fisika/visual POV      -> harus 0 temuan
node killer2.js     # audit angka halaman utama    -> harus 0 temuan
```
Keluaran di `site/` → salin ke akar repo → `git add -A && git commit && git push`.
`build2.js` mengosongkan `site/`, jadi jalankan `build_pov.js` **setelahnya**.
Butuh Node 18+, Python 3 + numpy; data mentah grid ada di `src/data/`.

**Push dari mesin ini**: `git push` biasa menggantung karena dialog kredensial Windows;
pakai `git -c credential.helper="!gh auth git-credential" push origin main`.

**Uji peramban**: Chrome headless dengan `--enable-unsafe-swiftshader --use-angle=swiftshader
--remote-debugging-port=9223`, lalu `node pov_test.js <url> 390 844` / `node mobile.js`.
Selalu matikan cache (`Network.setCacheDisabled`) saat menguji alamat live.

**Video**: `node mkvideo.js <url> labuan` (±8 menit) lalu `python mkvideo.py labuan`.

## Hal terbuka

- **Token GitHub `deploy-megathrust` terpapar di percakapan dan belum dicabut** —
  cabut di github.com/settings/tokens; buat baru lewat berkas/clipboard, jangan lewat chat
- Verifikasi email GoatCounter (spanduk biru di dasbor)
- Opsional: Microsoft Clarity (heatmap & rekaman sesi; butuh pemberitahuan cookie),
  tautan pendek bit.ly untuk hitung klik, formulir kontak sukarela
- Opsional: nama pemegang hak cipta di `LICENSE` masih "Indra"
- Data mentah besar (GMRT 183 MB, GHSL 45 MB, GADM) tidak disimpan; skrip pengunduhnya
  ada di `src/proc_*.py`, `src/ghsl.py`, `src/expose.py`

## Sumber data

GMRT Grid Server (LDEO) · USGS FDSN Event API (1.200 gempa M≥4,5 sejak 1970) ·
GHSL GHS-POP R2023A epoch 2025 (JRC) · GADM 4.1 · tabel COEFFS OpenQuake `abrahamson_2015` ·
BMKG/Pusgen (segmen Selat Sunda 8,7; Enggano 8,4) · Krakatau 1883, Pangandaran 2006, Tohoku 2011
