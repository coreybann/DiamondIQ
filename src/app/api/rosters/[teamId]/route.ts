import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const id = Number(teamId);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "Invalid MLB team ID" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/teams/${id}/roster?rosterType=active`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      throw new Error("MLB roster request failed");
    }

    const data = await response.json();

    const players = (data.roster ?? []).map(
      (entry: {
        person: { id: number; fullName: string };
        jerseyNumber?: string;
        position?: { abbreviation?: string; name?: string };
      }) => ({
        id: entry.person.id,
        name: entry.person.fullName,
        number: entry.jerseyNumber ?? null,
        position:
          entry.position?.abbreviation ??
          entry.position?.name ??
          "N/A",
      })
    );

    return NextResponse.json({ players });
  } catch {
    return NextResponse.json(
      { error: "Unable to load this team's roster" },
      { status: 502 }
    );
  }
}
