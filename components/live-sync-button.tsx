"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LiveSyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function sync() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/live", { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="border-white/20 text-emerald-50"
      onClick={sync}
      disabled={busy}
      title="Pull this week's live scores from Sleeper"
    >
      <RefreshCw className={busy ? "animate-spin" : ""} />
      <span className="hidden sm:inline">{busy ? "Syncing" : "Sync"}</span>
    </Button>
  );
}
