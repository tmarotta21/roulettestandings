import { loadLeagueStandings } from "../lib/standings";
import { SHADYNASTY_2025_ID } from "../lib/leagues";

async function main() {
  const board = await loadLeagueStandings(SHADYNASTY_2025_ID);
  console.log(
    JSON.stringify(
      {
        name: board.name,
        season: board.season,
        throughWeek: board.throughWeek,
        playoffTeams: board.playoffTeams,
        top: board.rows.slice(0, 6).map((row) => ({
          username: row.username,
          wins: row.wins,
          rou: row.rou,
          pts: row.pts,
          pf: Number(row.pf.toFixed(1)),
          inPlayoffs: row.inPlayoffs,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

