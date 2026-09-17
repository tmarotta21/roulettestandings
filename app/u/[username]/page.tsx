import { Download } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HistoryView } from "@/components/history-view";
import { LeagueToggle } from "@/components/league-toggle";
import { LiveSyncButton } from "@/components/live-sync-button";
import { MatchupTable, RoulettePts } from "@/components/matchup-table";
import { PlayoffBracket } from "@/components/playoff-bracket";
import { StandingsTable, parseStandingsSort } from "@/components/standings-table";
import {
  isHistorySubtab,
  isStandingsTab,
  StandingsTabs,
  type HistorySubtab,
  type StandingsTab,
} from "@/components/standings-tabs";
import { YearSelect } from "@/components/year-select";
import { UsernameForm } from "@/components/username-form";
import { loadLeagueHistory } from "@/lib/history-load";
import { ownerIdForUser } from "@/lib/history";
import { formatPf, cn } from "@/lib/utils";
import { maybeRefresh } from "@/lib/maybe-refresh";
import { loadLeagueMatchups, loadWinnersBracket } from "@/lib/matchups";
import { SleeperError, walkPreviousLeagues } from "@/lib/sleeper";
import { loadLeagueStandings } from "@/lib/standings";
import { hostedLeaguesForUser } from "@/lib/username";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function standingsPath(
  username: string,
  leagueId: string,
  tab: StandingsTab,
  week?: number,
  sort?: { column: string; direction: string },
  history?: HistorySubtab,
) {
  const params = new URLSearchParams();
  params.set("league", leagueId);
  if (tab !== "standings") params.set("tab", tab);
  if (tab === "weekly" && week) params.set("week", String(week));
  if (tab === "standings" && sort) {
    params.set("sort", sort.column);
    params.set("dir", sort.direction);
  }
  if (tab === "history" && history && history !== "h2h") {
    params.set("history", history);
  }
  return `/u/${encodeURIComponent(username)}?${params.toString()}`;
}

function recapTeamClass(result: "W" | "L" | "T" | null) {
  if (result === "W") return "font-bold text-emerald-400";
  return undefined;
}

function recapYouClass(username: string, highlightUsername: string) {
  const mine = username.trim().toLowerCase() === highlightUsername.trim().toLowerCase();
  return mine ? "font-bold text-amber-300" : undefined;
}

export default async function UserStandingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{
    league?: string;
    tab?: string;
    week?: string;
    sort?: string;
    dir?: string;
    history?: string;
  }>;
}) {
  const { username } = await params;
  const query = await searchParams;
  await maybeRefresh();

  let payload: Awaited<ReturnType<typeof hostedLeaguesForUser>>;
  try {
    payload = await hostedLeaguesForUser(username);
  } catch (error) {
    const message =
      error instanceof SleeperError
        ? "That Sleeper username was not found."
        : "Could not load Sleeper user.";
    return (
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-2xl font-semibold">Username</h1>
        <UsernameForm error={message} defaultUsername={username} />
      </div>
    );
  }

  const { user, matches } = payload;
  const displayName = user.username || username;
  if (matches.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">{displayName}</h1>
        <p className="text-sm text-emerald-100/70">
          None of your {payload.season} Sleeper leagues are hosted here for roulette
          standings.
        </p>
        <Link href="/?change=1" className="text-sm text-emerald-200 hover:underline">
          Try another username
        </Link>
      </div>
    );
  }

  const requested = query.league?.trim() ?? "";
  let primary = matches.find((league) => league.sleeperLeagueId === requested) ?? null;
  let history = primary ? await walkPreviousLeagues(primary.sleeperLeagueId) : [];
  if (!primary && requested) {
    for (const league of matches) {
      const chain = await walkPreviousLeagues(league.sleeperLeagueId);
      if (chain.some((row) => row.league_id === requested)) {
        primary = league;
        history = chain;
        break;
      }
    }
  }
  primary = primary ?? matches[0];
  if (history.length === 0) {
    history = await walkPreviousLeagues(primary.sleeperLeagueId);
  }
  const selectedId =
    requested && history.some((row) => row.league_id === requested)
      ? requested
      : primary.sleeperLeagueId;
  const tab: StandingsTab = isStandingsTab(query.tab) ? query.tab : "standings";
  const historySubtab: HistorySubtab = isHistorySubtab(query.history)
    ? query.history
    : "h2h";
  const { column, direction } = parseStandingsSort(query.sort, query.dir);
  const sort = { column, direction };

  const standingsLeagueId = tab === "history" ? primary.sleeperLeagueId : selectedId;
  const board = await loadLeagueStandings(standingsLeagueId);
  const maxWeek = Math.max(1, board.playoffWeekStart - 1);
  const weekParam = Number(query.week);
  const defaultWeek = Math.min(maxWeek, Math.max(1, board.throughWeek || board.week));
  const selectedWeek = Number.isFinite(weekParam) && weekParam >= 1
    ? Math.min(maxWeek, Math.max(1, weekParam))
    : defaultWeek;

  const matchupWeek = tab === "weekly" ? selectedWeek : defaultWeek;
  const [matchups, bracket, historySeasons] = await Promise.all([
    tab === "bracket" || tab === "history"
      ? Promise.resolve(null)
      : loadLeagueMatchups(selectedId, matchupWeek),
    tab === "bracket" ? loadWinnersBracket(selectedId) : Promise.resolve(null),
    tab === "history"
      ? loadLeagueHistory(primary.sleeperLeagueId)
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{board.name}</h1>
          <p className="mt-2 text-sm text-emerald-100/70">
            {board.season} · through week {board.throughWeek}
            {board.currentWeekFinal ? " (current week final)" : " (current week in progress)"}
            {" · "}
            top {board.playoffTeams} in playoffs
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LiveSyncButton />
          <a
            className={buttonVariants()}
            href={`/api/og/${board.sleeperLeagueId}?download=1`}
          >
            <Download />
            Download
          </a>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <LeagueToggle
          leagues={matches}
          selectedId={primary.sleeperLeagueId}
          hrefFor={(leagueId) =>
            standingsPath(displayName, leagueId, tab, selectedWeek, sort, historySubtab)
          }
        />
        {tab === "history" ? null : (
          <YearSelect
            history={history.map((league) => ({
              leagueId: league.league_id,
              season: league.season,
            }))}
            selectedId={selectedId}
            username={displayName}
            tab={tab}
            week={selectedWeek}
            sort={column}
            dir={direction}
          />
        )}
      </div>

      <StandingsTabs
        selected={tab}
        hrefFor={(next) =>
          standingsPath(
            displayName,
            next === "history" ? primary.sleeperLeagueId : selectedId,
            next,
            selectedWeek,
            sort,
            next === "history" ? historySubtab : undefined,
          )
        }
      />

      {tab === "standings" ? (
        <>
          <Card className="border-white/10 bg-[#0d1f14]">
            <CardHeader>
              <CardTitle>Roulette table</CardTitle>
            </CardHeader>
            <CardContent>
              <StandingsTable
                rows={board.rows}
                highlightUsername={displayName}
                column={column}
                direction={direction}
                pathname={`/u/${encodeURIComponent(displayName)}`}
                query={{ league: selectedId }}
              />
            </CardContent>
          </Card>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Week {matchupWeek} matchups</h2>
            <MatchupTable
              matchups={matchups?.pairs ?? []}
              highlightUsername={displayName}
            />
          </section>
        </>
      ) : null}

      {tab === "weekly" ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: maxWeek }, (_, index) => index + 1).map((week) => (
              <a
                key={week}
                href={standingsPath(displayName, selectedId, "weekly", week)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-sm",
                  week === selectedWeek
                    ? "bg-emerald-500/30 text-white"
                    : "bg-white/5 text-emerald-100/70 hover:bg-white/10",
                )}
              >
                {week}
              </a>
            ))}
          </div>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Week {selectedWeek} recap</h2>
            <div className="rounded-lg border border-white/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Opponent</TableHead>
                    <TableHead className="w-10">W/L</TableHead>
                    <TableHead className="text-right">Pts</TableHead>
                    <TableHead className="text-right">Opp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(matchups?.rows ?? []).map((row) => (
                    <TableRow key={row.rosterId}>
                      <TableCell
                        className={cn(
                          recapTeamClass(row.result),
                          recapYouClass(row.username, displayName),
                        )}
                      >
                        {row.username}
                      </TableCell>
                      <TableCell>
                        {row.opponentUsername ?? "—"}
                      </TableCell>
                      <TableCell
                        className={cn(row.result === "W" && "font-bold text-emerald-400")}
                      >
                        {row.result ?? "—"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          row.roulette && "text-amber-300",
                        )}
                      >
                        <RoulettePts points={row.pf} roulette={row.roulette} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.pa == null ? "—" : formatPf(row.pa)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Matchups</h2>
            <MatchupTable
              matchups={matchups?.pairs ?? []}
              highlightUsername={displayName}
            />
          </section>
        </div>
      ) : null}

      {tab === "bracket" ? (
        <PlayoffBracket
          matches={bracket?.matches ?? []}
          teams={bracket?.teams ?? []}
        />
      ) : null}

      {tab === "history" ? (
        <HistoryView
          seasons={historySeasons}
          viewerOwnerId={ownerIdForUser(
            historySeasons,
            user.user_id,
            displayName,
          )}
          subtab={historySubtab}
          subtabHrefs={{
            h2h: standingsPath(
              displayName,
              primary.sleeperLeagueId,
              "history",
              selectedWeek,
              sort,
              "h2h",
            ),
            "all-time": standingsPath(
              displayName,
              primary.sleeperLeagueId,
              "history",
              selectedWeek,
              sort,
              "all-time",
            ),
            seasons: standingsPath(
              displayName,
              primary.sleeperLeagueId,
              "history",
              selectedWeek,
              sort,
              "seasons",
            ),
          }}
        />
      ) : null}
    </div>
  );
}
