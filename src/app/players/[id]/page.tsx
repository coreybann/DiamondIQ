import Link from "next/link";
import type { Metadata } from "next";
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


export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    return {
      title: "Player Not Found | DiamondIQ",
      robots: { index: false, follow: false },
    };
  }

  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/people/${id}?hydrate=currentTeam`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      return {
        title: "Player Profile | DiamondIQ",
        robots: { index: false, follow: true },
      };
    }

    const data = await response.json();
    const player = data.people?.[0];

    if (!player) {
      return {
        title: "Player Not Found | DiamondIQ",
        robots: { index: false, follow: false },
      };
    }

    const name = player.fullName;
    const position = player.primaryPosition?.name;
    const team = player.currentTeam?.name;

    const title = `${name} Stats, Bio & Career Statistics | DiamondIQ`;

    const description =
      `Explore ${name}'s MLB player profile, career statistics,` +
      `${position ? ` ${position} performance,` : ""}` +
      `${team ? ` current team (${team}),` : ""}` +
      " and baseball analytics on DiamondIQ.";

    return {
      title,
      description,
      alternates: {
        canonical: `/players/${id}`,
      },
      openGraph: {
        title,
        description,
        url: `https://diamondiq-nine.vercel.app/players/${id}`,
        siteName: "DiamondIQ",
        type: "profile",
        images: ["/diamondiq-logo.png"],
      },
    };
  } catch {
    return {
      title: "MLB Player Profile | DiamondIQ",
      robots: { index: false, follow: true },
    };
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
    ? [
        "Season", "G", "IP", "ERA", "WHIP", "SO",
        "BB", "H", "HR", "K/9", "BB/9", "K/BB",
      ]
    : [
        "Season", "G", "PA", "AB", "H", "2B", "3B",
        "HR", "RBI", "BB", "SO", "BB%", "K%",
        "AVG", "OBP", "SLG", "OPS", "ISO", "SB",
      ];

  function statValues(stat: Record<string, string | number>) {
    const number = (key: string): number | null => {
      const value = stat[key];
      if (value === undefined || value === null || value === "") {
        return null;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const rate = (
      numerator: number | null,
      denominator: number | null,
      multiplier = 1,
      digits = 1
    ): string => {
      if (numerator === null || denominator === null || denominator === 0) {
        return "—";
      }
      return ((numerator / denominator) * multiplier).toFixed(digits);
    };

    if (isPitcher) {
      const inningsText = String(stat.inningsPitched ?? "");
      const match = /^(\d+)(?:\.([012]))?$/.exec(inningsText);
      const innings = match
        ? Number(match[1]) + Number(match[2] ?? 0) / 3
        : null;

      return [
        stat.gamesPlayed,
        stat.inningsPitched,
        stat.era,
        stat.whip,
        stat.strikeOuts,
        stat.baseOnBalls,
        stat.hits,
        stat.homeRuns,
        rate(number("strikeOuts"), innings, 9, 2),
        rate(number("baseOnBalls"), innings, 9, 2),
        rate(number("strikeOuts"), number("baseOnBalls"), 1, 2),
      ];
    }

    const pa = number("plateAppearances");
    const atBats = number("atBats");
    const hits = number("hits");
    const doubles = number("doubles");
    const triples = number("triples");
    const homeRuns = number("homeRuns");

    const iso =
      number("slg") !== null && number("avg") !== null
        ? (number("slg")! - number("avg")!).toFixed(3)
        : "—";

    return [
      stat.gamesPlayed,
      stat.plateAppearances,
      stat.atBats,
      hits,
      doubles,
      triples,
      homeRuns,
      stat.rbi,
      stat.baseOnBalls,
      stat.strikeOuts,
      rate(number("baseOnBalls"), pa, 100, 1) + "%",
      rate(number("strikeOuts"), pa, 100, 1) + "%",
      stat.avg,
      stat.obp,
      stat.slg,
      stat.ops,
      iso,
      stat.stolenBases,
    ];
  }

  function renderStats(
    title: string,
    splits: StatSplit[],
    showTeam = false,
    showLevel = false
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
                      {showLevel && (
                        <th className="px-4 py-3">Level</th>
                      )}
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
                        {showLevel && (
                          <td className="px-4 py-3">
                            {levelNames[split.sport?.id ?? 0] ?? "N/A"}
                          </td>
                        )}
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

        {renderStats("MLB Performance History", mlbStats, true)}
        {renderStats("Minor-League Performance History", minorLeagueStats, true, true)}

        <p className="mt-10 text-sm text-slate-500">
          Source: MLB Stats API. Statistics are displayed as reported
          by the API.
        </p>
      </div>
    </main>
  );
}
