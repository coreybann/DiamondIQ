import { getTeamFwar } from "@/lib/teamFwar";
import SortableBattingTable from "./SortableBattingTable";
import { getDefaultMLBSeason } from "@/lib/mlbSeason";
type Hitter = {
  id: number;
  name: string;
  games: number | string;
  avg: string;
  obp: string;
  slg: string;
  ops: string;
  homeRuns: number;
  rbi: number;
  plateAppearances: number;
  fwar: number | null;
};

async function getBattingStats(teamId: string): Promise<Hitter[]> {
  const season = getDefaultMLBSeason();
  const response = await fetch(
    `https://statsapi.mlb.com/api/v1/stats?stats=season&group=hitting&season=${season}&teamId=${teamId}&playerPool=ALL&gameType=R`,
    { next: { revalidate: 3600 } }
  );

  if (!response.ok) {
    throw new Error("Unable to load batting statistics");
  }

  const data = await response.json();
  const splits = data.stats?.[0]?.splits ?? [];
const warLookup = await getTeamFwar(teamId, season, "bat");
  return splits.map((entry: any) => {
    const stat = entry.stat ?? {};

    return {
      id: entry.player.id,
      name: entry.player.fullName,
      games: stat.gamesPlayed ?? 0,
      avg: stat.avg ?? ".000",
      obp: stat.obp ?? ".000",
      slg: stat.slg ?? ".000",
      ops: stat.ops ?? ".000",
      homeRuns: stat.homeRuns ?? 0,
      rbi: stat.rbi ?? 0,
plateAppearances: stat.plateAppearances ?? 0,
fwar: warLookup.get(entry.player.id) ?? null,
    };
  });
}

export default async function BattingStats({
  teamId,
}: {
  teamId: string;
}) {
  let hitters: Hitter[] = [];
  let error = false;

  try {
    hitters = await getBattingStats(teamId);
  } catch {
    error = true;
  }

  return (
    <section className="mt-14">
      <h2 className="mb-2 text-3xl font-bold">
        {getDefaultMLBSeason()} Batting Statistics
      </h2>

      <p className="mb-6 text-sm text-slate-400">
        MLB regular-season hitting statistics.
      </p>

      {error ? (
        <p className="text-red-300">
          Batting statistics could not be loaded.
        </p>
      ) : hitters.length === 0 ? (
        <p className="text-slate-400">
          No 2026 batting statistics are currently available.
        </p>
      ) : (
        <SortableBattingTable hitters={hitters} />
      )}
    </section>
  );
}
