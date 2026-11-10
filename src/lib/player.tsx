import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { db, type Track } from "./db";
import { probeDuration, readMeta } from "./metadata";
import { initializeNativeAudio, isAndroidNative, makeNativeAudioTrack, Playlist as NativePlaylist, RmxAudioStatusMessage } from "./native-audio";

export type Repeat = "off" | "all" | "one";
export type Playlist = { id: string; name: string; trackIds: string[] };

type Ctx = {
  tracks: Track[];
  covers: Record<string, string>;
  ready: boolean;
  queue: string[];
  current?: Track | undefined;
  playing: boolean;
  time: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: Repeat;
  favorites: string[];
  playlists: Playlist[];
  importFiles: (files: FileList | File[]) => Promise<void>;
  playFrom: (ids: string[], id: string) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleFav: (id: string) => void;
  removeTrack: (id: string) => Promise<void>;
  createPlaylist: (name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (pid: string, tid: string) => void;
  removeFromPlaylist: (pid: string, tid: string) => void;
  addToQueue: (id: string) => void;
};

const C = createContext<Ctx | null>(null);
export const usePlayer = () => {
  const c = useContext(C);
  if (!c) throw new Error("PlayerProvider missing");
  return c;
};

const PREFS = "neon-prefs";
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const tracksRef = useRef<Track[]>([]);
  tracksRef.current = tracks;
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [currentId, setCurrentId] = useState<string>();
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVol] = useState(1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<Repeat>("off");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const errStreak = useRef(0);

  // Load persisted state
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS) || "{}");
      if (p.volume != null) setVol(p.volume);
      if (p.shuffle) setShuffle(true);
      if (p.repeat) setRepeat(p.repeat);
      if (p.favorites) setFavorites(p.favorites);
      if (p.playlists) setPlaylists(p.playlists);
    } catch { /* ignore */ }
    db.allTracks()
      .then((t) => {
        t.sort((a, b) => a.title.localeCompare(b.title));
        setTracks(t);
        const c: Record<string, string> = {};
        t.forEach((x) => x.cover && (c[x.id] = URL.createObjectURL(x.cover)));
        setCovers(c);
      })
      .catch(() => toast.error("Não foi possível abrir a biblioteca local."))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(PREFS, JSON.stringify({ volume, shuffle, repeat, favorites, playlists }));
  }, [ready, volume, shuffle, repeat, favorites, playlists]);

  const current = tracks.find((t) => t.id === currentId);
  const stateRef = useRef({ queue, currentId, shuffle, repeat });
  stateRef.current = { queue, currentId, shuffle, repeat };

  const load = useCallback(async (id: string, autoplay = true) => {
    if (isAndroidNative()) {
      try {
        // Prepare only the selected song. Converting the entire queue before
        // playback caused long waits and could exhaust memory on large libraries.
        const track = tracksRef.current.find((item) => item.id === id);
        const blob = await db.getFile(id).catch(() => undefined);
        if (!track || !blob) throw new Error("Arquivo de áudio não encontrado.");
        const nativeItem = await makeNativeAudioTrack(track, blob);
        await initializeNativeAudio();
        await NativePlaylist.setPlaylistItems({ items: [nativeItem], options: { startPaused: true } });
        setCurrentId(id);
        setTime(0);
        if (autoplay) await NativePlaylist.playTrackById({ id });
        else await NativePlaylist.selectTrackById({ id });
        return true;
      } catch (error) {
        console.error("[Neon Player] Falha na reprodução Android:", error);
        toast.error(error instanceof Error ? error.message : "Não foi possível preparar o áudio nativo.");
        setPlaying(false);
        return false;
      }
    }
    const a = audio.current!;
    const blob = await db.getFile(id).catch(() => undefined);
    if (!blob) {
      toast.error("Arquivo não encontrado. Ele pode ter sido removido.");
      return false;
    }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(blob);
    a.src = urlRef.current;
    setCurrentId(id);
    setTime(0);
    if (autoplay) {
      try { await a.play(); errStreak.current = 0; } catch (e) {
        if ((e as Error).name !== "AbortError") setPlaying(false);
      }
    }
    return true;
  }, []);

  const step = useCallback((dir: 1 | -1, auto = false) => {
    const { queue: q, currentId: cid, shuffle: sh, repeat: rp } = stateRef.current;
    if (!q.length) return;
    if (auto && rp === "one" && cid) return void load(cid);
    let idx = q.indexOf(cid ?? "");
    if (sh && q.length > 1) {
      let r = idx;
      while (r === idx) r = Math.floor(Math.random() * q.length);
      idx = r;
    } else {
      idx += dir;
      if (idx >= q.length) { if (rp === "off" && auto) { setPlaying(false); return; } idx = 0; }
      if (idx < 0) idx = q.length - 1;
    }
    load(q[idx]!);
  }, [load]);

  // Native Android Media3 session and lock-screen controls
  useEffect(() => {
    if (!isAndroidNative()) return;
    let cancelled = false;
    let listener: { remove: () => Promise<void> } | undefined;
    initializeNativeAudio().then(async () => {
      listener = await NativePlaylist.addListener("status", ({ status }) => {
        const payload = status.value as { currentPosition?: number; duration?: number; currentItem?: { trackId: string } | null; message?: string; code?: number } | undefined;
        if (status.msgType === RmxAudioStatusMessage.RMXSTATUS_ERROR) {
          setPlaying(false);
          const failedTrack = tracksRef.current.find((item) => item.id === (payload?.currentItem?.trackId ?? stateRef.current.currentId));
          const reason = payload?.message || "O Android não conseguiu decodificar o áudio.";
          const code = typeof payload?.code === "number" ? ` (código ${payload.code})` : "";
          console.error("[Neon Player] Erro ao reproduzir faixa:", { title: failedTrack?.title, fileName: failedTrack?.fileName, mime: failedTrack?.mime, code: payload?.code, message: reason });
          toast.error(`${failedTrack?.title ? `${failedTrack.title}: ` : ""}${reason}${code}`);
          return;
        }
        if (status.msgType === RmxAudioStatusMessage.RMXSTATUS_PLAYING) setPlaying(true);
        if (status.msgType === RmxAudioStatusMessage.RMXSTATUS_PAUSE || status.msgType === RmxAudioStatusMessage.RMXSTATUS_STOPPED) setPlaying(false);
        if (status.msgType === RmxAudioStatusMessage.RMXSTATUS_PLAYBACK_POSITION) {
          if (typeof payload.currentPosition === "number") setTime(payload.currentPosition);
          if (typeof payload.duration === "number" && payload.duration > 0) setDuration(payload.duration);
        }
        if (status.msgType === RmxAudioStatusMessage.RMXSTATUS_DURATION && typeof payload.duration === "number") setDuration(payload.duration);
        if (status.msgType === RmxAudioStatusMessage.RMXSTATUS_TRACK_CHANGED) {
          const nextId = payload.currentItem?.trackId;
          if (nextId) { setCurrentId(nextId); setTime(0); setDuration(0); }
        }
        if (status.msgType === RmxAudioStatusMessage.RMXSTATUS_PLAYLIST_COMPLETED) {
          // Only the current file is loaded natively. Advance through the
          // in-app queue and prepare the next file on demand.
          step(1, true);
        }
      });
      if (cancelled) await listener.remove();
      await NativePlaylist.setPlaybackVolume({ volume: volume });
      await NativePlaylist.setLoop({ loop: false });
    }).catch(() => toast.error("Não foi possível iniciar o reprodutor Android."));
    return () => { cancelled = true; if (listener) void listener.remove(); };
  }, []);

  // Audio element + events (web fallback only)
  useEffect(() => {
    if (isAndroidNative()) return;
    const a = new Audio();
    a.preload = "auto";
    audio.current = a;
    a.onplay = () => setPlaying(true);
    a.onpause = () => setPlaying(false);
    a.ontimeupdate = () => setTime(a.currentTime);
    a.ondurationchange = () => setDuration(isFinite(a.duration) ? a.duration : 0);
    a.onended = () => step(1, true);
    a.onerror = () => {
      if (!a.src) return;
      toast.error("Formato não suportado ou arquivo corrompido.");
      errStreak.current++;
      if (errStreak.current < Math.min(5, stateRef.current.queue.length)) step(1, true);
      else setPlaying(false);
    };
    return () => { a.pause(); a.src = ""; };
  }, [step]);

  useEffect(() => {
    if (isAndroidNative()) { void initializeNativeAudio().then(() => NativePlaylist.setPlaybackVolume({ volume })).catch(() => undefined); return; }
    if (audio.current) audio.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (isAndroidNative()) void initializeNativeAudio().then(() => NativePlaylist.setLoop({ loop: false })).catch(() => undefined);
  }, [repeat]);

  const toggle = useCallback(() => {
    if (isAndroidNative()) {
      const q = stateRef.current.queue;
      if (!currentId && q[0]) { void load(q[0]); return; }
      void initializeNativeAudio().then(() => playing ? NativePlaylist.pause() : NativePlaylist.play()).catch(() => toast.error("Não foi possível controlar a reprodução."));
      return;
    }
    const a = audio.current;
    if (!a) return;
    if (!a.src) { const q = stateRef.current.queue; if (q[0]) load(q[0]!); return; }
    if (a.paused) a.play().catch(() => toast.error("Não foi possível reproduzir."));
    else a.pause();
  }, [load, currentId, playing]);

  const seek = useCallback((t: number) => {
    if (isAndroidNative()) { void NativePlaylist.seekTo({ position: t }).catch(() => undefined); return; }
    if (audio.current) audio.current.currentTime = t;
  }, []);
  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => {
    if ((isAndroidNative() ? time : audio.current?.currentTime ?? 0) > 3) return seek(0);
    step(-1);
  }, [step, seek, time]);

  // Media Session (progressive enhancement; does NOT guarantee background playback)
  useEffect(() => {
    if (isAndroidNative() || !("mediaSession" in navigator) || typeof MediaMetadata === "undefined" || !current) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist,
      album: current.album ?? "",
      artwork: covers[current.id] ? [{ src: covers[current.id]!, sizes: "512x512" }] : [{ src: "/icon-512.png", sizes: "512x512", type: "image/png" }],
    });
    const ms = navigator.mediaSession;
    const set = (a: MediaSessionAction, h: MediaSessionActionHandler | null) => { try { ms.setActionHandler(a, h); } catch { /* unsupported */ } };
    set("play", () => audio.current?.play());
    set("pause", () => audio.current?.pause());
    set("nexttrack", next);
    set("previoustrack", prev);
    set("seekto", (d) => d.seekTime != null && seek(d.seekTime));
  }, [current, covers, next, prev, seek]);

  useEffect(() => {
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }, [playing]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !duration) return;
    try { navigator.mediaSession.setPositionState({ duration, position: Math.min(time, duration), playbackRate: 1 }); } catch { /* */ }
  }, [time, duration]);

  const importFiles = useCallback(async (list: FileList | File[]) => {
    const files = Array.from(list);
    let ok = 0, bad = 0;
    const newCovers: Record<string, string> = {};
    const importOne = async (f: File) => {
      const probe = new Audio();
      // Accept common audio containers/codecs used by Android Media3. A file's
      // extension alone cannot guarantee its codec is supported by the device.
      const supportedAudioExtensions = /\.(mp3|m4a|m4b|mp4|aac|adts|ogg|oga|opus|wav|flac|webm|mkv|mka|amr|3gp|3gpp)$/i;
      if (!f.type.toLowerCase().startsWith("audio/") && !supportedAudioExtensions.test(f.name)) { bad++; return; }
      if (!isAndroidNative() && f.type && probe.canPlayType(f.type) === "") { bad++; return; }
      let dur: number | undefined;
      if (!isAndroidNative()) {
        const url = URL.createObjectURL(f);
        dur = await probeDuration(url);
        URL.revokeObjectURL(url);
        if (dur === undefined && f.type !== "") { bad++; return; }
      }
      const meta = await readMeta(f);
      const t: Track = { id: uid(), ...meta, duration: dur, addedAt: Date.now(), mime: f.type, fileName: f.name };
      try {
        await db.putFile(t.id, f);
        await db.putTrack(t);
        // Prepare the Android copy in the background so selecting this song later is faster.
        if (isAndroidNative()) void makeNativeAudioTrack(t, f).catch(() => undefined);
        if (t.cover) newCovers[t.id] = URL.createObjectURL(t.cover);
        ok++;
      } catch { bad++; }
    };
    // Process a small batch concurrently to reduce import time without
    // opening too many large file operations at once.
    for (let i = 0; i < files.length; i += 3) {
      await Promise.all(files.slice(i, i + 3).map(importOne));
    }
    const added = await db.allTracks();
    added.sort((a, b) => a.title.localeCompare(b.title));
    setTracks(added);
    setCovers((c) => ({ ...c, ...newCovers }));
    if (ok) toast.success(`${ok} música${ok > 1 ? "s" : ""} adicionada${ok > 1 ? "s" : ""}`);
    if (bad) toast.error(`${bad} arquivo${bad > 1 ? "s" : ""} inválido${bad > 1 ? "s" : ""} ou não suportado${bad > 1 ? "s" : ""}`);
  }, []);

  const playFrom = useCallback((ids: string[], id: string) => {
    setQueue(ids);
    stateRef.current.queue = ids;
    load(id);
  }, [load]);

  const removeTrack = useCallback(async (id: string) => {
    if (isAndroidNative()) void NativePlaylist.removeItem({ id }).catch(() => undefined);
    await db.remove(id).catch(() => undefined);
    setTracks((t) => t.filter((x) => x.id !== id));
    setQueue((q) => q.filter((x) => x !== id));
    setFavorites((f) => f.filter((x) => x !== id));
    setPlaylists((p) => p.map((pl) => ({ ...pl, trackIds: pl.trackIds.filter((x) => x !== id) })));
    if (stateRef.current.currentId === id) { audio.current?.pause(); if (audio.current) audio.current.removeAttribute("src"); setCurrentId(undefined); }
  }, []);

  const value = useMemo<Ctx>(() => ({
    tracks, covers, ready, queue, current, playing, time, duration, volume, shuffle, repeat, favorites, playlists,
    importFiles, playFrom, toggle, next, prev, seek,
    setVolume: setVol,
    toggleShuffle: () => setShuffle((s) => !s),
    cycleRepeat: () => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off")),
    toggleFav: (id) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
    removeTrack,
    createPlaylist: (name) => setPlaylists((p) => [...p, { id: uid(), name, trackIds: [] }]),
    deletePlaylist: (id) => setPlaylists((p) => p.filter((x) => x.id !== id)),
    addToPlaylist: (pid, tid) => { setPlaylists((p) => p.map((x) => (x.id === pid && !x.trackIds.includes(tid) ? { ...x, trackIds: [...x.trackIds, tid] } : x))); toast.success("Adicionada à playlist"); },
    removeFromPlaylist: (pid, tid) => setPlaylists((p) => p.map((x) => (x.id === pid ? { ...x, trackIds: x.trackIds.filter((t) => t !== tid) } : x))),
    addToQueue: (id) => { setQueue((q) => (q.includes(id) ? q : [...q, id])); toast.success("Adicionada à fila"); },
  }), [tracks, covers, ready, queue, current, playing, time, duration, volume, shuffle, repeat, favorites, playlists, importFiles, playFrom, toggle, next, prev, seek, removeTrack]);

  return <C.Provider value={value}>{children}</C.Provider>;
}