import { cookies } from "next/headers";
import { currentSeason } from "@/lib/admin";
import { listHostedLeagues } from "@/lib/hosted";
import type { HostedLeagueRecord } from "@/lib/leagues";
import {
  getNflState,
  getUser,
  getUserLeagues,
  type SleeperLeague,
  type SleeperUser,
} from "@/lib/sleeper";

export const USERNAME_COOKIE = "rs_username";

export async function getUsernameCookie(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(USERNAME_COOKIE)?.value?.trim();
  return value || null;
}

export function cookieUsernameOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  };
}

export async function hostedLeaguesForUser(username: string): Promise<{
  user: SleeperUser;
  matches: HostedLeagueRecord[];
  allUserLeagues: SleeperLeague[];
  season: string;
}> {
  const [user, hosted, state] = await Promise.all([
    getUser(username),
    listHostedLeagues(),
    getNflState(),
  ]);
  const season = state.season ?? currentSeason();
  const allUserLeagues = user.user_id
    ? await getUserLeagues(user.user_id, season)
    : [];
  const matches = hosted.filter((league) =>
    allUserLeagues.some((row) => row.league_id === league.sleeperLeagueId),
  );
  return { user, matches, allUserLeagues, season };
}
