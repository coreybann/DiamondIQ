
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
};

async function getBattingStats(teamId: string): Promise<Hitter[]> {
  const response = await fetch(
    `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=fullSeason&season=2026&hydrate=person(stats(type=season,group=hitting,season=2026))`,
    { next: { revalidate: 3600 } }
  );

  if (!response.ok) {
    throw new Error("Unable to load batting statistics");
  }

  const data = await response.json();

  return (data.roster ?? [])
    .map((entry: any) => {
      const statGroup = entry.person?.stats?.find(
        (group: any) => group.group?.displayName === "hitting"
      );

      const stat = statGroup?.splits?.[0]?.stat;

      if (!stat) return null;

      return {
        id: entry.person.id,
        name: entry.person.fullName,
        games: stat.gamesPlayed ?? 0,
        avg: stat.avg ?? ".000",
        obp: stat.obp ?? ".000",
        slg: stat.slg ?? ".000",
        ops: stat.ops ?? ".000",
        homeRuns: stat.homeRuns ?? 0,
        rbi: stat.rbi ?? 0,
      };
    })
    .filter((player: Hitter | null): player is Hitter => player !== null)
    .sort((a: Hitter, b: Hitter) => b.homeRuns - a.homeRuns);
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
        2026 Batting Statistics
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
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#162a43] text-slate-300">
              <tr>
                {["Player", "G", "AVG", "OBP", "SLG", "OPS", "HR", "RBI"].map(
                  (heading) => (
                    <th key={heading} className="px-4 py-4">
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {hitters.map((player) => (
                <tr
                  key={player.id}
                  className="border-t border-slate-700 hover:bg-white/5"
                >
                  <td className="px-4 py-4 font-semibold">
                    {player.name}
                  </td>
                  <td className="px-4 py-4">{player.games}</td>
                  <td className="px-4 py-4">{player.avg}</td>
                  <td className="px-4 py-4">{player.obp}</td>
                  <td className="px-4 py-4">{player.slg}</td>
                  <td className="px-4 py-4">{player.ops}</td>
                  <td className="px-4 py-4">{player.homeRuns}</td>
                  <td className="px-4 py-4">{player.rbi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
