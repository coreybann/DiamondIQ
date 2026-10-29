
import { NextRequest, NextResponse } from "next/server";

type RosterEntry = {
  person: {
    id: number;
    fullName: string;
  };
  jerseyNumber?: string;
  position?: {
    abbreviation: string;
  };
};

export async function GET(request: NextRequest) {
  const teamId = Number(
    request.nextUrl.searchParams.get("teamId")
  );

  if (!Number.isInteger(teamId) || teamId <= 0) {
    return NextResponse.json(
      { error: "Invalid team ID" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=active&hydrate=person`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("Unable to load roster");
    }

    const data = await response.json();

    const players = (data.roster ?? [])
      .map((entry: RosterEntry) => ({
        id: entry.person.id,
        name: entry.person.fullName,
        number: entry.jerseyNumber ?? null,
        position: entry.position?.abbreviation ?? "N/A",
      }))
      .filter(
        (player: { position: string }) =>
          !["P", "SP", "RP", "TWP"].includes(
            player.position
          )
      )
      .sort(
        (a: { name: string }, b: { name: string }) =>
          a.name.localeCompare(b.name)
      );

    return NextResponse.json({ players });
  } catch {
    return NextResponse.json(
      { error: "Unable to load MLB roster" },
      { status: 500 }
    );
  }
}
