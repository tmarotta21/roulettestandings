import test from "node:test";
import assert from "node:assert/strict";
import {
  computeRouletteSeason,
  computeRouletteWeek,
  markPlayoffs,
  rankStandings,
  rouletteCutoffSize,
  weeklyStandingsPts,
  type MatchupSide,
} from "./roulette";

function side(rosterId: number, points: number, matchupId: number | null): MatchupSide {
  return { rosterId, points, matchupId };
}

test("12-team cutoff is 6 and 10-team cutoff is 5", () => {
  assert.equal(rouletteCutoffSize(12), 6);
  assert.equal(rouletteCutoffSize(10), 5);
});

test("H2H winner gets 2 matchup points and loser 0", () => {
  const week = computeRouletteWeek([
    side(1, 120, 1),
    side(2, 100, 1),
    side(3, 90, 2),
    side(4, 80, 2),
  ]);
  const one = week.find((row) => row.rosterId === 1);
  const two = week.find((row) => row.rosterId === 2);
  assert.equal(one?.won, true);
  assert.equal(one?.matchupPts, 2);
  assert.equal(two?.lost, true);
  assert.equal(two?.matchupPts, 0);
});

test("weekly standings PTS is matchup points plus ROU (0 to +3)", () => {
  const week = computeRouletteWeek([
    side(1, 120, 1),
    side(2, 100, 1),
    side(3, 90, 2),
    side(4, 80, 2),
  ]);
  const byId = new Map(week.map((row) => [row.rosterId, weeklyStandingsPts(row)]));
  assert.equal(byId.get(1), 3);
  assert.equal(byId.get(2), 1);
  assert.equal(byId.get(3), 2);
  assert.equal(byId.get(4), 0);
});

test("H2H tie gives both teams 1 matchup point and no WIN", () => {
  const week = computeRouletteWeek([
    side(1, 110, 1),
    side(2, 110, 1),
    side(3, 80, 2),
    side(4, 70, 2),
  ]);
  const one = week.find((row) => row.rosterId === 1);
  const two = week.find((row) => row.rosterId === 2);
  assert.equal(one?.tied, true);
  assert.equal(two?.tied, true);
  assert.equal(one?.won, false);
  assert.equal(one?.matchupPts, 1);
  assert.equal(two?.matchupPts, 1);
});

test("tied last roulette spot awards ROU to both teams", () => {
  const sides: MatchupSide[] = [
    side(1, 140, 1),
    side(2, 130, 1),
    side(3, 120, 2),
    side(4, 110, 2),
    side(5, 100, 3),
    side(6, 90, 3),
    side(7, 90, 4),
    side(8, 70, 4),
    side(9, 60, 5),
    side(10, 50, 5),
    side(11, 40, 6),
    side(12, 30, 6),
  ];
  const week = computeRouletteWeek(sides);
  const withRou = week.filter((row) => row.roulette).map((row) => row.rosterId).sort((a, b) => a - b);
  assert.deepEqual(withRou, [1, 2, 3, 4, 5, 6, 7]);
});

test("season PTS is 2*WIN + TIE + ROU and ranks PTS then PF", () => {
  const weeks: MatchupSide[][] = [
    [side(1, 120, 1), side(2, 100, 1), side(3, 90, 2), side(4, 80, 2)],
    [side(1, 100, 1), side(2, 100, 1), side(3, 110, 2), side(4, 70, 2)],
  ];
  const ranked = rankStandings(computeRouletteSeason(weeks));
  const one = ranked.find((row) => row.rosterId === 1);
  assert.equal(one?.wins, 1);
  assert.equal(one?.ties, 1);
  assert.equal(one?.pts, 2 * 1 + 1 + one.rou);
  assert.equal(ranked[0].pts >= ranked[1].pts, true);
});

test("playoff highlight includes PTS+PF ties for the last seed", () => {
  const ranked = rankStandings([
    { rosterId: 1, wins: 5, ties: 0, losses: 0, rou: 5, pts: 15, pf: 500 },
    { rosterId: 2, wins: 4, ties: 0, losses: 0, rou: 4, pts: 12, pf: 400 },
    { rosterId: 3, wins: 3, ties: 0, losses: 0, rou: 3, pts: 10, pf: 350 },
    { rosterId: 4, wins: 3, ties: 0, losses: 0, rou: 3, pts: 10, pf: 350 },
  ]);
  const marked = markPlayoffs(ranked, 3);
  assert.equal(marked.filter((row) => row.inPlayoffs).length, 4);
  assert.equal(marked.find((row) => row.rosterId === 3)?.inPlayoffs, true);
  assert.equal(marked.find((row) => row.rosterId === 4)?.inPlayoffs, true);
});
