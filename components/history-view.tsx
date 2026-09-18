"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  HISTORY_SUBTABS,
  type HistorySubtab,
} from "@/components/standings-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ALL_TIME_COLUMN_KEYS,
  allTimeRows,
  h2hLifetimeGames,
  h2hTable,
  historyManagers,
  nextAllTimeSort,
  nextH2hSort,
  nextSeasonsSort,
  seasonsHistory,
  sortAllTimeRows,
  sortH2hRows,
  sortSeasonRows,
  formatAverageRank,
  type AllTimeColumnKey,
  type AllTimeRow,
  type AllTimeSortDir,
  type CellTone,
  type H2hSortColumn,
  type H2hSortDir,
  type HistorySeasonSnapshot,
  type LifetimeGame,
  type SeasonsSortColumn,
  type SeasonsSortDir,
} from "@/lib/history";
import type { BoxScoreSideView } from "@/lib/boxscore";
import { cn, formatPf } from "@/lib/utils";

const SUBTAB_LABELS: Record<HistorySubtab, string> = {
  h2h: "H2H",
  "all-time": "All-time",
  seasons: "Seasons",
};

const ALL_TIME_HEADERS: Record<AllTimeColumnKey, ReactNode> = {
  username: "Username",
  record: "W–L*",
  rou: "ROU",
  pts: "PTS",
  pf: "PF*",
  pa: "PA*",
  playoffBerths: (
    <>
      Playoff
      <br />
      berths
    </>
  ),
  firstRoundByes: (
    <>
      1st-round
      <br />
      byes
    </>
  ),
  semifinalBerths: (
    <>
      Semifinal
      <br />
      berths
    </>
  ),
  finalBerths: (
    <>
      Final
      <br />
      berths
    </>
  ),
  championships: "Championships",
};

function toneClass(tone: CellTone): string | undefined {
  if (tone === "green") return "text-emerald-400";
  if (tone === "red") return "text-red-400";
  return undefined;
}

function selectClass() {
  return "h-8 rounded-lg border border-white/15 bg-[#07140c] px-2 text-white";
}

function newestSeasons(seasons: HistorySeasonSnapshot[]): HistorySeasonSnapshot[] {
  return [...seasons].sort((a, b) => b.season.localeCompare(a.season));
}

export function HistoryView({
  seasons,
  viewerOwnerId,
  viewerUsername,
  subtab,
  subtabHrefs,
}: {
  seasons: HistorySeasonSnapshot[];
  viewerOwnerId: string | null;
  viewerUsername: string;
  subtab: HistorySubtab;
  subtabHrefs: Record<HistorySubtab, string>;
}) {
  const managers = useMemo(() => historyManagers(seasons), [seasons]);
  const defaultManager = viewerOwnerId ?? managers[0]?.ownerId ?? "";
  const [managerId, setManagerId] = useState(defaultManager);
  const selectedManagerId = managers.some((row) => row.ownerId === managerId)
    ? managerId
    : defaultManager;

  if (seasons.length === 0) {
    return (
      <p className="text-sm text-emerald-100/70">
        League history appears once Sleeper seasons are available.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 border-b border-white/10 pb-2">
        {HISTORY_SUBTABS.map((id) => (
          <a
            key={id}
            href={subtabHrefs[id]}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              id === subtab
                ? "bg-emerald-500/30 text-white"
                : "text-emerald-100/70 hover:bg-white/10 hover:text-emerald-50",
            )}
          >
            {SUBTAB_LABELS[id]}
          </a>
        ))}
      </div>

      {subtab === "h2h" ? (
        <H2hPanel
          seasons={seasons}
          managers={managers}
          managerId={selectedManagerId}
          onManagerId={setManagerId}
          viewerUsername={viewerUsername}
        />
      ) : null}
      {subtab === "all-time" ? <AllTimePanel seasons={seasons} /> : null}
      {subtab === "seasons" ? <SeasonsPanel seasons={seasons} /> : null}
    </div>
  );
}

function H2hPanel({
  seasons,
  managers,
  managerId,
  onManagerId,
  viewerUsername,
}: {
  seasons: HistorySeasonSnapshot[];
  managers: { ownerId: string; username: string }[];
  managerId: string;
  onManagerId: (ownerId: string) => void;
  viewerUsername: string;
}) {
  const table = useMemo(() => h2hTable(managerId, seasons), [managerId, seasons]);
  const [sortColumn, setSortColumn] = useState<H2hSortColumn | null>(null);
  const [sortDir, setSortDir] = useState<H2hSortDir>("desc");
  const rows = useMemo(
    () => sortH2hRows(table.rows, sortColumn, sortDir),
    [sortColumn, sortDir, table.rows],
  );
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [opponentManagerId, setOpponentManagerId] = useState(managerId);
  const activeOpponent = opponentManagerId === managerId ? opponentId : null;
  const ordered = useMemo(() => newestSeasons(seasons), [seasons]);
  const firstSeason = ordered[0];
  const [explorerSeason, setExplorerSeason] = useState(firstSeason?.season ?? "");
  const [explorerWeek, setExplorerWeek] = useState(firstSeason?.weeks.at(-1)?.week ?? 1);
  const [explorerOwnerId, setExplorerOwnerId] = useState(
    managerId || firstSeason?.owners[0]?.ownerId || "",
  );
  const explorerRef = useRef<HTMLElement | null>(null);

  const games = useMemo(
    () =>
      activeOpponent ? h2hLifetimeGames(managerId, activeOpponent, seasons) : [],
    [managerId, activeOpponent, seasons],
  );

  function applyGame(game: LifetimeGame, scroll: boolean) {
    setExplorerSeason(game.season);
    setExplorerWeek(game.week);
    setExplorerOwnerId(game.opponentOwnerId);
    if (scroll) {
      explorerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function selectOpponent(nextOpponentId: string) {
    setOpponentId(nextOpponentId);
    setOpponentManagerId(managerId);
    const latest = h2hLifetimeGames(managerId, nextOpponentId, seasons)[0];
    if (latest) applyGame(latest, false);
  }

  return (
    <div className="space-y-6">
      <label className="flex flex-wrap items-center gap-2 text-sm text-emerald-100/80">
        Manager
        <select
          className={selectClass()}
          value={managerId}
          onChange={(event) => {
            onManagerId(event.target.value);
          }}
        >
          {managers.map((manager) => (
            <option key={manager.ownerId} value={manager.ownerId}>
              {manager.username}
            </option>
          ))}
        </select>
      </label>

      <Card className="border-white/10 bg-[#0d1f14]">
        <CardHeader>
          <CardTitle>Head-to-head</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opponent</TableHead>
                {(["record", "pf", "pa"] as const).map((column) => {
                  const label =
                    column === "record" ? "W–L" : column === "pf" ? "PF" : "PA";
                  const active = sortColumn === column;
                  const marker = !active ? "↕" : sortDir === "asc" ? "↑" : "↓";
                  return (
                    <TableHead
                      key={column}
                      className={cn(
                        "h-auto min-h-8 py-1 text-center",
                        column === "record" && "whitespace-nowrap",
                      )}
                      aria-sort={
                        active
                          ? sortDir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          const next = nextH2hSort(column, sortColumn, sortDir);
                          setSortColumn(next.column);
                          setSortDir(next.direction);
                        }}
                        className={cn(
                          "inline-flex w-full flex-nowrap items-center justify-center gap-1 rounded-sm leading-tight hover:text-emerald-50",
                          active ? "text-emerald-50" : "text-emerald-100/70",
                          column === "record" && "whitespace-nowrap",
                        )}
                      >
                        {label}
                        <span className="text-[10px] leading-none opacity-80" aria-hidden>
                          {marker}
                        </span>
                      </button>
                    </TableHead>
                  );
                })}
                {table.seasonYears.map((year) => (
                  <TableHead key={year} className="text-center">
                    {year}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.opponentOwnerId}
                  className={cn(
                    "cursor-pointer",
                    activeOpponent === row.opponentOwnerId && "bg-emerald-500/10",
                  )}
                  onClick={() => selectOpponent(row.opponentOwnerId)}
                >
                  <TableCell>
                    <button type="button" className="text-left">
                      {row.username}
                    </button>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-center tabular-nums whitespace-nowrap",
                      toneClass(row.allTimeTone),
                    )}
                  >
                    {row.allTimeRecord}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {formatPf(row.allTimePf)}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {formatPf(row.allTimePa)}
                  </TableCell>
                  {table.seasonYears.map((year) => {
                    const cell = row.seasonCells[year] ?? { text: "—", tone: "none" as const };
                    return (
                      <TableCell
                        key={year}
                        className={cn("text-center tabular-nums", toneClass(cell.tone))}
                      >
                        {cell.text}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {activeOpponent ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Lifetime games</h2>
          {games.length === 0 ? (
            <p className="text-sm text-emerald-100/70">No games against this opponent.</p>
          ) : (
            <div className="rounded-lg border border-white/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Season</TableHead>
                    <TableHead>Week</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {games.map((game) => (
                    <TableRow
                      key={`${game.leagueId}-${game.week}-${game.opponentRosterId}`}
                    >
                      <TableCell>{game.season}</TableCell>
                      <TableCell>
                        {game.week}
                        {game.playoff ? (
                          <span className="ml-2 text-xs font-medium text-amber-300">
                            Playoff
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPf(game.pf)}–{formatPf(game.pa)}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          className="text-sm text-emerald-200 hover:underline"
                          onClick={() => applyGame(game, true)}
                        >
                          Box Score
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      ) : null}

      <BoxScoreExplorer
        seasons={ordered}
        season={explorerSeason}
        week={explorerWeek}
        ownerId={explorerOwnerId}
        viewerUsername={viewerUsername}
        onSeason={setExplorerSeason}
        onWeek={setExplorerWeek}
        onOwnerId={setExplorerOwnerId}
        sectionRef={explorerRef}
      />
    </div>
  );
}

function BoxScoreExplorer({
  seasons,
  season,
  week,
  ownerId,
  viewerUsername,
  onSeason,
  onWeek,
  onOwnerId,
  sectionRef,
}: {
  seasons: HistorySeasonSnapshot[];
  season: string;
  week: number;
  ownerId: string;
  viewerUsername: string;
  onSeason: (season: string) => void;
  onWeek: (week: number) => void;
  onOwnerId: (ownerId: string) => void;
  sectionRef: RefObject<HTMLElement | null>;
}) {
  const snapshot = seasons.find((row) => row.season === season) ?? seasons[0];
  const weeks = snapshot?.weeks ?? [];
  const owners = snapshot?.owners ?? [];
  const selectedWeek = weeks.some((row) => row.week === week)
    ? week
    : (weeks.at(-1)?.week ?? 1);
  const selectedOwner = owners.some((row) => row.ownerId === ownerId)
    ? ownerId
    : (owners[0]?.ownerId ?? "");
  const rosterId = owners.find((row) => row.ownerId === selectedOwner)?.rosterId;
  const leagueId = snapshot?.leagueId;
  const [result, setResult] = useState<{
    leagueId: string;
    week: number;
    rosterId: number;
    sides?: BoxScoreSideView[];
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (!leagueId || rosterId == null) return;
    const controller = new AbortController();
    const request = { leagueId, week: selectedWeek, rosterId };
    const params = new URLSearchParams({
      league: leagueId,
      week: String(selectedWeek),
      roster: String(rosterId),
    });
    if (viewerUsername) params.set("username", viewerUsername);
    fetch(`/api/boxscore?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        const data = (await res.json()) as { sides?: BoxScoreSideView[]; error?: string };
        if (controller.signal.aborted) return;
        if (!res.ok) {
          setResult({ ...request, error: data.error || "Box score failed" });
          return;
        }
        setResult({ ...request, sides: data.sides ?? [] });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          ...request,
          error: err instanceof Error ? err.message : "Box score failed",
        });
      });
    return () => controller.abort();
  }, [leagueId, rosterId, selectedWeek, viewerUsername]);

  const matches =
    result != null &&
    result.leagueId === leagueId &&
    result.week === selectedWeek &&
    result.rosterId === rosterId;
  const loading = Boolean(leagueId) && rosterId != null && !matches;
  const error = matches ? (result?.error ?? null) : null;
  const box = matches && result?.sides ? { sides: result.sides } : null;

  function changeSeason(nextSeason: string) {
    const next = seasons.find((row) => row.season === nextSeason);
    onSeason(nextSeason);
    onWeek(next?.weeks.at(-1)?.week ?? 1);
    const keep = next?.owners.some((row) => row.ownerId === selectedOwner);
    onOwnerId(keep ? selectedOwner : (next?.owners[0]?.ownerId ?? ""));
  }

  return (
    <section ref={sectionRef} id="box-score-explorer" className="space-y-3">
      <h2 className="text-xl font-semibold">Box score</h2>
      <div className="flex flex-wrap gap-3 text-sm text-emerald-100/80">
        <label className="flex items-center gap-2">
          Season
          <select
            className={selectClass()}
            value={snapshot?.season ?? ""}
            onChange={(event) => changeSeason(event.target.value)}
          >
            {seasons.map((row) => (
              <option key={row.leagueId} value={row.season}>
                {row.season}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Week
          <select
            className={selectClass()}
            value={String(selectedWeek)}
            onChange={(event) => onWeek(Number(event.target.value))}
          >
            {weeks.map((row) => (
              <option key={row.week} value={row.week}>
                {row.week}
                {row.playoff ? " (playoff)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Team
          <select
            className={selectClass()}
            value={selectedOwner}
            onChange={(event) => onOwnerId(event.target.value)}
          >
            {owners.map((owner) => (
              <option key={owner.ownerId} value={owner.ownerId}>
                {owner.username}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <p className="text-sm text-emerald-100/70">Loading box score…</p>
      ) : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {!loading && !error && box ? <BoxScoreCard sides={box.sides} /> : null}
    </section>
  );
}

function BoxScoreCard({ sides }: { sides: BoxScoreSideView[] }) {
  if (sides.length === 0) {
    return <p className="text-sm text-emerald-100/70">No matchup for that week.</p>;
  }
  const showProjected = sides.some(
    (side) =>
      side.projectedTotal != null ||
      side.starters.some((row) => row.projected != null) ||
      side.bench.some((row) => row.projected != null),
  );
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {sides.map((side) => (
        <article
          key={side.rosterId}
          className="rounded-lg border border-amber-400/25 bg-[#121a0c] px-3 py-2"
        >
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h3 className="font-semibold">{side.username}</h3>
            <p className="font-mono text-sm font-bold tabular-nums">
              {formatPf(side.total)}
              {showProjected && side.projectedTotal != null ? (
                <span className="ml-2 text-xs font-medium text-emerald-100/60">
                  proj {formatPf(side.projectedTotal)}
                </span>
              ) : null}
            </p>
          </div>
          <PlayerTable rows={side.starters} title="Starters" showProjected={showProjected} />
          {side.bench.length > 0 ? (
            <PlayerTable rows={side.bench} title="Bench" showProjected={showProjected} />
          ) : null}
        </article>
      ))}
    </div>
  );
}

function PlayerTable({
  rows,
  title,
  showProjected,
}: {
  rows: BoxScoreSideView["starters"];
  title: string;
  showProjected: boolean;
}) {
  return (
    <div className="mt-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/80">
        {title}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            {showProjected ? <TableHead className="text-right">Proj</TableHead> : null}
            <TableHead className="text-right">Pts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.playerId}>
              <TableCell>
                <span className="text-emerald-100/60">{row.position ?? ""}</span>
                {row.position ? " " : null}
                {row.name}
              </TableCell>
              {showProjected ? (
                <TableCell className="text-right tabular-nums text-emerald-100/70">
                  {row.projected == null ? "" : formatPf(row.projected)}
                </TableCell>
              ) : null}
              <TableCell className="text-right tabular-nums">{formatPf(row.points)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function allTimeValue(row: AllTimeRow, key: AllTimeColumnKey): string | number {
  if (key === "pf" || key === "pa") return formatPf(row[key]);
  return row[key];
}

function AllTimePanel({ seasons }: { seasons: HistorySeasonSnapshot[] }) {
  const [includePlayoffs, setIncludePlayoffs] = useState(false);
  const [sortColumn, setSortColumn] = useState<AllTimeColumnKey>("championships");
  const [sortDir, setSortDir] = useState<AllTimeSortDir>("desc");
  const rows = useMemo(
    () =>
      sortAllTimeRows(
        allTimeRows(seasons, { includePlayoffs }),
        sortColumn,
        sortDir,
      ),
    [includePlayoffs, seasons, sortColumn, sortDir],
  );
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm text-emerald-100/80">
        <input
          type="checkbox"
          checked={includePlayoffs}
          onChange={(event) => setIncludePlayoffs(event.target.checked)}
          className="size-4 accent-emerald-400"
        />
        Include Playoffs
      </label>
      <Card className="border-white/10 bg-[#0d1f14]">
        <CardHeader>
          <CardTitle>All-time</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {ALL_TIME_COLUMN_KEYS.map((key) => {
                  const active = sortColumn === key;
                  const marker = !active ? "↕" : sortDir === "asc" ? "↑" : "↓";
                  const centered = key !== "username";
                  return (
                    <TableHead
                      key={key}
                      className={cn(
                        "h-auto min-h-8 py-1",
                        centered ? "text-center" : "text-left",
                        key === "record" && "whitespace-nowrap",
                      )}
                      aria-sort={
                        active
                          ? sortDir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const next = nextAllTimeSort(key, sortColumn, sortDir);
                          setSortColumn(next.column);
                          setSortDir(next.direction);
                        }}
                        className={cn(
                          "inline-flex w-full flex-nowrap items-center gap-1 rounded-sm leading-tight hover:text-emerald-50",
                          centered ? "justify-center text-center" : "justify-start text-left",
                          active ? "text-emerald-50" : "text-emerald-100/70",
                          key === "record" && "whitespace-nowrap",
                        )}
                      >
                        <span className={key === "record" ? "whitespace-nowrap" : undefined}>
                          {ALL_TIME_HEADERS[key]}
                        </span>
                        <span className="text-[10px] leading-none opacity-80" aria-hidden>
                          {marker}
                        </span>
                      </button>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.ownerId}>
                  {ALL_TIME_COLUMN_KEYS.map((key) => (
                    <TableCell
                      key={key}
                      className={cn(
                        key !== "username" && "text-center tabular-nums",
                        key === "record" && "whitespace-nowrap",
                      )}
                    >
                      {allTimeValue(row, key)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SeasonsPanel({ seasons }: { seasons: HistorySeasonSnapshot[] }) {
  const grid = useMemo(() => seasonsHistory(seasons), [seasons]);
  const [sortColumn, setSortColumn] = useState<SeasonsSortColumn>("username");
  const [sortDir, setSortDir] = useState<SeasonsSortDir>("asc");
  const rows = useMemo(
    () => sortSeasonRows(grid.rows, sortColumn, sortDir),
    [grid.rows, sortColumn, sortDir],
  );
  const columns: SeasonsSortColumn[] = ["username", "average", ...grid.seasonYears];

  function sortHead(column: SeasonsSortColumn, label: string, centered: boolean) {
    const active = sortColumn === column;
    const marker = !active ? "↕" : sortDir === "asc" ? "↑" : "↓";
    return (
      <TableHead
        key={column}
        className={cn("h-auto min-h-8 py-1", centered ? "text-center" : "text-left")}
        aria-sort={
          active ? (sortDir === "asc" ? "ascending" : "descending") : "none"
        }
      >
        <button
          type="button"
          onClick={() => {
            const next = nextSeasonsSort(column, sortColumn, sortDir);
            setSortColumn(next.column);
            setSortDir(next.direction);
          }}
          className={cn(
            "inline-flex w-full items-center gap-1 rounded-sm leading-tight hover:text-emerald-50",
            centered ? "justify-center text-center" : "justify-start text-left",
            active ? "text-emerald-50" : "text-emerald-100/70",
          )}
        >
          {label}
          <span className="text-[10px] leading-none opacity-80" aria-hidden>
            {marker}
          </span>
        </button>
      </TableHead>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-[#0d1f14]">
        <CardHeader>
          <CardTitle>Season ranks</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) =>
                  column === "username"
                    ? sortHead("username", "Manager", false)
                    : column === "average"
                      ? sortHead("average", "Avg", true)
                      : sortHead(column, column, true),
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.ownerId}>
                  <TableCell>{row.username}</TableCell>
                  <TableCell className="text-center tabular-nums">
                    {formatAverageRank(row.averageRank)}
                  </TableCell>
                  {grid.seasonYears.map((year) => {
                    const cell = row.cells[year];
                    return (
                      <TableCell
                        key={year}
                        className={cn(
                          "text-center tabular-nums",
                          cell?.playoffBerth && "bg-amber-300/20 text-amber-100",
                        )}
                      >
                        {cell ? cell.rank : ""}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Champions</h2>
        {grid.champions.length === 0 ? (
          <p className="text-sm text-emerald-100/70">No championships recorded yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {grid.champions.map((champ) => (
              <li key={`${champ.season}-${champ.ownerId}`}>
                {champ.season} · {champ.username}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Runner-ups</h2>
        {grid.runnerUps.length === 0 ? (
          <p className="text-sm text-emerald-100/70">No runner-ups recorded yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {grid.runnerUps.map((row) => (
              <li key={row.ownerId}>
                {row.username} · {row.count} · {row.seasons.join(", ")}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
