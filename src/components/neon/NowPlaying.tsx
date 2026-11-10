import { ChevronDown, Heart, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from "lucide-react";
import { usePlayer } from "@/lib/player";
import { fmt } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import { Cover } from "./Cover";

export function NowPlaying({ onClose }: { onClose: () => void }) {
  const p = usePlayer();
  const t = p.current;
  if (!t) return null;
  const fav = p.favorites.includes(t.id);
  const dur = p.duration || t.duration || 0;
  const pct = dur ? (p.time / dur) * 100 : 0;
  const VolIcon = p.volume === 0 ? VolumeX : p.volume < 0.5 ? Volume1 : Volume2;

  return (
    <div role="dialog" aria-modal="true" aria-label="Tocando agora" className="fixed inset-0 z-50 overflow-y-auto bg-background animate-in slide-in-from-bottom duration-300">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-neon opacity-15 blur-3xl" />
      <div className="relative mx-auto flex min-h-full max-w-5xl flex-col px-6 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <button onClick={onClose} aria-label="Fechar" className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-surface-2">
            <ChevronDown className="h-6 w-6" />
          </button>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Tocando agora</span>
          <div className="w-12" />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-8 py-6 landscape:md:flex-row landscape:max-md:flex-row landscape:max-md:gap-6">
          <Cover id={t.id} playing={p.playing} className="aspect-square w-full max-w-[22rem] rounded-3xl shadow-neon landscape:max-md:max-w-[40vh]" />

          <div className="flex w-full max-w-md flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate font-display text-2xl font-semibold">{t.title}</h2>
                <p className="truncate text-muted-foreground">{t.artist}</p>
              </div>
              <button onClick={() => p.toggleFav(t.id)} aria-label={fav ? "Remover dos favoritos" : "Favoritar"} aria-pressed={fav} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full hover:bg-surface-2">
                <Heart className={cn("h-6 w-6", fav && "fill-primary text-primary")} />
              </button>
            </div>

            <div>
              <input
                type="range" className="neon-range" min={0} max={dur || 0} step={0.1} value={Math.min(p.time, dur)}
                style={{ ["--p" as string]: `${pct}%` }}
                onChange={(e) => p.seek(Number(e.target.value))}
                aria-label="Progresso" aria-valuetext={`${fmt(p.time)} de ${fmt(dur)}`}
              />
              <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
                <span>{fmt(p.time)}</span><span>{fmt(dur)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={p.toggleShuffle} aria-label="Aleatório" aria-pressed={p.shuffle} className={cn("flex h-12 w-12 items-center justify-center rounded-full", p.shuffle ? "text-primary" : "text-muted-foreground")}>
                <Shuffle className="h-5 w-5" />
              </button>
              <button onClick={p.prev} aria-label="Anterior" className="flex h-14 w-14 items-center justify-center rounded-full hover:bg-surface-2">
                <SkipBack className="h-7 w-7 fill-current" />
              </button>
              <button onClick={p.toggle} aria-label={p.playing ? "Pausar" : "Reproduzir"} className="flex h-20 w-20 items-center justify-center rounded-full bg-neon text-primary-foreground shadow-neon transition-transform active:scale-95">
                {p.playing ? <Pause className="h-8 w-8 fill-current" /> : <Play className="ml-1 h-8 w-8 fill-current" />}
              </button>
              <button onClick={p.next} aria-label="Próxima" className="flex h-14 w-14 items-center justify-center rounded-full hover:bg-surface-2">
                <SkipForward className="h-7 w-7 fill-current" />
              </button>
              <button onClick={p.cycleRepeat} aria-label={`Repetir: ${p.repeat === "off" ? "desligado" : p.repeat === "all" ? "todas" : "uma"}`} className={cn("flex h-12 w-12 items-center justify-center rounded-full", p.repeat !== "off" ? "text-primary" : "text-muted-foreground")}>
                {p.repeat === "one" ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
              </button>
            </div>

            <div className="flex items-center gap-3 text-muted-foreground">
              <button onClick={() => p.setVolume(p.volume ? 0 : 1)} aria-label="Silenciar" className="flex h-10 w-10 items-center justify-center"><VolIcon className="h-5 w-5" /></button>
              <input type="range" className="neon-range" min={0} max={1} step={0.01} value={p.volume} style={{ ["--p" as string]: `${p.volume * 100}%` }} onChange={(e) => p.setVolume(Number(e.target.value))} aria-label="Volume" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}