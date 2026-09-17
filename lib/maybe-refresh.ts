import { hasDatabase } from "@/lib/prisma";
import { getMeta } from "@/lib/queries";
import { syncAll, syncLiveScores } from "@/lib/sync";

const LIVE_MS = 45 * 1000;
const FULL_MS = 5 * 60 * 1000;

export async function maybeRefresh(): Promise<void> {
  if (!hasDatabase()) return;
  const meta = await getMeta();
  const age = meta?.lastSyncedAt
    ? Date.now() - meta.lastSyncedAt.getTime()
    : Number.POSITIVE_INFINITY;
  if (age < LIVE_MS) return;
  try {
    if (age >= FULL_MS || !meta?.lastSyncedAt) await syncAll();
    else await syncLiveScores();
  } catch {
    // Keep serving the last snapshot if Sleeper is down.
  }
}
