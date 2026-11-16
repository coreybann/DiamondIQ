type MLBAffiliate = {
  id: number;
  name: string;
  parentOrgId?: number;
  sport?: {
    id?: number;
  };
};

type MLBTeamsResponse = {
  teams?: MLBAffiliate[];
};

export type GMMinorLeagueAffiliate = {
  id: number;
  name: string;
  organizationId: number;
  sportId: number;
};

const LEVELS = [11, 12, 13, 14, 16];

export async function loadMinorLeagueAffiliates(
  organizationIds: number[]
): Promise<GMMinorLeagueAffiliate[]> {
  const validOrganizations = new Set(organizationIds);

  const results = await Promise.all(
    LEVELS.map(async (sportId) => {
      const params = new URLSearchParams({
        sportId: String(sportId),
        season: "2026",
      });

      const response = await fetch(
        `https://statsapi.mlb.com/api/v1/teams?${params}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load minor-league affiliates for level ${sportId}.`
        );
      }

      const data = (await response.json()) as MLBTeamsResponse;

      if (!Array.isArray(data.teams)) {
        throw new Error(
          `Invalid affiliate response for level ${sportId}.`
        );
      }

      return data.teams
        .filter(
          (team) =>
            Number.isInteger(team.id) &&
            typeof team.name === "string" &&
            typeof team.parentOrgId === "number" &&
            validOrganizations.has(team.parentOrgId)
        )
        .map((team) => ({
          id: team.id,
          name: team.name,
          organizationId: team.parentOrgId as number,
          sportId,
        }));
    })
  );

  const affiliates = results.flat();

  const ids = new Set<number>();

  for (const affiliate of affiliates) {
    if (ids.has(affiliate.id)) {
      throw new Error(
        `Duplicate minor-league affiliate: ${affiliate.id}.`
      );
    }

    ids.add(affiliate.id);
  }

  return affiliates;
}
