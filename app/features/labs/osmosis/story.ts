import type { LabStory } from "../story";
import type { ChallengeId } from "./model";

export const STORY: LabStory<ChallengeId> = {
  key: "mikroskop-osmosis",
  title: "Shift Malam di Klinik",
  opening: [
    { text: "Malam pertamamu magang di klinik. Kak Rani, perawat jaga, memberi satu tes sebelum kamu boleh membantu di ruang infus." },
    { text: "Pertanyaannya sederhana: kenapa pasien tidak diinfus air murni saja? Jawabannya ada di bawah mikroskop ini." },
    { text: "Ini pipet. Cincin hijaunya mengatur kadar garam larutan yang akan kamu teteskan. Coba geser.", part: "pipet", caption: "Pipet", act: "Geser cincin hijau dulu" },
    { text: "Di lensa ini sel terlihat 400×. Panah biru adalah air yang menembus membran, titik kuning adalah garam di luar sel.", part: "lensa", caption: "Lensa" },
    { text: "Teteskan menjatuhkan larutan ke kaca. Setelah itu, amati selnya beberapa detik sampai berhenti berubah.", part: "teteskan", caption: "Teteskan" },
  ],
  missions: {
    "air-ke-mana": {
      before: [{ text: "Tes pertama: sel darah merah ditetesi air suling, sama seperti infus air murni. Pilih dulu tebakanmu, lalu teteskan." }],
      after: [
        { text: "Di dalam sel ada banyak zat terlarut, di luar hampir tidak ada. Air bergerak menembus membran ke sisi yang lebih pekat.", mood: "senang" },
        { text: "Sel darah tidak punya dinding, jadi ia menggembung sampai pecah. Inilah hemolisis, dan alasan infus tidak boleh air murni." },
      ],
    },
    "cari-isotonis": {
      before: [
        { text: "Kak Rani mengangguk. Sekarang cari larutan garam yang membuat sel tetap utuh: tidak menggembung, tidak mengkerut." },
        { text: "Geser cincin, teteskan, lalu baca selnya. Larutan yang terlalu encer atau terlalu pekat akan terlihat di lensa.", part: "lensa", caption: "Baca selnya" },
      ],
      after: [
        { text: "Itu larutan isotonis. Kadar di luar sama dengan di dalam sel, jadi air masuk dan keluar sama banyak.", mood: "senang" },
        { text: "Air tetap bergerak dua arah, hanya tidak ada aliran bersih. Itulah sebabnya infus garam fisiologis berkadar 0,9 %." },
      ],
    },
    plasmolisis: {
      before: [
        { text: "Pagi hari, ibu kantin bertanya: kenapa irisan bawang untuk acar jadi lemas setelah digarami?" },
        { text: "Sel bawang punya dinding, beda dengan sel darah. Buat membrannya lepas dari dinding supaya jawabannya terlihat." },
      ],
      after: [
        { text: "Larutannya lebih pekat dari isi sel, jadi air keluar. Membran tertarik menjauh dari dinding: inilah plasmolisis.", mood: "senang" },
        { text: "Dindingnya tetap kaku, tapi sel kehilangan tekanan air. Itulah kenapa bawang yang digarami jadi lemas." },
      ],
    },
  },
  closing: {
    text: "Tes selesai. Kak Rani menulis namamu di jadwal ruang infus.",
    findings: ["Air bergerak lewat membran menuju sisi yang lebih pekat.", "Larutan isotonis menjaga sel tetap utuh.", "Sel darah bisa pecah, sel tumbuhan ditahan dindingnya."],
  },
};
