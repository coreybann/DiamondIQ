import type { RelieverStats } from "./relieverRanking";

type PitchingSplit = {
  team?: {
    id?: number;
  };
  stat?: RelieverStats;
};

type PitchingStatsResponse = {
  stats?: {
    splits?: PitchingSplit[];
  }[];
};

export function getTeamRelieverStats(
  data: PitchingStatsResponse,
  teamId: number
): RelieverStats | null {
  if (!Number.isInteger(teamId) || teamId <= 0) {
    return null;
  }

  const splits = (data.stats ?? []).flatMap(
    (group) => group.splits ?? []
  );

  const teamSplit = splits.find(
    (split) => split.team?.id === teamId
  );

  return teamSplit?.stat ?? null;
}
