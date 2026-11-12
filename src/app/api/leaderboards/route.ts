import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const season = request.nextUrl.searchParams.get("season") ?? "2026";
  const group = request.nextUrl.searchParams.get("group") ?? "hitting";

  const year = Number(season);
  const currentYear = new Date().getFullYear();

  if (
    !/^\d{4}$/.test(season) ||
    year < 2000 ||
    year > currentYear
  ) {
    return NextResponse.json(
      { error: "Invalid season" },
      { status: 400 }
    );
  }

  if (group !== "hitting" && group !== "pitching") {
    return NextResponse.json(
      { error: "Invalid statistic group" },
      { status: 400 }
    );
  }

  try {
    const params = new URLSearchParams({
      stats: "season",
      group,
      season,
      playerPool: "ALL",
      gameType: "R",
      limit: "5000",
    });

    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/stats?${params}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      throw new Error("MLB Stats API request failed");
    }

    const data = await response.json();
    const splits = data.stats?.[0]?.splits ?? [];

    const players = splits
      .filter(
        (entry: any) =>
          entry.player?.id &&
          entry.stat
      )
      .map((entry: any) => ({
        id: entry.player.id,
        name: entry.player.fullName,
        teamId: entry.team?.id ?? null,
        teamName: entry.team?.name ?? "Unknown",
        stats: {
          ...entry.stat,
          ...(group === "hitting"
            ? {
                iso:
                  Number.isFinite(Number(entry.stat.slg)) &&
                  Number.isFinite(Number(entry.stat.avg))
                    ? (
                        Number(entry.stat.slg) -
                        Number(entry.stat.avg)
                      ).toFixed(3)
                    : null,
                strikeoutRate:
                  Number(entry.stat.plateAppearances) > 0
                    ? (
                        (Number(entry.stat.strikeOuts ?? 0) /
                          Number(entry.stat.plateAppearances)) *
                        100
                      ).toFixed(1)
                    : null,
                walkRate:
                  Number(entry.stat.plateAppearances) > 0
                    ? (
                        (Number(entry.stat.baseOnBalls ?? 0) /
                          Number(entry.stat.plateAppearances)) *
                        100
                      ).toFixed(1)
                    : null,
              }
            : {
                strikeoutRate:
                  Number(entry.stat.battersFaced) > 0
                    ? (
                        (Number(entry.stat.strikeOuts ?? 0) /
                          Number(entry.stat.battersFaced)) *
                        100
                      ).toFixed(1)
                    : null,
                walkRate:
                  Number(entry.stat.battersFaced) > 0
                    ? (
                        (Number(entry.stat.baseOnBalls ?? 0) /
                          Number(entry.stat.battersFaced)) *
                        100
                      ).toFixed(1)
                    : null,
              }),
        },
      }));

    return NextResponse.json({
      season: year,
      group,
      count: players.length,
      players,
    });
  } catch (error) {
    console.error("Leaderboard API error:", error);

    return NextResponse.json(
      { error: "Unable to load MLB leaderboards" },
      { status: 500 }
    );
  }
}
