import type { LabStory } from "../story";
import type { ChallengeId } from "./model";

export const STORY: LabStory<ChallengeId> = {
  key: "mesin-gelombang",
  title: "Peramal Pasang",
  opening: [
    { text: "Di kantor pelabuhan ada mesin tua berengkol. Sebelum ada komputer, mesin seperti ini dipakai untuk meramal pasang laut." },
    { text: "Para nelayan butuh jadwal pasang. Petugasnya pensiun minggu lalu, dan sekarang kamu yang memutar engkolnya." },
    { text: "Ini engkol. Satu putaran penuh, 360°, mewakili satu siklus pasang. Coba putar.", part: "engkol", caption: "Engkol", act: "Putar pegangan hijau di engkol dulu" },
    { text: "Pena selalu setinggi pasak di roda. Saat engkol berputar, pena menuliskan tinggi air.", part: "pena", caption: "Pena" },
    { text: "Papan ini mencatat tinggi air y terhadap sudut engkol θ. Yang tergambar adalah grafik y = sin θ.", part: "grafik", caption: "Grafik" },
    { text: "Tandai menyimpan sudut saat ini di grafik. Putar dulu sampai posisinya pas, baru tandai.", part: "tombol", caption: "Tandai" },
  ],
  missions: {
    "dua-sudut-setengah": {
      before: [
        { text: "Kapal ikan hanya bisa melewati ambang saat air setinggi y = 0,5. Nelayan perlu tahu kapan saja itu terjadi." },
        { text: "Putar engkol satu putaran dan tandai semua sudutnya. Ingat, air yang naik nanti turun lagi." },
      ],
      after: [
        { text: "Ada dua sudut dalam satu putaran: saat air naik dan saat air turun. Keduanya punya nilai sinus yang sama.", mood: "senang" },
        { text: "Itu sifat sinus: sin θ = sin (180° − θ). Karena itu persamaan sinus biasanya punya dua jawaban dalam satu putaran." },
      ],
    },
    "periode-dua-kali": {
      before: [
        { text: "Pelabuhan di selat sebelah punya pasang dua kali lebih sering. Roda gigi 2× memutar roda dua kali tiap satu putaran engkol.", part: "roda-gigi", caption: "Roda gigi" },
        { text: "Cari putaran engkol terkecil saat gelombangnya mulai berulang, lalu tandai di situ." },
      ],
      after: [
        { text: "Gelombangnya berulang lebih cepat, jadi periodenya setengah putaran: 360° dibagi 2.", mood: "senang" },
        { text: "Untuk y = sin(bθ), periodenya 360°/b. Makin besar b, makin rapat gelombangnya." },
      ],
    },
    "tiru-gelombang": {
      before: [
        { text: "Datang rekaman tinggi air dari stasiun pasang: gelombang ungu di papan. Mesinmu harus menirunya sebelum jadwal terbit.", part: "grafik", caption: "Gelombang ungu" },
        { text: "Pasak sekarang terbuka. Makin jauh dari poros, makin tinggi puncak gelombang. Atur pasak dan roda gigi, lalu putar penuh.", part: "pasak", caption: "Pasak" },
      ],
      after: [
        { text: "Pas! Jarak pasak mengatur amplitudo A, roda gigi mengatur b. Dua angka itu cukup untuk menulis y = A·sin(bθ).", mood: "senang" },
        { text: "Pasang sungguhan adalah gabungan banyak gelombang sinus. Mesin peramal pasang dulu menjumlahkannya dengan banyak roda." },
      ],
    },
  },
  closing: {
    text: "Jadwal pasang terbit. Besok pagi kapal-kapal berangkat tepat waktu.",
    findings: ["Sinus adalah tinggi sebuah titik pada lingkaran yang berputar.", "Satu nilai sinus biasanya muncul di dua sudut tiap putaran.", "Pada y = A·sin(bθ), A mengatur puncak dan periodenya 360°/b."],
  },
};
