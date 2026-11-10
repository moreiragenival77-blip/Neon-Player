import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Toaster } from "sonner";
import { ArrowLeft, Music2, Pause, Play, Plus, Search, SkipForward, Trash2, ListMusic } from "lucide-react";
import { PlayerProvider, usePlayer } from "@/lib/player";
import { Cover } from "@/components/neon/Cover";
import { TrackRow } from "@/components/neon/TrackRow";
import { NowPlaying } from "@/components/neon/NowPlaying";
import { cn } from "@/lib/utils";
import icon from "@/assets/icon.svg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Neon Player — música offline" },
      { name: "description", content: "Reprodutor de música offline, privado e sem anúncios." },
      { property: "og:title", content: "Neon Player" },
      { property: "og:description", content: "Reprodutor de música offline, privado e sem anúncios." },
    ],
  }),
  component: () => (
    <PlayerProvider>
      <App />
      <Toaster theme="dark" position="top-center" />
    </PlayerProvider>
  ),
});

type Tab = "all" | "fav" | "lists" | "queue";

function App() {
  const p = usePlayer();
  const fileRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [openList, setOpenList] = useState<string>();
  const [full, setFull] = useState(false);
  const [newName, setNewName] = useState("");

  const byId = useMemo(() => new Map(p.tracks.map((t) => [t.id, t])), [p.tracks]);
  const pl = p.playlists.find((x) => x.id === openList);
  const base =
    tab === "fav" ? p.favorites.map((id) => byId.get(id)!).filter(Boolean)
    : tab === "queue" ? p.queue.map((id) => byId.get(id)!).filter(Boolean)
    : tab === "lists" && pl ? pl.trackIds.map((id) => byId.get(id)!).filter(Boolean)
    : p.tracks;
  const list = q ? base.filter((t) => `${t.title} ${t.artist} ${t.album ?? ""}`.toLowerCase().includes(q.toLowerCase())) : base;
  const ids = list.map((t) => t.id);

  const importBtn = (
    <button onClick={() => fileRef.current?.click()} className="inline-flex h-12 items-center gap-2 rounded-full bg-neon px-6 font-semibold text-primary-foreground shadow-neon active:scale-95 transition-transform">
      <Plus className="h-5 w-5" /> Importar músicas
    </button>
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-36 pt-[max(1rem,env(safe-area-inset-top))]">
      <input ref={fileRef} type="file" accept="audio/*,.mp3,.m4a,.aac,.ogg,.opus,.wav,.flac" multiple hidden
        onChange={(e) => { if (e.target.files?.length) p.importFiles(e.target.files); e.target.value = ""; }} />

      <header className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <img src={icon} alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
          <h1 className="font-display text-lg font-semibold tracking-tight">Neon Player</h1>
        </div>
        <button onClick={() => fileRef.current?.click()} aria-label="Importar músicas" className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold transition-colors hover:bg-surface-2">
          <Plus className="h-5 w-5 text-primary" />
          <span className="hidden sm:inline">Adicionar</span>
        </button>
      </header>

      <section className="mb-5 mt-7 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Sua música. Seu espaço.</p>
          <h2 className="mt-1 font-display text-3xl font-bold tracking-tight">Biblioteca</h2>
          <p className="mt-1 text-sm text-muted-foreground">{p.tracks.length} {p.tracks.length === 1 ? "faixa salva" : "faixas salvas"} neste aparelho</p>
        </div>
        {p.tracks.length > 0 && <button onClick={() => fileRef.current?.click()} className="mb-1 hidden h-10 items-center gap-2 rounded-full bg-neon px-4 text-sm font-semibold text-primary-foreground shadow-neon sm:inline-flex"><Plus className="h-4 w-4" /> Importar</button>}
      </section>

      {p.current && (
        <section aria-label="Tocando agora" className="mt-3">
          <button onClick={() => setFull(true)} className="relative flex w-full items-center gap-4 overflow-hidden rounded-2xl bg-surface p-4 text-left">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-neon opacity-25 blur-3xl" />
            <Cover id={p.current.id} playing={p.playing} className="h-20 w-20 rounded-2xl" />
            <div className="relative min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Tocando agora</p>
              <p className="mt-1 truncate font-display text-lg font-semibold">{p.current.title}</p>
              <p className="truncate text-sm text-muted-foreground">{p.current.artist}</p>
            </div>
          </button>
        </section>
      )}

      {p.tracks.length > 0 && (
        <>
          <div className="mt-5 flex h-12 items-center gap-2 rounded-full bg-surface px-4">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" aria-label="Buscar músicas" className="h-full flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
          </div>
          <nav className="mt-4 flex gap-2 overflow-x-auto" role="tablist">
            {([["all", "Biblioteca"], ["fav", "Favoritos"], ["lists", "Playlists"], ["queue", "Fila"]] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setOpenList(undefined); }}
                className={cn("h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors", tab === k ? "bg-foreground text-background" : "bg-surface text-muted-foreground")}>
                {l}
              </button>
            ))}
          </nav>
        </>
      )}

      <main className="mt-4 flex-1">
        {!p.ready ? null : p.tracks.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <img src={icon} alt="" width={96} height={96} className="h-24 w-24 rounded-3xl shadow-neon" />
            <h2 className="mt-6 font-display text-xl font-semibold">Sua biblioteca está vazia</h2>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">Importe arquivos de áudio do seu aparelho. Tudo fica salvo só aqui.</p>
            <div className="mt-6">{importBtn}</div>
          </div>
        ) : tab === "lists" && !pl ? (
          <div>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newName.trim()) { p.createPlaylist(newName.trim()); setNewName(""); } }}>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nova playlist" aria-label="Nome da nova playlist" className="h-12 flex-1 rounded-full bg-surface px-4 outline-none placeholder:text-muted-foreground" />
              <button aria-label="Criar playlist" className="flex h-12 w-12 items-center justify-center rounded-full bg-neon text-primary-foreground"><Plus className="h-5 w-5" /></button>
            </form>
            {p.playlists.length === 0 ? <Empty text="Crie uma playlist e adicione faixas pelo menu ⋮." /> : (
              <ul className="mt-3 space-y-1">
                {p.playlists.map((x) => (
                  <li key={x.id} className="flex items-center gap-3 rounded-xl px-2 hover:bg-surface">
                    <button onClick={() => setOpenList(x.id)} className="flex min-h-16 flex-1 items-center gap-3 text-left">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent"><ListMusic className="h-5 w-5 text-primary" /></div>
                      <div><p className="font-medium">{x.name}</p><p className="text-sm text-muted-foreground">{x.trackIds.length} faixas</p></div>
                    </button>
                    <button onClick={() => p.deletePlaylist(x.id)} aria-label={`Excluir ${x.name}`} className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2"><Trash2 className="h-5 w-5" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            {pl && (
              <div className="mb-2 flex items-center gap-2">
                <button onClick={() => setOpenList(undefined)} aria-label="Voltar" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface"><ArrowLeft className="h-5 w-5" /></button>
                <h2 className="font-display text-lg font-semibold">{pl.name}</h2>
              </div>
            )}
            {list.length === 0 ? (
              <Empty text={q ? "Nada encontrado." : tab === "fav" ? "Toque em ♥ para favoritar." : tab === "queue" ? "A fila está vazia." : "Playlist vazia."} />
            ) : (
              <ul className="space-y-0.5">
                {list.map((t) => <TrackRow key={t.id} track={t} playlistId={pl?.id} onPlay={() => p.playFrom(ids, t.id)} />)}
              </ul>
            )}
          </>
        )}
      </main>

      <footer className="py-6 text-center text-xs font-semibold tracking-[0.3em] text-muted-foreground">GF GAMEDEV</footer>

      {p.current && <MiniPlayer onOpen={() => setFull(true)} />}
      {full && <NowPlaying onClose={() => setFull(false)} />}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center py-14 text-center text-muted-foreground">
      <Music2 className="h-8 w-8 opacity-60" />
      <p className="mt-3 text-sm">{text}</p>
    </div>
  );
}

function MiniPlayer({ onOpen }: { onOpen: () => void }) {
  const p = usePlayer();
  const t = p.current!;
  const dur = p.duration || t.duration || 0;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="relative mx-auto flex max-w-3xl items-center gap-3 overflow-hidden rounded-2xl border bg-surface/95 p-2 pr-3 backdrop-blur-xl shadow-neon">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-surface-2"><div className="h-full bg-neon" style={{ width: `${dur ? (p.time / dur) * 100 : 0}%` }} /></div>
        <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label="Abrir tocando agora">
          <Cover id={t.id} playing={p.playing} className="h-12 w-12" />
          <div className="min-w-0"><p className="truncate font-medium">{t.title}</p><p className="truncate text-sm text-muted-foreground">{t.artist}</p></div>
        </button>
        <button onClick={p.toggle} aria-label={p.playing ? "Pausar" : "Reproduzir"} className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background">
          {p.playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
        </button>
        <button onClick={p.next} aria-label="Próxima" className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-surface-2"><SkipForward className="h-5 w-5 fill-current" /></button>
      </div>
    </div>
  );
}