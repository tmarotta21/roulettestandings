import { cn } from "@/lib/utils";
import type { HostedLeagueRecord } from "@/lib/leagues";

export function LeagueToggle({
  leagues,
  selectedId,
  hrefFor,
}: {
  leagues: HostedLeagueRecord[];
  selectedId: string;
  hrefFor: (leagueId: string) => string;
}) {
  if (leagues.length <= 1) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {leagues.map((league) => (
        <a
          key={league.sleeperLeagueId}
          href={hrefFor(league.sleeperLeagueId)}
          className={cn(
            "rounded-md px-2.5 py-1 text-sm",
            league.sleeperLeagueId === selectedId
              ? "bg-emerald-500/30 text-white"
              : "bg-white/5 text-emerald-100/70 hover:bg-white/10",
          )}
        >
          {league.name}
        </a>
      ))}
    </div>
  );
}
