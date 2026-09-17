import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSleeperLeagueId, walkPreviousLeagues } from "./sleeper";

test("normalizeSleeperLeagueId treats Sleeper 0 and blanks as missing", () => {
  assert.equal(normalizeSleeperLeagueId("0"), null);
  assert.equal(normalizeSleeperLeagueId(""), null);
  assert.equal(normalizeSleeperLeagueId("   "), null);
  assert.equal(normalizeSleeperLeagueId(null), null);
  assert.equal(normalizeSleeperLeagueId(undefined), null);
  assert.equal(normalizeSleeperLeagueId("1328148486587170816"), "1328148486587170816");
});

test("walkPreviousLeagues stops at previous_league_id 0 without fetching /league/0", async () => {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requested.push(url);
    if (url.endsWith("/league/aaa")) {
      return new Response(
        JSON.stringify({
          league_id: "aaa",
          name: "Now",
          season: "2026",
          previous_league_id: "bbb",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (url.endsWith("/league/bbb")) {
      return new Response(
        JSON.stringify({
          league_id: "bbb",
          name: "Then",
          season: "2020",
          previous_league_id: "0",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response("missing", { status: 404 });
  }) as typeof fetch;

  try {
    const leagues = await walkPreviousLeagues("aaa");
    assert.deepEqual(
      leagues.map((league) => league.league_id),
      ["aaa", "bbb"],
    );
    assert.equal(
      requested.some((url) => url.includes("/league/0")),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
