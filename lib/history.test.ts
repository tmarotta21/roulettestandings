import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_TIME_COLUMN_KEYS,
  allTimeColumnValues,
  allTimeRows,
  bracketRoles,
  h2hSeasonCell,
  h2hTable,
  nextAllTimeSort,
  nextH2hSort,
  recordWins,
  scoreFromStats,
  seasonsHistory,
  sortAllTimeRows,
  sortH2hRows,
  sortSeasonRows,
  winPctTone,
  type AllTimeRow,
  type H2hOpponentRow,
  type HistorySeasonSnapshot,
} from "./history";
import type { SleeperBracketMatch } from "./sleeper";

function snapshot(partial: HistorySeasonSnapshot): HistorySeasonSnapshot {
  return partial;
}

const scoring = {
  pass_yd: 0.04,
  pass_td: 4,
  rush_yd: 0.1,
  rec: 1,
  rec_yd: 0.1,
};

const h2hSeasons: HistorySeasonSnapshot[] = [
  snapshot({
    season: "2024",
    leagueId: "lg-2024",
    playoffTeams: 4,
    owners: [
      { ownerId: "alice", rosterId: 1, username: "Alice" },
      { ownerId: "bob", rosterId: 2, username: "Bobby" },
      { ownerId: "dave", rosterId: 3, username: "Dave" },
      { ownerId: "eve", rosterId: 4, username: "Eve" },
    ],
    weeks: [
      {
        week: 1,
        playoff: false,
        sides: [
          { rosterId: 1, points: 110, matchupId: 1 },
          { rosterId: 2, points: 100, matchupId: 1 },
          { rosterId: 3, points: 80, matchupId: 2 },
          { rosterId: 4, points: 70, matchupId: 2 },
        ],
      },
      {
        week: 2,
        playoff: false,
        sides: [
          { rosterId: 1, points: 120, matchupId: 1 },
          { rosterId: 2, points: 90, matchupId: 1 },
          { rosterId: 3, points: 85, matchupId: 2 },
          { rosterId: 4, points: 85, matchupId: 2 },
        ],
      },
      {
        week: 3,
        playoff: false,
        sides: [
          { rosterId: 1, points: 100, matchupId: 1 },
          { rosterId: 4, points: 100, matchupId: 1 },
          { rosterId: 2, points: 95, matchupId: 2 },
          { rosterId: 3, points: 70, matchupId: 2 },
        ],
      },
      {
        week: 4,
        playoff: false,
        sides: [
          { rosterId: 1, points: 90, matchupId: 1 },
          { rosterId: 4, points: 90, matchupId: 1 },
          { rosterId: 2, points: 88, matchupId: 2 },
          { rosterId: 3, points: 60, matchupId: 2 },
        ],
      },
      {
        week: 15,
        playoff: true,
        sides: [
          { rosterId: 1, points: 100, matchupId: 1 },
          { rosterId: 2, points: 120, matchupId: 1 },
        ],
      },
    ],
    bracket: [],
  }),
  snapshot({
    season: "2023",
    leagueId: "lg-2023",
    playoffTeams: 2,
    owners: [
      { ownerId: "alice", rosterId: 10, username: "Allie" },
      { ownerId: "bob", rosterId: 11, username: "Bob" },
    ],
    weeks: [
      {
        week: 1,
        playoff: false,
        sides: [
          { rosterId: 10, points: 120, matchupId: 1 },
          { rosterId: 11, points: 100, matchupId: 1 },
        ],
      },
    ],
    bracket: [],
  }),
];

function careerSeason(): HistorySeasonSnapshot {
  const weeks: HistorySeasonSnapshot["weeks"] = [];
  for (let week = 1; week <= 10; week += 1) {
    weeks.push({
      week,
      playoff: false,
      sides: [
        { rosterId: 1, points: 60, matchupId: 1 },
        { rosterId: 2, points: 40, matchupId: 1 },
        { rosterId: 3, points: 200, matchupId: 2 },
        { rosterId: 4, points: 180, matchupId: 2 },
      ],
    });
  }
  for (let week = 11; week <= 14; week += 1) {
    weeks.push({
      week,
      playoff: false,
      sides: [
        { rosterId: 1, points: 200, matchupId: 1 },
        { rosterId: 2, points: 225, matchupId: 1 },
        { rosterId: 3, points: 10, matchupId: 2 },
        { rosterId: 4, points: 5, matchupId: 2 },
      ],
    });
  }
  weeks.push(
    {
      week: 15,
      playoff: true,
      sides: [
        { rosterId: 1, points: 50, matchupId: 1 },
        { rosterId: 2, points: 40, matchupId: 1 },
        { rosterId: 3, points: 30, matchupId: 2 },
        { rosterId: 4, points: 20, matchupId: 2 },
      ],
    },
    {
      week: 16,
      playoff: true,
      sides: [
        { rosterId: 1, points: 30, matchupId: 1 },
        { rosterId: 2, points: 50, matchupId: 1 },
        { rosterId: 3, points: 25, matchupId: 2 },
        { rosterId: 4, points: 15, matchupId: 2 },
      ],
    },
  );
  return snapshot({
    season: "2024",
    leagueId: "career-1",
    playoffTeams: 2,
    owners: [
      { ownerId: "ace", rosterId: 1, username: "Ace" },
      { ownerId: "bee", rosterId: 2, username: "Bee" },
      { ownerId: "cee", rosterId: 3, username: "Cee" },
      { ownerId: "dee", rosterId: 4, username: "Dee" },
    ],
    weeks,
    bracket: [],
  });
}

const sixTeamBracket: SleeperBracketMatch[] = [
  { r: 1, m: 1, t1: 3, t2: 6, w: 3, l: 6 },
  { r: 1, m: 2, t1: 4, t2: 5, w: 4, l: 5 },
  { r: 2, m: 3, t1: 1, t2: 3, w: 1, l: 3 },
  { r: 2, m: 4, t1: 2, t2: 4, w: 2, l: 4 },
  { r: 3, m: 5, t1: 1, t2: 2, w: 1, l: 2, p: 1 },
];

const fourTeamBracket: SleeperBracketMatch[] = [
  { r: 1, m: 1, t1: 1, t2: 4, w: 1, l: 4 },
  { r: 1, m: 2, t1: 2, t2: 3, w: 2, l: 3 },
  { r: 2, m: 3, t1: 1, t2: 2, w: 1, l: 2, p: 1 },
];

const seasonsGridSeasons: HistorySeasonSnapshot[] = [
  snapshot({
    season: "2025",
    leagueId: "sg-2025",
    playoffTeams: 2,
    owners: [
      { ownerId: "a", rosterId: 1, username: "Alpha" },
      { ownerId: "b", rosterId: 2, username: "Beta" },
      { ownerId: "c", rosterId: 3, username: "Gamma" },
      { ownerId: "d", rosterId: 4, username: "Delta" },
    ],
    weeks: [
      {
        week: 1,
        playoff: false,
        sides: [
          { rosterId: 1, points: 120, matchupId: 1 },
          { rosterId: 4, points: 80, matchupId: 1 },
          { rosterId: 2, points: 100, matchupId: 2 },
          { rosterId: 3, points: 100, matchupId: 2 },
        ],
      },
    ],
    bracket: [{ r: 2, m: 1, t1: 1, t2: 2, w: 1, l: 2, p: 1 }],
  }),
  snapshot({
    season: "2024",
    leagueId: "sg-2024",
    playoffTeams: 2,
    owners: [
      { ownerId: "a", rosterId: 10, username: "A-old" },
      { ownerId: "b", rosterId: 11, username: "Beta" },
      { ownerId: "c", rosterId: 12, username: "Gamma" },
      { ownerId: "d", rosterId: 13, username: "Delta" },
    ],
    weeks: [
      {
        week: 1,
        playoff: false,
        sides: [
          { rosterId: 10, points: 110, matchupId: 1 },
          { rosterId: 11, points: 90, matchupId: 1 },
          { rosterId: 12, points: 130, matchupId: 2 },
          { rosterId: 13, points: 70, matchupId: 2 },
        ],
      },
    ],
    bracket: [{ r: 2, m: 1, t1: 12, t2: 10, w: 12, l: 10, p: 1 }],
  }),
  snapshot({
    season: "2023",
    leagueId: "sg-2023",
    playoffTeams: 2,
    owners: [
      { ownerId: "a", rosterId: 20, username: "A-older" },
      { ownerId: "d", rosterId: 21, username: "Delta" },
    ],
    weeks: [
      {
        week: 1,
        playoff: false,
        sides: [
          { rosterId: 21, points: 120, matchupId: 1 },
          { rosterId: 20, points: 100, matchupId: 1 },
        ],
      },
    ],
    bracket: [{ r: 1, m: 1, t1: 21, t2: 20, w: 21, l: 20, p: 1 }],
  }),
];

test("H2H season cells combine RS+playoff and color by win%", () => {
  assert.deepEqual(h2hSeasonCell({ wins: 2, losses: 1, ties: 0 }), {
    text: "2-1",
    tone: "green",
  });
  assert.deepEqual(h2hSeasonCell(null), { text: "—", tone: "none" });
  assert.deepEqual(h2hSeasonCell({ wins: 0, losses: 0, ties: 2 }), {
    text: "0-0-2",
    tone: "none",
  });
  assert.equal(winPctTone({ wins: 0, losses: 1, ties: 0 }), "red");
  assert.equal(winPctTone({ wins: 1, losses: 1, ties: 0 }), "none");

  const table = h2hTable("alice", h2hSeasons);
  const bob = table.rows.find((row) => row.opponentOwnerId === "bob");
  const dave = table.rows.find((row) => row.opponentOwnerId === "dave");
  const eve = table.rows.find((row) => row.opponentOwnerId === "eve");
  assert.deepEqual(bob?.seasonCells["2024"], { text: "2-1", tone: "green" });
  assert.deepEqual(dave?.seasonCells["2024"], { text: "—", tone: "none" });
  assert.deepEqual(eve?.seasonCells["2024"], { text: "0-0-2", tone: "none" });
});

test("H2H all-time W-L PF and PA sum combined RS+playoff games", () => {
  const table = h2hTable("alice", h2hSeasons);
  const bob = table.rows.find((row) => row.opponentOwnerId === "bob");
  assert.equal(bob?.username, "Bobby");
  assert.equal(bob?.allTimeRecord, "3-1");
  assert.equal(bob?.allTimeTone, "green");
  assert.equal(bob?.allTimePf, 450);
  assert.equal(bob?.allTimePa, 410);
  assert.deepEqual(bob?.seasonCells["2023"], { text: "1-0", tone: "green" });
  assert.deepEqual(table.seasonYears, ["2023", "2024"]);
});

test("H2H W-L sort uses wins, not the display string", () => {
  function row(
    username: string,
    allTimeRecord: string,
    allTimePf: number,
  ): H2hOpponentRow {
    return {
      opponentOwnerId: username,
      username,
      allTimeRecord,
      allTimeTone: "none",
      allTimePf,
      allTimePa: 0,
      seasonCells: {},
    };
  }
  const lowWins = row("Low", "8-0", 10);
  const highWins = row("High", "10-20", 1);
  const desc = sortH2hRows([lowWins, highWins], "record", "desc");
  assert.deepEqual(
    desc.map((item) => item.username),
    ["High", "Low"],
  );
  assert.deepEqual(nextH2hSort("record", null, "desc"), {
    column: "record",
    direction: "desc",
  });
});

test("all-time career Include Playoffs recomputes W-L PF PA and never PTS", () => {
  const seasons = [careerSeason()];
  const off = allTimeRows(seasons, { includePlayoffs: false }).find(
    (row) => row.ownerId === "ace",
  );
  const on = allTimeRows(seasons, { includePlayoffs: true }).find(
    (row) => row.ownerId === "ace",
  );
  assert.equal(off?.username, "Ace");
  assert.equal(off?.record, "10-4");
  assert.equal(off?.rou, 4);
  assert.equal(off?.pts, 24);
  assert.equal(off?.pf, 1400);
  assert.equal(off?.pa, 1300);
  assert.equal(on?.record, "11-5");
  assert.equal(on?.rou, 4);
  assert.equal(on?.pts, 24);
  assert.equal(on?.pf, 1480);
  assert.equal(on?.pa, 1390);
});

test("all-time column contract is username W-L ROU PTS PF PA then playoff counts", () => {
  assert.deepEqual([...ALL_TIME_COLUMN_KEYS], [
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
  ]);
  const ace = allTimeRows([careerSeason()], { includePlayoffs: false }).find(
    (row) => row.ownerId === "ace",
  );
  assert.ok(ace);
  assert.deepEqual(allTimeColumnValues(ace), [
    "Ace",
    "10-4",
    4,
    24,
    1400,
    1300,
    1,
    0,
    0,
    0,
    0,
  ]);
});

test("6-team bracket: byes for seeds 1-2, four semis, two finals, one champion", () => {
  const roles = bracketRoles(sixTeamBracket);
  assert.deepEqual([...roles.firstRoundByeRosterIds].sort((a, b) => a - b), [1, 2]);
  assert.deepEqual([...roles.semifinalRosterIds].sort((a, b) => a - b), [1, 2, 3, 4]);
  assert.deepEqual([...roles.finalRosterIds].sort((a, b) => a - b), [1, 2]);
  assert.equal(roles.championRosterId, 1);
  assert.equal(roles.runnerUpRosterId, 2);
});

test("4-team bracket: zero byes, four semis, two finals, one champion", () => {
  const roles = bracketRoles(fourTeamBracket);
  assert.deepEqual(roles.firstRoundByeRosterIds, []);
  assert.deepEqual([...roles.semifinalRosterIds].sort((a, b) => a - b), [1, 2, 3, 4]);
  assert.deepEqual([...roles.finalRosterIds].sort((a, b) => a - b), [1, 2]);
  assert.equal(roles.championRosterId, 1);
  assert.equal(roles.runnerUpRosterId, 2);
});

test("seasons grid ranks berths champions newest-first and runner-ups by frequency", () => {
  const grid = seasonsHistory(seasonsGridSeasons);
  assert.deepEqual(grid.seasonYears, ["2023", "2024", "2025"]);
  const alpha = grid.rows.find((row) => row.ownerId === "a");
  const beta = grid.rows.find((row) => row.ownerId === "b");
  const gamma = grid.rows.find((row) => row.ownerId === "c");
  const delta = grid.rows.find((row) => row.ownerId === "d");
  assert.equal(alpha?.username, "Alpha");
  assert.deepEqual(alpha?.cells["2025"], { rank: 1, playoffBerth: true });
  assert.deepEqual(alpha?.cells["2024"], { rank: 2, playoffBerth: true });
  assert.deepEqual(alpha?.cells["2023"], { rank: 2, playoffBerth: true });
  assert.equal(alpha?.averageRank, (1 + 2 + 2) / 3);
  assert.deepEqual(beta?.cells["2025"], { rank: 2, playoffBerth: true });
  assert.deepEqual(gamma?.cells["2025"], { rank: 2, playoffBerth: true });
  assert.deepEqual(delta?.cells["2025"], { rank: 4, playoffBerth: false });
  assert.equal(beta?.cells["2023"], null);
  assert.equal(beta?.averageRank, (2 + 3) / 2);
  assert.deepEqual(grid.champions, [
    { season: "2025", ownerId: "a", username: "Alpha" },
    { season: "2024", ownerId: "c", username: "Gamma" },
    { season: "2023", ownerId: "d", username: "Delta" },
  ]);
  assert.deepEqual(grid.runnerUps, [
    { ownerId: "a", username: "Alpha", count: 2, seasons: ["2023", "2024"] },
    { ownerId: "b", username: "Beta", count: 1, seasons: ["2025"] },
  ]);
  const by2023 = sortSeasonRows(grid.rows, "2023", "asc");
  assert.deepEqual(
    by2023.map((row) => row.ownerId),
    ["d", "a", "b", "c"],
  );
});

test("W-L sort key is the wins side of the record", () => {
  assert.equal(recordWins("53-44"), 53);
  assert.equal(recordWins("10-4-1"), 10);
  assert.equal(recordWins("0-0-2"), 0);
});

test("all-time W-L sort uses wins, not the display string", () => {
  const lowWins: AllTimeRow = {
    ownerId: "low",
    username: "Low",
    record: "8-0",
    rou: 0,
    pts: 0,
    pf: 1,
    pa: 0,
    playoffBerths: 0,
    firstRoundByes: 0,
    semifinalBerths: 0,
    finalBerths: 0,
    championships: 0,
  };
  const highWins = { ...lowWins, ownerId: "high", username: "High", record: "10-20" };
  const desc = sortAllTimeRows([lowWins, highWins], "record", "desc");
  assert.deepEqual(
    desc.map((row) => row.username),
    ["High", "Low"],
  );
  const next = nextAllTimeSort("record", "championships", "desc");
  assert.deepEqual(next, { column: "record", direction: "desc" });
});

test("scoreFromStats omits missing stats and empty products", () => {
  assert.equal(scoreFromStats(undefined, scoring), null);
  assert.equal(scoreFromStats(null, scoring), null);
  assert.equal(scoreFromStats({}, scoring), null);
  assert.equal(scoreFromStats({ pts_ppr: 20 }, scoring), null);
  assert.equal(scoreFromStats({ pass_yd: 0, pass_td: 0 }, scoring), null);
  assert.equal(scoreFromStats({ pass_yd: 250, pass_td: 2 }, scoring), 18);
  assert.equal(scoreFromStats({ pass_yd: 250, unknown: 99 }, scoring), 10);
});
