import { NextResponse } from "next/server";

type MLBTeam = {
  id: number;
  name: string;
  parentOrgId?: number;
  parentOrgName?: string;
  sport?: { id: number };
};

const levels = [
  { id: 11, name: "Triple-A" },
  { id: 12, name: "Double-A" },
  { id: 13, name: "High-A" },
  { id: 14, name: "Single-A" },
];

export async function GET() {
  try {
    const results = await Promise.all(
      levels.map(async (level) => {
        const response = await fetch(
          `https://statsapi.mlb.com/api/v1/teams?sportId=${level.id}`,
          { next: { revalidate: 86400 } }
        );

        if (!response.ok) {
          throw new Error(`Unable to load ${level.name} teams`);
        }

        const data = await response.json();

        return (data.teams ?? []).map((team: MLBTeam) => ({
          id: team.id,
          name: team.name,
          organizationId: team.parentOrgId,
          organization: team.parentOrgName,
          level: level.name,
          sportId: level.id,
        }));
      })
    );

    const affiliates = results
      .flat()
      .filter(
        (team) =>
          typeof team.organizationId === "number"
      );

    const organizations = Array.from(
      new Map(
        affiliates.map((team) => [
          team.organizationId,
          {
            id: team.organizationId,
            name: team.organization,
          },
        ])
      ).values()
    ).sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      organizations,
      levels,
      affiliates,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to retrieve minor-league affiliates" },
      { status: 502 }
    );
  }
}
