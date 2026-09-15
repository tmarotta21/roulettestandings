import { redirect } from "next/navigation";
import { HOSTED_LEAGUES } from "@/lib/leagues";
import { isAdmin } from "@/lib/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Commissioner</h1>
        <p className="mt-2 text-sm text-emerald-100/70">
          Phase 1 uses the hardcoded league list below. Phase 2: paste Sleeper league IDs
          here (see tournamentleagues `app/admin/page.tsx` + `POST /api/admin/config`).
        </p>
      </div>
      <Card className="border-white/10 bg-[#0d1f14]">
        <CardHeader>
          <CardTitle>Hosted roulette leagues</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {HOSTED_LEAGUES.map((league) => (
              <li key={league.sleeperLeagueId}>
                {league.name}{" "}
                <span className="text-emerald-100/50">{league.sleeperLeagueId}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
