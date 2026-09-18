import test from "node:test";
import assert from "node:assert/strict";
import {
  tabForViewerLeague,
  toggleTabForTarget,
  userIsLeagueMember,
  viewerLeagues,
} from "./viewer-leagues";

test("viewerLeagues keeps hosted first, appends other Sleeper leagues, and dedupes", () => {
  const leagues = viewerLeagues(
    [
      { sleeperLeagueId: "hosted-a", name: "Hosted A" },
      { sleeperLeagueId: "hosted-b", name: "Hosted B" },
    ],
    [
      { league_id: "hosted-a", name: "Sleeper name for A" },
      { league_id: "other-1", name: "Other 1" },
      { league_id: "hosted-b", name: "Sleeper name for B" },
      { league_id: "other-2", name: "Other 2" },
    ],
  );
  assert.deepEqual(
    leagues.map((row) => [row.sleeperLeagueId, row.hosted, row.name]),
    [
      ["hosted-a", true, "Hosted A"],
      ["hosted-b", true, "Hosted B"],
      ["other-1", false, "Other 1"],
      ["other-2", false, "Other 2"],
    ],
  );
});

test("viewerLeagues is empty when the user has no Sleeper leagues", () => {
  assert.deepEqual(viewerLeagues([], []), []);
});

test("viewerLeagues lists only non-hosted leagues when nothing is in the admin registry", () => {
  const leagues = viewerLeagues(
    [],
    [
      { league_id: "friend-1", name: "Friend League" },
      { league_id: "friend-2", name: "Another" },
    ],
  );
  assert.equal(leagues.length, 2);
  assert.equal(leagues.every((row) => row.hosted === false), true);
  assert.equal(leagues[0]?.sleeperLeagueId, "friend-1");
});

test("tabForViewerLeague keeps the requested tab on hosted leagues", () => {
  assert.equal(tabForViewerLeague(true, "weekly"), "weekly");
  assert.equal(tabForViewerLeague(true, "history"), "history");
  assert.equal(tabForViewerLeague(true, undefined), "standings");
  assert.equal(tabForViewerLeague(true, "nope"), "standings");
});

test("tabForViewerLeague always uses history for non-hosted leagues", () => {
  assert.equal(tabForViewerLeague(false, "standings"), "history");
  assert.equal(tabForViewerLeague(false, "weekly"), "history");
  assert.equal(tabForViewerLeague(false, "bracket"), "history");
  assert.equal(tabForViewerLeague(false, undefined), "history");
});

test("toggleTabForTarget forces history on non-hosted and standings when leaving history-only", () => {
  assert.equal(toggleTabForTarget(false, "standings", true), "history");
  assert.equal(toggleTabForTarget(false, "history", false), "history");
  assert.equal(toggleTabForTarget(true, "history", false), "standings");
  assert.equal(toggleTabForTarget(true, "weekly", true), "weekly");
});

test("userIsLeagueMember matches user id, username, or display name", () => {
  const users = [
    { user_id: "123", username: "FriendUser", display_name: "Friend" },
  ];
  assert.equal(userIsLeagueMember(users, "frienduser"), true);
  assert.equal(userIsLeagueMember(users, "Friend"), true);
  assert.equal(userIsLeagueMember(users, "123"), true);
  assert.equal(userIsLeagueMember(users, "stranger"), false);
  assert.equal(userIsLeagueMember(users, "  "), false);
});
