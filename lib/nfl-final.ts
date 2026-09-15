type EspnEvent = {
  status?: { type?: { completed?: boolean; state?: string; name?: string } };
};

type EspnScoreboard = {
  events?: EspnEvent[];
};

const ESPN_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

export async function isNflWeekFinal(
  week: number,
  seasonType = 2,
): Promise<boolean> {
  if (week < 1) return false;
  const url = `${ESPN_SCOREBOARD}?week=${week}&seasontype=${seasonType}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return false;
  const data = (await res.json()) as EspnScoreboard;
  const events = data.events ?? [];
  if (events.length === 0) return false;
  return events.every((event) => {
    const type = event.status?.type;
    return Boolean(
      type?.completed === true ||
        type?.state === "post" ||
        type?.name === "STATUS_FINAL",
    );
  });
}

export async function completedNflWeek(displayWeek: number): Promise<{
  throughWeek: number;
  currentFinal: boolean;
}> {
  const currentFinal = await isNflWeekFinal(displayWeek);
  return {
    currentFinal,
    throughWeek: currentFinal ? displayWeek : Math.max(displayWeek - 1, 0),
  };
}
