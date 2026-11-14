import { rankReliever } from "./relieverRanking";
import { getTeamRelieverStats } from "./relieverTeamStats";

type Pitcher = {
  id: number;
  position: string;
};

export type DepthChartRelieverRanking = {
  role: ReturnType<typeof rankReliever>["role"];
  score: number;
};

export async function getDepthChartRelieverRankings(
  players: Pitcher[],
  teamId: number,
  season: number
): Promise<Record<number, DepthChartRelieverRanking>> {
  const pitchers = players.filter(
    (player) => ["P", "RP"].includes(player.position)
  );

  const results = await Promise.all(
    pitchers.map(async (player) => {
      try {
        const response = await fetch(
          `https://statsapi.mlb.com/api/v1/people/${player.id}/stats?stats=season&group=pitching&season=${season}`,
          { next: { revalidate: 86400 } }
        );

        if (!response.ok) return null;

        const data = await response.json();
        const stats = getTeamRelieverStats(data, teamId);

        if (!stats) return null;

        return {
          id: player.id,
          ranking: rankReliever(stats),
        };
      } catch {
        return null;
      }
    })
  );

  return Object.fromEntries(
    results
      .filter(
        (result): result is NonNullable<typeof result> =>
          result !== null
      )
      .map((result) => [result.id, result.ranking])
  );
}
