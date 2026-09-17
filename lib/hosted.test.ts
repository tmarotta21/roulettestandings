import test from "node:test";
import assert from "node:assert/strict";
import { HOSTED_LEAGUES, intersectHostedLeagueIds, mergeHostedLeagues } from "./leagues";
import {
  maybePostLeagueImage,
  maybePostWeeklyImages,
  sleeperChatDecision,
  sleeperTokenExpired,
} from "./sleeper-chat";

test("mergeHostedLeagues keeps seed first and appends extra DB leagues", () => {
  const merged = mergeHostedLeagues(HOSTED_LEAGUES, [
    {
      sleeperLeagueId: HOSTED_LEAGUES[0].sleeperLeagueId,
      slug: "losrb-db",
      name: "LoSRB from DB",
    },
    {
      sleeperLeagueId: "999",
      slug: "extra",
      name: "Extra League",
    },
  ]);
  assert.equal(merged[0]?.name, "LoSRB from DB");
  assert.equal(merged[0]?.fromSeed, true);
  assert.equal(merged[0]?.slug, "losrb-db");
  const extra = merged.find((row) => row.sleeperLeagueId === "999");
  assert.ok(extra);
  assert.equal(extra?.fromSeed, false);
  assert.equal(merged.length, HOSTED_LEAGUES.length + 1);
});

test("mergeHostedLeagues drops excluded seed and extra leagues", () => {
  const merged = mergeHostedLeagues(
    HOSTED_LEAGUES,
    [
      {
        sleeperLeagueId: "999",
        slug: "extra",
        name: "Extra League",
      },
    ],
    [HOSTED_LEAGUES[0].sleeperLeagueId, "999"],
  );
  assert.equal(
    merged.some((row) => row.sleeperLeagueId === HOSTED_LEAGUES[0].sleeperLeagueId),
    false,
  );
  assert.equal(
    merged.some((row) => row.sleeperLeagueId === "999"),
    false,
  );
  assert.equal(merged.length, HOSTED_LEAGUES.length - 1);
});

test("intersectHostedLeagueIds keeps only hosted ids", () => {
  const hosted = HOSTED_LEAGUES.map((row) => row.sleeperLeagueId);
  const matched = intersectHostedLeagueIds(
    [hosted[0], "not-hosted", hosted[1]],
    hosted,
  );
  assert.deepEqual(matched, [hosted[0], hosted[1]]);
});

test("sleeper chat stays fail-closed without SLEEPER_CHAT_POST", () => {
  const decision = sleeperChatDecision({ SLEEPER_TOKEN: "eyJhbGciOiJub25lIn0.e30." });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "not-enabled");
});

test("sleeper chat skip missing token when post flag is on", () => {
  const decision = sleeperChatDecision({ SLEEPER_CHAT_POST: "1" });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "missing-token");
});

test("expired JWT is detected without sending", () => {
  const payload = Buffer.from(JSON.stringify({ exp: 1 }), "utf8").toString("base64url");
  const token = `eyJhbGciOiJub25lIn0.${payload}.`;
  assert.equal(sleeperTokenExpired(token, 10), true);
  const decision = sleeperChatDecision(
    { SLEEPER_CHAT_POST: "1", SLEEPER_TOKEN: token },
    10,
  );
  assert.equal(decision.reason, "expired-token");
});

test("valid token is allowed to post", () => {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    "utf8",
  ).toString("base64url");
  const token = `eyJhbGciOiJub25lIn0.${payload}.`;
  const decision = sleeperChatDecision({ SLEEPER_CHAT_POST: "1", SLEEPER_TOKEN: token });
  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, "ok");
});

test("maybePostWeeklyImages stays off without SLEEPER_CHAT_POST and never calls fetch", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    throw new Error("should not fetch");
  }) as typeof fetch;
  try {
    const posted = await maybePostWeeklyImages({
      week: 1,
      season: "2026",
      sleeperLeagueIds: [HOSTED_LEAGUES[0].sleeperLeagueId],
    });
    assert.equal(posted.posted, 0);
    assert.equal(posted.skipped, "not-enabled");
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("maybePostWeeklyImages sends the create_message mutation when enabled", async () => {
  const hadChatPost = "SLEEPER_CHAT_POST" in process.env;
  const hadToken = "SLEEPER_TOKEN" in process.env;
  const originalChatPost = process.env.SLEEPER_CHAT_POST;
  const originalToken = process.env.SLEEPER_TOKEN;
  const originalFetch = globalThis.fetch;
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    "utf8",
  ).toString("base64url");
  const token = `eyJhbGciOiJub25lIn0.${payload}.`;
  process.env.SLEEPER_CHAT_POST = "1";
  process.env.SLEEPER_TOKEN = token;
  const requests: { url: string; body: string; authorization: string | null }[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({
      url,
      body: String(init?.body ?? ""),
      authorization: (init?.headers as Record<string, string> | undefined)?.authorization ?? null,
    });
    return new Response(JSON.stringify({ data: { create_message: { message_id: "1" } } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const result = await maybePostWeeklyImages({
      week: 3,
      season: "2026",
      sleeperLeagueIds: [HOSTED_LEAGUES[0].sleeperLeagueId, HOSTED_LEAGUES[1].sleeperLeagueId],
    });
    assert.equal(result.posted, 2);
    assert.equal(result.skipped, null);
    assert.equal(requests.length, 2);
    assert.equal(requests[0]?.url, "https://sleeper.com/graphql");
    assert.equal(requests[0]?.authorization, token);
    assert.ok(requests[0]?.body.includes(HOSTED_LEAGUES[0].sleeperLeagueId));
    assert.ok(requests[0]?.body.includes("create_message"));
  } finally {
    globalThis.fetch = originalFetch;
    if (hadChatPost) process.env.SLEEPER_CHAT_POST = originalChatPost;
    else delete process.env.SLEEPER_CHAT_POST;
    if (hadToken) process.env.SLEEPER_TOKEN = originalToken;
    else delete process.env.SLEEPER_TOKEN;
  }
});

test("maybePostLeagueImage stays off without approval and never calls fetch", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    throw new Error("should not fetch");
  }) as typeof fetch;
  try {
    const leaguePost = await maybePostLeagueImage(HOSTED_LEAGUES[0].sleeperLeagueId);
    assert.equal(leaguePost.posted, 0);
    assert.equal(leaguePost.skipped, "not-enabled");
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
