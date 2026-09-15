import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isAdmin } from "@/lib/admin";
import { formatPf } from "@/lib/utils";
import { loadHostedStandings } from "@/lib/standings";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!(await isAdmin())) redirect("/login");

  let boards: Awaited<ReturnType<typeof loadHostedStandings>> = [];
  let error: string | null = null;
  try {
    boards = await loadHostedStandings();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load standings";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Roulette standings</h1>
        <p className="mt-2 text-sm text-emerald-100/70">
          Download a square PNG after the NFL week is final, then paste it into Sleeper
          chat. Automated chat upload is phase 2.
        </p>
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {boards.map((board) => (
        <Card key={board.sleeperLeagueId} className="border-white/10 bg-[#0d1f14]">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-emerald-50">{board.name}</CardTitle>
              <p className="text-xs text-emerald-100/60">
                {board.season} · through week {board.throughWeek}
                {board.currentWeekFinal ? " (current week final)" : " (current week in progress)"}
                {" · "}
                top {board.playoffTeams} in playoffs
              </p>
            </div>
            <a
              className={buttonVariants()}
              href={`/api/og/${board.sleeperLeagueId}?download=1`}
            >
              <Download />
              Download
            </a>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">WIN</TableHead>
                  <TableHead className="text-right">ROU</TableHead>
                  <TableHead className="text-right">PTS</TableHead>
                  <TableHead className="text-right">PF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {board.rows.map((row) => (
                  <TableRow
                    key={row.rosterId}
                    className={row.inPlayoffs ? "bg-amber-400/10" : undefined}
                  >
                    <TableCell className={row.inPlayoffs ? "font-semibold" : undefined}>
                      {row.username}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.wins}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.rou}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.pts}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPf(row.pf)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
