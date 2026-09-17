import { cn } from "@/lib/utils";
import { formatPf } from "@/lib/utils";
import type { MatchupPairView } from "@/lib/matchups";

function RouletteDot() {
  return (
    <span
      className="size-1.5 shrink-0 rounded-full bg-amber-300"
      title="Roulette"
      aria-label="Roulette"
    />
  );
}

export function RoulettePts({
  points,
  roulette,
  className,
}: {
  points: number;
  roulette: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center justify-end gap-1.5", className)}>
      {roulette ? <RouletteDot /> : null}
      {formatPf(points)}
    </span>
  );
}

function SideRow({
  side,
}: {
  side: MatchupPairView["sides"][number];
}) {
  const nameClass = side.won
    ? "font-bold text-emerald-400"
    : side.roulette
      ? "font-bold text-amber-300"
      : "font-medium";
  const scoreClass = side.roulette
    ? "text-amber-300"
    : side.won
      ? "text-emerald-400"
      : undefined;
  return (
    <div className="flex items-start justify-between gap-2">
      <p className={nameClass}>{side.username}</p>
      <p
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 font-mono text-sm font-bold tabular-nums",
          scoreClass,
        )}
      >
        {side.roulette ? <RouletteDot /> : null}
        {formatPf(side.points)}
      </p>
    </div>
  );
}

export function MatchupCard({
  matchup,
}: {
  matchup: MatchupPairView;
  highlightUsername?: string | null;
}) {
  return (
    <article className="flex h-full flex-col justify-center rounded-lg border border-amber-400/25 bg-[#121a0c] px-3 py-2">
      {matchup.sides.map((side, sideIndex) => (
        <div key={side.rosterId}>
          {sideIndex > 0 ? (
            <div className="my-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/80">
              <span className="h-px flex-1 bg-amber-400/30" />
              vs
              <span className="h-px flex-1 bg-amber-400/30" />
            </div>
          ) : null}
          <div
            className={cn(
              "rounded-sm border-2 px-1.5 py-0.5",
              side.won
                ? "border-emerald-400 bg-emerald-500/10"
                : "border-transparent",
            )}
          >
            <SideRow side={side} />
          </div>
        </div>
      ))}
    </article>
  );
}

export function MatchupTable({
  matchups,
  highlightUsername,
  className,
}: {
  matchups: MatchupPairView[];
  highlightUsername?: string | null;
  className?: string;
}) {
  if (matchups.length === 0) {
    return (
      <p className="text-xs text-emerald-100/60">
        Matchups appear once the week is set.
      </p>
    );
  }

  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
      {matchups.map((matchup, matchIndex) => (
        <MatchupCard
          key={`${matchup.matchupId ?? "solo"}-${matchIndex}`}
          matchup={matchup}
          highlightUsername={highlightUsername}
        />
      ))}
    </div>
  );
}
