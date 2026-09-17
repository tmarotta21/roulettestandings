import { getPrisma, hasDatabase } from "@/lib/prisma";
import {
  HOSTED_LEAGUES,
  mergeHostedLeagues,
  type HostedLeagueRecord,
} from "@/lib/leagues";
import { walkPreviousLeagues } from "@/lib/sleeper";

export async function listHostedLeagues(): Promise<HostedLeagueRecord[]> {
  if (!hasDatabase()) {
    return mergeHostedLeagues(HOSTED_LEAGUES, []);
  }
  const prisma = getPrisma();
  const [rows, excluded] = await Promise.all([
    prisma.league.findMany({
      orderBy: { createdAt: "asc" },
      select: { sleeperLeagueId: true, slug: true, name: true },
    }),
    prisma.excludedLeague.findMany({
      select: { sleeperLeagueId: true },
    }),
  ]);
  return mergeHostedLeagues(
    HOSTED_LEAGUES,
    rows,
    excluded.map((row) => row.sleeperLeagueId),
  );
}

export async function isAllowedLeague(sleeperLeagueId: string): Promise<boolean> {
  const hosted = await listHostedLeagues();
  if (hosted.some((league) => league.sleeperLeagueId === sleeperLeagueId)) {
    return true;
  }
  for (const league of hosted) {
    const chain = await walkPreviousLeagues(league.sleeperLeagueId);
    if (chain.some((row) => row.league_id === sleeperLeagueId)) return true;
  }
  return false;
}
