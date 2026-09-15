import test from "node:test";
import assert from "node:assert/strict";
import { HOSTED_LEAGUES, SHADYNASTY_2025_ID } from "./leagues";
import { formatMismatches, reconcileLeague } from "./sleeper-reconcile";
import { getNflState, nflDisplayWeek } from "./sleeper";
import { completedNflWeek } from "./nfl-final";

const LIVE_TIMEOUT_MS = 120_000;

test(
  "2025 Shadynasty WIN and PF match Sleeper rosters and matchup cards",
  { timeout: LIVE_TIMEOUT_MS },
  async () => {
    const result = await reconcileLeague(SHADYNASTY_2025_ID);
    assert.equal(
      result.winMismatches.length,
      0,
      `WIN/TIE/LOSS disagree with Sleeper:\n${formatMismatches(result.winMismatches)}`,
    );
    assert.equal(
      result.pfMismatches.length,
      0,
      `PF disagrees with Sleeper matchup.points:\n${formatMismatches(result.pfMismatches)}`,
    );
    assert.ok(result.rows.length >= 12);
    const deezus = result.rows.find((row) => row.ourWins === 11 && row.ourPf > 2300);
    assert.ok(deezus, "expected a 11-win high-PF roster like RDeezus");
    assert.equal(deezus.ourWins, deezus.sleeperWins);
  },
);

test(
  "hosted 2026 leagues: completed-week WIN and PF match Sleeper",
  { timeout: LIVE_TIMEOUT_MS },
  async () => {
    const state = await getNflState();
    const { throughWeek } = await completedNflWeek(nflDisplayWeek(state));
    if (throughWeek < 1) {
      return;
    }
    for (const league of HOSTED_LEAGUES) {
      const result = await reconcileLeague(league.sleeperLeagueId, throughWeek);
      assert.equal(
        result.winMismatches.length,
        0,
        `${league.name} WIN/TIE/LOSS disagree with Sleeper:\n${formatMismatches(result.winMismatches)}`,
      );
      assert.equal(
        result.pfMismatches.length,
        0,
        `${league.name} PF disagrees with Sleeper matchup.points:\n${formatMismatches(result.pfMismatches)}`,
      );
    }
  },
);
