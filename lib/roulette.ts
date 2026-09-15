export type MatchupSide = {
  rosterId: number;
  points: number;
  matchupId: number | null;
};

export type WeekResult = {
  rosterId: number;
  points: number;
  won: boolean;
  tied: boolean;
  lost: boolean;
  roulette: boolean;
  matchupPts: number;
};

export type SeasonTotals = {
  rosterId: number;
  wins: number;
  ties: number;
  losses: number;
  rou: number;
  pts: number;
  pf: number;
};

export type RankedStanding = SeasonTotals & {
  inPlayoffs: boolean;
};

function pairByMatchupId(sides: MatchupSide[]): MatchupSide[][] {
  const groups = new Map<number, MatchupSide[]>();
  const solos: MatchupSide[][] = [];
  for (const side of sides) {
    if (side.matchupId == null) {
      solos.push([side]);
      continue;
    }
    const list = groups.get(side.matchupId) ?? [];
    list.push(side);
    groups.set(side.matchupId, list);
  }
  return [...groups.values(), ...solos];
}

export function rouletteCutoffSize(teamCount: number): number {
  return Math.floor(teamCount / 2);
}

export function computeRouletteWeek(sides: MatchupSide[]): WeekResult[] {
  const byRoster = new Map<number, WeekResult>();
  for (const side of sides) {
    byRoster.set(side.rosterId, {
      rosterId: side.rosterId,
      points: side.points,
      won: false,
      tied: false,
      lost: false,
      roulette: false,
      matchupPts: 0,
    });
  }

  for (const group of pairByMatchupId(sides)) {
    if (group.length !== 2) continue;
    const [a, b] = group;
    const rowA = byRoster.get(a.rosterId);
    const rowB = byRoster.get(b.rosterId);
    if (!rowA || !rowB) continue;
    if (a.points > b.points) {
      rowA.won = true;
      rowA.matchupPts = 2;
      rowB.lost = true;
      rowB.matchupPts = 0;
    } else if (b.points > a.points) {
      rowB.won = true;
      rowB.matchupPts = 2;
      rowA.lost = true;
      rowA.matchupPts = 0;
    } else {
      rowA.tied = true;
      rowB.tied = true;
      rowA.matchupPts = 1;
      rowB.matchupPts = 1;
    }
  }

  const cutoff = rouletteCutoffSize(sides.length);
  if (cutoff > 0 && sides.length > 0) {
    const sorted = [...sides].sort((a, b) => b.points - a.points);
    const threshold = sorted[cutoff - 1]?.points ?? 0;
    for (const side of sides) {
      const row = byRoster.get(side.rosterId);
      if (row && side.points >= threshold) row.roulette = true;
    }
  }

  return Array.from(byRoster.values());
}

export function computeRouletteSeason(weeks: MatchupSide[][]): SeasonTotals[] {
  const totals = new Map<number, SeasonTotals>();

  function row(rosterId: number): SeasonTotals {
    const existing = totals.get(rosterId);
    if (existing) return existing;
    const created: SeasonTotals = {
      rosterId,
      wins: 0,
      ties: 0,
      losses: 0,
      rou: 0,
      pts: 0,
      pf: 0,
    };
    totals.set(rosterId, created);
    return created;
  }

  for (const sides of weeks) {
    const results = computeRouletteWeek(sides);
    for (const result of results) {
      const season = row(result.rosterId);
      season.pf += result.points;
      if (result.won) season.wins += 1;
      if (result.tied) season.ties += 1;
      if (result.lost) season.losses += 1;
      if (result.roulette) season.rou += 1;
    }
  }

  for (const season of totals.values()) {
    season.pts = 2 * season.wins + season.ties + season.rou;
  }

  return Array.from(totals.values());
}

export function rankStandings(rows: SeasonTotals[]): SeasonTotals[] {
  return [...rows].sort((a, b) => b.pts - a.pts || b.pf - a.pf);
}

export function markPlayoffs(
  ranked: SeasonTotals[],
  playoffTeams: number,
): RankedStanding[] {
  if (ranked.length === 0) return [];
  const spots = Math.max(0, Math.min(playoffTeams, ranked.length));
  if (spots === 0) {
    return ranked.map((row) => ({ ...row, inPlayoffs: false }));
  }
  const cutoff = ranked[spots - 1];
  return ranked.map((row) => ({
    ...row,
    inPlayoffs:
      row.pts > cutoff.pts || (row.pts === cutoff.pts && row.pf >= cutoff.pf),
  }));
}

export function regularSeasonWeeks(
  playoffWeekStart: number,
  throughWeek: number,
): number[] {
  const last = Math.min(playoffWeekStart - 1, throughWeek);
  if (last < 1) return [];
  return Array.from({ length: last }, (_, i) => i + 1);
}
