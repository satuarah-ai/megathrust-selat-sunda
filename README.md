# Megathrust Selat Sunda — simulasi Mw 9,5

Simulasi fisika terbuka tentang apa yang terjadi bila zona subduksi di barat daya Selat Sunda
pecah sepanjang 1.454 km sekaligus: rupture, deformasi dasar laut, perambatan tsunami,
guncangan tanah, likuefaksi, dan paparan penduduk di 105 juta jiwa — dengan fokus pada Jabodetabek.

**Halaman langsung:** _(isi setelah GitHub Pages aktif)_

> **Ini skenario, bukan prakiraan.** Tidak ada gempa Mw 9,5 yang sedang berlangsung.
> BMKG dan Pusgen menaksir magnitudo maksimum segmen Selat Sunda di angka **8,7**;
> Mw 9,5 mengandaikan pecahnya beberapa segmen sekaligus dalam satu peristiwa.
> Untuk peringatan dini dan keputusan resmi, rujukannya tetap **BMKG** dan **BNPB**.

---

## Apa yang dihitung, bukan digambar

Tidak ada satu pun peta di halaman ini yang digambar tangan. Semuanya keluaran perhitungan
di atas data pengukuran nyata:

| Tahap | Metode |
|---|---|
| Batimetri & topografi | GMRT resolusi ~1 km → grid 684×512, sel 1,96 km |
| Geometri palung | titik terdalam per kolom bujur, dihaluskan — 1.454 km |
| Bidang patahan | 44 subpatahan × 7 lajur *down-dip*, dip 13°, lebar 200 km, slip meruncing |
| Deformasi dasar laut | Okada (1985), dislokasi persegi dalam medium elastik |
| Tsunami | persamaan air dangkal 2D koordinat bola, grid Arakawa-C, Δt 4,2 s × 5.143 langkah, lapisan peredam di tepi |
| Kekerasan tanah | Vs30 dari kemiringan topografi (Wald & Allen 2007) — cara USGS ShakeMap |
| Guncangan | BC Hydro / Abrahamson dkk. (2016) → MMI Worden dkk. (2012) |
| Likuefaksi | Zhu dkk. (2017), model pesisir |
| Penduduk | GHSL GHS-POP 2025 resolusi 100 m × batas GADM 4.1 (116 kabupaten/kota) |
| Korban | PAGER — Jaiswal & Wald (2010), koefisien Indonesia |

## Validasi

Model apa pun tidak berarti sampai dijatuhkan dulu oleh kenyataan. Solver ini diuji melawan
peristiwa yang sudah terjadi, sebelum dipakai untuk yang belum:

| Uji | Model | Tercatat nyata |
|---|---|---|
| Okada (1985), kasus uji terbitan | uz = −3,5639e−2 | −3,564e−2 |
| Amplitudo laut dalam, parameter Tohoku 2011 | 2,05 m | pelampung DART ~1,8 m |
| Angkatan dasar laut, parameter Tohoku 2011 | 10,2 m | 7–10 m |
| Tsunami Pangandaran 2006 | 6,0 m | 5–7 m teramati |
| Waktu tiba Pangandaran 2006 | 25–50 menit | 30–45 menit |
| Jalur Selat Sunda → Teluk Jakarta (Krakatau 1883) | tiba 164 menit | ~2,5 jam |
| Redaman Jakarta/Merak | 10,6 % | 5,3 % (1883) |
| Guncangan Sendai (Tohoku 2011) | PGA 0,363 g · PGV 72 cm/s | 0,3–1,0 g · 50–100 cm/s |
| Total penduduk GHSL, petak 100–110°BT | 119 juta | sesuai agregat BPS |

Satu uji sempat **gagal total** — simulasi meledak menjadi gelombang 1.099 meter di tepi domain
karena syarat batas radiasi yang cacat. Diganti dengan lapisan peredam, lalu lolos.
Riwayat itu sengaja ditampilkan di halaman, bukan disembunyikan.

## Temuan utama

- **Jakarta bukan 350 km dari sumber.** Bidang megathrust menghunjam sampai kedalaman 51 km
  *di bawah* Jawa Barat; jarak Jakarta ke bidang patahan (Rrup) hanya **137 km**.
- **Jabodetabek dihancurkan guncangan, bukan tsunami.** 29,98 juta dari 36,85 juta jiwa berada
  di MMI VIII selama 73–80 detik. Tsunami Teluk Jakarta hanya 2,5 m dan baru tiba menit ke-201,
  karena Selat Sunda menyempit dan Laut Jawa dangkal.
- **Tanah Jakarta ambles 0,51 m permanen** dalam enam menit — dan amblesan itu sendiri
  memperbesar luas genangan **46 %**.
- **Dataran Jakarta punya tebing non-linier.** Gelombang 3 m → 5 m menaikkan penduduk terdampak
  dari 52.215 menjadi 805.717 jiwa.
- **Peringatan dini adalah tuas terbesar.** Perkiraan korban 959.019 tanpa evakuasi
  vs 170.248 dengan peringatan efektif. Di pesisir Pandeglang air datang **menit ke-9**:
  guncangan itu sendiri adalah peringatannya.

Ketidakpastian model korban bencana semacam ini lazimnya sampai faktor sepuluh.
Angka di sini untuk menimbang kebijakan mitigasi, bukan untuk dikutip sebagai ramalan.

## Isi repositori

```
index.html        halaman simulasi (mandiri, ~174 KB)
data/*.gz         grid terkompresi: batimetri, tinggi gelombang, waktu tiba,
                  deformasi, topografi Jakarta 183 m, MMI, Vs30  (total 869 KB)
data/*.bin        cadangan tanpa gzip untuk peramban lama
og.jpg            gambar pratinjau tautan
src/              seluruh kode yang menghasilkan data di atas
```

Grid disimpan delta per baris lalu digzip, dan dibongkar di peramban dengan
`DecompressionStream` — 3,8 MB mentah menjadi 869 KB. Halaman muncul seketika,
peta menyusul. Di ponsel, simulasi otomatis memakai grid separuh (8× lebih ringan).

## Menjalankan ulang

```bash
node src/pre.js        # hitung medan deformasi & guncangan
node src/impact.js     # dampak per kabupaten/kota
node src/build2.js     # rakit index.html + data
node src/validate.js   # jalankan uji validasi
```

Butuh Node.js 18+ dan Python 3 dengan numpy untuk tahap pengolahan grid awal.

## Sumber data

- Batimetri — [GMRT Grid Server](https://www.gmrt.org/), Lamont-Doherty Earth Observatory
- Katalog gempa — [USGS FDSN Event API](https://earthquake.usgs.gov/fdsnws/event/1/), 1.200 peristiwa M≥4,5 sejak 1970
- Penduduk — [GHSL GHS-POP R2023A epoch 2025](https://human-settlement.emergency.copernicus.eu/), JRC Komisi Eropa, 100 m
- Batas wilayah — [GADM 4.1](https://gadm.org/) tingkat kabupaten/kota
- Koefisien GMPE — tabel COEFFS [OpenQuake](https://github.com/gem/oq-engine), `abrahamson_2015`
- Magnitudo maksimum segmen — BMKG & Pusgen: Selat Sunda 8,7 · Enggano 8,4

## Lisensi

Kode: MIT (lihat `LICENSE`). Data keluaran simulasi bebas dipakai dengan menyebut sumber.
Data masukan tunduk pada lisensi penyedianya masing-masing (GMRT, USGS, GHSL/JRC, GADM).
