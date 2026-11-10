import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Playlist, RmxAudioStatusMessage, type AudioTrack } from "capacitor-plugin-playlist";
import type { Track } from "./db";

export const isAndroidNative = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

let initialized = false;

export async function initializeNativeAudio() {
  if (!isAndroidNative() || initialized) return;
  await Playlist.initialize();
  initialized = true;
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

function blobAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function saveBlob(path: string, blob: Blob) {
  await Filesystem.writeFile({
    path,
    data: await blobAsBase64(blob),
    directory: Directory.Data,
    recursive: true,
  });
  const result = await Filesystem.getUri({ path, directory: Directory.Data });
  return result.uri;
}

export async function makeNativeAudioTrack(track: Track, audio: Blob): Promise<AudioTrack> {
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
  return {
    trackId: track.id,
    assetUrl,
    title: track.title,
    artist: track.artist,
    album: track.album ?? "",
    albumArt,
    isStream: false,
  };
}

export { Playlist, RmxAudioStatusMessage };
