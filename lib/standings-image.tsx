import { ImageResponse } from "next/og";
import { pfScale } from "@/lib/colors";
import type { LeagueStandings } from "@/lib/standings";

export const IMAGE_SIZE = 900;

function downloadName(board: LeagueStandings): string {
  return `${board.slug}-${board.season}-w${board.throughWeek}.png`;
}

export function standingsImageResponse(board: LeagueStandings, download = false) {
  const pfs = board.rows.map((row) => row.pf);
  const minPf = pfs.length ? Math.min(...pfs) : 0;
  const maxPf = pfs.length ? Math.max(...pfs) : 1;
  const rowHeight = board.rows.length >= 12 ? 58 : 64;

  return new ImageResponse(
    (
      <div
        style={{
          width: IMAGE_SIZE,
          height: IMAGE_SIZE,
          display: "flex",
          flexDirection: "column",
          background: "#f4f1ea",
          padding: 28,
          fontFamily: "Georgia, Times New Roman, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            border: "2px solid #1f3d1a",
            background: "#fff",
            fontWeight: 700,
            fontSize: 22,
          }}
        >
          <div style={{ width: 10, height: "100%", background: "#1f3d1a" }} />
          <div style={{ flexGrow: 1, padding: "10px 12px" }}>{board.season}</div>
          <div style={{ width: 110, padding: 10, background: "#ffe566", display: "flex", justifyContent: "center" }}>
            WIN
          </div>
          <div style={{ width: 110, padding: 10, background: "#f4b4b4", display: "flex", justifyContent: "center" }}>
            ROU
          </div>
          <div style={{ width: 110, padding: 10, background: "#d9d9d9", display: "flex", justifyContent: "center" }}>
            PTS
          </div>
          <div style={{ width: 130, padding: 10, background: "#c8e6c9", display: "flex", justifyContent: "center" }}>
            PF
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
          {board.rows.map((row) => (
            <div
              key={row.rosterId}
              style={{
                display: "flex",
                alignItems: "center",
                height: rowHeight,
                borderLeft: row.inPlayoffs ? "10px solid #c9a227" : "10px solid #1f3d1a",
                borderRight: "2px solid #1f3d1a",
                borderBottom: "2px solid #1f3d1a",
                background: row.tint,
                fontSize: 22,
              }}
            >
              <div
                style={{
                  flexGrow: 1,
                  padding: "0 12px",
                  fontWeight: row.inPlayoffs ? 800 : 600,
                  display: "flex",
                }}
              >
                {row.username}
              </div>
              <div
                style={{
                  width: 110,
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#ffffff",
                  fontWeight: 700,
                }}
              >
                {row.wins}
              </div>
              <div
                style={{
                  width: 110,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                }}
              >
                {row.rou}
              </div>
              <div
                style={{
                  width: 110,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                }}
              >
                {row.pts}
              </div>
              <div
                style={{
                  width: 130,
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: pfScale(row.pf, minPf, maxPf),
                  fontWeight: 700,
                }}
              >
                {row.pf.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      width: IMAGE_SIZE,
      height: IMAGE_SIZE,
      headers: download
        ? {
            "Content-Disposition": `attachment; filename="${downloadName(board)}"`,
            "Cache-Control": "no-store",
          }
        : { "Cache-Control": "no-store" },
    },
  );
}
