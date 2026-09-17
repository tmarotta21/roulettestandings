/**
 * Sleeper chat upload is fail-closed.
 *
 * The official Sleeper API cannot write. Chat posts use the unofficial
 * https://sleeper.com/graphql `create_message` mutation with a commissioner
 * session JWT (SLEEPER_TOKEN, captured from DevTools). This module only sends
 * that mutation when SLEEPER_CHAT_POST=1 AND SLEEPER_TOKEN is set and
 * unexpired — the commissioner setting both in Vercel env IS the approval.
 * Until then, Monday cron still generates PNGs and the dashboard Download
 * button remains the path into league chat.
 */

import { getNflState, nflDisplayWeek } from "@/lib/sleeper";

export type ChatSkipReason = "not-enabled" | "missing-token" | "expired-token";

export type ChatDecision =
  | { allowed: false; reason: ChatSkipReason }
  | { allowed: true; reason: "ok" };

export type ChatPostResult = {
  posted: number;
  skipped: ChatSkipReason | null;
  message: string;
  errors: string[];
};

function decodeJwtExp(token: string): number | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(json) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function sleeperTokenExpired(token: string, nowSec = Math.floor(Date.now() / 1000)): boolean {
  const exp = decodeJwtExp(token);
  if (exp == null) return false;
  return exp <= nowSec;
}

export function sleeperChatDecision(
  env: Record<string, string | undefined> = process.env,
  nowSec = Math.floor(Date.now() / 1000),
): ChatDecision {
  if (env.SLEEPER_CHAT_POST !== "1") {
    return { allowed: false, reason: "not-enabled" };
  }
  const token = env.SLEEPER_TOKEN?.trim();
  if (!token) {
    return { allowed: false, reason: "missing-token" };
  }
  if (sleeperTokenExpired(token, nowSec)) {
    return { allowed: false, reason: "expired-token" };
  }
  return { allowed: true, reason: "ok" };
}

export function chatSkipMessage(reason: ChatSkipReason): string {
  switch (reason) {
    case "not-enabled":
      return "Sleeper chat post is off. Download the PNG from the dashboard.";
    case "missing-token":
      return "SLEEPER_TOKEN is not set. Download the PNG from the dashboard.";
    case "expired-token":
      return "SLEEPER_TOKEN is expired. Download the PNG from the dashboard.";
  }
}

function resolveBaseUrl(env: Record<string, string | undefined> = process.env): string | null {
  const host = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  return host ? `https://${host}` : null;
}

function standingsMessageText(sleeperLeagueId: string, week: number): string {
  const weekLabel = week > 0 ? `Week ${week} ` : "";
  const baseUrl = resolveBaseUrl();
  if (!baseUrl) {
    return `${weekLabel}Roulette standings are ready. Check the dashboard for the PNG.`.trim();
  }
  return `${weekLabel}Roulette standings: ${baseUrl}/api/og/${sleeperLeagueId}`.trim();
}

/** Fires the captured `create_message` mutation against the unofficial Sleeper GraphQL API. */
async function postSleeperMessage(
  sleeperLeagueId: string,
  token: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const clientId = crypto.randomUUID();
  const query = `mutation create_message($text: String) {
        create_message(parent_id: "${sleeperLeagueId}", client_id: "${clientId}", parent_type: "league", text: $text) {
          message_id
          created
        }
      }`;
  try {
    const response = await fetch("https://sleeper.com/graphql", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: token,
        "x-sleeper-graphql-op": "create_message",
      },
      body: JSON.stringify({ operationName: "create_message", variables: { text }, query }),
    });
    if (!response.ok) {
      return { ok: false, error: `Sleeper responded ${response.status}` };
    }
    const payload = (await response.json()) as { errors?: { message?: string }[] };
    if (payload.errors?.length) {
      return { ok: false, error: payload.errors[0]?.message ?? "Sleeper GraphQL error" };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Network error" };
  }
}

export async function maybePostWeeklyImages(input: {
  week: number;
  season: string;
  sleeperLeagueIds: string[];
}): Promise<ChatPostResult> {
  const decision = sleeperChatDecision();
  if (!decision.allowed) {
    return {
      posted: 0,
      skipped: decision.reason,
      message: chatSkipMessage(decision.reason),
      errors: [],
    };
  }

  const token = process.env.SLEEPER_TOKEN!.trim();
  const errors: string[] = [];
  let posted = 0;
  for (const sleeperLeagueId of input.sleeperLeagueIds) {
    const text = standingsMessageText(sleeperLeagueId, input.week);
    const result = await postSleeperMessage(sleeperLeagueId, token, text);
    if (result.ok) {
      posted += 1;
    } else {
      errors.push(`${sleeperLeagueId}: ${result.error}`);
    }
  }

  const message =
    errors.length === 0
      ? `Posted standings to ${posted} league${posted === 1 ? "" : "s"}.`
      : `Posted to ${posted} league${posted === 1 ? "" : "s"}; ${errors.length} failed.`;
  return { posted, skipped: null, message, errors };
}

export async function maybePostLeagueImage(sleeperLeagueId: string): Promise<ChatPostResult> {
  const decision = sleeperChatDecision();
  if (!decision.allowed) {
    return {
      posted: 0,
      skipped: decision.reason,
      message: chatSkipMessage(decision.reason),
      errors: [],
    };
  }
  const state = await getNflState().catch(() => null);
  const week = state ? nflDisplayWeek(state) : 0;
  return maybePostWeeklyImages({ week, season: state?.season ?? "", sleeperLeagueIds: [sleeperLeagueId] });
}
