import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BracketMatchView, BracketTeamView } from "@/lib/matchups";

function label(teams: BracketTeamView[], rosterId: number | null): string {
  if (rosterId == null) return "TBD";
  const team = teams.find((row) => row.sleeperRosterId === rosterId);
  return team?.teamName || team?.displayName || `Roster ${rosterId}`;
}

export function PlayoffBracket({
  matches,
  teams,
}: {
  matches: BracketMatchView[];
  teams: BracketTeamView[];
}) {
  const rounds = Array.from(new Set(matches.map((match) => match.round))).sort(
    (a, b) => a - b,
  );
  if (rounds.length === 0) {
    return (
      <p className="text-sm text-emerald-100/70">
        Sleeper playoff bracket appears once the league playoffs are generated.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {rounds.map((round) => (
        <div key={round} className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
            Round {round}
          </h3>
          {matches
            .filter((match) => match.round === round)
            .sort((a, b) => a.match - b.match)
            .map((match) => (
              <Card key={match.id} className="border-white/10 bg-[#0d1f14] text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-100/70">
                    {match.place === 1 ? "Championship" : `Match ${match.match}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <TeamLine
                    rosterId={match.t1}
                    name={label(teams, match.t1)}
                    winner={match.winner}
                  />
                  <TeamLine
                    rosterId={match.t2}
                    name={label(teams, match.t2)}
                    winner={match.winner}
                  />
                </CardContent>
              </Card>
            ))}
        </div>
      ))}
    </div>
  );
}

function TeamLine({
  rosterId,
  name,
  winner,
}: {
  rosterId: number | null;
  name: string;
  winner: number | null;
}) {
  const won = winner != null && rosterId === winner;
  return (
    <p className={won ? "font-semibold text-emerald-200" : "text-white"}>{name}</p>
  );
}
