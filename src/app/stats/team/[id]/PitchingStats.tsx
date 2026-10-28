import { getTeamFwar } from "@/lib/teamFwar";
import SortablePitchingTable from "./SortablePitchingTable";
import { getDefaultMLBSeason } from "@/lib/mlbSeason";
type Pitcher = {
  id: number;
  name: string;
  games: number;
  wins: number;
  losses: number;
  era: string;
  whip: string;
  innings: string;
  strikeouts: number;
walks: number;
fwar: number | null;
};

async function getPitchingStats(teamId: string): Promise<Pitcher[]> {
  const season = getDefaultMLBSeason();

  const response = await fetch(
    `https://statsapi.mlb.com/api/v1/stats?stats=season&group=pitching&season=${season}&teamId=${teamId}&playerPool=ALL&gameType=R`,
    { next: { revalidate: 3600 } }
  );

  if (!response.ok) {
    throw new Error("Unable to load pitching statistics");
  }

  const data = await response.json();
  const splits = data.stats?.[0]?.splits ?? [];
const warLookup = await getTeamFwar(teamId, season, "pit");
  return splits.map((entry: any) => {
    const stat = entry.stat ?? {};

    return {
      id: entry.player.id,
      name: entry.player.fullName,
      games: stat.gamesPlayed ?? 0,
      wins: stat.wins ?? 0,
      losses: stat.losses ?? 0,
      era: stat.era ?? "-",
      whip: stat.whip ?? "-",
      innings: stat.inningsPitched ?? "0.0",
      strikeouts: stat.strikeOuts ?? 0,
walks: stat.baseOnBalls ?? 0,
fwar: warLookup.get(entry.player.id) ?? null,
    };
  }).sort(
    (a: Pitcher, b: Pitcher) => b.strikeouts - a.strikeouts
  );
}

export default async function PitchingStats({
  teamId,
}: {
  teamId: string;
}) {
  let pitchers: Pitcher[] = [];
  let error = false;

  try {
    pitchers = await getPitchingStats(teamId);
  } catch {
    error = true;
  }

  return (
    <section className="mt-14">
      <h2 className="mb-2 text-3xl font-bold">
        {getDefaultMLBSeason()} Pitching Statistics
      </h2>

      <p className="mb-6 text-sm text-slate-400">
        MLB regular-season pitching statistics.
      </p>

      {error ? (
        <p className="text-red-300">
          Pitching statistics could not be loaded.
        </p>
      ) : pitchers.length === 0 ? (
        <p className="text-slate-400">
          No 2026 pitching statistics are currently available.
        </p>
      ) : (
        <SortablePitchingTable pitchers={pitchers} />
      )}
    </section>
  );
}
