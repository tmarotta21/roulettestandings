import { scoreFromStats } from "@/lib/history";
import {
  asStringIds,
  liveMatchupPoints,
  type SleeperMatchup,
  type SleeperNflPlayer,
  type SleeperProjection,
} from "@/lib/sleeper";

export type BoxScorePlayerRow = {
  playerId: string;
  name: string;
  position: string | null;
  points: number;
  projected: number | null;
};

export type BoxScoreSideView = {
  rosterId: number;
  username: string;
  total: number;
  projectedTotal: number | null;
  starters: BoxScorePlayerRow[];
  bench: BoxScorePlayerRow[];
};

function projectionStats(
  projections: SleeperProjection[],
): Map<string, Record<string, number>> {
  const map = new Map<string, Record<string, number>>();
  for (const row of projections) {
    if (!row.player_id || !row.stats) continue;
    map.set(row.player_id, row.stats);
  }
  return map;
}

function playerLabel(player: SleeperNflPlayer | undefined, playerId: string): string {
  const full = [player?.first_name, player?.last_name].filter(Boolean).join(" ").trim();
  return full || playerId;
}

function playerPoints(
  matchup: SleeperMatchup,
  playerId: string,
  starterIndex: number | null,
): number {
  if (
    starterIndex != null &&
    matchup.starters_points &&
    matchup.starters_points[starterIndex] != null
  ) {
    return matchup.starters_points[starterIndex] ?? 0;
  }
  return matchup.players_points?.[playerId] ?? 0;
}

function buildPlayerRow(
  playerId: string,
  matchup: SleeperMatchup,
  starterIndex: number | null,
  players: Record<string, SleeperNflPlayer>,
  projectedStats: Map<string, Record<string, number>>,
  scoring: Record<string, number>,
): BoxScorePlayerRow {
  const player = players[playerId];
  return {
    playerId,
    name: playerLabel(player, playerId),
    position: player?.position ?? null,
    points: playerPoints(matchup, playerId, starterIndex),
    projected: scoreFromStats(projectedStats.get(playerId), scoring),
  };
}

export function buildBoxScoreSide(
  matchup: SleeperMatchup,
  username: string,
  players: Record<string, SleeperNflPlayer>,
  projections: SleeperProjection[],
  scoring: Record<string, number>,
): BoxScoreSideView {
  const projectedStats = projectionStats(projections);
  const starterIds = asStringIds(matchup.starters);
  const starterSet = new Set(starterIds);
  const starters = starterIds.map((id, index) =>
    buildPlayerRow(id, matchup, index, players, projectedStats, scoring),
  );
  const bench = asStringIds(matchup.players)
    .filter((id) => !starterSet.has(id))
    .map((id) => buildPlayerRow(id, matchup, null, players, projectedStats, scoring));
  const projectedValues = starters
    .map((row) => row.projected)
    .filter((value): value is number => value != null);
  return {
    rosterId: matchup.roster_id,
    username,
    total: liveMatchupPoints(matchup),
    projectedTotal:
      projectedValues.length === 0
        ? null
        : projectedValues.reduce((sum, value) => sum + value, 0),
    starters,
    bench,
  };
}
