// @ts-nocheck -- low-level byte parser; indexed access is bounds-checked manually
// Minimal on-device ID3v2 reader (title, artist, album, cover). Falls back to file name.
export type Meta = { title: string; artist: string; album?: string; cover?: Blob };

function decode(bytes: Uint8Array, enc: number) {
  const label = enc === 1 ? "utf-16" : enc === 2 ? "utf-16be" : enc === 3 ? "utf-8" : "latin1";
  return new TextDecoder(label).decode(bytes).replace(/\0/g, "").trim();
}

export function nameFallback(file: File): Meta {
  const base = file.name.replace(/\.[^.]+$/, "").replace(/_/g, " ");
  const m = base.split(" - ");
  return m.length >= 2
    ? { artist: m[0].trim(), title: m.slice(1).join(" - ").trim() }
    : { title: base, artist: "Artista desconhecido" };
}

export async function readMeta(file: File): Promise<Meta> {
  const fb = nameFallback(file);
  try {
    const head = new Uint8Array(await file.slice(0, 10).arrayBuffer());
    if (head[0] !== 0x49 || head[1] !== 0x44 || head[2] !== 0x33) return fb;
    const ver = head[3];
    const size = ((head[6] & 127) << 21) | ((head[7] & 127) << 14) | ((head[8] & 127) << 7) | (head[9] & 127);
    const buf = new Uint8Array(await file.slice(10, 10 + Math.min(size, 8_000_000)).arrayBuffer());
    const out: Partial<Meta> = {};
    let i = 0;
    while (i + 10 < buf.length) {
      const id = String.fromCharCode(...buf.slice(i, i + 4));
      if (!/^[A-Z0-9]{4}$/.test(id)) break;
      const fs =
        ver === 4
          ? ((buf[i + 4] & 127) << 21) | ((buf[i + 5] & 127) << 14) | ((buf[i + 6] & 127) << 7) | (buf[i + 7] & 127)
          : (buf[i + 4] << 24) | (buf[i + 5] << 16) | (buf[i + 6] << 8) | buf[i + 7];
      if (fs <= 0 || i + 10 + fs > buf.length) break;
      const body = buf.slice(i + 10, i + 10 + fs);
      if (id === "TIT2") out.title = decode(body.slice(1), body[0]);
      else if (id === "TPE1") out.artist = decode(body.slice(1), body[0]);
      else if (id === "TALB") out.album = decode(body.slice(1), body[0]);
      else if (id === "APIC") {
        const enc = body[0];
        let p = 1;
        while (body[p] !== 0) p++;
        const mime = new TextDecoder("latin1").decode(body.slice(1, p)) || "image/jpeg";
        p += 2; // null + picture type
        if (enc === 1 || enc === 2) { while (!(body[p] === 0 && body[p + 1] === 0)) p += 2; p += 2; }
        else { while (body[p] !== 0) p++; p++; }
        out.cover = new Blob([body.slice(p)], { type: mime });
      }
      i += 10 + fs;
    }
    return { title: out.title || fb.title, artist: out.artist || fb.artist, album: out.album, cover: out.cover };
  } catch {
    return fb;
  }
}

export function probeDuration(url: string): Promise<number | undefined> {
  return new Promise((res) => {
    const a = new Audio();
    a.preload = "metadata";
    const done = (v?: number) => { a.src = ""; res(v); };
    a.onloadedmetadata = () => done(isFinite(a.duration) ? a.duration : undefined);
    a.onerror = () => done(undefined);
    setTimeout(() => done(undefined), 8000);
    a.src = url;
  });
}

export function fmt(s?: number) {
  if (!s || !isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}