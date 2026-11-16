import type { GMPlayer } from "./universeTypes";
import type { GMMinorLeagueAffiliate } from "./loadMinorLeagueAffiliates";

type MinorLeagueRosterEntry = {
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
};

type MinorLeagueRosterResponse = {
  roster?: MinorLeagueRosterEntry[];
};

const START_DATE = "2026-11-14";

export async function loadMinorLeaguePlayers(
  affiliates: GMMinorLeagueAffiliate[],
  existingPlayers: GMPlayer[]
): Promise<GMPlayer[]> {
  const existingById = new Map(
    existingPlayers.map((player) => [player.id, player])
  );

  const addedIds = new Set<number>();

  const rosters = await Promise.all(
    affiliates.map(async (affiliate) => {
      const params = new URLSearchParams({
        rosterType: "active",
        date: START_DATE,
        hydrate: "person",
      });

      const response = await fetch(
        `https://statsapi.mlb.com/api/v1/teams/${affiliate.id}/roster?${params}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load minor-league roster for ${affiliate.name}.`
        );
      }

      const data =
        (await response.json()) as MinorLeagueRosterResponse;

      if (!Array.isArray(data.roster)) {
        throw new Error(
          `Invalid minor-league roster for ${affiliate.name}.`
        );
      }

      return {
        affiliate,
        players: data.roster,
      };
    })
  );

  const players: GMPlayer[] = [];

  for (const roster of rosters) {
    for (const entry of roster.players) {
      const id = entry.person?.id;
      const name = entry.person?.fullName;

      if (!Number.isInteger(id) || !id || !name) {
        throw new Error(
          `Invalid minor-league player for ${roster.affiliate.name}.`
        );
      }

      const existing = existingById.get(id);

      if (existing) {
        // Preserve MLB 40-man assignments when minor-league
        // affiliate snapshots contain outdated information.
        if (existing.onFortyMan) {
          continue;
        }

        if (
          existing.organizationId !== null &&
          existing.organizationId !== roster.affiliate.organizationId
        ) {
          throw new Error(
            `Conflicting organization for ${name} (${id}): ` +
            `${existing.organizationId} vs ${roster.affiliate.organizationId}.`
          );
        }

        // Preserve existing MLB roster assignments.
        // Unassigned free-agent conflicts require separate review.
        if (existing.organizationId === null) {
          throw new Error(
            `Minor-league/free-agent conflict for ${name} (${id}).`
          );
        }

        continue;
      }

      if (addedIds.has(id)) {
        throw new Error(
          `Duplicate minor-league player ID: ${id}.`
        );
      }

      addedIds.add(id);

      players.push({
        id,
        name,
        age: entry.person?.currentAge ?? null,
        position: entry.position?.abbreviation ?? "N/A",
        bats: entry.person?.batSide?.code ?? "—",
        throws: entry.person?.pitchHand?.code ?? "—",

        organizationId: roster.affiliate.organizationId,
        rosterStatus: "minor-league",
        onFortyMan: false,
        onActiveRoster: false,

        salaryMillions: null,
        salaryType: "unknown",
        contractStatus: "Minor-league contract (unverified)",

        prospectProjectionScore: null,
        prospectDevelopmentScore: null,
      });
    }
  }

  return players;
}
