"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export function AdminLeagueActions({
  sleeperLeagueId,
  leagueName,
  autoChatPostEnabled,
}: {
  sleeperLeagueId: string;
  leagueName: string;
  autoChatPostEnabled: boolean;
}) {
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [autoPost, setAutoPost] = useState(autoChatPostEnabled);
  const [toggleBusy, setToggleBusy] = useState(false);

  async function postToSleeper() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/sleeper-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sleeperLeagueId }),
      });
      const payload = (await response.json()) as { message?: string; error?: string };
      setMessage(payload.error ?? payload.message ?? "Could not post.");
    } catch {
      setMessage("Could not post to Sleeper.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleAutoPost() {
    if (toggleBusy) return;
    const next = !autoPost;
    setToggleBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/leagues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sleeperLeagueId, autoChatPostEnabled: next }),
      });
      const payload = (await response.json()) as {
        message?: string;
        error?: string;
        autoChatPostEnabled?: boolean;
      };
      if (!response.ok) throw new Error(payload.error ?? "Could not update auto-post.");
      setAutoPost(payload.autoChatPostEnabled ?? next);
      setMessage(payload.message ?? null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not update auto-post.");
    } finally {
      setToggleBusy(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-white/20 text-emerald-50"
          onClick={postToSleeper}
          disabled={busy}
          title="Send this league's standings PNG to Sleeper chat when posting is approved"
        >
          {busy ? "Posting" : "Post to Sleeper"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={autoPost}
          className={
            autoPost
              ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
              : "border-white/20 text-emerald-50"
          }
          onClick={toggleAutoPost}
          disabled={toggleBusy}
          title="Automatically post standings to this league's Sleeper chat after Monday cron, once posting is approved"
        >
          {toggleBusy ? "Saving" : autoPost ? "Auto-post: on" : "Auto-post: off"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-white/20 text-emerald-50"
          onClick={() => setPreview(true)}
        >
          Preview
        </Button>
        <a
          className={buttonVariants()}
          href={`/api/og/${sleeperLeagueId}?download=1`}
        >
          <Download />
          Download
        </a>
      </div>
      {message ? (
        <p className="max-w-xs text-right text-xs text-amber-200/80">{message}</p>
      ) : null}

      {preview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setPreview(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-[min(900px,100%)] flex-col gap-3 overflow-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 text-sm text-emerald-50">
              <p className="font-medium">{leagueName} standings</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/20"
                onClick={() => setPreview(false)}
              >
                Close
              </Button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/og/${encodeURIComponent(sleeperLeagueId)}`}
              alt={`${leagueName} standings preview`}
              className="h-auto w-full rounded-lg bg-[#f4f1ea]"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
