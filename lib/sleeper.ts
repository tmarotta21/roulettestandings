const SLEEPER_BASE = "https://api.sleeper.app/v1";

export class SleeperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SleeperError";
  }
}

async function sleeperGet<T>(path: string): Promise<T> {
  const res = await fetch(`${SLEEPER_BASE}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new SleeperError(`Sleeper ${path} failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export type SleeperUser = {
  user_id: string;
  username?: string;
  display_name?: string;
  avatar?: string;
};

export type SleeperLeague = {
  league_id: string;
  name: string;
  season: string;
  status?: string;
  avatar?: string;
  total_rosters?: number;
  previous_league_id?: string | null;
  roster_positions?: string[];
  settings?: Record<string, unknown>;
  scoring_settings?: Record<string, number>;
};

export type SleeperRoster = {
  roster_id: number;
  owner_id?: string | null;
  players?: string[] | null;
  starters?: string[] | null;
  reserve?: string[] | null;
  settings?: {
    wins?: number;
    losses?: number;
    ties?: number;
    fpts?: number;
    fpts_decimal?: number;
  };
};

export type SleeperLeagueUser = {
  user_id: string;
  username?: string;
  display_name?: string;
  avatar?: string;
  is_owner?: boolean;
  metadata?: { team_name?: string };
};

export type SleeperMatchup = {
  roster_id: number;
  matchup_id?: number | null;
  points?: number;
  starters?: string[] | null;
  players?: string[] | null;
  starters_points?: number[] | null;
  players_points?: Record<string, number> | null;
};

export type SleeperBracketMatch = {
  r: number;
  m: number;
  t1?: number | null;
  t2?: number | null;
  w?: number | null;
  l?: number | null;
  p?: number;
};

export type SleeperNflState = {
  week?: number;
  season?: string;
  season_type?: string;
  display_week?: number;
};

export type SleeperNflPlayer = {
  player_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  position?: string | null;
  team?: string | null;
};

export type SleeperProjection = {
  player_id?: string;
  stats?: Record<string, number> | null;
};

const PLAYERS_REVALIDATE_SECONDS = 60 * 60 * 24;

export function asStringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item !== "0");
}

export function liveMatchupPoints(
  matchup:
    | {
        points?: number | null;
        starters?: string[] | null;
        starters_points?: number[] | null;
        players_points?: Record<string, number> | null;
      }
    | null
    | undefined,
): number {
  if (!matchup) return 0;
  const starters = asStringIds(matchup.starters);
  const fromCard = matchup.points ?? 0;
  const fromStarters = (matchup.starters_points ?? []).reduce(
    (sum, value) => sum + (value ?? 0),
    0,
  );
  const playerPts = matchup.players_points ?? {};
  const fromPlayers = starters.reduce((sum, id) => sum + (playerPts[id] ?? 0), 0);
  return Math.max(fromCard, fromStarters, fromPlayers);
}

export function pairMatchups<T extends { matchupId: number | null; rosterId?: number }>(
  sides: T[],
): { matchupId: number | null; sides: T[] }[] {
  const groups = new Map<string, T[]>();
  sides.forEach((side, index) => {
    const key =
      side.matchupId == null
        ? `solo-${side.rosterId ?? index}`
        : String(side.matchupId);
    const list = groups.get(key) ?? [];
    list.push(side);
    groups.set(key, list);
  });
  return Array.from(groups.entries()).map(([key, grouped]) => ({
    matchupId: key.startsWith("solo-") ? null : Number(key),
    sides: grouped,
  }));
}

export async function getNflState(): Promise<SleeperNflState> {
  return sleeperGet<SleeperNflState>("/state/nfl");
}

export async function getLeague(leagueId: string): Promise<SleeperLeague> {
  return sleeperGet<SleeperLeague>(`/league/${encodeURIComponent(leagueId)}`);
}

export async function getRosters(leagueId: string): Promise<SleeperRoster[]> {
  const data = await sleeperGet<SleeperRoster[] | null>(
    `/league/${encodeURIComponent(leagueId)}/rosters`,
  );
  return data ?? [];
}

export async function getLeagueUsers(
  leagueId: string,
): Promise<SleeperLeagueUser[]> {
  const data = await sleeperGet<SleeperLeagueUser[] | null>(
    `/league/${encodeURIComponent(leagueId)}/users`,
  );
  return data ?? [];
}

export async function getMatchups(
  leagueId: string,
  week: number,
): Promise<SleeperMatchup[]> {
  const data = await sleeperGet<SleeperMatchup[] | null>(
    `/league/${encodeURIComponent(leagueId)}/matchups/${week}`,
  );
  return data ?? [];
}

export async function getWinnersBracket(
  leagueId: string,
): Promise<SleeperBracketMatch[]> {
  const data = await sleeperGet<SleeperBracketMatch[] | null>(
    `/league/${encodeURIComponent(leagueId)}/winners_bracket`,
  );
  return data ?? [];
}

export async function getUser(usernameOrId: string): Promise<SleeperUser> {
  return sleeperGet<SleeperUser>(`/user/${encodeURIComponent(usernameOrId)}`);
}

export async function getUserLeagues(
  userId: string,
  season: string,
): Promise<SleeperLeague[]> {
  const data = await sleeperGet<SleeperLeague[] | null>(
    `/user/${encodeURIComponent(userId)}/leagues/nfl/${encodeURIComponent(season)}`,
  );
  return data ?? [];
}

/** Sleeper uses `"0"` (not null) when a league has no predecessor. */
export function normalizeSleeperLeagueId(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  if (!id || id === "0") return null;
  return id;
}

export async function walkPreviousLeagues(
  leagueId: string,
  maxSeasons = 20,
): Promise<SleeperLeague[]> {
  const leagues: SleeperLeague[] = [];
  const seen = new Set<string>();
  let cursor = normalizeSleeperLeagueId(leagueId);
  while (cursor && !seen.has(cursor) && leagues.length < maxSeasons) {
    seen.add(cursor);
    const league = await getLeague(cursor);
    leagues.push(league);
    cursor = normalizeSleeperLeagueId(league.previous_league_id);
  }
  return leagues;
}

export function combinedPoints(whole?: number, decimal?: number): number {
  return (whole ?? 0) + (decimal ?? 0) / 100;
}

export function settingNumber(
  settings: Record<string, unknown> | undefined,
  key: string,
  fallback: number,
): number {
  const value = settings?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function nflDisplayWeek(state: SleeperNflState): number {
  return state.display_week ?? state.week ?? 1;
}

export function sleeperAvatarUrl(avatar?: string | null): string | null {
  if (!avatar) return null;
  return `https://sleepercdn.com/avatars/thumbs/${avatar}`;
}

export async function getNflPlayers(): Promise<Record<string, SleeperNflPlayer>> {
  const res = await fetch(`${SLEEPER_BASE}/players/nfl`, {
    headers: { Accept: "application/json" },
    next: { revalidate: PLAYERS_REVALIDATE_SECONDS },
  });
  if (!res.ok) {
    throw new SleeperError(`Sleeper /players/nfl failed (${res.status})`);
  }
  const data = (await res.json()) as Record<string, SleeperNflPlayer> | null;
  return data ?? {};
}

function projectionsFromPayload(
  data: SleeperProjection[] | Record<string, SleeperProjection> | null,
): SleeperProjection[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return Object.entries(data).map(([playerId, row]) => ({
    player_id: row.player_id ?? playerId,
    stats: row.stats,
  }));
}

export async function getWeekProjections(
  season: string,
  week: number,
): Promise<SleeperProjection[]> {
  const data = await sleeperGet<
    SleeperProjection[] | Record<string, SleeperProjection> | null
  >(
    `/projections/nfl/regular/${encodeURIComponent(season)}/${week}`,
  );
  return projectionsFromPayload(data);
}
