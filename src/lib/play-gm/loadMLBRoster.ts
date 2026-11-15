import type { GMPlayer } from "./universeTypes";

type MLBRosterEntry = {
  person?: {
    id?: number;
    fullName?: string;
    currentAge?: number;
    batSide?: { code?: string };
    pitchHand?: { code?: string };
  };
  position?: {
    abbreviation?: string;
  };
  status?: {
    description?: string;
  };
};

type MLBRosterResponse = {
  roster?: MLBRosterEntry[];
};

export async function loadMLBRoster(
  teamId: number
): Promise<GMPlayer[]> {
  if (!Number.isInteger(teamId) || teamId <= 0) {
    throw new Error("Invalid MLB team ID.");
  }

  const params = new URLSearchParams({
    rosterType: "40Man",
    date: "2026-11-14",
    hydrate: "person",
  });

  const response = await fetch(
    `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?${params}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error(
      `Unable to retrieve Play GM roster for team ${teamId}.`
    );
  }

  const data = (await response.json()) as MLBRosterResponse;

  if (!Array.isArray(data.roster)) {
    throw new Error(
      `Invalid roster response for team ${teamId}.`
    );
  }

  const players = data.roster.map((entry) => {
    const id = entry.person?.id;
    const name = entry.person?.fullName;

    if (
      !Number.isInteger(id) ||
      !id ||
      !name
    ) {
      throw new Error(
        `Invalid player on team ${teamId}.`
      );
    }

    const status = entry.status?.description ?? "Unknown";

    return {
      id,
      name,
      age: entry.person?.currentAge ?? null,
      position: entry.position?.abbreviation ?? "N/A",
      bats: entry.person?.batSide?.code ?? "—",
      throws: entry.person?.pitchHand?.code ?? "—",
      organizationId: teamId,
      rosterStatus:
        status.toLowerCase().includes("injured")
          ? "injured" as const
          : "40-man" as const,
      onFortyMan: true,
      onActiveRoster: false,
      salaryMillions: null,
      salaryType: "unknown" as const,
      contractStatus: "Unknown",
      prospectProjectionScore: null,
      prospectDevelopmentScore: null,
    };
  });

  if (
    new Set(players.map((player) => player.id)).size !==
    players.length
  ) {
    throw new Error(
      `Duplicate player IDs on team ${teamId}.`
    );
  }

  return players;
}
