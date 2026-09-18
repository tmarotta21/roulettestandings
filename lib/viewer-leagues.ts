import type { HostedLeagueRecord } from "@/lib/leagues";
import type { SleeperLeague } from "@/lib/sleeper";

export type ViewerLeague = {
  sleeperLeagueId: string;
  name: string;
  hosted: boolean;
};

export type ViewerTab = "standings" | "weekly" | "bracket" | "history";

/** Hosted matches first (existing order), then remaining current-season Sleeper leagues. */
export function viewerLeagues(
  matches: Pick<HostedLeagueRecord, "sleeperLeagueId" | "name">[],
  allUserLeagues: Pick<SleeperLeague, "league_id" | "name">[],
): ViewerLeague[] {
  const seen = new Set<string>();
  const result: ViewerLeague[] = [];
  for (const row of matches) {
    if (seen.has(row.sleeperLeagueId)) continue;
    seen.add(row.sleeperLeagueId);
    result.push({
      sleeperLeagueId: row.sleeperLeagueId,
      name: row.name,
      hosted: true,
    });
  }
  for (const row of allUserLeagues) {
    if (seen.has(row.league_id)) continue;
    seen.add(row.league_id);
    result.push({
      sleeperLeagueId: row.league_id,
      name: row.name,
      hosted: false,
    });
  }
  return result;
}

export function tabForViewerLeague(
  hosted: boolean,
  requested: string | undefined,
): ViewerTab {
  if (!hosted) return "history";
  if (
    requested === "standings" ||
    requested === "weekly" ||
    requested === "bracket" ||
    requested === "history"
  ) {
    return requested;
  }
  return "standings";
}

/** Non-hosted always History. Leaving a History-only league lands on Standings. */
export function toggleTabForTarget(
  targetHosted: boolean,
  currentTab: ViewerTab,
  currentHosted: boolean,
): ViewerTab {
  if (!targetHosted) return "history";
  if (!currentHosted) return "standings";
  return currentTab;
}

export function userIsLeagueMember(
  users: { user_id: string; username?: string | null; display_name?: string | null }[],
  identity: string,
): boolean {
  const needle = identity.trim().toLowerCase();
  if (!needle) return false;
  return users.some((user) => {
    if (user.user_id.toLowerCase() === needle) return true;
    if (user.username?.trim().toLowerCase() === needle) return true;
    if (user.display_name?.trim().toLowerCase() === needle) return true;
    return false;
  });
}
