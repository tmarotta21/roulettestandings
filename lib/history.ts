import {
  computeRouletteSeason,
  markPlayoffs,
  rankStandings,
  type MatchupSide,
} from "./roulette";
import type { SleeperBracketMatch } from "./sleeper";

export type CellTone = "green" | "red" | "none";

export type WinLossRecord = {
  wins: number;
  losses: number;
  ties: number;
};

export type HistoryOwner = {
  ownerId: string;
  rosterId: number;
  username: string;
};

export type HistoryWeekSide = {
  rosterId: number;
  points: number;
  matchupId: number | null;
};

export type HistoryWeek = {
  week: number;
  playoff: boolean;
  sides: HistoryWeekSide[];
};

export type HistorySeasonSnapshot = {
  season: string;
  leagueId: string;
  playoffTeams: number;
  owners: HistoryOwner[];
  weeks: HistoryWeek[];
  bracket: SleeperBracketMatch[];
};

export type H2hSeasonCell = {
  text: string;
  tone: CellTone;
};

export type H2hOpponentRow = {
  opponentOwnerId: string;
  username: string;
  allTimeRecord: string;
  allTimeTone: CellTone;
  allTimePf: number;
  allTimePa: number;
  seasonCells: Record<string, H2hSeasonCell>;
};

export type H2hTable = {
  seasonYears: string[];
  rows: H2hOpponentRow[];
};

export type LifetimeGame = {
  season: string;
  leagueId: string;
  week: number;
  playoff: boolean;
  pf: number;
  pa: number;
  viewerRosterId: number;
  opponentOwnerId: string;
  opponentUsername: string;
  opponentRosterId: number;
};

export const ALL_TIME_COLUMN_KEYS = [
  "username",
  "record",
  "rou",
  "pts",
  "pf",
  "pa",
  "playoffBerths",
  "firstRoundByes",
  "semifinalBerths",
  "finalBerths",
  "championships",
] as const;

export type AllTimeColumnKey = (typeof ALL_TIME_COLUMN_KEYS)[number];

export type AllTimeRow = {
  ownerId: string;
  username: string;
  record: string;
  rou: number;
  pts: number;
  pf: number;
  pa: number;
  playoffBerths: number;
  firstRoundByes: number;
  semifinalBerths: number;
  finalBerths: number;
  championships: number;
};

/** W–L / W–L–T display: the first number is wins. */
export function recordWins(record: string): number {
  const wins = Number.parseInt(record.split("-")[0] ?? "", 10);
  return Number.isFinite(wins) ? wins : 0;
}

export type BracketRoles = {
  firstRoundByeRosterIds: number[];
  semifinalRosterIds: number[];
  finalRosterIds: number[];
  championRosterId: number | null;
  runnerUpRosterId: number | null;
};

export type SeasonCell = {
  rank: number;
  playoffBerth: boolean;
};

export type SeasonGridRow = {
  ownerId: string;
  username: string;
  averageRank: number | null;
  cells: Record<string, SeasonCell | null>;
};

export type SeasonsGrid = {
  seasonYears: string[];
  rows: SeasonGridRow[];
  champions: Array<{ season: string; ownerId: string; username: string }>;
  runnerUps: Array<{ ownerId: string; username: string; count: number; seasons: string[] }>;
};

type PairedGame = {
  season: string;
  leagueId: string;
  week: number;
  playoff: boolean;
  viewerOwnerId: string;
  viewerRosterId: number;
  opponentOwnerId: string;
  opponentRosterId: number;
  pf: number;
  pa: number;
};

function bySeasonNewest(seasons: HistorySeasonSnapshot[]): HistorySeasonSnapshot[] {
  return [...seasons].sort((a, b) => b.season.localeCompare(a.season));
}

function bySeasonOldest(seasons: HistorySeasonSnapshot[]): HistorySeasonSnapshot[] {
  return [...seasons].sort((a, b) => a.season.localeCompare(b.season));
}

function emptyRecord(): WinLossRecord {
  return { wins: 0, losses: 0, ties: 0 };
}

function addGameResult(record: WinLossRecord, pf: number, pa: number) {
  if (pf > pa) record.wins += 1;
  else if (pa > pf) record.losses += 1;
  else record.ties += 1;
}

function addRecord(target: WinLossRecord, extra: WinLossRecord) {
  target.wins += extra.wins;
  target.losses += extra.losses;
  target.ties += extra.ties;
}

function ownerByRoster(season: HistorySeasonSnapshot): Map<number, HistoryOwner> {
  const map = new Map<number, HistoryOwner>();
  for (const owner of season.owners) {
    map.set(owner.rosterId, owner);
  }
  return map;
}

function allOwnerIds(seasons: HistorySeasonSnapshot[]): string[] {
  const ids = new Set<string>();
  for (const season of seasons) {
    for (const owner of season.owners) ids.add(owner.ownerId);
  }
  return [...ids];
}

export function latestUsername(
  seasons: HistorySeasonSnapshot[],
  ownerId: string,
): string {
  for (const season of bySeasonNewest(seasons)) {
    const owner = season.owners.find((row) => row.ownerId === ownerId);
    if (owner?.username) return owner.username;
  }
  return ownerId;
}

export function formatRecord(record: WinLossRecord): string {
  if (record.ties > 0) return `${record.wins}-${record.losses}-${record.ties}`;
  return `${record.wins}-${record.losses}`;
}

export function winPctTone(record: WinLossRecord): CellTone {
  const decided = record.wins + record.losses;
  if (decided === 0) return "none";
  const pct = record.wins / decided;
  if (pct > 0.5) return "green";
  if (pct < 0.5) return "red";
  return "none";
}

export function h2hSeasonCell(record: WinLossRecord | null): H2hSeasonCell {
  if (!record || (record.wins === 0 && record.losses === 0 && record.ties === 0)) {
    return { text: "—", tone: "none" };
  }
  return { text: formatRecord(record), tone: winPctTone(record) };
}

function pairWeekSides(sides: HistoryWeekSide[]): HistoryWeekSide[][] {
  const groups = new Map<string, HistoryWeekSide[]>();
  sides.forEach((side, index) => {
    const key =
      side.matchupId == null ? `solo-${side.rosterId}-${index}` : String(side.matchupId);
    const list = groups.get(key) ?? [];
    list.push(side);
    groups.set(key, list);
  });
  return [...groups.values()];
}

function pairedGames(seasons: HistorySeasonSnapshot[]): PairedGame[] {
  const games: PairedGame[] = [];
  for (const season of seasons) {
    const owners = ownerByRoster(season);
    for (const week of season.weeks) {
      for (const sides of pairWeekSides(week.sides)) {
        if (sides.length !== 2) continue;
        const [a, b] = sides;
        const ownerA = owners.get(a.rosterId);
        const ownerB = owners.get(b.rosterId);
        if (!ownerA || !ownerB || ownerA.ownerId === ownerB.ownerId) continue;
        games.push({
          season: season.season,
          leagueId: season.leagueId,
          week: week.week,
          playoff: week.playoff,
          viewerOwnerId: ownerA.ownerId,
          viewerRosterId: a.rosterId,
          opponentOwnerId: ownerB.ownerId,
          opponentRosterId: b.rosterId,
          pf: a.points,
          pa: b.points,
        });
        games.push({
          season: season.season,
          leagueId: season.leagueId,
          week: week.week,
          playoff: week.playoff,
          viewerOwnerId: ownerB.ownerId,
          viewerRosterId: b.rosterId,
          opponentOwnerId: ownerA.ownerId,
          opponentRosterId: a.rosterId,
          pf: b.points,
          pa: a.points,
        });
      }
    }
  }
  return games;
}

export function h2hTable(
  viewerOwnerId: string,
  seasons: HistorySeasonSnapshot[],
): H2hTable {
  const ordered = bySeasonOldest(seasons);
  const seasonYears = ordered.map((season) => season.season);
  const games = pairedGames(seasons).filter(
    (game) => game.viewerOwnerId === viewerOwnerId,
  );
  const rows: H2hOpponentRow[] = allOwnerIds(seasons)
    .filter((id) => id !== viewerOwnerId)
    .map((opponentOwnerId) => {
      const vs = games.filter((game) => game.opponentOwnerId === opponentOwnerId);
      const allTime = emptyRecord();
      let allTimePf = 0;
      let allTimePa = 0;
      for (const game of vs) {
        addGameResult(allTime, game.pf, game.pa);
        allTimePf += game.pf;
        allTimePa += game.pa;
      }
      const seasonCells: Record<string, H2hSeasonCell> = {};
      for (const year of seasonYears) {
        const yearGames = vs.filter((game) => game.season === year);
        if (yearGames.length === 0) {
          seasonCells[year] = h2hSeasonCell(null);
          continue;
        }
        const record = emptyRecord();
        for (const game of yearGames) addGameResult(record, game.pf, game.pa);
        seasonCells[year] = h2hSeasonCell(record);
      }
      return {
        opponentOwnerId,
        username: latestUsername(seasons, opponentOwnerId),
        allTimeRecord: formatRecord(allTime),
        allTimeTone: winPctTone(allTime),
        allTimePf,
        allTimePa,
        seasonCells,
      };
    });
  rows.sort((a, b) =>
    a.username.localeCompare(b.username, undefined, { sensitivity: "base" }),
  );
  return { seasonYears, rows };
}

export type H2hSortColumn = "record" | "pf" | "pa";
export type H2hSortDir = "asc" | "desc";

export function h2hSortValue(row: H2hOpponentRow, column: H2hSortColumn): number {
  if (column === "record") return recordWins(row.allTimeRecord);
  if (column === "pf") return row.allTimePf;
  return row.allTimePa;
}

export function nextH2hSort(
  clicked: H2hSortColumn,
  current: H2hSortColumn | null,
  direction: H2hSortDir,
): { column: H2hSortColumn; direction: H2hSortDir } {
  if (clicked === current) {
    return { column: clicked, direction: direction === "desc" ? "asc" : "desc" };
  }
  return { column: clicked, direction: "desc" };
}

export function sortH2hRows(
  rows: H2hOpponentRow[],
  column: H2hSortColumn | null,
  direction: H2hSortDir,
): H2hOpponentRow[] {
  if (!column) return rows;
  return [...rows].sort((a, b) => {
    const primary = h2hSortValue(a, column) - h2hSortValue(b, column);
    if (primary !== 0) return direction === "asc" ? primary : -primary;
    return a.username.localeCompare(b.username, undefined, { sensitivity: "base" });
  });
}

export function h2hLifetimeGames(
  viewerOwnerId: string,
  opponentOwnerId: string,
  seasons: HistorySeasonSnapshot[],
): LifetimeGame[] {
  return pairedGames(seasons)
    .filter(
      (game) =>
        game.viewerOwnerId === viewerOwnerId &&
        game.opponentOwnerId === opponentOwnerId,
    )
    .sort((a, b) => b.season.localeCompare(a.season) || b.week - a.week)
    .map((game) => ({
      season: game.season,
      leagueId: game.leagueId,
      week: game.week,
      playoff: game.playoff,
      pf: game.pf,
      pa: game.pa,
      viewerRosterId: game.viewerRosterId,
      opponentOwnerId: game.opponentOwnerId,
      opponentUsername: latestUsername(seasons, game.opponentOwnerId),
      opponentRosterId: game.opponentRosterId,
    }));
}

export function historyManagers(
  seasons: HistorySeasonSnapshot[],
): { ownerId: string; username: string }[] {
  return allOwnerIds(seasons)
    .map((ownerId) => ({
      ownerId,
      username: latestUsername(seasons, ownerId),
    }))
    .sort((a, b) =>
      a.username.localeCompare(b.username, undefined, { sensitivity: "base" }),
    );
}

export function ownerIdForUser(
  seasons: HistorySeasonSnapshot[],
  userId: string,
  username?: string,
): string | null {
  const ids = new Set(allOwnerIds(seasons));
  if (userId && ids.has(userId)) return userId;
  if (username) {
    const needle = username.trim().toLowerCase();
    for (const season of bySeasonNewest(seasons)) {
      const owner = season.owners.find(
        (row) => row.username.trim().toLowerCase() === needle,
      );
      if (owner) return owner.ownerId;
    }
  }
  return historyManagers(seasons)[0]?.ownerId ?? null;
}

function regularSides(season: HistorySeasonSnapshot): MatchupSide[][] {
  return season.weeks
    .filter((week) => !week.playoff)
    .map((week) =>
      week.sides.map((side) => ({
        rosterId: side.rosterId,
        points: side.points,
        matchupId: side.matchupId,
      })),
    );
}

function seasonRecordAndPoints(
  season: HistorySeasonSnapshot,
  playoff: boolean,
): Map<string, { record: WinLossRecord; pf: number; pa: number }> {
  const owners = ownerByRoster(season);
  const byOwner = new Map<string, { record: WinLossRecord; pf: number; pa: number }>();
  function row(ownerId: string) {
    const existing = byOwner.get(ownerId);
    if (existing) return existing;
    const created = { record: emptyRecord(), pf: 0, pa: 0 };
    byOwner.set(ownerId, created);
    return created;
  }
  for (const owner of season.owners) row(owner.ownerId);
  for (const week of season.weeks) {
    if (week.playoff !== playoff) continue;
    for (const sides of pairWeekSides(week.sides)) {
      if (sides.length === 2) {
        const [a, b] = sides;
        const ownerA = owners.get(a.rosterId);
        const ownerB = owners.get(b.rosterId);
        if (!ownerA || !ownerB) continue;
        const rowA = row(ownerA.ownerId);
        const rowB = row(ownerB.ownerId);
        rowA.pf += a.points;
        rowA.pa += b.points;
        rowB.pf += b.points;
        rowB.pa += a.points;
        addGameResult(rowA.record, a.points, b.points);
        addGameResult(rowB.record, b.points, a.points);
        continue;
      }
      for (const side of sides) {
        const owner = owners.get(side.rosterId);
        if (!owner) continue;
        row(owner.ownerId).pf += side.points;
      }
    }
  }
  return byOwner;
}

function rosterIdsInMatch(match: SleeperBracketMatch): number[] {
  const ids: number[] = [];
  if (typeof match.t1 === "number") ids.push(match.t1);
  if (typeof match.t2 === "number") ids.push(match.t2);
  return ids;
}

export function bracketRoles(bracket: SleeperBracketMatch[]): BracketRoles {
  const championship = bracket.find((match) => match.p === 1) ?? null;
  const round1Ids = new Set<number>();
  const laterIds = new Set<number>();
  for (const match of bracket) {
    for (const id of rosterIdsInMatch(match)) {
      if (match.r === 1) round1Ids.add(id);
      else if (match.r > 1) laterIds.add(id);
    }
  }
  const firstRoundByeRosterIds = [...laterIds]
    .filter((id) => !round1Ids.has(id))
    .sort((a, b) => a - b);

  const semifinalRosterIds: number[] = [];
  if (championship) {
    const semiRound = championship.r - 1;
    const ids = new Set<number>();
    for (const match of bracket) {
      if (match.r === semiRound) {
        for (const id of rosterIdsInMatch(match)) ids.add(id);
      }
    }
    semifinalRosterIds.push(...[...ids].sort((a, b) => a - b));
  }

  const finalRosterIds = championship
    ? rosterIdsInMatch(championship).sort((a, b) => a - b)
    : [];

  const championRosterId =
    championship && typeof championship.w === "number" ? championship.w : null;

  let runnerUpRosterId: number | null = null;
  if (championship) {
    if (typeof championship.l === "number") runnerUpRosterId = championship.l;
    else if (typeof championship.w === "number") {
      runnerUpRosterId =
        rosterIdsInMatch(championship).find((id) => id !== championship.w) ?? null;
    }
  }

  return {
    firstRoundByeRosterIds,
    semifinalRosterIds,
    finalRosterIds,
    championRosterId,
    runnerUpRosterId,
  };
}

export function allTimeColumnValues(row: AllTimeRow): unknown[] {
  return ALL_TIME_COLUMN_KEYS.map((key) => row[key]);
}

export type AllTimeSortDir = "asc" | "desc";

export function allTimeSortValue(
  row: AllTimeRow,
  key: AllTimeColumnKey,
): string | number {
  if (key === "username") return row.username;
  if (key === "record") return recordWins(row.record);
  return row[key];
}

export function nextAllTimeSort(
  clicked: AllTimeColumnKey,
  current: AllTimeColumnKey,
  direction: AllTimeSortDir,
): { column: AllTimeColumnKey; direction: AllTimeSortDir } {
  if (clicked === current) {
    return { column: clicked, direction: direction === "desc" ? "asc" : "desc" };
  }
  return {
    column: clicked,
    direction: clicked === "username" ? "asc" : "desc",
  };
}

export function sortAllTimeRows(
  rows: AllTimeRow[],
  column: AllTimeColumnKey,
  direction: AllTimeSortDir,
): AllTimeRow[] {
  return [...rows].sort((a, b) => {
    const left = allTimeSortValue(a, column);
    const right = allTimeSortValue(b, column);
    let primary = 0;
    if (typeof left === "string" && typeof right === "string") {
      primary = left.localeCompare(right, undefined, { sensitivity: "base" });
    } else {
      primary = Number(left) - Number(right);
    }
    if (primary !== 0) return direction === "asc" ? primary : -primary;
    if (a.championships !== b.championships) return b.championships - a.championships;
    if (a.pf !== b.pf) return b.pf - a.pf;
    return a.username.localeCompare(b.username, undefined, { sensitivity: "base" });
  });
}

export function allTimeRows(
  seasons: HistorySeasonSnapshot[],
  options: { includePlayoffs: boolean },
): AllTimeRow[] {
  const rows: AllTimeRow[] = allOwnerIds(seasons).map((ownerId) => {
    const record = emptyRecord();
    let pts = 0;
    let rou = 0;
    let pf = 0;
    let pa = 0;
    let playoffBerths = 0;
    let firstRoundByes = 0;
    let semifinalBerths = 0;
    let finalBerths = 0;
    let championships = 0;
    for (const season of seasons) {
      const owner = season.owners.find((row) => row.ownerId === ownerId);
      if (!owner) continue;
      const rs = seasonRecordAndPoints(season, false).get(ownerId);
      if (rs) {
        addRecord(record, rs.record);
        pf += rs.pf;
        pa += rs.pa;
      }
      const totals = computeRouletteSeason(regularSides(season));
      const standing = totals.find((row) => row.rosterId === owner.rosterId);
      if (standing) {
        pts += standing.pts;
        rou += standing.rou;
      }
      const ranked = markPlayoffs(rankStandings(totals), season.playoffTeams);
      if (ranked.find((row) => row.rosterId === owner.rosterId)?.inPlayoffs) {
        playoffBerths += 1;
      }
      if (options.includePlayoffs) {
        const po = seasonRecordAndPoints(season, true).get(ownerId);
        if (po) {
          addRecord(record, po.record);
          pf += po.pf;
          pa += po.pa;
        }
      }
      const roles = bracketRoles(season.bracket);
      if (roles.firstRoundByeRosterIds.includes(owner.rosterId)) firstRoundByes += 1;
      if (roles.semifinalRosterIds.includes(owner.rosterId)) semifinalBerths += 1;
      if (roles.finalRosterIds.includes(owner.rosterId)) finalBerths += 1;
      if (roles.championRosterId === owner.rosterId) championships += 1;
    }
    return {
      ownerId,
      username: latestUsername(seasons, ownerId),
      record: formatRecord(record),
      rou,
      pts,
      pf,
      pa,
      playoffBerths,
      firstRoundByes,
      semifinalBerths,
      finalBerths,
      championships,
    };
  });
  rows.sort((a, b) => b.championships - a.championships || b.pf - a.pf);
  return rows;
}

function ranksByPtsThenPf(
  ranked: { rosterId: number; pts: number; pf: number }[],
): Map<number, number> {
  const ranks = new Map<number, number>();
  let index = 0;
  while (index < ranked.length) {
    const current = ranked[index];
    let end = index + 1;
    while (
      end < ranked.length &&
      ranked[end].pts === current.pts &&
      ranked[end].pf === current.pf
    ) {
      end += 1;
    }
    const rank = index + 1;
    for (let i = index; i < end; i += 1) ranks.set(ranked[i].rosterId, rank);
    index = end;
  }
  return ranks;
}

function averageSeasonRank(cells: Record<string, SeasonCell | null>): number | null {
  const ranks: number[] = [];
  for (const cell of Object.values(cells)) {
    if (cell) ranks.push(cell.rank);
  }
  if (ranks.length === 0) return null;
  return ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length;
}

export function formatAverageRank(value: number | null): string {
  if (value == null) return "";
  return value.toFixed(1);
}

export function seasonsHistory(seasons: HistorySeasonSnapshot[]): SeasonsGrid {
  const oldest = bySeasonOldest(seasons);
  const newest = bySeasonNewest(seasons);
  const seasonYears = oldest.map((season) => season.season);
  const rows = allOwnerIds(seasons).map((ownerId) => {
    const cells: Record<string, SeasonCell | null> = {};
    for (const season of oldest) {
      const owner = season.owners.find((row) => row.ownerId === ownerId);
      if (!owner) {
        cells[season.season] = null;
        continue;
      }
      const ranked = markPlayoffs(
        rankStandings(computeRouletteSeason(regularSides(season))),
        season.playoffTeams,
      );
      const standing = ranked.find((row) => row.rosterId === owner.rosterId);
      if (!standing) {
        cells[season.season] = null;
        continue;
      }
      const ranks = ranksByPtsThenPf(ranked);
      cells[season.season] = {
        rank: ranks.get(owner.rosterId) ?? 0,
        playoffBerth: standing.inPlayoffs,
      };
    }
    return {
      ownerId,
      username: latestUsername(seasons, ownerId),
      averageRank: averageSeasonRank(cells),
      cells,
    };
  });
  rows.sort((a, b) =>
    a.username.localeCompare(b.username, undefined, { sensitivity: "base" }),
  );

  const champions: SeasonsGrid["champions"] = [];
  const runnerSeasons = new Map<string, string[]>();
  for (const season of newest) {
    const roles = bracketRoles(season.bracket);
    const owners = ownerByRoster(season);
    if (roles.championRosterId != null) {
      const owner = owners.get(roles.championRosterId);
      if (owner) {
        champions.push({
          season: season.season,
          ownerId: owner.ownerId,
          username: latestUsername(seasons, owner.ownerId),
        });
      }
    }
    if (roles.runnerUpRosterId != null) {
      const owner = owners.get(roles.runnerUpRosterId);
      if (owner) {
        const years = runnerSeasons.get(owner.ownerId) ?? [];
        years.push(season.season);
        runnerSeasons.set(owner.ownerId, years);
      }
    }
  }

  const runnerUps = [...runnerSeasons.entries()]
    .map(([ownerId, years]) => ({
      ownerId,
      username: latestUsername(seasons, ownerId),
      count: years.length,
      seasons: [...years].sort((a, b) => a.localeCompare(b)),
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.username.localeCompare(b.username, undefined, { sensitivity: "base" }),
    );

  return { seasonYears, rows, champions, runnerUps };
}

export type SeasonsSortColumn = "username" | "average" | string;
export type SeasonsSortDir = "asc" | "desc";

export function seasonsSortValue(
  row: SeasonGridRow,
  column: SeasonsSortColumn,
): string | number | null {
  if (column === "username") return row.username;
  if (column === "average") return row.averageRank;
  return row.cells[column]?.rank ?? null;
}

export function nextSeasonsSort(
  clicked: SeasonsSortColumn,
  current: SeasonsSortColumn,
  direction: SeasonsSortDir,
): { column: SeasonsSortColumn; direction: SeasonsSortDir } {
  if (clicked === current) {
    return { column: clicked, direction: direction === "desc" ? "asc" : "desc" };
  }
  return { column: clicked, direction: "asc" };
}

function compareNullableNumber(
  left: number | null,
  right: number | null,
  direction: SeasonsSortDir,
): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  const primary = left - right;
  return direction === "asc" ? primary : -primary;
}

export function sortSeasonRows(
  rows: SeasonGridRow[],
  column: SeasonsSortColumn,
  direction: SeasonsSortDir,
): SeasonGridRow[] {
  return [...rows].sort((a, b) => {
    const left = seasonsSortValue(a, column);
    const right = seasonsSortValue(b, column);
    let primary = 0;
    if (typeof left === "string" && typeof right === "string") {
      primary = left.localeCompare(right, undefined, { sensitivity: "base" });
      if (primary !== 0) return direction === "asc" ? primary : -primary;
    } else {
      primary = compareNullableNumber(
        typeof left === "number" ? left : null,
        typeof right === "number" ? right : null,
        direction,
      );
      if (primary !== 0) return primary;
    }
    return a.username.localeCompare(b.username, undefined, { sensitivity: "base" });
  });
}

export function scoreFromStats(
  stats: Record<string, number> | null | undefined,
  scoringSettings: Record<string, number>,
): number | null {
  if (!stats) return null;
  let total = 0;
  let used = false;
  for (const [key, setting] of Object.entries(scoringSettings)) {
    const value = stats[key];
    if (typeof setting !== "number" || !Number.isFinite(setting)) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    total += value * setting;
    used = true;
  }
  if (!used || total === 0) return null;
  return total;
}
