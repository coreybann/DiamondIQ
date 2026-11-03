import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Player = {
  fullName: string;
  currentAge?: number;
  birthDate?: string;
  primaryPosition?: {
    name?: string;
    abbreviation?: string;
  };
  currentTeam?: {
    name?: string;
  };
  mlbDebutDate?: string;
  batSide?: { description?: string };
  pitchHand?: { description?: string };
};

type StatSplit = {
  season?: string;
  team?: { name?: string };
  sport?: { id?: number };
  stat?: Record<string, string | number>;
};

const levelNames: Record<number, string> = {
  11: "Triple-A",
  12: "Double-A",
  13: "High-A",
  14: "Single-A",
  16: "Rookie",
  17: "Rookie",
};

async function getSeasonStats(
  id: string,
  group: "hitting" | "pitching",
  leagueListId: "mlb_hist" | "milb_all"
): Promise<StatSplit[]> {
  const url =
    `https://statsapi.mlb.com/api/v1/people/${id}/stats` +
    `?stats=yearByYear&group=${group}&leagueListId=${leagueListId}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) return [];

    const data = await response.json();

    return data.stats?.[0]?.splits ?? [];
  } catch {
    return [];
  }
}

export default async function UniversalPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    return (
      <main className="min-h-screen bg-[#081321] p-10 text-white">
        Invalid player ID.
      </main>
    );
  }

  let player: Player | undefined;

  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/people/${id}?hydrate=currentTeam`,
      { next: { revalidate: 3600 } }
    );

    if (response.ok) {
      const data = await response.json();
      player = data.people?.[0];
    }
  } catch {
    // Display a fallback if the MLB API is unavailable.
  }

  if (!player) {
    return (
      <main className="min-h-screen bg-[#081321] p-10 text-white">
        Player not found.
      </main>
    );
  }

  const isPitcher = player.primaryPosition?.abbreviation === "P";
  const group = isPitcher ? "pitching" : "hitting";

  const [mlbStats, milbStats] = await Promise.all([
    getSeasonStats(id, group, "mlb_hist"),
    getSeasonStats(id, group, "milb_all"),
  ]);

  const minorLeagueStats = milbStats.filter(
    (split) => split.sport?.id !== 21 && Boolean(split.team?.name)
  );

  const columns = isPitcher
    ? ["Season", "ERA", "WHIP", "SO", "IP", "BB"]
    : ["Season", "AVG", "OBP", "SLG", "OPS", "HR"];

  function statValues(stat: Record<string, string | number>) {
    return isPitcher
      ? [
          stat.era,
          stat.whip,
          stat.strikeOuts,
          stat.inningsPitched,
          stat.baseOnBalls,
        ]
      : [
          stat.avg,
          stat.obp,
          stat.slg,
          stat.ops,
          stat.homeRuns,
        ];
  }

  function renderStats(
    title: string,
    splits: StatSplit[],
    showTeam = false
  ) {
    return (
      <section className="mt-12">
        <h2 className="mb-5 text-2xl font-bold">{title}</h2>

        {splits.length === 0 ? (
          <p className="text-slate-400">
            No season statistics available.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-[#12243a] text-slate-300">
                <tr>
                  {columns.slice(0, 1).map((column) => (
                    <th key={column} className="px-4 py-3">
                      {column}
                    </th>
                  ))}
                  {showTeam && (
                    <>
                      <th className="px-4 py-3">Level</th>
                      <th className="px-4 py-3">Team</th>
                    </>
                  )}
                  {columns.slice(1).map((column) => (
                    <th key={column} className="px-4 py-3">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {splits.map((split, index) => (
                  <tr
                    key={`${split.season}-${index}`}
                    className="border-t border-slate-700"
                  >
                    <td className="px-4 py-3">
                      {split.season ?? "N/A"}
                    </td>

                    {showTeam && (
                      <>
                        <td className="px-4 py-3">
                          {levelNames[split.sport?.id ?? 0] ?? "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          {split.team?.name ?? "N/A"}
                        </td>
                      </>
                    )}

                    {statValues(split.stat ?? {}).map((value, i) => (
                      <td key={i} className="px-4 py-3">
                        {value ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-[#081321] px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400"
        >
          <ArrowLeft size={16} />
          Back to Homepage
        </Link>

        <p className="mt-10 text-sm font-bold uppercase tracking-widest text-blue-400">
          DiamondIQ · Player Profile
        </p>

        <h1 className="mt-3 text-4xl font-black">
          {player.fullName}
        </h1>

        <div className="mt-5 flex flex-wrap gap-5 text-slate-400">
          <span>Age: {player.currentAge ?? "N/A"}</span>
          <span>
            Position: {player.primaryPosition?.name ?? "N/A"}
          </span>
          <span>
            Team: {player.currentTeam?.name ?? "N/A"}
          </span>
          <span>
            MLB Debut: {player.mlbDebutDate ?? "Not recorded"}
          </span>
        </div>

        {renderStats("MLB Performance History", mlbStats)}
        {renderStats("Minor-League Performance History", minorLeagueStats, true)}

        <p className="mt-10 text-sm text-slate-500">
          Source: MLB Stats API. Statistics are displayed as reported
          by the API.
        </p>
      </div>
    </main>
  );
}
