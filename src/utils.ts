import { TMPFILES_API } from "./presets";

export function nowStamp(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function persistSession(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Storage may be full (large photo data URLs) or blocked by the browser.
    // Persisting is best-effort; the app must keep working without it.
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export async function uploadTemporary(blob: Blob, filename: string): Promise<string> {
  const body = new FormData();
  body.append("file", blob, filename);
  const response = await fetch(TMPFILES_API, {
    method: "POST",
    body
  });
  if (!response.ok) {
    throw new Error(`Temporary upload failed with ${response.status}.`);
  }
  const data = (await response.json()) as { status?: string; data?: { url?: string } };
  if (data.status !== "success" || !data.data?.url) {
    throw new Error("Temporary upload did not return a link.");
  }
  return data.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
}
