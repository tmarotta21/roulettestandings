"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { HostedLeagueRecord } from "@/lib/leagues";

export function AdminLeagueForm({ leagues }: { leagues: HostedLeagueRecord[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"add" | "exclude" | null>(null);

  async function addLeague(form: FormData) {
    setBusy("add");
    setError(null);
    setMessage(null);
    try {
      const sleeperLeagueId = String(form.get("sleeperLeagueId") ?? "").trim();
      const res = await fetch("/api/admin/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sleeperLeagueId }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not add league");
      setMessage(data.message ?? "Saved.");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add league");
      setBusy(null);
    }
  }

  async function excludeLeague(sleeperLeagueId: string) {
    setBusy("exclude");
    setError(null);
    try {
      const res = await fetch("/api/admin/leagues", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sleeperLeagueId }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not exclude league");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not exclude league");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          void addLeague(new FormData(event.currentTarget));
        }}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <label htmlFor="sleeperLeagueId" className="text-sm font-medium">
            Sleeper league ID
          </label>
          <Input
            id="sleeperLeagueId"
            name="sleeperLeagueId"
            required
            placeholder="1312897670829862912"
            disabled={busy != null}
          />
        </div>
        <Button type="submit" disabled={busy != null}>
          {busy === "add" ? "Saving" : "Add league"}
        </Button>
      </form>
      <ul className="space-y-2 text-sm">
        {leagues.map((league) => (
          <li key={league.sleeperLeagueId} className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-emerald-100/45 hover:bg-white/10 hover:text-red-300 disabled:opacity-50"
              aria-label={`Exclude ${league.name} from standings`}
              title="Exclude from standings"
              disabled={busy != null}
              onClick={() => void excludeLeague(league.sleeperLeagueId)}
            >
              <X className="size-3.5" />
            </button>
            <span>
              {league.name}{" "}
              <span className="text-emerald-100/50">{league.sleeperLeagueId}</span>
              {league.fromSeed ? (
                <span className="ml-2 text-[11px] uppercase tracking-wide text-emerald-200/60">
                  seed
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {message ? <p className="text-sm text-emerald-200">{message}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
