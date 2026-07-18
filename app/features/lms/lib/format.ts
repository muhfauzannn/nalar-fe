export function formatDateTime(value: string | null) {
  if (!value) return "Tanpa tenggat";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

export function sentenceStatus(value: string | null) {
  const labels: Record<string, string> = {
    not_started: "Belum dimulai",
    in_progress: "Sedang dikerjakan",
    submitted: "Sudah dikumpulkan",
    returned: "Sudah dinilai",
    completed: "Selesai",
    published: "Tersedia",
    closed: "Ditutup",
    archived: "Diarsipkan",
    expired: "Waktu habis",
  };
  return value ? (labels[value] ?? value.replaceAll("_", " ")) : "Belum dimulai";
}
