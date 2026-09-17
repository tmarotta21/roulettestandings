"use client";

type YearOption = {
  leagueId: string;
  season: string;
};

export function YearSelect({
  history,
  selectedId,
  username,
  tab,
  week,
  sort,
  dir,
}: {
  history: YearOption[];
  selectedId: string;
  username: string;
  tab: string;
  week?: number;
  sort?: string;
  dir?: string;
}) {
  if (history.length <= 1) return null;
  return (
    <form
      action={`/u/${encodeURIComponent(username)}`}
      method="get"
      className="flex items-center gap-2 text-sm text-emerald-100/80"
    >
      {tab !== "standings" ? <input type="hidden" name="tab" value={tab} /> : null}
      {tab === "weekly" && week ? (
        <input type="hidden" name="week" value={String(week)} />
      ) : null}
      {tab === "standings" && sort ? (
        <input type="hidden" name="sort" value={sort} />
      ) : null}
      {tab === "standings" && dir ? (
        <input type="hidden" name="dir" value={dir} />
      ) : null}
      <label className="flex items-center gap-2">
        Year
        <select
          name="league"
          className="h-8 rounded-lg border border-white/15 bg-[#07140c] px-2 text-white"
          defaultValue={selectedId}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {history.map((league) => (
            <option key={league.leagueId} value={league.leagueId}>
              {league.season}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
