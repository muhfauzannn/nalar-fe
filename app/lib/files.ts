import { env } from "~/config/env";

/** Same limit the API enforces; checked here so a too-big file never leaves the browser. */
export const MAX_PDF_BYTES = 20 * 1024 * 1024;

const sizeFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

export function formatFileSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1
    ? `${sizeFormat.format(mb)} MB`
    : `${sizeFormat.format(Math.max(1, Math.round(bytes / 1024)))} KB`;
}

/** A message when `file` cannot be uploaded as a lesson PDF, otherwise null. */
export function pdfProblem(file: File | null): string | null {
  if (!file) return "Pilih file PDF terlebih dahulu.";
  if (file.size > MAX_PDF_BYTES) {
    return `File terlalu besar (maksimal ${formatFileSize(MAX_PDF_BYTES)}).`;
  }
  // The browser may not know the type; the API checks the real content anyway.
  if (file.type && file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
    return "Hanya file PDF yang diterima.";
  }
  return null;
}

const withDownload = (url: string, download: boolean) => (download ? `${url}?download=1` : url);

/** An uploaded PDF as an enrolled student opens it. */
export const studentResourceFileUrl = (resourceId: string, download = false) =>
  withDownload(`${env.apiUrl}/api/student/resources/${resourceId}/file`, download);

/** The same file as the course's teacher opens it (any lesson status). */
export const manageResourceFileUrl = (resourceId: string, download = false) =>
  withDownload(`${env.apiUrl}/api/manage/resources/${resourceId}/file`, download);
