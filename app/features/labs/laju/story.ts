import type { LabStory } from "../story";
import type { ChallengeId } from "./model";

export const STORY: LabStory<ChallengeId> = {
  key: "reaktor-tumbukan",
  title: "Hari Pertama Jadi Operator",
  opening: [
    { text: "Hari pertamamu di pabrik. Bu Sari, kepala shift, menyerahkan kendali reaktor ini kepadamu." },
    { text: "Reaksi hanya terjadi saat partikel bertumbukan dengan energi yang cukup. Di dalam kaca, partikel A dan B terus bergerak." },
    { text: "Ini pemanas. Putar kenopnya untuk mengubah suhu, lalu lihat gerak partikelnya. Coba putar.", part: "pemanas", caption: "Pemanas", act: "Putar kenop pemanas dulu" },
    { text: "Pengukur menunjukkan laju reaksi dibanding campuran awal. Angka 1× berarti sama dengan campuran awal.", part: "pengukur", caption: "Pengukur" },
    { text: "Kalau pengaturan sudah siap, tekan Reaksikan untuk mengukur hasilnya.", part: "reaksikan", caption: "Reaksikan" },
  ],
  missions: {
    "gandakan-suhu": {
      before: [
        { text: "Pesanan pertama: reaksi harus 2× lebih cepat, dan Bu Sari hanya mengizinkan pemanas yang diubah." },
        { text: "Kira-kira butuh suhu berapa? Putar kenop, amati pengukur, lalu reaksikan." },
      ],
      after: [
        { text: "Naik 10 K saja sudah cukup, tidak perlu dua kali lipat suhu. Panas menambah porsi tumbukan yang energinya melewati energi aktivasi.", mood: "senang" },
        { text: "Partikel memang sedikit lebih cepat, tapi yang paling berpengaruh adalah makin banyak tumbukan yang efektif." },
      ],
    },
    "katalis-tetap": {
      before: [
        { text: "Keranjang ini berisi 2,0 g katalis yang mahal. Bagian keuangan bertanya: apakah harus beli lagi setiap kali reaksi?", part: "katalis", caption: "Katalis" },
        { text: "Keranjangnya sudah dicelupkan. Pilih tebakanmu, reaksikan, lalu lihat massanya." },
      ],
      after: [
        { text: "Massanya tetap. Katalis membuka jalur reaksi dengan energi aktivasi lebih rendah, dan tidak ikut habis.", mood: "senang" },
        { text: "Jadi satu katalis bisa dipakai berulang. Bagian keuangan tenang, dan lajunya pun naik jauh." },
      ],
    },
    "cepat-tapi-aman": {
      before: [
        { text: "Pesanan besar: laju harus 12× atau lebih. Masalahnya, kaca reaktor hanya aman sampai 310 K." },
        { text: "Semua kendali kini terbuka. Pompa ini mengatur konsentrasi, dan katalis boleh dipakai atau tidak.", part: "pompa", caption: "Pompa" },
      ],
      after: [
        { text: "Panas saja tidak cukup. Katalis menurunkan energi aktivasi, jadi laju bisa naik tanpa memaksa suhu melewati batas kaca.", mood: "senang" },
        { text: "Konsentrasi juga membantu: makin rapat partikelnya, makin sering mereka bertumbukan." },
      ],
    },
  },
  closing: {
    text: "Pesanan selesai tepat waktu dan kacanya utuh. Bu Sari menulis namamu di papan operator.",
    findings: ["Suhu menambah porsi tumbukan yang efektif.", "Konsentrasi menambah jumlah tumbukan.", "Katalis menurunkan energi aktivasi dan tidak habis."],
  },
};
