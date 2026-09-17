import { computeRouletteWeek } from "@/lib/roulette";
import {
  getLeague,
  getLeagueUsers,
  getMatchups,
  getRosters,
  getWinnersBracket,
  liveMatchupPoints,
  pairMatchups,
  settingNumber,
  type SleeperBracketMatch,
} from "@/lib/sleeper";
import { usernameForRoster } from "@/lib/standings";

export type MatchupSideView = {
  rosterId: number;
  username: string;
  points: number;
  matchupId: number | null;
  won: boolean;
  tied: boolean;
  roulette: boolean;
};

export type MatchupPairView = {
  matchupId: number | null;
  sides: MatchupSideView[];
};

export type WeeklyRow = {
  rosterId: number;
  username: string;
  opponentRosterId: number | null;
  opponentUsername: string | null;
  result: "W" | "L" | "T" | null;
  pf: number;
  pa: number | null;
  roulette: boolean;
};

export type BracketMatchView = {
  id: string;
  round: number;
  match: number;
  t1: number | null;
  t2: number | null;
  winner: number | null;
  loser: number | null;
  place: number | null;
};

export type BracketTeamView = {
  sleeperRosterId: number;
  teamName: string | null;
  displayName: string | null;
};

function ownerMaps(
  rosters: { roster_id: number; owner_id?: string | null }[],
) {
  const ownerByRoster = new Map<number, string>();
  for (const roster of rosters) {
    if (roster.owner_id) ownerByRoster.set(roster.roster_id, roster.owner_id);
  }
  return ownerByRoster;
}

export async function loadLeagueMatchups(
  sleeperLeagueId: string,
  week: number,
): Promise<{ pairs: MatchupPairView[]; rows: WeeklyRow[]; playoffWeekStart: number }> {
  const [league, users, rosters, matchups] = await Promise.all([
    getLeague(sleeperLeagueId),
    getLeagueUsers(sleeperLeagueId),
    getRosters(sleeperLeagueId),
    getMatchups(sleeperLeagueId, week),
  ]);
  const ownerByRoster = ownerMaps(rosters);
  const sides = matchups.map((matchup) => {
    const points = liveMatchupPoints(matchup);
    return {
      rosterId: matchup.roster_id,
      username: usernameForRoster(matchup.roster_id, ownerByRoster, users),
      points,
      matchupId: matchup.matchup_id ?? null,
    };
  });
  const weekResults = computeRouletteWeek(sides);
  const rouletteByRoster = new Map(
    weekResults.map((result) => [result.rosterId, result.roulette]),
  );
  const pairs: MatchupPairView[] = pairMatchups(sides).map((pair) => {
    const scored = pair.sides.map((side) => {
      const opp = pair.sides.find((other) => other.rosterId !== side.rosterId);
      let won = false;
      let tied = false;
      if (opp) {
        won = side.points > opp.points;
        tied = side.points === opp.points;
      }
      return {
        ...side,
        won,
        tied,
        roulette: rouletteByRoster.get(side.rosterId) ?? false,
      };
    });
    return { matchupId: pair.matchupId, sides: scored };
  });
  const rows: WeeklyRow[] = pairs.flatMap((pair) =>
    pair.sides.map((side) => {
      const opp = pair.sides.find((other) => other.rosterId !== side.rosterId);
      let result: WeeklyRow["result"] = null;
      if (opp) {
        result = side.won ? "W" : side.tied ? "T" : "L";
      }
      return {
        rosterId: side.rosterId,
        username: side.username,
        opponentRosterId: opp?.rosterId ?? null,
        opponentUsername: opp?.username ?? null,
        result,
        pf: side.points,
        pa: opp?.points ?? null,
        roulette: side.roulette,
      };
    }),
  );
  rows.sort((a, b) => b.pf - a.pf);
  return {
    pairs,
    rows,
    playoffWeekStart: settingNumber(league.settings, "playoff_week_start", 15),
  };
}

export async function loadWinnersBracket(sleeperLeagueId: string): Promise<{
  matches: BracketMatchView[];
  teams: BracketTeamView[];
}> {
  const [bracket, users, rosters] = await Promise.all([
    getWinnersBracket(sleeperLeagueId),
    getLeagueUsers(sleeperLeagueId),
    getRosters(sleeperLeagueId),
  ]);
  const ownerByRoster = ownerMaps(rosters);
  const teams: BracketTeamView[] = rosters.map((roster) => {
    const username = usernameForRoster(roster.roster_id, ownerByRoster, users);
    const owner = users.find((user) => user.user_id === roster.owner_id);
    return {
      sleeperRosterId: roster.roster_id,
      teamName: owner?.metadata?.team_name ?? null,
      displayName: username,
    };
  });
  const matches: BracketMatchView[] = (bracket as SleeperBracketMatch[]).map((match) => ({
    id: `${match.r}-${match.m}`,
    round: match.r,
    match: match.m,
    t1: match.t1 ?? null,
    t2: match.t2 ?? null,
    winner: match.w ?? null,
    loser: match.l ?? null,
    place: match.p ?? null,
  }));
  return { matches, teams };
}
