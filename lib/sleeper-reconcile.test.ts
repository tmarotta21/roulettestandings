import test from "node:test";
import assert from "node:assert/strict";
import { reconcileWinsAndPf } from "./sleeper-reconcile";
import type { SleeperMatchup, SleeperRoster } from "./sleeper";

function roster(
  rosterId: number,
  wins: number,
  losses: number,
  ties: number,
  fpts: number,
  fptsDecimal = 0,
): SleeperRoster {
  return {
    roster_id: rosterId,
    settings: { wins, losses, ties, fpts, fpts_decimal: fptsDecimal },
  };
}

function matchup(
  rosterId: number,
  matchupId: number,
  points: number,
  extra?: Partial<SleeperMatchup>,
): SleeperMatchup {
  return { roster_id: rosterId, matchup_id: matchupId, points, ...extra };
}

test("computed WIN and PF match Sleeper roster record and matchup.points", () => {
  const rosters = [
    roster(1, 2, 0, 0, 220),
    roster(2, 0, 2, 0, 180),
    roster(3, 0, 0, 2, 200),
    roster(4, 0, 0, 2, 200),
  ];
  const matchupWeeks: SleeperMatchup[][] = [
    [
      matchup(1, 1, 120),
      matchup(2, 1, 100),
      matchup(3, 2, 100),
      matchup(4, 2, 100),
    ],
    [
      matchup(1, 1, 100),
      matchup(2, 1, 80),
      matchup(3, 2, 100),
      matchup(4, 2, 100),
    ],
  ];
  const result = reconcileWinsAndPf({ rosters, matchupWeeks });
  assert.equal(result.winMismatches.length, 0, format(result.winMismatches));
  assert.equal(result.pfMismatches.length, 0, format(result.pfMismatches));
  const one = result.rows.find((row) => row.rosterId === 1);
  assert.equal(one?.ourWins, 2);
  assert.equal(one?.sleeperWins, 2);
  assert.equal(one?.ourPf, 220);
  assert.equal(one?.sleeperMatchupPf, 220);
});

test("flags WIN when our pairing disagrees with Sleeper roster.settings.wins", () => {
  const rosters = [roster(1, 2, 0, 0, 120), roster(2, 0, 2, 0, 100)];
  const matchupWeeks: SleeperMatchup[][] = [
    [matchup(1, 1, 120), matchup(2, 1, 100)],
  ];
  const result = reconcileWinsAndPf({ rosters, matchupWeeks });
  assert.ok(result.winMismatches.some((row) => row.rosterId === 1 && row.field === "wins"));
});

test("flags PF when live starter points disagree with Sleeper matchup.points", () => {
  const rosters = [roster(1, 1, 0, 0, 100), roster(2, 0, 1, 0, 80)];
  const matchupWeeks: SleeperMatchup[][] = [
    [
      matchup(1, 1, 100, { starters: ["1"], starters_points: [125] }),
      matchup(2, 1, 80),
    ],
  ];
  const result = reconcileWinsAndPf({ rosters, matchupWeeks });
  assert.ok(result.pfMismatches.some((row) => row.rosterId === 1));
});

function format(
  rows: { rosterId: number; field: string; ours: number; sleeper: number }[],
): string {
  return rows.map((row) => `${row.rosterId} ${row.field} ${row.ours} vs ${row.sleeper}`).join("; ");
}
