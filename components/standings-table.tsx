import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatPf } from "@/lib/utils";
import type { StandingRow } from "@/lib/standings";

export const STANDINGS_COLUMNS = [
  { id: "rank", label: "Rank", align: "right" },
  { id: "username", label: "Team", align: "left" },
  { id: "wins", label: "WIN", align: "right" },
  { id: "rou", label: "ROU", align: "right" },
  { id: "pts", label: "PTS", align: "right" },
  { id: "last", label: "LAST", align: "right" },
  { id: "pf", label: "PF", align: "right" },
] as const;

export type StandingsSortColumn = (typeof STANDINGS_COLUMNS)[number]["id"];
export type StandingsSortDir = "asc" | "desc";

export function parseStandingsSort(
  sort?: string,
  dir?: string,
): { column: StandingsSortColumn; direction: StandingsSortDir } {
  const column = STANDINGS_COLUMNS.some((col) => col.id === sort)
    ? (sort as StandingsSortColumn)
    : "pts";
  if (dir === "asc" || dir === "desc") return { column, direction: dir };
  return { column, direction: column === "username" || column === "rank" ? "asc" : "desc" };
}

export function nextStandingsSort(
  clicked: StandingsSortColumn,
  current: StandingsSortColumn,
  direction: StandingsSortDir,
): { column: StandingsSortColumn; direction: StandingsSortDir } {
  if (clicked === current) {
    return { column: clicked, direction: direction === "desc" ? "asc" : "desc" };
  }
  return { column: clicked, direction: clicked === "username" || clicked === "rank" ? "asc" : "desc" };
}

export function ranksByPtsThenPf(rows: StandingRow[]): Map<number, number> {
  const ordered = [...rows].sort(
    (a, b) => b.pts - a.pts || b.pf - a.pf || a.username.localeCompare(b.username, undefined, { sensitivity: "base" }),
  );
  const ranks = new Map<number, number>();
  let index = 0;
  while (index < ordered.length) {
    const current = ordered[index];
    let end = index + 1;
    while (
      end < ordered.length &&
      ordered[end].pts === current.pts &&
      ordered[end].pf === current.pf
    ) {
      end += 1;
    }
    const rank = index + 1;
    for (let i = index; i < end; i++) ranks.set(ordered[i].rosterId, rank);
    index = end;
  }
  return ranks;
}

function valueFor(
  row: StandingRow,
  column: StandingsSortColumn,
  ranks: Map<number, number>,
): string | number {
  if (column === "rank") return ranks.get(row.rosterId) ?? 0;
  if (column === "username") return row.username;
  if (column === "wins") return row.wins;
  if (column === "rou") return row.rou;
  if (column === "pts") return row.pts;
  if (column === "last") return row.last;
  return row.pf;
}

export function sortStandingRows(
  rows: StandingRow[],
  column: StandingsSortColumn,
  direction: StandingsSortDir,
  ranks: Map<number, number>,
): StandingRow[] {
  return [...rows].sort((a, b) => {
    const left = valueFor(a, column, ranks);
    const right = valueFor(b, column, ranks);
    let primary = 0;
    if (typeof left === "string" && typeof right === "string") {
      primary = left.localeCompare(right, undefined, { sensitivity: "base" });
    } else {
      primary = Number(left) - Number(right);
    }
    if (primary !== 0) return direction === "asc" ? primary : -primary;
    if (a.pts !== b.pts) return b.pts - a.pts;
    if (a.pf !== b.pf) return b.pf - a.pf;
    return a.username.localeCompare(b.username, undefined, { sensitivity: "base" });
  });
}

export function standingsSortHref(
  pathname: string,
  query: Record<string, string | undefined>,
  column: StandingsSortColumn,
  direction: StandingsSortDir,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  params.set("sort", column);
  params.set("dir", direction);
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function StandingsTable({
  rows,
  highlightUsername,
  column,
  direction,
  pathname,
  query = {},
}: {
  rows: StandingRow[];
  highlightUsername?: string | null;
  column: StandingsSortColumn;
  direction: StandingsSortDir;
  pathname: string;
  query?: Record<string, string | undefined>;
}) {
  const needle = highlightUsername?.trim().toLowerCase();
  const ranks = ranksByPtsThenPf(rows);
  const sorted = sortStandingRows(rows, column, direction, ranks);

  return (
    <div className="space-y-3">
    <Table>
      <TableHeader>
        <TableRow>
          {STANDINGS_COLUMNS.map((col) => {
            const active = column === col.id;
            const next = nextStandingsSort(col.id, column, direction);
            const marker = !active ? "↕" : direction === "asc" ? "↑" : "↓";
            return (
              <TableHead
                key={col.id}
                className={col.align === "right" ? "text-right" : undefined}
                aria-sort={
                  active ? (direction === "asc" ? "ascending" : "descending") : "none"
                }
              >
                <a
                  href={standingsSortHref(pathname, query, next.column, next.direction)}
                  className={cn(
                    "inline-flex w-full items-center gap-1 rounded-sm hover:text-emerald-50",
                    col.align === "right" ? "justify-end" : "justify-start",
                    active ? "text-emerald-50" : "text-emerald-100/70",
                  )}
                >
                  {col.label}
                  <span className="text-[10px] leading-none opacity-80" aria-hidden>
                    {marker}
                  </span>
                </a>
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => {
          const mine = needle != null && row.username.toLowerCase() === needle;
          return (
            <TableRow
              key={row.rosterId}
              className={cn(
                mine && "bg-emerald-500/35 text-emerald-50",
                !mine && row.inPlayoffs && "bg-amber-400/10",
              )}
            >
              <TableCell className="w-12 text-right tabular-nums text-emerald-100/80">
                {ranks.get(row.rosterId)}
              </TableCell>
              <TableCell className={row.inPlayoffs || mine ? "font-semibold" : undefined}>
                {row.username}
              </TableCell>
              <TableCell className="text-right tabular-nums">{row.wins}</TableCell>
              <TableCell className="text-right tabular-nums">{row.rou}</TableCell>
              <TableCell className="text-right tabular-nums">{row.pts}</TableCell>
              <TableCell className="text-right tabular-nums">
                {row.last > 0 ? `+${row.last}` : row.last}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatPf(row.pf)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    <p className="flex items-center gap-1.5 text-xs text-emerald-100/70">
      <span className="size-2.5 shrink-0 rounded-[2px] bg-amber-400" aria-hidden />
      Playoffs
    </p>
    </div>
  );
}
