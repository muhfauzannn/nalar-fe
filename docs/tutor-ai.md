# TutorAI untuk pembelajaran PDF

Di halaman materi yang memiliki PDF unggahan, siswa dapat membaca PDF di aplikasi,
memilih teks atau mengetuk gambar, lalu bertanya lewat teks atau suara. Tutor membaca
halaman aktif, menunjukkan rujukan dengan cursor sendiri, dan membuat sorotan,
panah, kotak, lingkaran, garis bebas, atau catatan singkat. Bubble di cursor berisi
ringkasan langkah. Pada ponsel kolom tulis menempel di bawah layar selama ruang
belajar terlihat, agar dapat dipakai sambil membaca.

## Teks dan suara dalam satu percakapan

Berlaku untuk tutor PDF dan tutor kuis/tugas (`tutor-conversation.tsx`).

- Kolom tulis selalu tersedia, juga saat mikrofon menyala. Pertanyaan yang diketik
  dikirim sebagai `realtimeInput.text` ke sesi Live yang sama; mengetik tidak menutup
  mikrofon.
- Pertanyaan pertama yang diketik membuka sesi tanpa mikrofon. Jawabannya tampil
  sebagai teks saja; audio dari model tidak diputar. Tombol suara di kolom tulis
  membuka mikrofon pada sesi yang sama, dan sejak itu jawaban juga diucapkan.
  "Matikan suara" kembali ke teks tanpa memutus sesi; jawaban yang sedang berjalan
  diteruskan sebagai teks.
- Giliran suara dan teks masuk ke satu thread. Tutor PDF menyimpan thread hanya di
  memori browser selama halaman terbuka (tetap terlihat setelah sesi diakhiri); tutor
  kuis/tugas tetap menyimpan transkrip di backend seperti sebelumnya.
- Bola suara mengikuti kenyaringan nyata: mikrofon saat siswa bicara, `AnalyserNode`
  pada output saat tutor bicara. Nilainya dibaca setiap frame dan ditulis langsung ke
  `transform`, tanpa render ulang React. Reduced motion hanya mengubah opacity.

## Menjalankan

Backend memakai `GEMINI_API_KEY` yang sama dengan tutor tugas/kuis. Tidak ada
migrasi database atau perubahan konfigurasi storage. Backend harus memuat endpoint
baru `POST /api/student/ai-tutor/pdf-sessions` bersama frontend ini.

```sh
npm ci
npm run dev
```

`predev` dan `prebuild` menyalin CMaps, font standar, dan WASM dari versi PDF.js yang
terpasang ke `public/pdfjs/`. Worker dibundel Vite. Asset PDF tidak bergantung pada
CDN. Gunakan Node 24 sesuai Dockerfile proyek.

## Kontrak dan keputusan

- Sesi memakai Gemini Live dan token sekali pakai berumur 15 menit. Endpoint
  backend menerapkan otorisasi yang sama dengan pembacaan file asli, membatasi
  frekuensi sesi per akun, dan tidak mengirim API key ke browser.
- `PdfReader` membaca file asli dengan kredensial siswa. Model menerima JPEG halaman
  bersih dalam orientasi asli, block teks dengan bounding box, area terlihat, dan
  pilihan eksplisit. Ini termasuk diagram dan PDF hasil scan. Ekstraksi dibatasi
  600 block/24.000 karakter; gambar melengkapi teks yang tidak tersedia.
- Viewport berasal dari irisan halaman, area scroll, dan jendela browser. Ini bukan
  pelacakan mata. Rujukan ambigu tanpa pilihan harus diklarifikasi oleh tutor.
- `get_pdf_context` wajib sebelum menjawab. `present_pdf_guidance` harus membawa
  `resourceId`, `page`, `revision`, dan `turnId` terbaru. Gunakan `blockId` untuk teks;
  geometri memakai koordinat 0..1 pada halaman asli tanpa rotasi. Untuk garis bebas
  gunakan `points`; panah juga mendukung dua titik untuk arah mana pun.
- Seluruh batch tindakan divalidasi sebelum dipasang. Tidak ada eksekusi kode model,
  pengambilalihan mouse sistem, atau navigasi/scroll otomatis. PDF tidak dimodifikasi.
- Aplikasi mengakui tindakan setelah satu frame render (batas tunggu 80 ms), lalu
  model dapat menjelaskan langkah tersebut. Sinkronisasi dilakukan per langkah,
  bukan per kata. Audio baru diputar setelah pembacaan konteks pada giliran itu.
- Goresan memakai timeline GSAP yang sudah ada di proyek. Sebuah tangan dengan
  pena mengikuti panjang jalur SVG; pena terangkat ketika berpindah goresan.
  Persegi panjang, elips, panah, sorotan, dan garis bebas digambar berurutan.
  Label Latin/angka serta simbol matematika umum memakai glyph satu garis
  Hershey (data public domain; atribusi di `lib/handwriting/LICENSE.txt`), bukan
  animasi ketik. Karakter di luar cakupan glyph tetap ditampilkan dengan font
  biasa setelah goresan selesai agar isi tidak hilang.
- Suara boleh berjalan sambil pena menggambar; acknowledgment tool tidak menunggu
  semua huruf selesai. Satu batch animasi dibatasi sekitar 10 detik. Label panjang
  dibungkus dalam halaman. Saat konteks berubah, timeline dihentikan dan goresan
  yang sudah terlihat dipertahankan tanpa memulai ulang ketika zoom/rotasi.
  Reduced motion menampilkan hasil lengkap langsung tanpa gerak tangan.
- Pergantian konteks langsung menghentikan audio dan membatalkan giliran tertunda.
  Anotasi yang sudah selesai tetap mengikuti sumber saat zoom/rotasi/scroll; cursor
  lama disembunyikan. Pindah halaman/dokumen membersihkan lapisan. Siswa dapat
  menyela melalui suara, menghentikan penjelasan, menjeda mikrofon, atau mengakhiri.
- Metadata view dikirim setelah scroll tenang selama 200 ms. Gambar tidak dikirim
  ulang pada setiap scroll. Pembacaan konteks oleh tutor menyegarkan bukti visual.
- Percakapan dan anotasi sesi ini hanya ada di memori browser. Reconnect memulai
  percakapan baru. AudioContext, track mikrofon, request, timer, dan socket dilepas
  saat sesi ditutup atau komponen dilepas. Tidak ada rekaman suara yang disimpan
  oleh aplikasi. Pengiriman ke provider tetap mengikuti pengaturan akun provider.

## Ketahanan koneksi

Browser tersambung langsung ke Gemini Live, jadi penolakan atau pemutusan dari Google tidak
pernah melewati backend. Perilaku berikut diukur pada layanan sungguhan (Okt 2026), bukan
diasumsikan:

- **Satu key hanya menampung sekitar 6 sesi Live yang terbuka bersamaan.** Sesi ke-7 tersambung,
  lalu ditutup Google ±1,5 detik kemudian dengan kode `1011 "You exceeded your current quota"`.
  Sesi yang ditutup dalam beberapa detik setelah dibuka tidak dihitung. Satu kelas yang memakai tutor
  bersamaan bisa melewatinya; solusi tuntasnya menaikkan tier/billing project Gemini.
- **SDK tidak pernah menolak promise `live.connect()` untuk sesi yang ditolak.** Tanpa penanganan,
  tutor macet di "Menyambungkan…". `connectTutorLive` karena itu berlomba dengan event close dan
  batas waktu 20 detik, lalu menolak dengan `LiveConnectError` yang membawa kode, alasan, dan umur.
- **Setiap koneksi dihentikan Google pada menit ke-10** (`1011 "The service is currently
  unavailable"`, tanpa `goAway` sebelumnya). Sekitar 45 detik sebelumnya klien membuka sesi kedua,
  menunggu momen hening, lalu menukar sesi (`useSessionRenewal`); mikrofon dan halaman PDF ikut
  berpindah tanpa jeda. Kalau pergantian gagal, pemutusan paksa ditangani sebagai jalur
  sambung ulang biasa.
- **Token hanya berlaku untuk memulai sesi selama 2 menit** (`newSessionExpireTime`).
- **Sesi yang hanya dipakai mengetik ditutup setelah 60 detik tanpa aktivitas** (`useIdleClose`,
  `TEXT_IDLE_CLOSE_MS`), karena setiap sesi terbuka memakai jatah ±6 sesi per key. Sesi suara
  tidak ditutup. Pertanyaan berikutnya membuka sesi baru (±1 detik, satu dari 30 sesi per 10 menit
  per akun) dan tercatat sebagai event `idle_closed`.
- **Sesi baru tetap tahu percakapan sebelumnya.** Untuk kuis/tugas backend memasukkan maksimal
  12 giliran tersimpan terakhir (≤ 4.000 karakter) ke system instruction sebagai data. Tutor PDF
  tidak menyimpan percakapan di server, jadi browser mengirim thread-nya sebagai pesan
  `CONVERSATION_HISTORY` (batas yang sama) setiap kali sesi dibuka ulang, termasuk saat renewal.

`live-session-policy.ts` mengubah semua itu menjadi pesan untuk siswa dan keputusan retry.
Penolakan kuota, token terlambat, batas 10 menit, dan layanan tidak tersedia dicoba ulang otomatis
(maksimal 3 kali, jeda 0,3 detik sampai 60 detik ditambah acak agar satu kelas tidak mencoba
serempak, dengan hitung mundur di layar). Jatah retry baru pulih setelah sesi bertahan 30 detik.
Pertanyaan teks atau ketukan mikrofon saat menunggu disimpan dan dijalankan begitu tutor kembali;
pertanyaan yang belum dijawab saat koneksi putus diajukan ulang.

Setiap kegagalan dilaporkan ke `POST /api/student/ai-tutor/session-events` dan dicatat di log
backend (`tutor_client_event`), sehingga frekuensi dan penyebabnya dapat dilihat di prod.

## Verifikasi yang dapat diulang

```sh
npx playwright install chromium
npm run typecheck
npm run test:tutor
npm run build
```

Test memakai komponen produksi dalam harness terpisah, PDF dua halaman yang valid,
serta PDF raster tanpa text layer. Hanya API sesi dan WebSocket provider yang
simulasi; parsing PDF, worker, text selection, audio plumbing, SVG, dan interaksi
browser berjalan nyata. CI menjalankan typecheck dan tes ini tanpa API key.

Kriteria penerimaan teknis:

| Kriteria | Bukti |
| --- | --- |
| Tindakan salah dokumen/halaman/revisi/giliran tidak tampil | Validator dan pengujian tool browser |
| Rujukan teks memakai lokasi sumber | Uji `blockId` dan sorotan di PDF asli fixture |
| Zoom/rotasi mempertahankan posisi anotasi | Uji koordinat rotasi dan bounding box SVG di browser |
| Interupsi, stop, dan pergantian dokumen membatalkan respons lama | Uji WebSocket, kontrol suara, dan lapisan overlay |
| PDF scan tetap menghasilkan bukti visual | Uji PDF JPEG tanpa block teks |
| Gagal koneksi/PDF tetap menyediakan pemulihan | Uji 503, 404, retry, dan pembacaan materi |
| Kontrol tetap muat di ponsel | Uji viewport 390 px tanpa overflow halaman |
| Gambar dan huruf ditulis bertahap, ujung pena sesuai ujung garis | Uji kemajuan stroke SVG dan koordinat tangan dengan clock browser |
| Pembatalan menghentikan animasi; zoom/rotasi tidak mengulang tulisan | Uji kemajuan goresan yang dibekukan saat konteks berubah |
| Reduced motion menampilkan semua goresan tanpa animasi | Uji media preference di browser |

Di backend, jalankan seluruh suite dengan `TEST_DATABASE_URL` yang menunjuk
Postgres lokal sementara. Test `pdf-tutor.test.ts` memeriksa login, ID, kepemilikan
akses, materi belum terbit, dan kegagalan konfigurasi provider. Tes tutor kuis/tugas
lama tetap dipertahankan.

Provider nyata dapat diuji terpisah dari direktori backend:

```sh
bun run tutor:smoke
# Opsional, gunakan fixture gambar dari tes frontend untuk menguji input visual:
PDF_TUTOR_SMOKE_IMAGE=../nalar-fe/test-results/pdf-source.jpg bun run tutor:smoke
```

Smoke test menggunakan kunci yang dikonfigurasi, memanggil provider berbayar, dan
memakai contoh sintetis. Hasil hanya berupa status token, koneksi, pembacaan
konteks, identitas tindakan, dan penerimaan audio; kredensial tidak dicetak.

## Batas bukti dan validasi pembelajaran

Tes teknis dan smoke test tidak membuktikan akurasi semua penjelasan, kualitas OCR,
atau peningkatan hasil belajar. Belum ada evaluasi siswa/guru. Model melihat halaman
aktif, bukan seluruh isi PDF sekaligus; gambar kecil atau scan buram bisa tidak
terbaca. Performa jaringan nyata serta interupsi dengan mikrofon/perangkat pengguna
perlu diukur pada pilot. Trace lokal dalam hook menyimpan maksimal 200 timestamp
kejadian tanpa audio atau isi percakapan untuk membantu pengukuran tersebut.

Pilot yang disarankan tetap dalam satu skenario pembelajaran:

1. Guru menandai rujukan benar, miskonsepsi, dan jawaban pada beberapa bagian PDF
   asli (teks, rumus, diagram, scan), sebelum menilai keluaran tutor.
2. Siswa menyelesaikan soal awal, belajar dengan tutor, lalu menjawab soal penerapan
   baru tanpa bantuan. Gunakan kelompok pembanding membaca PDF jika memungkinkan.
3. Guru menilai secara buta dengan rubrik rujukan, kebenaran konsep, dan penerapan.
   Tetapkan ambang kelulusan bersama guru sebelum pilot, lalu laporkan jumlah kasus
   dan kegagalan, bukan hanya kesan atau kepuasan siswa.
4. Catat waktu selesai bicara → audio pertama, visual tampil → audio terkait, dan
   interupsi → audio berhenti pada perangkat/jaringan pilot. Laporkan p50/p95;
   jangan menganggap kelancaran mock sebagai latensi produksi.
