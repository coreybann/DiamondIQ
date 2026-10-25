import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const playerId = request.nextUrl.searchParams.get("id");
  const season =
  request.nextUrl.searchParams.get("season") ??
  String(new Date().getFullYear());
const group =
  request.nextUrl.searchParams.get("group") === "pitching"
    ? "pitching"
    : "hitting";
  if (!playerId || !/^\d+$/.test(playerId)) {
    return NextResponse.json(
      { error: "A valid player ID is required" },
      { status: 400 }
    );
  }

  if (!/^\d{4}$/.test(season)) {
    return NextResponse.json(
      { error: "A valid season is required" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
  `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=season&group=${group}&season=${season}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("MLB API request failed");
    }

    const data = await response.json();
    const stats = data.stats?.[0]?.splits?.[0]?.stat ?? null;

    return NextResponse.json({
  playerId,
  season,
  group,
  stats,
});
  } catch {
    return NextResponse.json(
      { error: "Unable to load player statistics" },
      { status: 500 }
    );
  }
}