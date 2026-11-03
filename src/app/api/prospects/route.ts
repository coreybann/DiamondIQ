import { NextRequest, NextResponse } from "next/server";

type MLBRosterPlayer = {
  person?: {
    id?: number;
    fullName?: string;
  };
  position?: {
    abbreviation?: string;
  };
};

export async function GET(request: NextRequest) {
  const teamId = Number(
    request.nextUrl.searchParams.get("teamId") ?? "531"
  );

  const season = Number(
    request.nextUrl.searchParams.get("season") ?? "2026"
  );

  if (
    !Number.isInteger(teamId) ||
    teamId <= 0 ||
    !Number.isInteger(season) ||
    season < 2000 ||
    season > 2100
  ) {
    return NextResponse.json(
      { error: "Invalid team or season" },
      { status: 400 }
    );
  }

  try {
    const url =
      `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster` +
      `?rosterType=fullSeason&season=${season}`;

    const response = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error("MLB minor-league roster request failed");
    }

    const data = await response.json();

    const players = (data.roster ?? []).map(
      (player: MLBRosterPlayer) => ({
        id: player.person?.id ?? 0,
        name: player.person?.fullName ?? "Unknown",
        position: player.position?.abbreviation ?? "N/A",
      })
    );

    return NextResponse.json({
      teamId,
      season,
      count: players.length,
      players,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to retrieve minor-league players" },
      { status: 502 }
    );
  }
}
