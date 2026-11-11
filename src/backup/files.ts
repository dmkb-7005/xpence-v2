/** Saves text as a file through the browser's download mechanism. */
export function downloadText(filename: string, text: string, mime = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

/**
 * Android share sheet (Dropbox, pCloud, …) when the browser can share files, otherwise a download.
 * "cancelled" means the user closed the share sheet: nothing was saved.
 */
export async function shareOrDownload(filename: string, text: string, mime: string): Promise<ShareResult> {
  const file = new File([text], filename, { type: mime });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // any other share failure: fall back to a download
    }
  }
  downloadText(filename, text, mime);
  return 'downloaded';
}
