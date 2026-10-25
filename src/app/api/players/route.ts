
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams
    .get("search")
    ?.trim();

  if (!search || search.length < 2) {
    return NextResponse.json({ players: [] });
  }

  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(search)}&hydrate=currentTeam`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("MLB API request failed");
    }

    const data = await response.json();

    const players = (data.people ?? []).map(
      (player: {
        id: number;
        fullName: string;
        primaryPosition?: { abbreviation: string };
        currentTeam?: { name: string };
      }) => ({
        id: player.id,
        name: player.fullName,
        position: player.primaryPosition?.abbreviation ?? "N/A",
        team: player.currentTeam?.name ?? "N/A",
      })
    );

    return NextResponse.json({ players });
  } catch {
    return NextResponse.json(
      { error: "Unable to search players" },
      { status: 502 }
    );
  }
}
