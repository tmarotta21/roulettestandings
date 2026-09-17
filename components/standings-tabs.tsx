import { cn } from "@/lib/utils";

const TABS = [
  { id: "standings", label: "Standings" },
  { id: "weekly", label: "Weekly" },
  { id: "bracket", label: "Bracket" },
  { id: "history", label: "History" },
] as const;

export type StandingsTab = (typeof TABS)[number]["id"];

export function isStandingsTab(value: string | undefined): value is StandingsTab {
  return (
    value === "standings" ||
    value === "weekly" ||
    value === "bracket" ||
    value === "history"
  );
}

export const HISTORY_SUBTABS = ["h2h", "all-time", "seasons"] as const;
export type HistorySubtab = (typeof HISTORY_SUBTABS)[number];

export function isHistorySubtab(value: string | undefined): value is HistorySubtab {
  return value === "h2h" || value === "all-time" || value === "seasons";
}

export function StandingsTabs({
  selected,
  hrefFor,
}: {
  selected: StandingsTab;
  hrefFor: (tab: StandingsTab) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-white/10 pb-2">
      {TABS.map((tab) => (
        <a
          key={tab.id}
          href={hrefFor(tab.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm",
            tab.id === selected
              ? "bg-emerald-500/30 text-white"
              : "text-emerald-100/70 hover:bg-white/10 hover:text-emerald-50",
          )}
        >
          {tab.label}
        </a>
      ))}
    </div>
  );
}
