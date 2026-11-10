import { usePlayer } from "@/lib/player";
import { cn } from "@/lib/utils";

export function Cover({ id, className, playing }: { id?: string; className?: string; playing?: boolean }) {
  const { covers } = usePlayer();
  const src = id ? covers[id] : undefined;
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-surface-2 shrink-0", className)} aria-hidden>
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent to-surface">
          <div className="flex h-1/2 items-end gap-[8%] w-1/2 justify-center">
            {[0.5, 0.85, 1, 0.7, 0.45].map((h, i) => (
              <span
                key={i}
                className={cn("w-[12%] rounded-full bg-neon opacity-80", playing && "eq-bar")}
                style={{ height: `${h * 100}%`, animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}