import {
  computeRouletteSeason,
  regularSeasonWeeks,
  type SeasonTotals,
} from "@/lib/roulette";
import {
  combinedPoints,
  getLeague,
  getMatchups,
  getRosters,
  liveMatchupPoints,
  settingNumber,
  type SleeperMatchup,
  type SleeperRoster,
} from "@/lib/sleeper";

const PF_TOLERANCE = 0.051;

export type RecordMismatch = {
  rosterId: number;
  field: "wins" | "ties" | "losses" | "pf";
  ours: number;
  sleeper: number;
};

export type ReconcileRow = {
  rosterId: number;
  ourWins: number;
  ourTies: number;
  ourLosses: number;
  ourPf: number;
  sleeperMatchupPf: number;
  sleeperWins: number;
  sleeperTies: number;
  sleeperLosses: number;
  sleeperFpts: number;
};

function near(a: number, b: number, tolerance = PF_TOLERANCE): boolean {
  return Math.abs(a - b) <= tolerance;
}

function sidesFromMatchups(
  matchups: SleeperMatchup[],
  pointsFor: (matchup: SleeperMatchup) => number,
) {
  return matchups.map((matchup) => ({
    rosterId: matchup.roster_id,
    points: pointsFor(matchup),
    matchupId: matchup.matchup_id ?? null,
  }));
}

export function sleeperRosterRecord(roster: SleeperRoster) {
  return {
    rosterId: roster.roster_id,
    wins: roster.settings?.wins ?? 0,
    ties: roster.settings?.ties ?? 0,
    losses: roster.settings?.losses ?? 0,
    fpts: combinedPoints(roster.settings?.fpts, roster.settings?.fpts_decimal),
  };
}

/** Sum Sleeper's official matchup card points for the same weeks we score. */
export function sleeperMatchupPointTotals(
  matchupWeeks: SleeperMatchup[][],
): Map<number, number> {
  const totals = new Map<number, number>();
  for (const matchups of matchupWeeks) {
    for (const matchup of matchups) {
      const prev = totals.get(matchup.roster_id) ?? 0;
      totals.set(matchup.roster_id, prev + (matchup.points ?? 0));
    }
  }
  return totals;
}

export function reconcileWinsAndPf(input: {
  rosters: SleeperRoster[];
  matchupWeeks: SleeperMatchup[][];
}): {
  rows: ReconcileRow[];
  winMismatches: RecordMismatch[];
  pfMismatches: RecordMismatch[];
} {
  const ours = new Map<number, SeasonTotals>(
    computeRouletteSeason(
      input.matchupWeeks.map((week) => sidesFromMatchups(week, liveMatchupPoints)),
    ).map((row) => [row.rosterId, row]),
  );
  const officialPf = sleeperMatchupPointTotals(input.matchupWeeks);
  const fromCardWins = new Map<number, SeasonTotals>(
    computeRouletteSeason(
      input.matchupWeeks.map((week) =>
        sidesFromMatchups(week, (matchup) => matchup.points ?? 0),
      ),
    ).map((row) => [row.rosterId, row]),
  );

  const rows: ReconcileRow[] = [];
  const winMismatches: RecordMismatch[] = [];
  const pfMismatches: RecordMismatch[] = [];

  for (const roster of input.rosters) {
    const computed = ours.get(roster.roster_id);
    const card = fromCardWins.get(roster.roster_id);
    const sleeper = sleeperRosterRecord(roster);
    const ourWins = computed?.wins ?? 0;
    const ourTies = computed?.ties ?? 0;
    const ourLosses = computed?.losses ?? 0;
    const ourPf = computed?.pf ?? 0;
    const sleeperMatchupPf = officialPf.get(roster.roster_id) ?? 0;
    rows.push({
      rosterId: roster.roster_id,
      ourWins,
      ourTies,
      ourLosses,
      ourPf,
      sleeperMatchupPf,
      sleeperWins: sleeper.wins,
      sleeperTies: sleeper.ties,
      sleeperLosses: sleeper.losses,
      sleeperFpts: sleeper.fpts,
    });

    if (ourWins !== sleeper.wins) {
      winMismatches.push({
        rosterId: roster.roster_id,
        field: "wins",
        ours: ourWins,
        sleeper: sleeper.wins,
      });
    }
    if (ourTies !== sleeper.ties) {
      winMismatches.push({
        rosterId: roster.roster_id,
        field: "ties",
        ours: ourTies,
        sleeper: sleeper.ties,
      });
    }
    if (ourLosses !== sleeper.losses) {
      winMismatches.push({
        rosterId: roster.roster_id,
        field: "losses",
        ours: ourLosses,
        sleeper: sleeper.losses,
      });
    }
    if (!near(ourPf, sleeperMatchupPf)) {
      pfMismatches.push({
        rosterId: roster.roster_id,
        field: "pf",
        ours: ourPf,
        sleeper: sleeperMatchupPf,
      });
    }
    if (card && (card.wins !== ourWins || card.ties !== ourTies)) {
      winMismatches.push({
        rosterId: roster.roster_id,
        field: "wins",
        ours: ourWins,
        sleeper: card.wins,
      });
    }
  }

  return { rows, winMismatches, pfMismatches };
}

export async function fetchRegularSeasonMatchups(
  sleeperLeagueId: string,
  throughWeek: number,
  playoffWeekStart: number,
): Promise<SleeperMatchup[][]> {
  const weeks = regularSeasonWeeks(playoffWeekStart, throughWeek);
  return Promise.all(weeks.map((week) => getMatchups(sleeperLeagueId, week)));
}

export async function reconcileLeague(
  sleeperLeagueId: string,
  throughWeek?: number,
): Promise<ReturnType<typeof reconcileWinsAndPf> & { throughWeek: number }> {
  const [league, rosters] = await Promise.all([
    getLeague(sleeperLeagueId),
    getRosters(sleeperLeagueId),
  ]);
  const playoffWeekStart = settingNumber(league.settings, "playoff_week_start", 15);
  const lastReport = settingNumber(league.settings, "last_report", playoffWeekStart - 1);
  const week = throughWeek ?? Math.min(playoffWeekStart - 1, lastReport);
  const matchupWeeks = await fetchRegularSeasonMatchups(
    sleeperLeagueId,
    week,
    playoffWeekStart,
  );
  return { ...reconcileWinsAndPf({ rosters, matchupWeeks }), throughWeek: week };
}

export function formatMismatches(mismatches: RecordMismatch[]): string {
  if (mismatches.length === 0) return "";
  return mismatches
    .map(
      (row) =>
        `roster ${row.rosterId} ${row.field}: ours ${row.ours} vs Sleeper ${row.sleeper}`,
    )
    .join("\n");
}

export { combinedPoints };
