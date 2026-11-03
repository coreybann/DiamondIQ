import { NextRequest, NextResponse } from "next/server";

export const revalidate = 3600;

const ALLOWED_LEVELS = new Set([11, 12, 13, 14]);

type StatSplit = {
  player?: { id?: number; fullName?: string };
  team?: { id?: number; name?: string };
  stat?: Record<string, unknown>;
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const season = Number(params.get("season") ?? "2026");
  const level = Number(params.get("level") ?? "11");
  const group = params.get("group") ?? "hitting";

  if (
    !Number.isInteger(season) ||
    season < 2000 ||
    season > 2100 ||
    !ALLOWED_LEVELS.has(level) ||
    !["hitting", "pitching"].includes(group)
  ) {
    return NextResponse.json(
      { error: "Invalid leaderboard parameters" },
      { status: 400 }
    );
  }

  try {
    const query = new URLSearchParams({
      stats: "season",
      group,
      sportIds: String(level),
      season: String(season),
      playerPool: "ALL",
      limit: "5000",
    });

    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/stats?${query}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      throw new Error("MLB statistics request failed");
    }

    const data = await response.json();

    const splits: StatSplit[] = data.stats?.[0]?.splits ?? [];

    const players = splits
      .filter((split) => split.player?.id && split.stat)
      .map((split) => ({
        id: split.player!.id,
        name: split.player?.fullName ?? "Unknown",
        teamId: split.team?.id ?? null,
        team: split.team?.name ?? "Unknown",
        stats: split.stat,
      }));

    return NextResponse.json({
      season,
      level,
      group,
      count: players.length,
      players,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to retrieve minor-league leaderboard data" },
      { status: 502 }
    );
  }
}
