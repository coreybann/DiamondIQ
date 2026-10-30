import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const playerId = request.nextUrl.searchParams.get("id");
  const season = request.nextUrl.searchParams.get("season") ?? "2026";

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
    const url =
      `https://statsapi.mlb.com/api/v1/people/${playerId}/stats` +
      `?stats=statSplits&group=hitting&season=${season}&sitCodes=vl,vr`;

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error("MLB API request failed");
    }

    const data = await response.json();
    const splits = data.stats?.[0]?.splits ?? [];

    const vsLeft = splits.find(
      (item: { split?: { code?: string } }) =>
        item.split?.code === "vl"
    )?.stat ?? null;

    const vsRight = splits.find(
      (item: { split?: { code?: string } }) =>
        item.split?.code === "vr"
    )?.stat ?? null;

    return NextResponse.json({
      playerId,
      season,
      vsLeft,
      vsRight,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load platoon splits" },
      { status: 500 }
    );
  }
}
