/**
 * Sleeper chat upload is fail-closed.
 *
 * Official Sleeper API cannot write. Chat posts would use unofficial
 * https://sleeper.com/graphql with SLEEPER_TOKEN. This module never sends a
 * GraphQL mutation unless SLEEPER_CHAT_POST=1 AND a captured mutation is wired
 * after explicit commissioner approval. Until then, Monday cron still generates
 * PNGs and the dashboard Download button remains the path into league chat.
 */

export type ChatSkipReason =
  | "not-enabled"
  | "missing-token"
  | "expired-token"
  | "awaiting-approval";

export type ChatDecision =
  | { allowed: false; reason: ChatSkipReason }
  | { allowed: true; reason: "ok" };

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
  return { allowed: false, reason: "awaiting-approval" };
}

export function chatSkipMessage(reason: ChatSkipReason): string {
  switch (reason) {
    case "not-enabled":
      return "Sleeper chat post is off. Download the PNG from the dashboard.";
    case "missing-token":
      return "SLEEPER_TOKEN is not set. Download the PNG from the dashboard.";
    case "expired-token":
      return "SLEEPER_TOKEN is expired. Download the PNG from the dashboard.";
    case "awaiting-approval":
      return "Sleeper chat post is waiting on commissioner approval. Download the PNG from the dashboard.";
  }
}

export async function maybePostWeeklyImages(_input: {
  week: number;
  season: string;
  sleeperLeagueIds: string[];
}): Promise<{ posted: number; skipped: ChatSkipReason; message: string }> {
  void _input;
  const decision = sleeperChatDecision();
  const reason = decision.reason === "ok" ? "awaiting-approval" : decision.reason;
  return {
    posted: 0,
    skipped: reason,
    message: chatSkipMessage(reason),
  };
}

export async function maybePostLeagueImage(_sleeperLeagueId: string): Promise<{
  posted: false;
  skipped: ChatSkipReason;
  message: string;
}> {
  const posted = await maybePostWeeklyImages({
    week: 0,
    season: "",
    sleeperLeagueIds: [_sleeperLeagueId],
  });
  return { posted: false, skipped: posted.skipped, message: posted.message };
}
