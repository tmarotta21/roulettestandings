export const HOSTED_LEAGUES = [
  {
    sleeperLeagueId: "1312059475418435584",
    slug: "losrb",
    name: "LoSRB",
  },
  {
    sleeperLeagueId: "1312064033167282176",
    slug: "mfl",
    name: "MFL",
  },
  {
    sleeperLeagueId: "1312897670829862912",
    slug: "shadynasty",
    name: "Shadynasty Fantasy Lounge",
  },
  {
    sleeperLeagueId: "1318054540800462848",
    slug: "game-of-dyno",
    name: "Game of Dyno",
  },
  {
    sleeperLeagueId: "1312903288433172480",
    slug: "unwavering-faith",
    name: "League of Unwavering Faith, Ultimate Belief",
  },
] as const;

export const SHADYNASTY_2025_ID = "1180599038981910528";

export type HostedLeague = (typeof HOSTED_LEAGUES)[number];

export type HostedLeagueRecord = {
  sleeperLeagueId: string;
  slug: string;
  name: string;
  fromSeed: boolean;
  autoChatPostEnabled: boolean;
};

export function hostedLeagueIds(): string[] {
  return HOSTED_LEAGUES.map((league) => league.sleeperLeagueId);
}

export function hostedById(sleeperLeagueId: string): HostedLeague | undefined {
  return HOSTED_LEAGUES.find((league) => league.sleeperLeagueId === sleeperLeagueId);
}

export function isSeedLeague(sleeperLeagueId: string): boolean {
  return Boolean(hostedById(sleeperLeagueId));
}

/** Seed first, then extra DB rows. DB names/slugs win when both exist. */
export function mergeHostedLeagues(
  seed: readonly { sleeperLeagueId: string; slug: string; name: string }[],
  db: {
    sleeperLeagueId: string;
    slug: string;
    name: string;
    autoChatPostEnabled?: boolean;
  }[],
  excludedIds: Iterable<string> = [],
): HostedLeagueRecord[] {
  const excluded = new Set(excludedIds);
  const dbById = new Map(db.map((row) => [row.sleeperLeagueId, row]));
  const result: HostedLeagueRecord[] = [];
  const seen = new Set<string>();
  for (const row of seed) {
    if (excluded.has(row.sleeperLeagueId)) {
      seen.add(row.sleeperLeagueId);
      continue;
    }
    const overlay = dbById.get(row.sleeperLeagueId);
    result.push({
      sleeperLeagueId: row.sleeperLeagueId,
      slug: overlay?.slug || row.slug,
      name: overlay?.name || row.name,
      fromSeed: true,
      autoChatPostEnabled: overlay?.autoChatPostEnabled ?? false,
    });
    seen.add(row.sleeperLeagueId);
  }
  for (const row of db) {
    if (seen.has(row.sleeperLeagueId) || excluded.has(row.sleeperLeagueId)) continue;
    result.push({
      sleeperLeagueId: row.sleeperLeagueId,
      slug: row.slug || slugifyLeagueName(row.name),
      name: row.name,
      fromSeed: false,
      autoChatPostEnabled: row.autoChatPostEnabled ?? false,
    });
  }
  return result;
}

export function intersectHostedLeagueIds(
  userLeagueIds: string[],
  hostedIds: Iterable<string>,
): string[] {
  const hosted = new Set(hostedIds);
  return userLeagueIds.filter((id) => hosted.has(id));
}

export function slugifyLeagueName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
