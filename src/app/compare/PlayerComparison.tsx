
"use client";

import { useEffect, useState } from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function getStatColor(
  value1: number,
  value2: number,
  player: 1 | 2,
  lowerIsBetter = false
) {
  if (value1 === value2) {
    return "text-white";
  }

  const player1Wins = lowerIsBetter
    ? value1 < value2
    : value1 > value2;

  const isWinner =
    player === 1 ? player1Wins : !player1Wins;

  return isWinner
    ? "text-green-400 font-bold"
    : "text-slate-400";
}

type Player = {
  id: number;
  name: string;
  position: string;
  team: string;
};

type BattingStats = {
  gamesPlayed?: number;
  avg?: string;
  homeRuns?: number;
  rbi?: number;
  obp?: string;
  slg?: string;
  ops?: string;
  hits?: number;
  runs?: number;
  baseOnBalls?: number;
  atBats?: number;
  plateAppearances?: number;
strikeOuts?: number;
sacFlies?: number;
doubles?: number;
triples?: number;
intentionalWalks?: number;
hitByPitch?: number;
};
type PitchingStats = {
  gamesPlayed?: number;
  gamesStarted?: number;
  wins?: number;
  losses?: number;
  era?: string;
  whip?: string;
  inningsPitched?: string;
  strikeOuts?: number;
  battersFaced?: number;
  hitByPitch?: number;
  baseOnBalls?: number;
  hits?: number;
  homeRuns?: number;
  saves?: number;
};
export default function PlayerComparison({
  player1,
  player2,
  season,
  statGroup,
}: {
  player1: Player;
  player2: Player;
  season: number;
  statGroup: "hitting" | "pitching";
}) {
  const [stats1, setStats1] = useState<
  (BattingStats & PitchingStats) | null
>(null);

const [stats2, setStats2] = useState<
  (BattingStats & PitchingStats) | null
>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
const [statsMode, setStatsMode] = useState<"basic" | "advanced">("basic");
  useEffect(() => {
    let active = true;

    async function loadStats() {
      setLoading(true);
      setError("");
      setStats1(null);
      setStats2(null);

      try {
        const [response1, response2] = await Promise.all([
 fetch(`/api/player-stats?id=${player1.id}&season=${season}&group=${statGroup}`),
fetch(`/api/player-stats?id=${player2.id}&season=${season}&group=${statGroup}`)
        ]);

        if (!response1.ok || !response2.ok) {
          throw new Error("Unable to load player statistics.");
        }

        const [data1, data2] = await Promise.all([
          response1.json(),
          response2.json(),
        ]);

        if (active) {
          setStats1(data1.stats);
          setStats2(data2.stats);
        }
      } catch {
        if (active) {
          setError("Unable to load player statistics.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadStats();

    return () => {
      active = false;
    };
}, [player1.id, player2.id, season, statGroup]);
const calculateRate = (
  numerator?: number,
  denominator?: number
): string => {
  if (numerator == null || denominator == null || denominator === 0) {
    return "N/A";
  }

  return ((numerator / denominator) * 100).toFixed(1) + "%";
};
const calculateBattingKRate = (stats: BattingStats): string => {
  const strikeouts = Number(stats.strikeOuts ?? 0);
  const plateAppearances = Number(stats.plateAppearances ?? 0);

  if (plateAppearances === 0) return "N/A";

  return ((strikeouts / plateAppearances) * 100).toFixed(1) + "%";
};

const calculateBattingBBRate = (stats: BattingStats): string => {
  const walks = Number(stats.baseOnBalls ?? 0);
  const plateAppearances = Number(stats.plateAppearances ?? 0);

  if (plateAppearances === 0) return "N/A";

  return ((walks / plateAppearances) * 100).toFixed(1) + "%";
};
const calculateBattingKBBRate = (stats: BattingStats): string => {
  const strikeouts = Number(stats.strikeOuts);
  const walks = Number(stats.baseOnBalls);
  const plateAppearances = Number(stats.plateAppearances);

  if (
    stats.strikeOuts == null ||
    stats.baseOnBalls == null ||
    stats.plateAppearances == null ||
    !Number.isFinite(plateAppearances) ||
    plateAppearances <= 0
  ) {
    return "N/A";
  }

  return (((strikeouts - walks) / plateAppearances) * 100).toFixed(1) + "%";
};
const calculateISO = (stats: BattingStats): string => {
  if (stats.slg == null || stats.avg == null) {
    return "N/A";
  }

  const slg = Number(stats.slg);
  const avg = Number(stats.avg);

  if (!Number.isFinite(slg) || !Number.isFinite(avg)) {
    return "N/A";
  }

  return (slg - avg).toFixed(3).replace(/^0/, "");
};
const calculateBABIP = (stats: BattingStats): string => {
  const {
    hits,
    homeRuns,
    atBats,
    strikeOuts,
    sacFlies,
  } = stats;

  if (
    hits == null ||
    homeRuns == null ||
    atBats == null ||
    strikeOuts == null ||
    sacFlies == null
  ) {
    return "N/A";
  }

  const denominator = atBats - strikeOuts - homeRuns + sacFlies;

  if (denominator <= 0) {
    return "N/A";
  }

  const babip = (hits - homeRuns) / denominator;

  return babip.toFixed(3).replace(/^0/, "");
};

const WOBA_WEIGHTS: Record<
  number,
  {
    bb: number;
    hbp: number;
    single: number;
    double: number;
    triple: number;
    hr: number;
  }
> = {
  2026: { bb: 0.706, hbp: 0.738, single: 0.901, double: 1.278, triple: 1.617, hr: 2.078 },
  2025: { bb: 0.691, hbp: 0.722, single: 0.882, double: 1.252, triple: 1.584, hr: 2.037 },
  2024: { bb: 0.689, hbp: 0.720, single: 0.882, double: 1.254, triple: 1.590, hr: 2.050 },
  2023: { bb: 0.696, hbp: 0.726, single: 0.883, double: 1.244, triple: 1.569, hr: 2.004 },
  2022: { bb: 0.689, hbp: 0.720, single: 0.884, double: 1.261, triple: 1.601, hr: 2.072 },
  2021: { bb: 0.692, hbp: 0.722, single: 0.879, double: 1.242, triple: 1.568, hr: 2.007 },
  2020: { bb: 0.699, hbp: 0.728, single: 0.883, double: 1.238, triple: 1.558, hr: 1.979 },
  2019: { bb: 0.690, hbp: 0.719, single: 0.870, double: 1.217, triple: 1.529, hr: 1.940 },
  2018: { bb: 0.690, hbp: 0.720, single: 0.880, double: 1.247, triple: 1.578, hr: 2.031 },
  2017: { bb: 0.693, hbp: 0.723, single: 0.877, double: 1.232, triple: 1.552, hr: 1.980 },
  2016: { bb: 0.691, hbp: 0.721, single: 0.878, double: 1.242, triple: 1.569, hr: 2.015 },
};

const calculateWOBA = (
  stats: BattingStats,
  season: number
): string => {
  const weights = WOBA_WEIGHTS[season];

  if (!weights) return "N/A";

  const {
    hits,
    doubles,
    triples,
    homeRuns,
    baseOnBalls,
    intentionalWalks,
    hitByPitch,
    atBats,
    sacFlies,
  } = stats;

  if (
    hits == null ||
    doubles == null ||
    triples == null ||
    homeRuns == null ||
    baseOnBalls == null ||
    intentionalWalks == null ||
    hitByPitch == null ||
    atBats == null ||
    sacFlies == null
  ) {
    return "N/A";
  }

  const singles = hits - doubles - triples - homeRuns;
  const unintentionalWalks = baseOnBalls - intentionalWalks;

  const denominator =
    atBats + unintentionalWalks + hitByPitch + sacFlies;

  if (
    denominator <= 0 ||
    singles < 0 ||
    unintentionalWalks < 0
  ) {
    return "N/A";
  }

  const woba =
    (
      weights.bb * unintentionalWalks +
      weights.hbp * hitByPitch +
      weights.single * singles +
      weights.double * doubles +
      weights.triple * triples +
      weights.hr * homeRuns
    ) / denominator;

  return woba.toFixed(3).replace(/^0/, "");
};
const convertInningsPitched = (innings?: string): number | null => {
  if (!innings) return null;

  const [whole, partial = "0"] = innings.split(".");
  const fullInnings = Number(whole);
  const outs = Number(partial);

  if (
    !Number.isInteger(fullInnings) ||
    fullInnings < 0 ||
    !Number.isInteger(outs) ||
    outs < 0 ||
    outs > 2
  ) {
    return null;
  }

  return fullInnings + outs / 3;
};

const FIP_CONSTANTS: Record<number, number> = {
  2026: 3.139,
  2025: 3.135,
  2024: 3.166,
  2023: 3.255,
  2022: 3.112,
  2021: 3.170,
  2020: 3.191,
  2019: 3.214,
  2018: 3.160,
  2017: 3.158,
  2016: 3.147,
};

const calculateFIP = (
  stats: PitchingStats,
  fipConstant: number
): string => {
  const innings = convertInningsPitched(stats.inningsPitched);

  if (
    innings == null ||
    innings <= 0 ||
    stats.homeRuns == null ||
    stats.baseOnBalls == null ||
    stats.hitByPitch == null ||
    stats.strikeOuts == null
  ) {
    return "N/A";
  }

  const fip =
    (
      13 * stats.homeRuns +
      3 * (stats.baseOnBalls + stats.hitByPitch) -
      2 * stats.strikeOuts
    ) / innings + fipConstant;

  return fip.toFixed(2);
};
  const rows: {
    label: string;
    key: keyof BattingStats;
  }[] = [
    { label: "Games", key: "gamesPlayed" },
    { label: "Batting Average", key: "avg" },
    { label: "Home Runs", key: "homeRuns" },
    { label: "RBI", key: "rbi" },
    { label: "On-Base Percentage", key: "obp" },
    { label: "Slugging Percentage", key: "slg" },
    { label: "OPS", key: "ops" },
    { label: "Hits", key: "hits" },
    { label: "Runs", key: "runs" },
    { label: "Walks", key: "baseOnBalls" },
  ];
const pitchingRows: {
  label: string;
  key: keyof PitchingStats;
}[] = [
  { label: "Games", key: "gamesPlayed" },
  { label: "Games Started", key: "gamesStarted" },
  { label: "Wins", key: "wins" },
  { label: "Losses", key: "losses" },
  { label: "ERA", key: "era" },
  { label: "WHIP", key: "whip" },
  { label: "Innings Pitched", key: "inningsPitched" },
  { label: "Strikeouts", key: "strikeOuts" },
  { label: "Walks", key: "baseOnBalls" },
  { label: "Hits Allowed", key: "hits" },
  { label: "Home Runs Allowed", key: "homeRuns" },
  { label: "Saves", key: "saves" },
];
const lowerIsBetter = new Set([
  "era",
  "whip",
  "losses",
  "hits",
  "homeRuns",
  "baseOnBalls",
]);
const chartData = [
  {
    statistic: "Home Runs",
    [player1.name]: stats1?.homeRuns ?? 0,
    [player2.name]: stats2?.homeRuns ?? 0,
  },
  {
    statistic: "RBI",
    [player1.name]: stats1?.rbi ?? 0,
    [player2.name]: stats2?.rbi ?? 0,
  },
  {
    statistic: "Hits",
    [player1.name]: stats1?.hits ?? 0,
    [player2.name]: stats2?.hits ?? 0,
  },
  {
    statistic: "Runs",
    [player1.name]: stats1?.runs ?? 0,
    [player2.name]: stats2?.runs ?? 0,
  },
  {
    statistic: "Walks",
    [player1.name]: stats1?.baseOnBalls ?? 0,
    [player2.name]: stats2?.baseOnBalls ?? 0,
  },
];

const advancedChartData = [
  {
    statistic: "AVG",
    [player1.name]: Number(stats1?.avg ?? 0),
    [player2.name]: Number(stats2?.avg ?? 0),
  },
  {
    statistic: "OBP",
    [player1.name]: Number(stats1?.obp ?? 0),
    [player2.name]: Number(stats2?.obp ?? 0),
  },
  {
    statistic: "SLG",
    [player1.name]: Number(stats1?.slg ?? 0),
    [player2.name]: Number(stats2?.slg ?? 0),
  },
  {
    statistic: "OPS",
    [player1.name]: Number(stats1?.ops ?? 0),
    [player2.name]: Number(stats2?.ops ?? 0),
  },
];
const pitchingChartData = [
  {
    statistic: "Strikeouts",
    [player1.name]: stats1?.strikeOuts ?? 0,
    [player2.name]: stats2?.strikeOuts ?? 0,
  },
  {
    statistic: "Wins",
    [player1.name]: stats1?.wins ?? 0,
    [player2.name]: stats2?.wins ?? 0,
  },
  {
    statistic: "Innings Pitched",
    [player1.name]: Number(stats1?.inningsPitched ?? 0),
    [player2.name]: Number(stats2?.inningsPitched ?? 0),
  },
 
];
const pitchingEfficiencyData = [
  {
    statistic: "ERA",
    [player1.name]: Number(stats1?.era ?? 0),
    [player2.name]: Number(stats2?.era ?? 0),
  },
  {
    statistic: "WHIP",
    [player1.name]: Number(stats1?.whip ?? 0),
    [player2.name]: Number(stats2?.whip ?? 0),
  },
];

const pitchingComparison = pitchingRows.reduce(
  (totals, row) => {
    const value1 = stats1?.[row.key];
    const value2 = stats2?.[row.key];

    if (
      value1 == null ||
      value2 == null ||
      value1 === "" ||
      value2 === ""
    ) {
      return totals;
    }

    const number1 = Number(value1);
    const number2 = Number(value2);

    if (
      !Number.isFinite(number1) ||
      !Number.isFinite(number2) ||
      number1 === number2
    ) {
      return totals;
    }

    const lowerBetter = lowerIsBetter.has(row.key);

    if (
      (lowerBetter && number1 < number2) ||
      (!lowerBetter && number1 > number2)
    ) {
      totals.player1++;
    } else {
      totals.player2++;
    }

    return totals;
  },
  { player1: 0, player2: 0 }
);

  if (loading) {
    return <p className="mt-5 text-slate-400">Loading statistics...</p>;
  }

  if (error) {
    return <p className="mt-5 text-red-400">{error}</p>;
  }

 if (!stats1 || !stats2) {
  return (
    <p className="mt-5 text-slate-400">
      {season} {statGroup === "pitching" ? "pitching" : "batting"} statistics are unavailable for one or both players.
    </p>
  );
}

  return (
    <div className="mt-6 overflow-x-auto">
      <p className="mb-4 text-sm text-slate-400">
        {season} MLB Regular Season {statGroup === "pitching" ? "Pitching" : "Batting"} Statistics
      </p>


{/* Basic / Advanced Statistics Toggle */}
<div className="mb-6 flex gap-3">
  <button
    onClick={() => setStatsMode("basic")}
    className={`rounded-lg px-5 py-2 font-semibold transition ${
      statsMode === "basic"
        ? "bg-blue-600 text-white"
        : "bg-[#0d1d30] text-slate-400 hover:text-white"
    }`}
  >
    Basic Stats
  </button>

  <button
    onClick={() => setStatsMode("advanced")}
    className={`rounded-lg px-5 py-2 font-semibold transition ${
      statsMode === "advanced"
        ? "bg-blue-600 text-white"
        : "bg-[#0d1d30] text-slate-400 hover:text-white"
    }`}
  >
    Advanced Stats
  </button>
</div>
      {statsMode === "advanced" ? (
  <div className="rounded-xl border border-blue-500/20 bg-[#0d1d30] p-8 text-center">
    <h3 className="text-xl font-bold text-white">
      Advanced Player Analytics
    </h3>

    {statGroup === "pitching" ? (
  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
    {[
      { label: "K%", key: "strikeOuts" as const },
{ label: "BB%", key: "baseOnBalls" as const },
{ label: "K-BB%", key: "strikeOuts" as const },
{ label: "FIP", key: "homeRuns" as const },
    ].map((metric) => (
      <div
      
        key={metric.label}
        className="rounded-lg border border-white/10 bg-[#081321] p-5"
      >
        <h4 className="mb-4 text-lg font-bold">{metric.label}</h4>

        <div className="flex justify-between gap-4">
          <div>
            <p className="text-sm text-blue-400">{player1.name}</p>
            <p className="mt-2 text-xl font-bold">
           {metric.label === "FIP"
  ? FIP_CONSTANTS[Number(season)] !== undefined
    ? calculateFIP(stats1, FIP_CONSTANTS[Number(season)])
    : "N/A"
  : calculateRate(
  metric.label === "K-BB%"
    ? (stats1.strikeOuts != null && stats1.baseOnBalls != null
        ? stats1.strikeOuts - stats1.baseOnBalls
        : undefined)
    : stats1[metric.key],
  stats1.battersFaced
)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-green-400">{player2.name}</p>
            <p className="mt-2 text-xl font-bold">
             {metric.label === "FIP"
  ? FIP_CONSTANTS[Number(season)] !== undefined
    ? calculateFIP(stats2, FIP_CONSTANTS[Number(season)])
    : "N/A"
  : calculateRate(
  metric.label === "K-BB%"
    ? (stats2.strikeOuts != null && stats2.baseOnBalls != null
        ? stats2.strikeOuts - stats2.baseOnBalls
        : undefined)
    : stats2[metric.key],
  stats2.battersFaced
)}
            </p>
          </div>
        </div>
      </div>
    ))}
  </div>
) : (
  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
  <div className="rounded-lg border border-white/10 bg-[#081321] p-5">
    <h4 className="mb-4 text-lg font-bold">ISO</h4>

    <div className="flex justify-between gap-4">
      <div>
        <p className="text-sm text-blue-400">{player1.name}</p>
        <p className="mt-2 text-xl font-bold">
          {calculateISO(stats1 as BattingStats)}
        </p>
      </div>

      <div className="text-right">
        <p className="text-sm text-green-400">{player2.name}</p>
        <p className="mt-2 text-xl font-bold">
          {calculateISO(stats2 as BattingStats)}
        </p>
      </div>
    </div>
  </div>
<div className="rounded-lg border border-white/10 bg-[#081321] p-5">
  <h4 className="mb-4 text-lg font-bold">BABIP</h4>

  <div className="flex justify-between gap-4">
    <div>
      <p className="text-sm text-blue-400">{player1.name}</p>
      <p className="mt-2 text-xl font-bold">
        {calculateBABIP(stats1 as BattingStats)}
      </p>
    </div>

    <div className="text-right">
      <p className="text-sm text-green-400">{player2.name}</p>
      <p className="mt-2 text-xl font-bold">
        {calculateBABIP(stats2 as BattingStats)}
      </p>
    </div>
  </div>
</div>
<div className="rounded-lg border border-white/10 bg-[#081321] p-5">
  <h4 className="mb-4 text-lg font-bold">K%</h4>

  <div className="flex justify-between gap-4">
    <div>
      <p className="text-sm text-blue-400">{player1.name}</p>
      <p className="mt-2 text-xl font-bold">
        {calculateBattingKRate(stats1 as BattingStats)}
      </p>
    </div>

    <div className="text-right">
      <p className="text-sm text-green-400">{player2.name}</p>
      <p className="mt-2 text-xl font-bold">
        {calculateBattingKRate(stats2 as BattingStats)}
      </p>
    </div>
  </div>
</div>
<div className="rounded-lg border border-white/10 bg-[#081321] p-5">
  <h4 className="mb-4 text-lg font-bold">BB%</h4>

  <div className="flex justify-between gap-4">
    <div>
      <p className="text-sm text-blue-400">{player1.name}</p>
      <p className="mt-2 text-xl font-bold">
        {calculateBattingBBRate(stats1 as BattingStats)}
      </p>
    </div>

    <div className="text-right">
      <p className="text-sm text-green-400">{player2.name}</p>
      <p className="mt-2 text-xl font-bold">
        {calculateBattingBBRate(stats2 as BattingStats)}
      </p>
    </div>
  </div>
</div>
<div className="rounded-lg border border-white/10 bg-[#081321] p-5">
  <h4 className="mb-4 text-lg font-bold">K-BB%</h4>

  <div className="flex justify-between gap-4">
    <div>
      <p className="text-sm text-blue-400">{player1.name}</p>
      <p className="mt-2 text-xl font-bold">
        {calculateBattingKBBRate(stats1 as BattingStats)}
      </p>
    </div>

    <div className="text-right">
      <p className="text-sm text-green-400">{player2.name}</p>
      <p className="mt-2 text-xl font-bold">
        {calculateBattingKBBRate(stats2 as BattingStats)}
      </p>
    </div>
  </div>
</div>
<div className="rounded-lg border border-white/10 bg-[#081321] p-5">
  <h4 className="mb-4 text-lg font-bold">wOBA</h4>

  <div className="flex justify-between gap-4">
    <div>
      <p className="text-sm text-blue-400">{player1.name}</p>
      <p className="mt-2 text-xl font-bold">
        {calculateWOBA(stats1 as BattingStats, Number(season))}
      </p>
    </div>

    <div className="text-right">
      <p className="text-sm text-green-400">{player2.name}</p>
      <p className="mt-2 text-xl font-bold">
        {calculateWOBA(stats2 as BattingStats, Number(season))}
      </p>
    </div>
  </div>
</div>
</div>
)}
  </div>
) : (
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="py-4 text-blue-400">{player1.name}</th>
            <th className="py-4 text-center">Statistic</th>
            <th className="py-4 text-right text-blue-400">
              {player2.name}
            </th>
          </tr>
        </thead>

        <tbody>
{(statGroup === "pitching" ? pitchingRows : rows).map((row) => {
            const value1 = stats1[row.key];
            const value2 = stats2[row.key];

            const number1 = Number(value1);
            const number2 = Number(value2);

           
const lowerIsBetter = [
  "losses",
  "era",
  "whip",
  "baseOnBalls",
  "hits",
  "homeRuns",
  "earnedRuns",
  "runs",
].includes(row.key) && statGroup === "pitching";

const neutralStats = [
  "gamesPlayed",
  "gamesStarted",
  "inningsPitched",
];

const isNeutral =
  statGroup === "pitching" &&
  neutralStats.includes(row.key);

const validValues =
  value1 != null &&
  value2 != null &&
  value1 !== "" &&
  value2 !== "" &&
  Number.isFinite(number1) &&
  Number.isFinite(number2);

const firstWins =
  validValues &&
  !isNeutral &&
  (lowerIsBetter
    ? number1 < number2
    : number1 > number2);

const secondWins =
  validValues &&
  !isNeutral &&
  (lowerIsBetter
    ? number2 < number1
    : number2 > number1);

              

            return (
              <tr
                key={row.key}
                className="border-b border-slate-800"
              >
                <td
                  className={`py-4 font-semibold ${
                    firstWins ? "text-green-400" : "text-white"
                  }`}
                >
                  {value1 ?? "N/A"}
                </td>

                <td className="py-4 text-center text-slate-400">
                  {row.label}
                </td>

                <td
                  className={`py-4 text-right font-semibold ${
                    secondWins ? "text-green-400" : "text-white"
                  }`}
                >
                  {value2 ?? "N/A"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      )}
{/* Player Comparison Insights */}
<div className="mt-10 rounded-xl border border-white/10 bg-[#0d1d30] p-6">
  <h3 className="mb-2 text-xl font-bold text-white">
    Player Comparison Insights
  </h3>

  <p className="mb-6 text-sm text-slate-400">
    Key performance advantages based on the selected season.
  </p>

  {statGroup === "hitting" ? (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {[
        {
  title: "Power",
  stat: "Isolated Power (ISO)",
  value1: Number(calculateISO(stats1 as BattingStats)),
  value2: Number(calculateISO(stats2 as BattingStats)),
},
        {
  title: "Strikeout-to-Walk Profile",
  stat: "K-BB%",
  value1: Number(calculateBattingKBBRate(stats1 as BattingStats).replace("%", "")),
  value2: Number(calculateBattingKBBRate(stats2 as BattingStats).replace("%", "")),
},
        {
  title: "Overall Production",
  stat: "wOBA",
  value1: parseFloat(calculateWOBA(stats1 as BattingStats, Number(season))),
value2: parseFloat(calculateWOBA(stats2 as BattingStats, Number(season))),
},
      ].map((insight) => {
        const lowerIsBetter = insight.stat === "K-BB%";

const valid =
  Number.isFinite(insight.value1) &&
  Number.isFinite(insight.value2) &&
  (insight.stat === "K-BB%" ||
    (insight.value1 >= 0 && insight.value2 >= 0));

const winner = !valid
  ? "Data unavailable"
  : insight.value1 === insight.value2
  ? "Tied"
  : lowerIsBetter
  ? insight.value1 < insight.value2
    ? player1.name
    : player2.name
  : insight.value1 > insight.value2
  ? player1.name
  : player2.name;
  const difference = valid
  ? Math.abs(insight.value1 - insight.value2)
  : null;

        return (
          <div
            key={insight.title}
            className="rounded-lg border border-white/10 bg-[#081321] p-5"
          >
            <p className="text-sm text-slate-400">
              {insight.title}
            </p>

            <h4 className="mt-2 text-lg font-bold text-white">
              {winner}
            </h4>

            <p className="mt-2 text-xs text-slate-400">
              Advantage based on {insight.stat}
            </p>
         {difference !== null && (
  <p className="mt-2 text-sm font-medium text-blue-300">
    Difference: {difference.toFixed(insight.stat === "K-BB%" ? 1 : 3)}
    {insight.stat === "K-BB%" ? " percentage points" : ""}
  </p>
)}
         <div className="mt-4 flex justify-between gap-4 border-t border-white/10 pt-3">
  <div>
    <p className="text-xs text-blue-400">{player1.name}</p>
    <p className="mt-1 text-lg font-bold text-white">
      {Number.isFinite(insight.value1)
  ? insight.value1.toFixed(insight.stat === "K-BB%" ? 1 : 3)
  : "N/A"}
      {insight.stat === "K-BB%" ? "%" : ""}
    </p>
  </div>

  <div className="text-right">
    <p className="text-xs text-green-400">{player2.name}</p>
    <p className="mt-1 text-lg font-bold text-white">
      {Number.isFinite(insight.value2)
  ? insight.value2.toFixed(insight.stat === "K-BB%" ? 1 : 3)
  : "N/A"}
      {insight.stat === "K-BB%" ? "%" : ""}
    </p>
  </div>
</div>
          </div>
        );
      })}
    </div>
  ) : (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    {[
      {
        title: "Run Prevention",
        stat: "ERA",
        value1: Number(stats1.era),
        value2: Number(stats2.era),
        lowerIsBetter: true,
      },
      {
        title: "Strikeout Production",
        stat: "Strikeouts",
        value1: Number(stats1.strikeOuts),
        value2: Number(stats2.strikeOuts),
        lowerIsBetter: false,
      },
      {
        title: "Baserunner Prevention",
        stat: "WHIP",
        value1: Number(stats1.whip),
        value2: Number(stats2.whip),
        lowerIsBetter: true,
      },
    ].map((insight) => {
      const valid =
        Number.isFinite(insight.value1) &&
        Number.isFinite(insight.value2) &&
        insight.value1 >= 0 &&
        insight.value2 >= 0;

      const winner = !valid
        ? "Data unavailable"
        : insight.value1 === insight.value2
        ? "Tied"
        : (insight.lowerIsBetter
            ? insight.value1 < insight.value2
            : insight.value1 > insight.value2)
        ? player1.name
        : player2.name;

      return (
        <div
          key={insight.title}
          className="rounded-lg border border-white/10 bg-[#081321] p-5"
        >
          <p className="text-sm text-slate-400">
            {insight.title}
          </p>

          <h4 className="mt-2 text-lg font-bold text-white">
            {winner}
          </h4>

          <p className="mt-2 text-xs text-slate-400">
            Advantage based on {insight.stat}
          </p>
        </div>
      );
    })}
  </div>
)}
</div>
<div className="mt-10">
  <h3 className="mb-6 text-xl font-bold">
    {statGroup === "pitching"
  ? "Pitching Performance Comparison"
  : "Batting Performance Comparison"}
  </h3>

  <div className="h-96 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
  data={statGroup === "pitching" ? pitchingChartData : chartData}
>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="statistic" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0f172a",
            border: "1px solid #334155",
            color: "#ffffff",
          }}
        />
        <Legend />
        <Bar
          dataKey={player1.name}
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey={player2.name}
          fill="#22c55e"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>
{statGroup === "pitching" && (
  <div className="mt-10">
    <h3 className="mb-6 text-xl font-bold">
      Pitching Efficiency Comparison
    </h3>

    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={pitchingEfficiencyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="statistic" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid #334155",
              color: "#ffffff",
            }}
          />
          <Legend />
          <Bar
            dataKey={player1.name}
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey={player2.name}
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>

    <p className="mt-4 text-xs text-slate-500">
      Lower ERA and WHIP values generally indicate better pitching efficiency.
    </p>
  </div>
)}
<div className="mt-10">
  <h3 className="mb-6 text-xl font-bold">
    Advanced Batting Comparison
  </h3>

  <div className="h-96 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={advancedChartData}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#334155"
        />
        <XAxis dataKey="statistic" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" domain={[0, "auto"]} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0f172a",
            border: "1px solid #334155",
            color: "#ffffff",
          }}
        />
        <Legend />
        <Bar
          dataKey={player1.name}
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey={player2.name}
          fill="#22c55e"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>
      <p className="mt-4 text-xs text-slate-500">
        Green indicates the higher statistical value, not necessarily
        the better overall player.
      </p>
    </div>
  );
}
