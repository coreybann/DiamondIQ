import type { DepthChartRelieverRanking } from "./depthChartRelievers";

type Player = {
  id: number;
};

const rolePriority: Record<
  DepthChartRelieverRanking["role"],
  number
> = {
  Closer: 3,
  Setup: 2,
  "Middle Relief": 1,
  "Insufficient Data": 0,
};

export function sortDepthChartRelievers<T extends Player>(
  players: T[],
  rankings: Record<number, DepthChartRelieverRanking>
): T[] {
  return [...players]
    .map((player, index) => ({
      player,
      index,
      ranking: rankings[player.id],
    }))
    .sort((a, b) => {
      const aPriority = a.ranking
        ? rolePriority[a.ranking.role]
        : 0;

      const bPriority = b.ranking
        ? rolePriority[b.ranking.role]
        : 0;

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      if (aPriority > 0) {
        const scoreDifference =
          (b.ranking?.score ?? 0) -
          (a.ranking?.score ?? 0);

        if (scoreDifference !== 0) {
          return scoreDifference;
        }
      }

      return a.index - b.index;
    })
    .map(({ player }) => player);
}
