import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Playlist, RmxAudioStatusMessage, type AudioTrack } from "capacitor-plugin-playlist";
import type { Track } from "./db";

export const isAndroidNative = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

let initialized = false;
let initialization: Promise<void> | undefined;
const nativeTrackCache = new Map<string, AudioTrack>();

export async function initializeNativeAudio() {
  if (!isAndroidNative() || initialized) return;
  if (!initialization) {
    initialization = Playlist.setOptions({
      verbose: false,
      options: { icon: "ic_neon_notification" },
    })
      .then(() => Playlist.initialize())
      .then(() => { initialized = true; })
      .catch((error) => { initialization = undefined; throw error; });
  }
  await initialization;
}

function extensionFor(track: Track) {
  const fromName = track.fileName?.split(".").pop()?.toLowerCase();
  if (fromName && fromName !== track.fileName?.toLowerCase()) return fromName;
  const known: Record<string, string> = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    "audio/ogg": "ogg",
    "audio/opus": "opus",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/flac": "flac",
    "audio/webm": "webm",
  };
  return known[track.mime] ?? "audio";
}

function blobChunkAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler o arquivo de áudio."));
    reader.readAsDataURL(blob);
  });
}

// Write in small pieces: converting an entire large song to one base64 string
// can exhaust Android WebView memory and close the app.
async function saveBlob(path: string, blob: Blob) {
  // Base64 chunks must end on a 3-byte boundary; otherwise each chunk's padding corrupts the joined audio file.
  const chunkSize = 3 * 256 * 1024;
  for (let offset = 0; offset < blob.size; offset += chunkSize) {
    const chunk = blob.slice(offset, Math.min(offset + chunkSize, blob.size));
    const data = await blobChunkAsBase64(chunk);
    if (offset === 0) {
      await Filesystem.writeFile({ path, data, directory: Directory.Data, recursive: true });
    } else {
      await Filesystem.appendFile({ path, data, directory: Directory.Data });
    }
  }
  const info = await Filesystem.stat({ path, directory: Directory.Data });
  if (!info.size || info.size !== blob.size) {
    throw new Error("O arquivo de áudio não foi copiado corretamente para o armazenamento do Android.");
  }
  const result = await Filesystem.getUri({ path, directory: Directory.Data });
  if (!result.uri) throw new Error("O Android não forneceu o endereço do arquivo de áudio.");
  return result.uri;
}

export async function makeNativeAudioTrack(track: Track, audio: Blob): Promise<AudioTrack> {
  const cacheKey = `${track.id}:${track.addedAt}:${audio.size}:${track.cover?.size ?? 0}`;
  const cached = nativeTrackCache.get(cacheKey);
  if (cached) return cached;
  const assetUrl = await saveBlob(
    `neon-audio/${track.id}.${extensionFor(track)}`,
    audio,
  );
  let albumArt: string | undefined;
  if (track.cover) {
    try {
      albumArt = await saveBlob(`neon-covers/${track.id}.jpg`, track.cover);
    } catch {
      // Artwork is optional; audio playback must remain available.
    }
  }
  const nativeTrack: AudioTrack = {
    trackId: track.id,
    assetUrl,
    title: track.title,
    artist: track.artist,
    album: track.album ?? "",
    albumArt,
    // Leave mimeType unset for ordinary local files. Media3 detects MP3,
    // AAC, OGG, WAV and FLAC from the file/container; passing browser MIME
    // strings here can override that detection on some Android devices.
    isStream: false,
  };
  nativeTrackCache.set(cacheKey, nativeTrack);
  return nativeTrack;
}

export { Playlist, RmxAudioStatusMessage };
