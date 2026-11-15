import type { GMTeam } from "./universeTypes";

type MLBTeamResponse = {
  teams?: {
    id: number;
    name: string;
    abbreviation: string;
  }[];
};

export async function loadMLBTeams(): Promise<GMTeam[]> {
  const response = await fetch(
    "https://statsapi.mlb.com/api/v1/teams?sportId=1&season=2026",
    {
      next: { revalidate: 86400 },
    }
  );

  if (!response.ok) {
    throw new Error("Unable to retrieve MLB teams for Play GM.");
  }

  const data = (await response.json()) as MLBTeamResponse;

  const teams = (data.teams ?? []).map((team) => ({
    id: team.id,
    name: team.name,
    abbreviation: team.abbreviation,
    playerIds: [],
    payrollMillions: 0,
    payrollKnown: false,
  }));

  if (
    teams.length !== 30 ||
    new Set(teams.map((team) => team.id)).size !== 30 ||
    teams.some(
      (team) =>
        !Number.isInteger(team.id) ||
        !team.name ||
        !team.abbreviation
    )
  ) {
    throw new Error("Invalid MLB team data for Play GM.");
  }

  return teams.sort((a, b) => a.name.localeCompare(b.name));
}
