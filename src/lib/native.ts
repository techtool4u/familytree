// Small bridge so the same code works in a browser and inside the Android / iOS apps.
// In the browser files download as usual; in the apps they are saved and handed
// to the phone's share sheet (Save to Files, Drive, WhatsApp, Mail…).
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const isNativeApp = () => Capacitor.isNativePlatform();

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

/** Save a file: browser download on the web, share sheet in the apps. */
export async function saveFile(name: string, data: Blob | string, type = 'application/octet-stream') {
  const blob = typeof data === 'string'
    ? (data.startsWith('data:') ? await (await fetch(data)).blob() : new Blob([data], { type }))
    : data;
  if (!isNativeApp()) {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return;
  }
  const { uri } = await Filesystem.writeFile({ path: name, data: await toBase64(blob), directory: Directory.Cache });
  await Share.share({ title: name, files: [uri] });
}

/** Open WhatsApp, mail or a web page outside the app. */
export function openExternal(url: string) {
  if (isNativeApp()) window.location.href = url; // the app hands non-app links to the system
  else window.open(url, '_blank', 'noopener');
}
