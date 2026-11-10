import { Heart, ListPlus, MoreVertical, Trash2, ListEnd, X } from "lucide-react";
import type { Track } from "@/lib/db";
import { fmt } from "@/lib/metadata";
import { usePlayer } from "@/lib/player";
import { cn } from "@/lib/utils";
import { Cover } from "./Cover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TrackRow({ track, onPlay, playlistId }: { track: Track; onPlay: () => void; playlistId?: string | undefined }) {
  const p = usePlayer();
  const active = p.current?.id === track.id;
  const fav = p.favorites.includes(track.id);
  return (
    <li className={cn("group flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-surface", active && "bg-surface")}>
      <button onClick={onPlay} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Tocar ${track.title}, ${track.artist}`}>
        <Cover id={track.id} playing={active && p.playing} className="h-12 w-12" />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate font-medium", active && "text-neon")}>{track.title}</p>
          <p className="truncate text-sm text-muted-foreground">{track.artist}</p>
        </div>
        <span className="min-w-9 text-right text-xs tabular-nums text-muted-foreground">{track.duration && track.duration > 0 ? fmt(track.duration) : "—"}</span>
      </button>
      {fav && <Heart className="h-4 w-4 fill-primary text-primary" aria-label="Favorita" />}
      <DropdownMenu>
        <DropdownMenuTrigger aria-label="Mais opções" className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2">
          <MoreVertical className="h-5 w-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => p.toggleFav(track.id)}><Heart className="mr-2 h-4 w-4" />{fav ? "Desfavoritar" : "Favoritar"}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => p.addToQueue(track.id)}><ListEnd className="mr-2 h-4 w-4" />Adicionar à fila</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger><ListPlus className="mr-2 h-4 w-4" />Playlist</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {p.playlists.length === 0 && <DropdownMenuItem disabled>Nenhuma playlist</DropdownMenuItem>}
              {p.playlists.map((pl) => <DropdownMenuItem key={pl.id} onClick={() => p.addToPlaylist(pl.id, track.id)}>{pl.name}</DropdownMenuItem>)}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          {playlistId ? (
            <DropdownMenuItem onClick={() => p.removeFromPlaylist(playlistId, track.id)}><X className="mr-2 h-4 w-4" />Remover da playlist</DropdownMenuItem>
          ) : (
            <DropdownMenuItem className="text-destructive" onClick={() => p.removeTrack(track.id)}><Trash2 className="mr-2 h-4 w-4" />Remover da biblioteca</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}