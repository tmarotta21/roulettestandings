import { redirect } from "next/navigation";
import { AdminLeagueActions } from "@/components/admin-league-actions";
import { AdminLeagueForm } from "@/components/admin-league-form";
import { LiveSyncButton } from "@/components/live-sync-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAdmin } from "@/lib/admin";
import { listHostedLeagues } from "@/lib/hosted";
import { maybeRefresh } from "@/lib/maybe-refresh";
import { hasDatabase } from "@/lib/prisma";
import { sleeperChatDecision, chatSkipMessage } from "@/lib/sleeper-chat";
import { loadHostedStandings } from "@/lib/standings";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/login");
  await maybeRefresh();

  const hosted = await listHostedLeagues();
  const hostedById = new Map(hosted.map((league) => [league.sleeperLeagueId, league]));
  const chat = sleeperChatDecision();
  let boards: Awaited<ReturnType<typeof loadHostedStandings>> = [];
  let error: string | null = null;
  try {
    boards = await loadHostedStandings();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load standings";
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Commissioner</h1>
          <p className="mt-2 text-sm text-emerald-100/70">
            Add Sleeper league IDs to the hosted registry. X excludes a league
            from standings. Seed leagues stay as fallback if the database is empty.
          </p>
        </div>
        <LiveSyncButton />
      </div>

      <Card className="border-white/10 bg-[#0d1f14]">
        <CardHeader>
          <CardTitle>Hosted roulette leagues</CardTitle>
        </CardHeader>
        <CardContent>
          {hasDatabase() ? (
            <AdminLeagueForm leagues={hosted} />
          ) : (
            <p className="text-sm text-red-300">
              No Postgres URL in this deployment. Set <code>DATABASE_URL</code> or
              Neon&apos;s <code>DATABASE_URL_UNPOOLED</code> on the Vercel project,
              then redeploy.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-[#0d1f14]">
        <CardHeader>
          <CardTitle>Sleeper chat upload</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-emerald-100/70">
          <p>{chatSkipMessage(chat.reason === "ok" ? "awaiting-approval" : chat.reason)}</p>
          <p className="mt-2">
            Automated posts stay off until you approve sending messages in league
            chats and set <code>SLEEPER_CHAT_POST=1</code> with a captured{" "}
            <code>SLEEPER_TOKEN</code>. Monday cron still generates PNGs.
          </p>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <Card className="border-white/10 bg-[#0d1f14]">
        <CardHeader>
          <CardTitle>League standings images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {boards.map((board) => (
            <div
              key={board.sleeperLeagueId}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 py-3 last:border-b-0 last:pb-0 first:pt-0"
            >
              <div className="min-w-0">
                <p className="font-medium text-emerald-50">{board.name}</p>
                <p className="text-xs text-emerald-100/60">
                  {board.season} · through week {board.throughWeek}
                  {board.currentWeekFinal ? " (current week final)" : " (current week in progress)"}
                  {" · "}
                  top {board.playoffTeams} in playoffs
                </p>
              </div>
              <AdminLeagueActions
                sleeperLeagueId={board.sleeperLeagueId}
                leagueName={board.name}
                autoChatPostEnabled={hostedById.get(board.sleeperLeagueId)?.autoChatPostEnabled ?? false}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
