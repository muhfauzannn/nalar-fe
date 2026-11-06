import type { LabStory } from "../story";
import type { ChallengeId } from "./model";

export const STORY: LabStory<ChallengeId> = {
  key: "gerak-parabola",
  title: "Jembatan Putus",
  opening: [
    { text: "Longsor memutus jalan ke Benteng Tua, tempat warga desa mengungsi. Hanya ada satu jalan cepat: lewat udara." },
    { text: "Di atas tebing ada meriam tua. Warga mengisi bola besi berongga dengan bantuan, dan kamu yang membidik." },
    { text: "Ini laras. Pegangan hijau di ujungnya mengatur sudut tembakan. Coba seret.", part: "laras", caption: "Laras", act: "Seret pegangan hijau di laras dulu" },
    { text: "Tong mesiu mengatur kecepatan awal bola: makin banyak takaran, makin cepat bola keluar. Coba geser.", part: "mesiu", caption: "Mesiu", act: "Geser pegangan hijau di tong dulu" },
    { text: "Bendera menandai titik jemput warga. Angka di tanah menunjukkan jaraknya dari tebing, dalam meter.", part: "bendera", caption: "Titik jemput" },
    { text: "Kalau bidikan sudah pas, tekan Tembak! Meleset tidak apa-apa: lihat selisihnya, lalu koreksi.", part: "tembak", caption: "Tembak" },
  ],
  missions: {
    "kenai-benteng": {
      before: [
        { text: "Titik jemput pertama ada 30 m dari tebing. Atur sudut dan mesiu, lalu tembak sampai bola mendarat di bendera." },
        { text: "Tebing ini tinggi, jadi jangan terpaku pada satu sudut hafalan. Perhatikan angka jangkauan di bawah gambar." },
      ],
      after: [
        { text: "Lihat kereta kecil itu: ia berjalan tepat di bawah bola dengan laju tetap. Kecepatan mendatar bola memang tidak berubah.", mood: "senang", part: "kereta", caption: "Kereta" },
        { text: "Yang berubah hanya kecepatan tegak: berkurang 9,8 m/s setiap detik. Dua gerak itulah yang membentuk lengkung parabola." },
      ],
    },
    "dua-sudut": {
      before: [
        { text: "Titik jemput pindah ke 24 m, dan warga minta dua kiriman. Bisakah dua sudut berbeda mendarat di titik yang sama?" },
        { text: "Kenai bendera dua kali, dengan dua sudut yang berbeda minimal 15°." },
      ],
      after: [
        { text: "Sudut rendah terbang datar, sudut tinggi naik jauh lalu turun. Dengan kecepatan yang sama, keduanya bisa sampai ke satu titik.", mood: "senang" },
        { text: "Jadi satu kecepatan sering punya dua sudut yang tepat. Bedanya, bola bersudut tinggi lebih lama di udara." },
      ],
    },
    "berat-ringan": {
      before: [
        { text: "Kiriman terakhir: bola obat 1 kg dan bola beras 5 kg. Sudut dan kecepatan awal dikunci sama untuk keduanya." },
        { text: "Pilih bola dari rak ini. Tebak dulu mana yang lebih jauh, lalu tembak keduanya.", part: "bola", caption: "Rak bola" },
      ],
      after: [
        { text: "Keduanya mendarat di titik yang sama. Dengan kecepatan awal sama dan tanpa hambatan udara, massa tidak mengubah lintasan.", mood: "senang" },
        { text: "Gravitasi memberi percepatan yang sama, 9,8 m/s², pada benda seberat apa pun." },
      ],
    },
  },
  closing: {
    text: "Semua bantuan sampai. Malam ini warga di Benteng Tua bisa makan dan berobat.",
    findings: ["Kecepatan mendatar tetap, kecepatan tegak berkurang 9,8 m/s tiap detik.", "Satu kecepatan bisa punya dua sudut yang mendarat di titik sama.", "Tanpa hambatan udara, massa tidak mengubah lintasan."],
  },
};
