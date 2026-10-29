"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

function normalizePlayerName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export default function FrontOfficePage() {
  const [activeTab, setActiveTab] = useState("Player Value");

const [leaderboardView, setLeaderboardView] = useState("Cost Efficiency");
const [minimumWar, setMinimumWar] = useState(2);
const [leaderboardSearch, setLeaderboardSearch] = useState("");
const downloadLeaderboard = () => {
  const headers = ["Rank", "Player", "Team", "Salary", "bWAR", "Salary per WAR"];

  const rows = leaderboardPlayers.map((player, index) => [
    index + 1,
    player.player,
    player.team,
    player.salary,
    player.war ?? "",
    player.salaryPerWar ?? "",
  ]);

  const escapeCSV = (value: string | number) =>
    `"${String(value).replace(/"/g, '""')}"`;

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCSV).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `diamondiq-${leaderboardView.toLowerCase().replace(/\s+/g, "-")}-2026.csv`;
  link.click();

  URL.revokeObjectURL(url);
};
const [selectedTeamFilter, setSelectedTeamFilter] = useState("All Teams");
const [teamSortBy, setTeamSortBy] = useState("WAR");
const resetLeaderboardFilters = () => {
  setLeaderboardSearch("");
  setSelectedTeamFilter("All Teams");
  setMinimumWar(2);
};

const [playerSearch, setPlayerSearch] = useState("");
const [playerResults, setPlayerResults] = useState<
  { id: number; fullName: string }[]
>([]);

const [selectedPlayer, setSelectedPlayer] = useState<{
  id: number;
  fullName: string;
} | null>(null);

const [hittingStats, setHittingStats] = useState<{
  gamesPlayed: number;
  avg: string;
  homeRuns: number;
  rbi: number;
  ops: string;
} | null>(null);

const [pitchingStats, setPitchingStats] = useState<{
  gamesPlayed: number;
  era: string;
  whip: string;
  strikeOuts: number;
  inningsPitched: string;
} | null>(null);


const [statsLoading, setStatsLoading] = useState(false);
const [salaryData, setSalaryData] = useState<
  { player: string; team: string; position: string; salary: number }[]
>([]);

const [warData, setWarData] = useState<
  {
    player_id: number;
    player_name: string;
    war: number;
    season: number;
    source: string;
  }[]
>([]);

useEffect(() => {
  async function loadWarData() {
    try {
      const response = await fetch("/data/player-war-2026.csv");

      if (!response.ok) {
        throw new Error("Could not load WAR data");
      }

      const csv = await response.text();
      const lines = csv.trim().split(/\r?\n/);

      const rows = lines.slice(1).map((line) => {
        const [player_id, player_name, war, season, source] =
          line.split(",");

        return {
          player_id: Number(player_id),
          player_name: player_name.trim(),
          war: Number(war),
          season: Number(season),
          source: source.trim(),
        };
      });

      setWarData(rows);
      console.log("WAR records loaded:", rows.length);
    } catch (error) {
      console.error("Error loading WAR data:", error);
    }
  }

  loadWarData();
}, []);


const selectedPlayerWar = selectedPlayer
  ? warData.find((player) => player.player_id === selectedPlayer.id)
  : null;

const warLookup = useMemo(() => {
  const lookup = new Map<string, typeof warData>();

  for (const record of warData) {
    const name = normalizePlayerName(record.player_name);
    const existing = lookup.get(name) ?? [];
    lookup.set(name, [...existing, record]);
  }

  return lookup;
}, [warData]);
const resolveWarRecord = (player: {
  player: string;
  team: string;
}) => {
  const matchingRecords =
    warLookup.get(normalizePlayerName(player.player)) ?? [];

  if (matchingRecords.length === 1) {
    return matchingRecords[0];
  }

  if (normalizePlayerName(player.player) === "maxmuncy") {
    const playerId =
      player.team === "Los Angeles Dodgers" ? 571970 :
      player.team === "Athletics" ? 691777 :
      null;

    return matchingRecords.find(
      record => record.player_id === playerId
    );
  }
if (normalizePlayerName(player.player) === "josefermin") {
  const playerId =
    player.team === "St. Louis Cardinals" ? 665877 :
    player.team === "Los Angeles Angels" ? 820862 :
    null;

  return matchingRecords.find(
    record => record.player_id === playerId
  );
}
if (normalizePlayerName(player.player) === "luisgarcia") {
  if (player.team === "Washington Nationals") {
    return matchingRecords.find(
      record => record.player_id === 671277
    );
  }

  return undefined;
}
  return undefined;
};
const playerEfficiency = salaryData
  .map((player) => {

const warRecord = resolveWarRecord(player);



    
if (!warRecord || warRecord.war < minimumWar) {
  return null;
}

   

    return {
      player: player.player,
      team: player.team,
      salary: player.salary,
      war: warRecord.war,
      salaryPerWar: player.salary / warRecord.war,
    };
  })
  .filter((player) => player !== null)
  .filter(
    (player) =>
      selectedTeamFilter === "All Teams" ||
      player.team === selectedTeamFilter
  )
  .sort((a, b) => a.salaryPerWar - b.salaryPerWar);



const highestWarPlayers = salaryData
  .map((player) => {


const warRecord = resolveWarRecord(player);



    if (!warRecord || warRecord.war <= 0) {
      return null;
    }

    return {
      player: player.player,
      team: player.team,
      salary: player.salary,
      war: warRecord.war,
      salaryPerWar: player.salary / warRecord.war,
    };
  })
  .filter((player) => player !== null)
  .filter(
    (player) =>
      selectedTeamFilter === "All Teams" ||
      player.team === selectedTeamFilter
  )
  .sort((a, b) => b.war - a.war);


const matchesPlayerSearch = (player: { player: string }) =>
  player.player
    .toLowerCase()
    .includes(leaderboardSearch.trim().toLowerCase());
const leaderboardPlayers =
  leaderboardView === "Cost Efficiency"
    ? playerEfficiency.filter(matchesPlayerSearch)
    : leaderboardView === "Highest WAR"
    ? highestWarPlayers.filter(matchesPlayerSearch)
    : salaryData
        .filter(matchesPlayerSearch)
       .filter(
  (player) =>
    selectedTeamFilter === "All Teams" ||
    player.team === selectedTeamFilter
)
    .sort((a, b) => b.salary - a.salary)
    .map((player) => {

          

const warRecord = resolveWarRecord(player);



          return {
            player: player.player,
            team: player.team,
            salary: player.salary,
            war: warRecord?.war ?? null,
            salaryPerWar:
              warRecord && warRecord.war > 0
                ? player.salary / warRecord.war
                : null,
          };
        });
const teamRosterValue = Object.values(
  salaryData.reduce<
    Record<
      string,
      {
        team: string;
        payroll: number;
        totalWar: number;
        players: number;
        matchedPlayers: number;
      }
    >
  >((teams, player) => {
    if (!teams[player.team]) {
      teams[player.team] = {
        team: player.team,
        payroll: 0,
        totalWar: 0,
        players: 0,
        matchedPlayers: 0,
      };
    }

    const team = teams[player.team];

    team.payroll += player.salary;
    team.players += 1;

const warRecord = resolveWarRecord(player);

    if (warRecord) {
      team.totalWar += warRecord.war;
      team.matchedPlayers += 1;
    }

    return teams;
  }, {})
)
  .map((team) => ({
    ...team,
    costPerWar:
      team.totalWar > 0
        ? team.payroll / team.totalWar
        : null,
  }))
  
.sort((a, b) => {
  if (teamSortBy === "Payroll") {
    return b.payroll - a.payroll;
  }

  if (teamSortBy === "Cost") {
    if (a.costPerWar === null) return 1;
    if (b.costPerWar === null) return -1;
    return a.costPerWar - b.costPerWar;
  }

  if (teamSortBy === "Matched") {
    return b.matchedPlayers - a.matchedPlayers;
  }

  return b.totalWar - a.totalWar;
});


const [highlightedTeam, setHighlightedTeam] = useState("All Teams");

const topEfficientTeams = [...teamRosterValue]
  .filter(
    (team) =>
      team.costPerWar !== null &&
      team.totalWar > 0 &&
      team.players > 0 &&
      team.matchedPlayers / team.players >= 0.8
  )
  .sort((a, b) => a.costPerWar! - b.costPerWar!)
  .slice(0, 5);

const bestValueTeam = topEfficientTeams[0] ?? null;

const leastEfficientTeams = [...teamRosterValue]
  .filter(
    (team) =>
      team.costPerWar !== null &&
      team.totalWar > 0 &&
      team.players > 0 &&
      team.matchedPlayers / team.players >= 0.8
  )
  .sort((a, b) => b.costPerWar! - a.costPerWar!)
  .slice(0, 5);

const leastValueTeam = leastEfficientTeams[0] ?? null;

const efficiencyGap =
  bestValueTeam?.costPerWar != null &&
  leastValueTeam?.costPerWar != null
    ? leastValueTeam.costPerWar / bestValueTeam.costPerWar
    : null;

const teamScatterData = teamRosterValue.map((team) => ({
  team: team.team,
  payrollMillions: team.payroll / 1_000_000,
  totalWar: team.totalWar,
  payroll: team.payroll,
  matchedPlayers: team.matchedPlayers,
}));

const selectedTeamData = teamRosterValue.find(
  (team) => team.team === highlightedTeam
);

const averagePayroll =
  teamScatterData.length > 0
    ? teamScatterData.reduce(
        (sum, team) => sum + team.payrollMillions,
        0
      ) / teamScatterData.length
    : 0;

const averageWar =
  teamScatterData.length > 0
    ? teamScatterData.reduce(
        (sum, team) => sum + team.totalWar,
        0
      ) / teamScatterData.length
    : 0;

const quadrantCounts = {
  topLeft: teamScatterData.filter(
    (team) =>
      team.payrollMillions < averagePayroll &&
      team.totalWar >= averageWar
  ).length,

  topRight: teamScatterData.filter(
    (team) =>
      team.payrollMillions >= averagePayroll &&
      team.totalWar >= averageWar
  ).length,

  bottomLeft: teamScatterData.filter(
    (team) =>
      team.payrollMillions < averagePayroll &&
      team.totalWar < averageWar
  ).length,

  bottomRight: teamScatterData.filter(
    (team) =>
      team.payrollMillions >= averagePayroll &&
      team.totalWar < averageWar
  ).length,
};

const selectedTeamQuadrant = selectedTeamData
  ? selectedTeamData.payroll / 1_000_000 < averagePayroll
    ? selectedTeamData.totalWar >= averageWar
      ? "High Production, Lower Payroll"
      : "Low Production, Lower Payroll"
    : selectedTeamData.totalWar >= averageWar
      ? "High Production, Higher Payroll"
      : "Low Production, Higher Payroll"
  : null;

const selectedPayrollDifference = selectedTeamData
  ? selectedTeamData.payroll / 1_000_000 - averagePayroll
  : 0;

const selectedWarDifference = selectedTeamData
  ? selectedTeamData.totalWar - averageWar
  : 0;



const [teamPayrolls, setTeamPayrolls] = useState<
  { team: string; payroll: number; players: number }[]
>([]);
const [payrollLoading, setPayrollLoading] = useState(false);

const [payrollChartFilter, setPayrollChartFilter] = useState<
  "top" | "bottom" | "all"
>("top");

const [selectedPayrollTeam, setSelectedPayrollTeam] = useState("");

const selectedPlayerSalary = selectedPlayer
  ? salaryData.find((record) => {
      const nameMatches =
        normalizePlayerName(record.player) ===
        normalizePlayerName(selectedPlayer.fullName);

      if (!nameMatches) return false;

      if (normalizePlayerName(record.player) === "maxmuncy") {
        if (selectedPlayer.id === 571970) {
          return record.team === "Los Angeles Dodgers";
        }

        if (selectedPlayer.id === 691777) {
          return record.team === "Athletics";
        }

        return false;
      }

   if (normalizePlayerName(record.player) === "josefermin") {
  if (selectedPlayer.id === 665877) {
    return record.team === "St. Louis Cardinals";
  }

  if (selectedPlayer.id === 820862) {
    return record.team === "Los Angeles Angels";
  }

  return false;
}
if (normalizePlayerName(record.player) === "luisgarcia") {
  return selectedPlayer.id === 671277 &&
    record.team === "Washington Nationals";
}
return true;
    })
  : undefined;


useEffect(() => {
  async function loadSalaryData() {
    try {
      const response = await fetch("/data/mlb-salaries-2026.csv");

      if (!response.ok) {
        throw new Error("Could not load salary data");
      }

      const csv = await response.text();
      const lines = csv.trim().split(/\r?\n/);

      const rows = lines.slice(1).map((line) => {
        const [player, team, position, salary] = line.split(",");

        return {
          player: player.trim(),
          team: team.trim(),
          position: position.trim(),
          salary: Number(salary),
        };
      });

      setSalaryData(rows);

const payrollMap = new Map<
  string,
  { payroll: number; players: number }
>();

rows.forEach((player) => {
  const team = player.team.trim();
  const current = payrollMap.get(team) ?? {
    payroll: 0,
    players: 0,
  };

  current.payroll += player.salary;
  current.players += 1;
  payrollMap.set(team, current);
});

setTeamPayrolls(
  Array.from(payrollMap.entries())
    .map(([team, data]) => ({
      team,
      payroll: data.payroll,
      players: data.players,
    }))
    .sort((a, b) => b.payroll - a.payroll)
);

      console.log("Salary records loaded:", rows.length);
    } catch (error) {
      console.error("Error loading salary data:", error);
    }
  }

  loadSalaryData();
}, []);

useEffect(() => {
  if (!selectedPlayer) {
    setHittingStats(null);
    return;
  }

  const controller = new AbortController();

  async function loadHittingStats() {
    setStatsLoading(true);
    setHittingStats(null);

    try {
      const response = await fetch(
        `https://statsapi.mlb.com/api/v1/people/${selectedPlayer!.id}/stats?stats=season&group=hitting&season=2026&gameType=R`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error("Failed to load player statistics");
      }

      const data = await response.json();
      const stats = data.stats?.[0]?.splits?.[0]?.stat;

      if (stats && !controller.signal.aborted) {
        setHittingStats({
          gamesPlayed: stats.gamesPlayed ?? 0,
          avg: stats.avg ?? ".000",
          homeRuns: stats.homeRuns ?? 0,
          rbi: stats.rbi ?? 0,
          ops: stats.ops ?? ".000",
        });
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error("Error loading hitting stats:", error);
      }
    } finally {
      if (!controller.signal.aborted) {
        setStatsLoading(false);
      }
    }
  }

  loadHittingStats();

  return () => controller.abort();
}, [selectedPlayer]);

useEffect(() => {
  if (!selectedPlayer) {
    setPitchingStats(null);
    return;
  }

  const controller = new AbortController();

  async function loadPitchingStats() {
    setPitchingStats(null);

    try {
      const response = await fetch(
        `https://statsapi.mlb.com/api/v1/people/${selectedPlayer!.id}/stats?stats=season&group=pitching&season=2026&gameType=R`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error("Failed to load pitching statistics");
      }

      const data = await response.json();
      const stats = data.stats?.[0]?.splits?.[0]?.stat;

      if (stats && !controller.signal.aborted) {
        setPitchingStats({
          gamesPlayed: stats.gamesPlayed ?? 0,
          era: stats.era ?? "0.00",
          whip: stats.whip ?? "0.00",
          strikeOuts: stats.strikeOuts ?? 0,
          inningsPitched: stats.inningsPitched ?? "0.0",
        });
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error("Error loading pitching stats:", error);
      }
    }
  }

  loadPitchingStats();

  return () => controller.abort();
}, [selectedPlayer]);

useEffect(() => {
  
if (
  playerSearch.trim().length < 2 ||
  playerSearch.trim() === selectedPlayer?.fullName
) {
  setPlayerResults([]);
  return;
}

    

  const controller = new AbortController();

  const timer = setTimeout(async () => {
    try {
      const response = await fetch(
        `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(playerSearch.trim())}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error("Player search failed");
      }

      const data = await response.json();

      setPlayerResults(
        (data.people ?? []).slice(0, 8).map(
          (player: { id: number; fullName: string }) => ({
            id: player.id,
            fullName: player.fullName,
          })
        )
      );
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error("MLB player search error:", error);
        setPlayerResults([]);
      }
    }
  }, 300);


return () => {
  clearTimeout(timer);
  controller.abort();
};
}, [playerSearch, selectedPlayer]);


  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-10">
          <h1 className="text-4xl font-bold">
            Front Office
          </h1>

          <p className="mt-3 text-lg text-slate-400">
            Analyze MLB roster construction, player value,
            payroll efficiency, and front office decisions.
          </p>
        </div>


<div className="mb-8 flex flex-wrap gap-3">
  {["Player Value", "Team Payroll", "Front Office Insights", "Team Roster Value"].map(
    (tab) => (
      <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className={`rounded-lg px-5 py-3 font-semibold transition-colors ${
          activeTab === tab
            ? "bg-blue-600 text-white"
            : "border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
        }`}
      >
        {tab}
      </button>
    )
  )}
</div>


        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
  {activeTab === "Player Value" && (
    <div className="rounded-xl border border-blue-800 bg-slate-900 p-6 md:col-span-3">
      <h2 className="text-2xl font-bold">Player Value Analysis</h2>
      <p className="mt-3 text-slate-400">
        Compare MLB player performance, salaries, and contract efficiency.
      </p>

<div className="mt-6">
  <label
    htmlFor="player-search"
    className="mb-2 block text-sm font-semibold text-slate-300"
  >
    Search MLB Players
  </label>

  <input
    id="player-search"
    type="text"
    placeholder="Enter a player name..."
    value={playerSearch}

onChange={(e) => {
  setPlayerSearch(e.target.value);
  setSelectedPlayer(null);
  setPlayerResults([]);
}}

    className="w-full max-w-xl rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
  />

{playerResults.length > 0 && (
  <div className="mt-2 max-w-xl rounded-lg border border-slate-700 bg-slate-950">
    
{playerResults.map((player) => (
  <button
    key={player.id}
    type="button"
    onClick={() => {
      setSelectedPlayer(player);
      setPlayerSearch(player.fullName);
      setPlayerResults([]);
    }}
    className="block w-full border-b border-slate-800 px-4 py-3 text-left text-slate-300 transition-colors hover:bg-slate-800 last:border-b-0"
  >
    {player.fullName}
  </button>
))}

  </div>
)}

{selectedPlayer && (
  
<div className="mt-6 w-full rounded-lg border border-blue-800 bg-slate-950 p-5">

    <p className="text-sm text-slate-400">
      Selected Player
    </p>

    <h3 className="mt-1 text-xl font-bold text-white">
      {selectedPlayer.fullName}
    </h3>

<div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">

{selectedPlayerWar && (
  
<div className="rounded-lg border border-blue-800 bg-slate-900 p-4">

    <p className="text-sm text-slate-400">
      2026 Wins Above Replacement (bWAR)
    </p>

    <p className="mt-1 text-3xl font-bold text-blue-400">
      {selectedPlayerWar.war.toFixed(2)}
    </p>

    <p className="mt-2 text-xs text-slate-400">
      Source: Baseball-Reference | Batting + Pitching
    </p>
  </div>
)}

{selectedPlayerWar &&
  selectedPlayerSalary &&
  selectedPlayerWar.war > 0 && (
    
<div className="rounded-lg border border-blue-800 bg-slate-900 p-4">

      <p className="text-sm text-slate-400">
        2026 Salary Per WAR
      </p>

      <p className="mt-1 text-3xl font-bold text-blue-400">
        {(selectedPlayerSalary.salary / selectedPlayerWar.war)
          .toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          })}
      </p>

      <p className="mt-2 text-xs text-slate-400">
        Annual salary divided by 2026 bWAR
      </p>
    </div>
  )}


<div className="rounded-lg border border-slate-700 bg-slate-900 p-4">

  <p className="text-sm text-slate-400">2026 Player Salary</p>

  {selectedPlayerSalary ? (
    <>
      <p className="mt-1 text-2xl font-bold text-green-400">
        {selectedPlayerSalary.salary.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        })}
      </p>

      <p className="mt-1 text-sm text-slate-400">
        {selectedPlayerSalary.team} | {selectedPlayerSalary.position}
      </p>
    </>
  ) : (
    <p className="mt-2 text-slate-400">
      Salary information unavailable
    </p>
  )}
</div>

{!statsLoading && hittingStats && selectedPlayerSalary && hittingStats.homeRuns > 0 && (
  <div className="rounded-lg border border-blue-800 bg-slate-900 p-4">
    <p className="text-sm text-slate-400">
      Salary Per Home Run
    </p>

    <p className="mt-1 text-2xl font-bold text-blue-400">
      {(selectedPlayerSalary.salary / hittingStats.homeRuns).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      })}
    </p>

    <p className="mt-2 text-xs text-slate-400">
      2026 salary divided by 2026 regular-season home runs
    </p>
  </div>
)}

{selectedPlayerSalary && pitchingStats && pitchingStats.strikeOuts > 0 && (
  <div className="rounded-lg border border-blue-800 bg-slate-900 p-4">
    <p className="text-sm text-slate-400">
      Salary Per Strikeout
    </p>

    <p className="mt-1 text-2xl font-bold text-blue-400">
      {(selectedPlayerSalary.salary / pitchingStats.strikeOuts)
        .toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        })}
    </p>

    <p className="mt-2 text-xs text-slate-400">
      2026 salary divided by 2026 regular-season strikeouts
    </p>
  </div>
)}
</div>

{statsLoading && (
  <p className="mt-4 text-slate-400">
    Loading 2026 statistics...
  </p>
)}

{!statsLoading && hittingStats && (
  
<div className="mt-5">
  


  <h4 className="mb-3 text-lg font-semibold text-white">
    2026 Hitting Statistics
  </h4>
  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">

    {[
      { label: "Games", value: hittingStats.gamesPlayed },
      { label: "AVG", value: hittingStats.avg },
      { label: "Home Runs", value: hittingStats.homeRuns },
      { label: "RBI", value: hittingStats.rbi },
      { label: "OPS", value: hittingStats.ops },
    ].map((stat) => (
      <div
        key={stat.label}
        className="rounded-lg border border-slate-700 bg-slate-900 p-4"
      >
        <p className="text-xs text-slate-400">{stat.label}</p>
        <p className="mt-1 text-2xl font-bold text-white">
          {stat.value}
        </p>
      </div>
    ))}
  </div>
</div>
)}

{pitchingStats && (
  <div className="contents">
    

    <h4 className="mb-3 text-lg font-semibold text-white">
      2026 Pitching Statistics
    </h4>

    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {[
        { label: "Games", value: pitchingStats.gamesPlayed },
        { label: "ERA", value: pitchingStats.era },
        { label: "WHIP", value: pitchingStats.whip },
        { label: "Strikeouts", value: pitchingStats.strikeOuts },
        { label: "Innings Pitched", value: pitchingStats.inningsPitched },
      ].map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-slate-700 bg-slate-900 p-4"
        >
          <p className="text-xs text-slate-400">{stat.label}</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  </div>
)}


{!statsLoading && !hittingStats && !pitchingStats && (

  <p className="mt-4 text-sm text-slate-400">
    No 2026 regular-season statistics available for this player.
  </p>
)}

  </div>
)}

</div>

    </div>
  )}

{activeTab === "Team Payroll" && (
  <div className="rounded-xl border border-blue-800 bg-slate-900 p-6 md:col-span-3">
    <h2 className="text-2xl font-bold">
      MLB Team Payroll Analysis
    </h2>
    <p className="mt-3 text-slate-400">
      Explore 2026 MLB team payrolls, compare spending across
      all 30 organizations, and evaluate roster efficiency.
    </p>

<div className="mt-6">

<div className="mb-6">
  <label
    htmlFor="payroll-team"
    className="mb-2 block text-sm font-semibold text-slate-300"
  >
    Select an MLB Team
  </label>

  <select
    id="payroll-team"
    value={selectedPayrollTeam}
    onChange={(e) => setSelectedPayrollTeam(e.target.value)}
    className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
  >
    <option value="">Choose a team...</option>

    {teamPayrolls.map((team) => (
      <option key={team.team} value={team.team}>
        {team.team}
      </option>
    ))}
  </select>
</div>

{selectedPayrollTeam && (
  <div className="mb-8 rounded-lg border border-blue-800 bg-slate-950 p-5">
    <h3 className="mb-2 text-xl font-bold text-white">
      {selectedPayrollTeam} Player Salaries
    </h3>

    <p className="mb-4 text-sm text-slate-400">
      2026 salaries from the imported dataset
    </p>

    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-800 text-slate-300">
          <tr>
            <th className="p-3">Player</th>
            <th className="p-3">Position</th>
            <th className="p-3">2026 Salary</th>
          </tr>
        </thead>

        <tbody>
          {salaryData
            .filter((player) => player.team === selectedPayrollTeam)
            .sort((a, b) => b.salary - a.salary)
            .map((player, index) => (
              <tr
                key={`${player.player}-${index}`}
                className="border-t border-slate-800"
              >
                <td className="p-3 font-medium text-white">
                  {player.player}
                </td>

                <td className="p-3 text-slate-300">
                  {player.position}
                </td>

                <td className="p-3 text-slate-300">
                  {player.salary.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  })}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  </div>
)}

  <h3 className="text-xl font-bold mb-4">
    2026 Payroll Rankings
  </h3>

  {teamPayrolls.length === 0 ? (
    <p className="text-slate-400">
      No payroll data loaded yet. Check that your CSV file
      is available in public/data.
    </p>
  ) : (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
          <p className="text-slate-400 text-sm">Teams Loaded</p>
          <p className="text-3xl font-bold">{teamPayrolls.length}</p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
          <p className="text-slate-400 text-sm">Highest Payroll</p>
          <p className="text-xl font-bold">
            {teamPayrolls[0]?.team}
          </p>
          <p className="text-slate-300">
            {teamPayrolls[0]?.payroll.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            })}
          </p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
          <p className="text-slate-400 text-sm">Combined Payroll</p>
          <p className="text-2xl font-bold">
            {teamPayrolls.reduce((sum, team) => sum + team.payroll, 0)
              .toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              })}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800">
            <tr>
              <th className="p-3">Rank</th>
              <th className="p-3">Team</th>
              <th className="p-3">Players</th>
              <th className="p-3">Total Salary</th>
            </tr>
          </thead>
          <tbody>
            {teamPayrolls.map((team, index) => (
              <tr key={team.team} className="border-t border-slate-700">
                <td className="p-3">{index + 1}</td>
                <td className="p-3 font-medium">{team.team}</td>
                <td className="p-3">{team.players}</td>
                <td className="p-3">
                  {team.payroll.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

<div className="mt-8">
  
<div className="mb-5 flex flex-wrap items-center justify-between gap-4">
  <h3 className="text-xl font-bold text-white">
    MLB Team Payroll Comparison
  </h3>

  <div className="flex flex-wrap gap-2">
    {[
      { label: "Top 10", value: "top" },
      { label: "Bottom 10", value: "bottom" },
      { label: "All 30", value: "all" },
    ].map((filter) => (
      <button
        key={filter.value}
        type="button"
        onClick={() =>
          setPayrollChartFilter(
            filter.value as "top" | "bottom" | "all"
          )
        }
        className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
          payrollChartFilter === filter.value
            ? "bg-blue-600 text-white"
            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
        }`}
      >
        {filter.label}
      </button>
    ))}
  </div>
</div>


  <div className="space-y-4">
    
{(payrollChartFilter === "top"
  ? teamPayrolls.slice(0, 10)
  : payrollChartFilter === "bottom"
  ? teamPayrolls.slice(-10).reverse()
  : teamPayrolls
).map((team) => (

      <div key={team.team}>
        <div className="mb-2 flex justify-between gap-4 text-sm">
          <span className="font-medium text-slate-200">
            {team.team}
          </span>
          <span className="text-slate-400">
            ${(team.payroll / 1000000).toFixed(1)}M
          </span>
        </div>

        <div className="h-4 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-blue-600"
            style={{
              width: `${
                (team.payroll / teamPayrolls[0].payroll) * 100
              }%`,
            }}
          />
        </div>
      </div>
    ))}
  </div>
</div>

    </>
  )}
</div>

  </div>
)}

{activeTab === "Front Office Insights" && (
  <div className="rounded-xl border border-blue-800 bg-slate-900 p-6 md:col-span-3">
    <h2 className="text-2xl font-bold">
      Front Office Insights
    </h2>
<div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
  <span className="font-medium text-blue-400">
    2026 Season • Salary & bWAR Data Snapshot
  </span>

  <span className="text-slate-400">
    Latest local dataset update: October 24, 2026
  </span>
</div>
    <p className="mt-3 text-slate-400">
      Explore player contract values, identify potential
      bargains, and evaluate roster improvement opportunities
      using MLB performance and payroll data.
    </p>
    <details className="mt-6 rounded-xl border border-slate-700 bg-slate-800/50 p-5">
  <summary className="cursor-pointer text-lg font-semibold text-white hover:text-blue-400">
  Data & Methodology
</summary>

  <p className="mb-3 text-sm text-slate-300">
    DiamondIQ combines 2026 MLB player salary data with
    Baseball-Reference Wins Above Replacement (bWAR) to evaluate
    player production relative to salary.
  </p>

  <p className="mb-3 text-sm text-slate-300">
    Cost Efficiency is calculated by dividing a player's annual
    salary by their bWAR. Lower values indicate more production
    per dollar spent. The minimum WAR filter helps exclude
    players with small WAR totals.
  </p>

  <p className="text-sm text-slate-400">
    Rankings include players with matching salary and WAR records.
    Missing values are displayed as N/A. Salary per WAR is a
    descriptive metric, not a projection of future performance
    or a complete measure of contract value.
  </p>
</details>

<div className="mt-8 w-full min-w-0">
  <h3 className="mb-4 text-xl font-bold text-white">
    

{leaderboardView === "Cost Efficiency"
  ? "Top 10 Most Cost-Efficient MLB Players"
  : leaderboardView === "Highest WAR"
  ? "Top 10 MLB Players by bWAR"
  : "Top 10 Highest-Paid MLB Players"}


  </h3>

<div className="mb-5 flex flex-wrap gap-3">
  {["Cost Efficiency", "Highest Paid", "Highest WAR"].map((view) => (
    <button
      key={view}
      type="button"
      onClick={() => setLeaderboardView(view)}
      className={`rounded-lg px-4 py-2 font-medium transition-colors ${
        leaderboardView === view
          ? "bg-blue-600 text-white"
          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
      }`}
    >
      {view}
    </button>
  ))}
</div>
<div className="mt-4 mb-6">
  <label className="mb-2 block text-sm font-medium text-slate-300">
    Filter by Team
  </label>

  <select
    value={selectedTeamFilter}
    onChange={(e) => setSelectedTeamFilter(e.target.value)}
    className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
  >
    <option value="All Teams">All Teams</option>

    {[...new Set(salaryData.map((player) => player.team))]
      .sort()
      .map((team) => (
        <option key={team} value={team}>
          {team}
        </option>
      ))}
  </select>
</div>
<div className="mb-5">
  <button
    type="button"
    onClick={downloadLeaderboard}
    disabled={leaderboardPlayers.length === 0}
    className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
  >
    Export All Filtered Players (CSV)
  </button>
</div>
<button
  type="button"
  onClick={resetLeaderboardFilters}
  className="mb-5 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
>
  Reset Filters
</button>

<div className="mb-6">
  <label className="mb-2 block text-sm font-medium text-slate-300">
    Search Players
  </label>

  <input
    type="text"
    value={leaderboardSearch}
    onChange={(e) => setLeaderboardSearch(e.target.value)}
    placeholder="Search by player name..."
    className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
  />
</div>
{leaderboardView === "Cost Efficiency" && (
  <div className="mb-5">
    <p className="mb-2 text-sm font-medium text-slate-300">
      Minimum WAR: {minimumWar.toFixed(1)}
    </p>

    <div className="flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setMinimumWar(value)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            minimumWar === value
              ? "bg-blue-600 text-white"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
        >
          {value}+ WAR
        </button>
      ))}
    </div>
    
    
<p className="mt-3 text-sm text-slate-400">
{leaderboardPlayers.length}{" "}
{leaderboardPlayers.length === 1
  ? "player qualifies"
  : "players qualify"}{" "}
with at least{" "}
  {minimumWar.toFixed(1)} WAR
  {selectedTeamFilter === "All Teams"
    ? " across all MLB teams."
    : ` for the ${selectedTeamFilter}.`}
</p>

{leaderboardView === "Cost Efficiency" &&
  leaderboardPlayers.length > 0 && (
  <div className="mt-5 rounded-xl border border-blue-500/30 bg-slate-800 p-5">
    <p className="mb-2 text-sm font-semibold text-blue-400">
      Best Value Player
    </p>

    <h3 className="text-2xl font-bold text-white">
  {leaderboardPlayers[0].player}
    </h3>

    <p className="mt-1 text-sm text-slate-400">
      {playerEfficiency[0].team}
    </p>

    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <p className="text-xs text-slate-400">2026 Salary</p>
        <p className="font-semibold text-white">
    ${leaderboardPlayers[0].salary.toLocaleString()}
        </p>
      </div>

      <div>
        <p className="text-xs text-slate-400">2026 bWAR</p>
        <p className="font-semibold text-white">
      {leaderboardPlayers[0].war?.toFixed(2)}
        </p>
      </div>

      <div>
        <p className="text-xs text-slate-400">Salary / WAR</p>
        <p className="font-bold text-blue-400">
        ${Math.round(leaderboardPlayers[0].salaryPerWar ?? 0).toLocaleString()}
        </p>
      </div>
    </div>
  </div>
)}

  </div>
)}
{leaderboardView === "Highest WAR" &&
  highestWarPlayers.filter(matchesPlayerSearch).length > 0 && (
  <div className="mb-6 rounded-xl border border-blue-500/30 bg-slate-800 p-5">
    <p className="mb-2 text-sm font-semibold text-blue-400">
      Highest WAR Player
    </p>

    <h3 className="text-2xl font-bold text-white">
{highestWarPlayers.filter(matchesPlayerSearch)[0].player}
    </h3>

    <p className="mt-1 text-sm text-slate-400">
{highestWarPlayers.filter(matchesPlayerSearch)[0].team}
    </p>

    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <p className="text-xs text-slate-400">2026 bWAR</p>
        <p className="text-xl font-bold text-blue-400">
{highestWarPlayers.filter(matchesPlayerSearch)[0].war.toFixed(2)}
        </p>
      </div>

      <div>
        <p className="text-xs text-slate-400">2026 Salary</p>
        <p className="text-xl font-semibold text-white">
{highestWarPlayers.filter(matchesPlayerSearch)[0].salary.toLocaleString()}
        </p>
      </div>
    </div>
  </div>
)}
  {leaderboardView === "Highest Paid" && leaderboardPlayers.length > 0 && (
  <div className="mb-6 rounded-xl border border-blue-500/30 bg-slate-800 p-5">
    <p className="mb-2 text-sm font-semibold text-blue-400">
      Highest-Paid Player
    </p>

    <h3 className="text-2xl font-bold text-white">
      {leaderboardPlayers[0].player}
    </h3>

    <p className="mt-1 text-sm text-slate-400">
      {leaderboardPlayers[0].team}
    </p>

    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <p className="text-xs text-slate-400">2026 Salary</p>
        <p className="text-xl font-bold text-blue-400">
          ${leaderboardPlayers[0].salary.toLocaleString()}
        </p>
      </div>

      <div>
        <p className="text-xs text-slate-400">2026 bWAR</p>
        <p className="text-xl font-semibold text-white">
          {leaderboardPlayers[0].war != null
            ? leaderboardPlayers[0].war.toFixed(2)
            : "N/A"}
        </p>
      </div>

      <div>
        <p className="text-xs text-slate-400">Salary / WAR</p>
        <p className="text-xl font-semibold text-white">
          {leaderboardPlayers[0].salaryPerWar != null
            ? `$${Math.round(
                leaderboardPlayers[0].salaryPerWar
              ).toLocaleString()}`
            : "N/A"}
        </p>
      </div>
    </div>
  </div>
)}
  <p className="mb-4 text-sm text-slate-400">
    

{leaderboardView === "Cost Efficiency"
  ? "Rankings based on 2026 salary per bWAR. Lower values indicate more production per dollar."
  : leaderboardView === "Highest WAR"
  ? "Players ranked by 2026 Baseball-Reference WAR (bWAR). Higher values indicate greater on-field value. Only players with matching salary and WAR records are included."
  : "The 10 highest-paid MLB players in the 2026 salary dataset, ranked by annual salary."}


  </p>

  <div className="overflow-x-auto rounded-lg border border-slate-700">
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-800 text-slate-200">
        <tr>
          <th className="p-3">Rank</th>
          <th className="p-3">Player</th>
          <th className="p-3">Team</th>
          
<th
  className={`p-3 ${
    leaderboardView === "Highest Paid"
      ? "text-blue-400"
      : ""
  }`}
>
  Salary
</th>

          
<th
  className={`p-3 ${
    leaderboardView === "Highest WAR"
      ? "text-blue-400"
      : ""
  }`}
>
  bWAR
</th>

          
<th
  className={`p-3 ${
    leaderboardView === "Cost Efficiency"
      ? "text-blue-400"
      : ""
  }`}
>
  Salary / WAR
</th>

        </tr>
      </thead>

      <tbody>
      
{leaderboardPlayers.length === 0 && (
  <tr>
    <td colSpan={6} className="px-6 py-12 text-center">
      <p className="text-lg font-semibold text-white">
        No players found
      </p>
      <p className="mt-2 text-sm text-slate-400">
        Try a different player name, select another team,
        or lower the Minimum WAR requirement.
      </p>
    </td>
  </tr>
)}
  
{leaderboardPlayers.slice(0, 10).map((player, index) => (

          <tr
            key={`${player.player}-${index}`}
            className="border-t border-slate-700 text-slate-300"
          >
            <td className="p-3">{index + 1}</td>
            <td className="p-3 font-medium">{player.player}</td>
            <td className="p-3">{player.team}</td>
            
<td
  className={`p-3 ${
    leaderboardView === "Highest Paid"
      ? "font-bold text-blue-400"
      : ""
  }`}
>
  ${player.salary.toLocaleString()}
</td>

            

<td
  className={`p-3 ${
    leaderboardView === "Highest WAR"
      ? "font-bold text-blue-400"
      : ""
  }`}
>

  {player.war !== null ? player.war.toFixed(2) : "N/A"}
</td>

            
<td
  className={`p-3 ${
    leaderboardView === "Cost Efficiency"
      ? "font-bold text-blue-400"
      : ""
  }`}
>

              
{player.salaryPerWar !== null
  ? `$${Math.round(player.salaryPerWar).toLocaleString()}`
  : "N/A"}

            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

  </div>
)}

{false && (
  <>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Player Value
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Evaluate player performance relative to salary.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Team Payroll
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Compare spending and roster construction
              across MLB teams.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Front Office Insights
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Identify efficient contracts and potential
              roster improvements.
            </p>
          </div>
          </>
)}
          {activeTab === "Team Roster Value" && (
          <div className="mt-8 w-full min-w-0 rounded-xl border border-blue-800 bg-slate-900 p-6 md:col-span-3">
  
<div className="mb-4">
  <div className="mb-2 flex items-center gap-3">
    <span className="rounded-full bg-blue-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-300">
      MLB Front Office Analytics
    </span>
  </div>

  <h2 className="text-3xl font-extrabold tracking-tight text-white">
    Team Roster Value
  </h2>

  <p className="mt-1 text-sm font-medium text-blue-400">
    2026 MLB | All 30 Teams | Payroll &amp; WAR Analysis
  </p>
</div>


  <p className="mt-2 text-sm text-slate-400">
    Compare MLB teams by total player WAR, payroll, and cost efficiency.
  </p>
  <div className="mt-4 mb-4">
  <label className="mb-2 block text-sm font-medium text-slate-300">
    Sort Teams By
  </label>

  <select
    value={teamSortBy}
    onChange={(e) => setTeamSortBy(e.target.value)}
    className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
  >
    <option value="WAR">Total bWAR</option>
    <option value="Payroll">Payroll</option>
    <option value="Cost">Cost per WAR</option>
    <option value="Matched">Players Matched</option>
  </select>
</div>
  <div className="mt-6 w-full min-w-0">
  <table className="w-full table-fixed text-left text-xs">
    <thead className="border-b border-slate-700 text-slate-400">
      <tr>
        <th className="px-2 py-3">Rank</th>
        <th className="px-2 py-3">Team</th>
        <th className="px-2 py-3">Payroll</th>
        <th className="px-2 py-3">Total bWAR</th>
        <th className="px-2 py-3">WAR Matches / Salary Records</th>
        <th className="px-2 py-3">Cost per WAR</th>
      </tr>
    </thead>

    <tbody>
      {teamRosterValue.map((team, index) => (
        <tr
          key={team.team}
          className="border-b border-slate-800 text-slate-200"
        >
          <td className="px-2 py-3">{index + 1}</td>
          <td className="p-3 font-semibold">{team.team}</td>
          <td className="px-2 py-3">
            ${team.payroll.toLocaleString()}
          </td>
          <td className="px-2 py-3">{team.totalWar.toFixed(2)}</td>
          <td className="px-2 py-3">
            {team.matchedPlayers} / {team.players}
{" "}
<span className="text-slate-400">
  (
  {team.players > 0
    ? ((team.matchedPlayers / team.players) * 100).toFixed(1)
    : "0.0"}
  %)
</span>
          </td>
          <td className="px-2 py-3">
            {team.costPerWar !== null
              ? `$${Math.round(team.costPerWar).toLocaleString()}`
              : "N/A"}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

<div className="mt-10 border-t border-blue-800 pt-8">
  <h3 className="mb-2 text-xl font-bold text-white">
    Payroll vs. Total bWAR
  </h3>
  <p className="mb-6 text-sm text-slate-400">
    Compare team payroll spending with total roster production.
    Hover over a dot to see its values.
  </p>

<p className="mb-5 rounded-lg border border-slate-700 bg-slate-800 p-4 text-sm leading-relaxed text-slate-300">
  <span className="font-semibold text-white">Methodology:</span>{" "}
  Team payroll is calculated from available 2026 salary records.
  Total bWAR is the sum of matched player WAR values, including
  negative WAR. Dashed lines represent the average payroll and
  bWAR across the 30 teams. Quadrants show relative spending
  and production, not definitive front office performance.
  Missing player matches and differences in roster coverage
  may affect team comparisons.
</p>

<div className="mb-6 flex items-center gap-3">
  <label className="text-sm font-semibold text-slate-300">
    Highlight Team:
  </label>

  <select
    value={highlightedTeam}
    onChange={(e) => setHighlightedTeam(e.target.value)}
    className="rounded-lg border border-blue-800 bg-slate-800 px-4 py-2 text-sm text-white"
  >
    <option value="All Teams">All Teams</option>

    {[...teamScatterData]
      .sort((a, b) => a.team.localeCompare(b.team))
      .map((team) => (
        <option key={team.team} value={team.team}>
          {team.team}
        </option>
      ))}
  </select>
</div>

{selectedTeamData && (
  <div className="mb-6 rounded-xl border border-orange-500 bg-slate-800 p-5">
    <h4 className="mb-4 text-lg font-bold text-orange-400">
      {selectedTeamData.team} — Roster Value
    </h4>

<div className="mb-5 rounded-lg border border-slate-600 bg-slate-900 p-3">
  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
    Payroll vs. bWAR Quadrant
  </p>
  <p className="mt-1 text-base font-bold text-orange-400">
    {selectedTeamQuadrant}
  </p>
</div>

<div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
  <div className="rounded-lg border border-slate-600 bg-slate-900 p-4">
    <p className="text-sm text-slate-400">
      Payroll vs. Team Average
    </p>
    <p className="mt-1 text-xl font-bold text-white">
      {selectedPayrollDifference >= 0 ? "+" : "-"}$
      {Math.abs(selectedPayrollDifference).toFixed(1)}M
    </p>
    <p className="mt-1 text-xs text-slate-400">
      {selectedPayrollDifference >= 0 ? "Above" : "Below"} average payroll
    </p>
  </div>

  <div className="rounded-lg border border-slate-600 bg-slate-900 p-4">
    <p className="text-sm text-slate-400">
      bWAR vs. Team Average
    </p>
    <p className="mt-1 text-xl font-bold text-white">
      {selectedWarDifference >= 0 ? "+" : ""}
      {selectedWarDifference.toFixed(2)}
    </p>
    <p className="mt-1 text-xs text-slate-400">
      {selectedWarDifference >= 0 ? "Above" : "Below"} average bWAR
    </p>
  </div>
</div>

    <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
      <div>
        <p className="text-sm text-slate-400">Team Payroll</p>
        <p className="text-xl font-bold text-white">
          ${selectedTeamData.payroll.toLocaleString()}
        </p>
      </div>

      <div>
        <p className="text-sm text-slate-400">Total bWAR</p>
        <p className="text-xl font-bold text-white">
          {selectedTeamData.totalWar.toFixed(2)}
        </p>
      </div>

<div>
  <p className="text-sm text-slate-400">WAR Data Coverage</p>
  <p className="text-xl font-bold text-white">
    {selectedTeamData.matchedPlayers} / {selectedTeamData.players}
  </p>
  <p className="text-xs text-slate-400">
    {selectedTeamData.players > 0
      ? (
          (selectedTeamData.matchedPlayers /
            selectedTeamData.players) *
          100
        ).toFixed(1)
      : "0.0"}
    % of salary records matched
  </p>
</div>

      <div>
        <p className="text-sm text-slate-400">Cost per WAR</p>
        <p className="text-xl font-bold text-white">
          {selectedTeamData.costPerWar !== null
            ? `$${selectedTeamData.costPerWar.toLocaleString(
                "en-US",
                { maximumFractionDigits: 0 }
              )}`
            : "N/A"}
        </p>
      </div>
    </div>
  </div>
)}

<div className="mb-5 flex flex-wrap gap-6 rounded-lg border border-slate-700 bg-slate-800 p-4">
  <div>
    <p className="text-sm text-slate-400">
      Average Team Payroll
    </p>
    <p className="text-xl font-bold text-orange-400">
      ${averagePayroll.toFixed(1)}M
    </p>
  </div>

  <div>
    <p className="text-sm text-slate-400">
      Average Team bWAR
    </p>
    <p className="text-xl font-bold text-green-400">
      {averageWar.toFixed(2)}
    </p>
  </div>
</div>

  <div className="h-105 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
        <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="payrollMillions"
          name="Payroll"
          unit="M"
          tick={{ fill: "#94a3b8" }}
          label={{
            value: "Payroll ($ Millions)",
            position: "insideBottom",
            offset: -15,
            fill: "#94a3b8",
          }}
        />
        <YAxis
          type="number"
          dataKey="totalWar"
          name="Total bWAR"
          tick={{ fill: "#94a3b8" }}
          label={{
            value: "Total bWAR",
            angle: -90,
            position: "insideLeft",
            fill: "#94a3b8",
          }}
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const team = payload[0].payload;
            return (
              <div className="rounded-lg border border-blue-700 bg-slate-900 p-3 text-sm text-white shadow-lg">
                <p className="font-bold">{team.team}</p>
                <p>Payroll: ${team.payrollMillions.toFixed(1)}M</p>
                <p>Total bWAR: {team.totalWar.toFixed(2)}</p>
              </div>
            );
          }}
        />
        

<ReferenceLine
  x={averagePayroll}
  stroke="#f59e0b"
  strokeDasharray="6 6"
  strokeWidth={2}
/>

<ReferenceLine
  y={averageWar}
  stroke="#22c55e"
  strokeDasharray="6 6"
  strokeWidth={2}
/>




<Scatter
  name="MLB Teams"
  data={teamScatterData}
  fill="#38bdf8"
>
  {teamScatterData.map((team) => (
    
<Cell
  key={team.team}
  fill={
    highlightedTeam === team.team
      ? "#f97316"
      : "#38bdf8"
  }
  fillOpacity={
    highlightedTeam === "All Teams" ||
    highlightedTeam === team.team
      ? 1
      : 0.2
  }
/>

  ))}
</Scatter>






      </ScatterChart>
    </ResponsiveContainer>
  </div>

<div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
  <div className="rounded-lg border border-green-800 bg-slate-800 p-4">
    <p className="font-semibold text-green-400">
      Top Left: High Production, Lower Payroll
    </p>
    <p className="mt-2 text-2xl font-bold text-white">
  {quadrantCounts.topLeft} Teams
</p>
    <p className="mt-1 text-sm text-slate-400">
      Teams producing above-average bWAR with below-average payroll.
    </p>

<div className="mt-3 flex flex-wrap gap-2">
  {teamScatterData
    .filter(
      (team) =>
        team.payrollMillions < averagePayroll &&
        team.totalWar >= averageWar
    )
    .map((team) => (
      <span
        key={team.team}
        className="rounded-md border border-green-800 bg-slate-900 px-3 py-1 text-sm text-green-300"
      >
        {team.team}
      </span>
    ))}
</div>

  </div>

  <div className="rounded-lg border border-blue-800 bg-slate-800 p-4">
    <p className="font-semibold text-blue-400">
      Top Right: High Production, Higher Payroll
    </p>

<p className="mt-2 text-2xl font-bold text-white">
  {quadrantCounts.topRight} Teams
</p>

    <p className="mt-1 text-sm text-slate-400">
      Teams producing above-average bWAR with above-average payroll.
    </p>

<div className="mt-3 flex flex-wrap gap-2">
  {teamScatterData
    .filter(
      (team) =>
        team.payrollMillions >= averagePayroll &&
        team.totalWar >= averageWar
    )
    .map((team) => (
      <span
        key={team.team}
        className="rounded-md border border-blue-800 bg-slate-900 px-3 py-1 text-sm text-blue-300"
      >
        {team.team}
      </span>
    ))}
</div>

  </div>

  <div className="rounded-lg border border-slate-600 bg-slate-800 p-4">
    <p className="font-semibold text-slate-200">
      Bottom Left: Low Production, Lower Payroll
    </p>

<p className="mt-2 text-2xl font-bold text-white">
  {quadrantCounts.bottomLeft} Teams
</p>

    <p className="mt-1 text-sm text-slate-400">
      Teams producing below-average bWAR with below-average payroll.
    </p>

<div className="mt-3 flex flex-wrap gap-2">
  {teamScatterData
    .filter(
      (team) =>
        team.payrollMillions < averagePayroll &&
        team.totalWar < averageWar
    )
    .map((team) => (
      <span
        key={team.team}
        className="rounded-md border border-slate-600 bg-slate-900 px-3 py-1 text-sm text-slate-200"
      >
        {team.team}
      </span>
    ))}
</div>

  </div>

  <div className="rounded-lg border border-orange-800 bg-slate-800 p-4">
    <p className="font-semibold text-orange-400">
      Bottom Right: Low Production, Higher Payroll
    </p>

<p className="mt-2 text-2xl font-bold text-white">
  {quadrantCounts.bottomRight} Teams
</p>

    <p className="mt-1 text-sm text-slate-400">
      Teams producing below-average bWAR despite above-average payroll.
    </p>

<div className="mt-3 flex flex-wrap gap-2">
  {teamScatterData
    .filter(
      (team) =>
        team.payrollMillions >= averagePayroll &&
        team.totalWar < averageWar
    )
    .map((team) => (
      <span
        key={team.team}
        className="rounded-md border border-orange-800 bg-slate-900 px-3 py-1 text-sm text-orange-300"
      >
        {team.team}
      </span>
    ))}

</div>
</div>
</div>

<div className="mt-8 rounded-xl border border-blue-800 bg-slate-800 p-6">

  <h3 className="mb-2 text-xl font-bold text-white">
    Top 5 Most Cost-Efficient MLB Teams
  </h3>

{highlightedTeam !== "All Teams" && (
  <button
    type="button"
    onClick={() => setHighlightedTeam("All Teams")}
    className="mb-4 rounded-lg border border-blue-600 bg-blue-900 px-4 py-2 text-sm font-semibold text-blue-200 transition-colors hover:bg-blue-800"
  >
    Clear Team Selection
  </button>
)}

  <p className="mb-5 text-sm text-slate-400">
    Ranked by lowest payroll cost per bWAR.
    Only teams with positive total bWAR and at least
    80% WAR match coverage qualify.
  </p>

  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="border-b border-slate-600 text-slate-400">
        <tr>
          <th className="px-3 py-3">Rank</th>
          <th className="px-3 py-3">Team</th>
          <th className="px-3 py-3">Payroll</th>
          <th className="px-3 py-3">Total bWAR</th>
          <th className="px-3 py-3">Cost per WAR</th>
        </tr>
      </thead>

      <tbody>
        {topEfficientTeams.map((team, index) => (
          


<tr
  key={team.team}
  onClick={() => setHighlightedTeam(team.team)}
  className={`cursor-pointer border-b border-slate-700 text-white transition-colors hover:bg-slate-700 ${
    highlightedTeam === team.team ? "bg-slate-700" : ""
  }`}
  title={`Highlight ${team.team} on the scatter plot`}
>
  <td className="px-3 py-3 font-bold">
    #{index + 1}
  </td>

            
<td className="px-3 py-3">
  {team.team}
  {highlightedTeam === team.team && (
    <span className="ml-2 rounded bg-blue-900 px-2 py-1 text-xs font-semibold text-blue-300">
      Selected
    </span>
  )}
</td>

            <td className="px-3 py-3">
              ${team.payroll.toLocaleString()}
            </td>
            <td className="px-3 py-3">
              {team.totalWar.toFixed(2)}
            </td>
            <td className="px-3 py-3 font-semibold text-green-400">
              {team.costPerWar !== null
                ? `$${team.costPerWar.toLocaleString(
                    "en-US",
                    { maximumFractionDigits: 0 }
                  )}`
                : "N/A"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

<div className="mt-8 rounded-xl border border-orange-800 bg-slate-800 p-6">
  <h3 className="mb-2 text-xl font-bold text-white">
    Top 5 Least Cost-Efficient MLB Teams
  </h3>

  <p className="mb-5 text-sm text-slate-400">
    Ranked by highest payroll cost per bWAR.
    Only teams with positive total bWAR and at least
    80% WAR match coverage qualify.
  </p>

  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="border-b border-slate-600 text-slate-400">
        <tr>
          <th className="px-3 py-3">Rank</th>
          <th className="px-3 py-3">Team</th>
          <th className="px-3 py-3">Payroll</th>
          <th className="px-3 py-3">Total bWAR</th>
          <th className="px-3 py-3">Cost per WAR</th>
        </tr>
      </thead>

      <tbody>
        {leastEfficientTeams.map((team, index) => (
          
<tr
  key={team.team}
  onClick={() => setHighlightedTeam(team.team)}
  className={`cursor-pointer border-b border-slate-700 text-white transition-colors hover:bg-slate-700 ${
    highlightedTeam === team.team ? "bg-slate-700" : ""
  }`}
  title={`Highlight ${team.team} on the scatter plot`}
>

            <td className="px-3 py-3 font-bold">
              #{index + 1}
            </td>
            
<td className="px-3 py-3">
  {team.team}
  {highlightedTeam === team.team && (
    <span className="ml-2 rounded bg-orange-900 px-2 py-1 text-xs font-semibold text-orange-300">
      Selected
    </span>
  )}
</td>

            <td className="px-3 py-3">
              ${team.payroll.toLocaleString()}
            </td>
            <td className="px-3 py-3">
              {team.totalWar.toFixed(2)}
            </td>
            <td className="px-3 py-3 font-semibold text-orange-400">
              {team.costPerWar !== null
                ? `$${team.costPerWar.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}`
                : "N/A"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

<div className="mt-8 rounded-xl border border-blue-800 bg-slate-800 p-6">
  <h3 className="mb-5 text-xl font-bold text-white">
    Front Office Takeaways
  </h3>

  {bestValueTeam && (
    <div className="rounded-lg border border-green-800 bg-slate-900 p-5">
      <p className="text-sm font-semibold uppercase tracking-wide text-green-400">
        Best Payroll Efficiency
      </p>

      <h4 className="mt-2 text-2xl font-bold text-white">
        {bestValueTeam.team}
      </h4>

      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        {bestValueTeam.team} has the lowest payroll cost per bWAR
        among teams meeting the 80% WAR match threshold,
        at approximately $
        {bestValueTeam.costPerWar?.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })} per bWAR.
        This suggests strong payroll efficiency within the
        available 2026 dataset, although it does not account
        for every aspect of roster construction.
      </p>
    </div>
  )}

{efficiencyGap !== null && bestValueTeam && leastValueTeam && (
  <div className="mt-4 rounded-lg border border-blue-800 bg-slate-900 p-5">
    <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
      Payroll Efficiency Gap
    </p>

    <h4 className="mt-2 text-2xl font-bold text-white">
      {efficiencyGap.toFixed(2)}x Difference
    </h4>

    <p className="mt-3 text-sm leading-relaxed text-slate-300">
      The {leastValueTeam.team} have a payroll cost per bWAR
      approximately {efficiencyGap.toFixed(2)} times higher
      than the {bestValueTeam.team}.
      This comparison highlights the difference in recorded
      payroll efficiency between the highest- and lowest-ranked
      qualifying teams in the available 2026 dataset.
    </p>

    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-green-800 bg-slate-800 p-3">
        <p className="text-xs text-green-400">Most Efficient</p>
        <p className="mt-1 font-bold text-white">
          {bestValueTeam.team}
        </p>
        <p className="text-sm text-slate-300">
          ${bestValueTeam.costPerWar?.toLocaleString("en-US", {
            maximumFractionDigits: 0,
          })} per bWAR
        </p>
      </div>

      <div className="rounded-lg border border-orange-800 bg-slate-800 p-3">
        <p className="text-xs text-orange-400">Least Efficient</p>
        <p className="mt-1 font-bold text-white">
          {leastValueTeam.team}
        </p>
        <p className="text-sm text-slate-300">
          ${leastValueTeam.costPerWar?.toLocaleString("en-US", {
            maximumFractionDigits: 0,
          })} per bWAR
        </p>
      </div>
    </div>
  </div>
)}

<div className="mt-4 rounded-lg border border-green-800 bg-slate-900 p-5">
  <p className="text-sm font-semibold uppercase tracking-wide text-green-400">
    High Production, Lower Payroll
  </p>

  <h4 className="mt-2 text-2xl font-bold text-white">
    {quadrantCounts.topLeft} MLB Teams
  </h4>

  <p className="mt-3 text-sm leading-relaxed text-slate-300">
    {quadrantCounts.topLeft} teams generated above-average
    total bWAR while operating with below-average payroll.
    These teams represent potential examples of efficient
    roster construction within the available 2026 data.
  </p>

<div className="mt-4 flex flex-wrap gap-2">
  {teamScatterData
    .filter(
      (team) =>
        team.payrollMillions < averagePayroll &&
        team.totalWar >= averageWar
    )
    .map((team) => (
      <span
        key={team.team}
        className="rounded-md border border-green-800 bg-slate-800 px-3 py-1 text-sm text-green-300"
      >
        {team.team}
      </span>
    ))}
</div>

</div>

<div className="mt-4 rounded-lg border border-orange-800 bg-slate-900 p-5">
  <p className="text-sm font-semibold uppercase tracking-wide text-orange-400">
    High Payroll, Lower Production
  </p>



  <h4 className="mt-2 text-2xl font-bold text-white">
    {quadrantCounts.bottomRight} MLB Teams
  </h4>

  <p className="mt-3 text-sm leading-relaxed text-slate-300">
    {quadrantCounts.bottomRight} teams have above-average
    payroll but below-average total bWAR in the available
    2026 dataset. This may indicate opportunities to
    investigate roster spending and player production.
    However, payroll commitments, injuries, missing data,
    and other factors should be considered before drawing
    conclusions about front office performance.
  </p>
  <div className="mt-4 flex flex-wrap gap-2">
  {teamScatterData
    .filter(
      (team) =>
        team.payrollMillions >= averagePayroll &&
        team.totalWar < averageWar
    )
    .map((team) => (
      <span
        key={team.team}
        className="rounded-md border border-orange-800 bg-slate-800 px-3 py-1 text-sm text-orange-300"
      >
        {team.team}
      </span>
    ))}
</div>
</div>

</div>

  </div>
</div>



)}
</div>
      </div>
    </main>
  );
}
