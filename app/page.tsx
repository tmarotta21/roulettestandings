import { redirect } from "next/navigation";
import { UsernameForm } from "@/components/username-form";
import { getUsernameCookie } from "@/lib/username";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  missing: "Enter a Sleeper username.",
  notfound: "That Sleeper username was not found.",
  sleeper: "Could not reach Sleeper. Try again.",
};

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; change?: string }>;
}) {
  const { error, change } = await searchParams;
  const cookie = await getUsernameCookie();
  if (cookie && change !== "1") {
    redirect(`/u/${encodeURIComponent(cookie)}`);
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Roulette standings</h1>
        <p className="mt-2 text-sm text-emerald-100/70">
          Enter your Sleeper username to see History for your Sleeper leagues.
          Roulette standings appear when you play in a hosted league.
        </p>
      </div>
      <UsernameForm
        error={error ? ERRORS[error] ?? "Could not load that username." : null}
        defaultUsername={cookie ?? undefined}
      />
    </div>
  );
}
