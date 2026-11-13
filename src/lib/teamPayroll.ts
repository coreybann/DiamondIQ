import contracts from "../../public/data/mlb-contracts-2026.json";
import verifiedSalaries from "../../public/data/verified-salary-updates-2027.json";
import arbitration from "../../public/data/arbitration-salary-projections-2027.json";
import preArbitration from "../../public/data/pre-arbitration-salary-projections-2027.json";


export type TeamSalaryRecord = {
  player: string;
  mlbPlayerId: number | null;
  teamCode: string;
  contractStatus: string;
  salaryMillions: number | null;
  salaryStatus: string;
  salaryRaw: string;
  source: string;
};

type ContractRecord = {
  player: string;
  mlb_player_id?: number;
  team_code: string;
  contract_status?: string;
  salary_by_year?: Record<
    string,
    {
      raw?: string;
      salary_millions?: number | null;
      status?: string;
    }
  >;
  source?: string;
};

type VerifiedSalaryRecord = {
  mlb_player_id: number;
  player: string;
  team_code: string;
  season: number;
  salary_millions: number;
  source: string;
  verified_date: string;
};

export function getTeamSalaryRecords(
  teamCode: string,
  season = 2027,
  currentRosterIds?: number[]
): TeamSalaryRecord[] {
  const records = contracts.records as ContractRecord[];

  const verifiedRecords =
    season === 2027
      ? verifiedSalaries.records as VerifiedSalaryRecord[]
      : [];

  const verifiedById = new Map(
    verifiedRecords.map((record) => [
      record.mlb_player_id,
      record,
    ])
  );

  const historicalIds = new Set(
    records
      .map((record) => record.mlb_player_id)
      .filter((id): id is number => typeof id === "number")
  );

  const updatedHistorical = records.map((record) => {
    const verified =
      record.mlb_player_id !== undefined
        ? verifiedById.get(record.mlb_player_id)
        : undefined;

    if (!verified) return record;

    return {
      ...record,
      team_code: verified.team_code,
      salary_by_year: {
        ...record.salary_by_year,
        [String(season)]: {
          raw: `$${verified.salary_millions}M`,
          salary_millions: verified.salary_millions,
          status: "salary_listed",
        },
      },
      source: verified.source,
    };
  });

  const newVerifiedRecords: ContractRecord[] =
    verifiedRecords
      .filter((record) => !historicalIds.has(record.mlb_player_id))
      .map((record) => ({
        player: record.player,
        mlb_player_id: record.mlb_player_id,
        team_code: record.team_code,
        contract_status: "Verified salary update",
        salary_by_year: {
          [String(season)]: {
            raw: `$${record.salary_millions}M`,
            salary_millions: record.salary_millions,
            status: "salary_listed",
          },
        },
        source: record.source,
      }));

  return [...updatedHistorical, ...newVerifiedRecords]
    .filter((record) => {
      if (currentRosterIds) {
        return (
          typeof record.mlb_player_id === "number" &&
          currentRosterIds.includes(record.mlb_player_id)
        );
      }

      return (
        record.team_code.toUpperCase() === teamCode.toUpperCase()
      );
    })
    .map((record) => {
      const salary = record.salary_by_year?.[String(season)];

      return {
        player: record.player,
        mlbPlayerId: record.mlb_player_id ?? null,
        teamCode: record.team_code,
        contractStatus: record.contract_status ?? "Unknown",
        salaryMillions: salary?.salary_millions ?? null,
        salaryStatus: salary?.status ?? "unavailable",
        salaryRaw: salary?.raw ?? "",
        source: record.source ?? "",
      };
    })
    .sort((a, b) => {
      const salaryDifference =
        (b.salaryMillions ?? -1) - (a.salaryMillions ?? -1);

      return salaryDifference || a.player.localeCompare(b.player);
    });
}


export type TeamSalaryProjection = {
  player: string;
  mlbPlayerId: number;
  teamCode: string;
  rosterStatus: "current" | "unverified" | "historical";
  category: "arbitration" | "pre_arbitration";
  estimatedSalaryMillions: number;
  method: string;
};

type ProjectionRecord = {
  player: string;
  mlb_player_id: number;
  team_code: string;
  estimated_salary_2027_millions?: number;
  projection_method?: string;
};

export function getTeamSalaryProjections(
  teamCode: string,
  currentRosterIds?: number[]
): TeamSalaryProjection[] {
  const rosterIds = currentRosterIds
    ? new Set(currentRosterIds)
    : null;
  // Listed salaries take priority even when a player changes teams.
  const playersWithListedSalaries = new Set<number>();

  for (const record of contracts.records as ContractRecord[]) {
    const salary = record.salary_by_year?.["2027"];
    const playerId = record.mlb_player_id;

    if (
      typeof playerId === "number" &&
      salary?.status === "salary_listed" &&
      salary.salary_millions !== null &&
      salary.salary_millions !== undefined
    ) {
      playersWithListedSalaries.add(playerId);
    }
  }

  for (
    const record of verifiedSalaries.records as VerifiedSalaryRecord[]
  ) {
    playersWithListedSalaries.add(record.mlb_player_id);
  }

  const datasets = [
    {
      records: arbitration.records as ProjectionRecord[],
      category: "arbitration" as const,
    },
    {
      records: preArbitration.records as ProjectionRecord[],
      category: "pre_arbitration" as const,
    },
  ];

  return datasets
    .flatMap(({ records, category }) =>
      records
        .filter(
          (record) =>
            rosterIds
              ? rosterIds.has(record.mlb_player_id)
              : record.team_code.toUpperCase() === teamCode.toUpperCase()
        )
        .filter(
          (record) =>
            typeof record.estimated_salary_2027_millions === "number"
        )
        .filter(
          (record) =>
            !playersWithListedSalaries.has(record.mlb_player_id)
        )
        .map((record) => ({
          player: record.player,
          mlbPlayerId: record.mlb_player_id,
          teamCode: record.team_code,
          rosterStatus: rosterIds
            ? rosterIds.has(record.mlb_player_id)
              ? "current" as const
              : "unverified" as const
            : "historical" as const,
          category,
          estimatedSalaryMillions:
            record.estimated_salary_2027_millions as number,
          method: record.projection_method ?? "Unknown",
        }))
    )
    .sort(
      (a, b) =>
        b.estimatedSalaryMillions - a.estimatedSalaryMillions
    );
}
