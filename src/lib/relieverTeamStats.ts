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

  if (teamSplit?.stat) {
    return teamSplit.stat;
  }

  // Fallback for pitchers who have not yet appeared
  // for their current team.
  const seasonSplit = splits.find(
    (split) => !split.team?.id && split.stat
  );

  if (seasonSplit?.stat) {
    return seasonSplit.stat;
  }

  // MLB may return a single season split associated
  // with the pitcher's previous team.
  if (splits.length === 1) {
    return splits[0].stat ?? null;
  }

  // Multiple team splits require separate handling
  // to avoid using incomplete or duplicated totals.
  return null;
}
