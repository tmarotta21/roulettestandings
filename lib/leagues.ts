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

export function hostedLeagueIds(): string[] {
  return HOSTED_LEAGUES.map((league) => league.sleeperLeagueId);
}

export function hostedById(sleeperLeagueId: string): HostedLeague | undefined {
  return HOSTED_LEAGUES.find((league) => league.sleeperLeagueId === sleeperLeagueId);
}

export function slugifyLeagueName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
