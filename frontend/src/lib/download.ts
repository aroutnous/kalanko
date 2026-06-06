import { api } from "@/lib/api";

async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export async function downloadPdf(url: string, filename: string): Promise<void> {
  const { data } = await api.get<Blob>(url, { responseType: "blob" });
  await downloadBlob(new Blob([data], { type: "application/pdf" }), filename);
}

export async function downloadFile(
  url: string,
  filename: string,
  mimeType: string,
  params?: Record<string, string>,
): Promise<void> {
  const { data } = await api.get<Blob>(url, { responseType: "blob", params });
  await downloadBlob(new Blob([data], { type: mimeType }), filename);
}
