
"use client";

import { useEffect, useState } from "react";
type MLBPlayer = {
  id: number;
  name: string;
  position: string;
  team: string;
};
function isRelatedPosition(
  playerPosition: string,
  rosterPosition: string
): boolean {
  if (playerPosition === rosterPosition) {
    return true;
  }

  const outfieldPositions = ["LF", "CF", "RF", "OF"];
  const infieldPositions = ["2B", "SS", "3B"];

  if (outfieldPositions.includes(playerPosition)) {
    return outfieldPositions.includes(rosterPosition);
  }

  if (infieldPositions.includes(playerPosition)) {
    return infieldPositions.includes(rosterPosition);
  }

  return false;
}
export default function TeamFitSelector() {
  const [playerSearch, setPlayerSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<{
  id: number;
  name: string;
  position: string;
  team: string;
} | null>(null);
const [selectedTeam, setSelectedTeam] = useState("");
const [playerStats, setPlayerStats] = useState<Record<string, unknown> | null>(null);

const [advancedStats, setAdvancedStats] = useState<{
  reliableHittingIndex: number | null;
  reliablePitchingIndex: number | null;
  parkAdjustedHittingIndex: number | null;
  parkAdjustedPitchingIndex: number | null;
} | null>(null);

const [statsLoading, setStatsLoading] = useState(false);

useEffect(() => {
  if (!selectedPlayer) {
    setPlayerStats(null);
    setAdvancedStats(null);
    setStatsLoading(false);
    return;
  }


  const controller = new AbortController();

  async function loadPlayerStats() {
    setStatsLoading(true);
setPlayerStats(null);
setAdvancedStats(null);

    try {
      const group =
        selectedPlayer?.position === "P" ? "pitching" : "hitting";

      const response = await fetch(
        `/api/player-stats?id=${selectedPlayer?.id}&season=2026&group=${group}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error("Unable to load player statistics");
      }

      const data = await response.json();

      
const advancedResponse = await fetch(
  `/api/advanced-stats?id=${selectedPlayer?.id}&group=${group}`,
  { signal: controller.signal }
);

if (advancedResponse.ok) {
  const advancedData = await advancedResponse.json();

  if (!controller.signal.aborted) {
    setAdvancedStats({
      reliableHittingIndex: advancedData.reliableHittingIndex,
      reliablePitchingIndex: advancedData.reliablePitchingIndex,
      parkAdjustedHittingIndex: advancedData.parkAdjustedHittingIndex,
      parkAdjustedPitchingIndex: advancedData.parkAdjustedPitchingIndex,
    });
  }
} else if (!controller.signal.aborted) {
  setAdvancedStats(null);
}


      if (!controller.signal.aborted) {
        setPlayerStats(data.stats ?? null);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error("Player statistics error:", error);
        setPlayerStats(null);
      }
    } finally {
      if (!controller.signal.aborted) {
        setStatsLoading(false);
      }
    }
  }

  loadPlayerStats();

  return () => controller.abort();
}, [selectedPlayer]);
const [teamRoster, setTeamRoster] = useState<
  { id: number; name: string; position: string }[]
>([]);
const [rosterPerformance, setRosterPerformance] = useState<
  Record<
    number,
    {
      performanceIndex: number | null;
    }
  >
>({});
const [rosterLoading, setRosterLoading] = useState(false);
const [rosterError, setRosterError] = useState("");
const [rosterDefense, setRosterDefense] = useState<
  Record<
    number,
    {
      oaa: number | null;
      defensiveInnings: number | null;
      position: string | null;
    }
  >
>({});
const mlbTeams = [
  "Arizona Diamondbacks",
  "Atlanta Braves",
  "Baltimore Orioles",
  "Boston Red Sox",
  "Chicago Cubs",
  "Chicago White Sox",
  "Cincinnati Reds",
  "Cleveland Guardians",
  "Colorado Rockies",
  "Detroit Tigers",
  "Houston Astros",
  "Kansas City Royals",
  "Los Angeles Angels",
  "Los Angeles Dodgers",
  "Miami Marlins",
  "Milwaukee Brewers",
  "Minnesota Twins",
  "New York Mets",
  "New York Yankees",
  "Athletics",
  "Philadelphia Phillies",
  "Pittsburgh Pirates",
  "San Diego Padres",
  "San Francisco Giants",
  "Seattle Mariners",
  "St. Louis Cardinals",
  "Tampa Bay Rays",
  "Texas Rangers",
  "Toronto Blue Jays",
  "Washington Nationals",
];
const [playerResults, setPlayerResults] = useState<MLBPlayer[]>([]);
const [isLoading, setIsLoading] = useState(false);

useEffect(() => {
  if (playerSearch.trim().length < 2) {
    return;
  }

  const controller = new AbortController();

  const timer = setTimeout(async () => {
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/players?search=${encodeURIComponent(playerSearch.trim())}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error("Player search failed");
      }

      const data = await response.json();
      setPlayerResults(data.players ?? []);
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error("Unable to search players:", error);
        setPlayerResults([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, 300);

  return () => {
    clearTimeout(timer);
    controller.abort();
  };
}, [playerSearch]);
useEffect(() => {
  if (!selectedTeam) {
  setTeamRoster([]);
  setRosterPerformance({});
  setRosterError("");
  return;
}

  const controller = new AbortController();

  async function loadRoster() {
    setRosterLoading(true);
    setRosterError("");
    setTeamRoster([]);
setRosterPerformance({});
    try {
      const teamsResponse = await fetch(
        "https://statsapi.mlb.com/api/v1/teams?sportId=1",
        { signal: controller.signal }
      );

      if (!teamsResponse.ok) {
        throw new Error("Unable to load MLB teams");
      }

      const teamsData = await teamsResponse.json();

      const team = teamsData.teams?.find(
        (item: { id: number; name: string }) =>
          item.name === selectedTeam
      );

      if (!team) {
        throw new Error("Selected MLB team not found");
      }

      const rosterResponse = await fetch(
        `https://statsapi.mlb.com/api/v1/teams/${team.id}/roster?rosterType=40Man`,
        { signal: controller.signal }
      );

      if (!rosterResponse.ok) {
        throw new Error("Unable to load team roster");
      }

      const rosterData = await rosterResponse.json();
const rosterPlayers: {
  id: number;
  name: string;
  position: string;
}[] = (rosterData.roster ?? []).map(
  (player: {
    person: { id: number; fullName: string };
    position: { abbreviation: string };
  }) => ({
    id: player.person.id,
    name: player.person.fullName,
    position: player.position.abbreviation,
  })
);
const defenseResults = await Promise.all(
  rosterPlayers.map(async (player) => {
    try {
      const response = await fetch(
        `/api/defensive-stats?id=${player.id}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        return {
          id: player.id,
          oaa: null,
          defensiveInnings: null,
          position: null,
        };
      }

      const data = await response.json();

      return {
        id: player.id,
        oaa: data.oaa as number | null,
        defensiveInnings: data.defensiveInnings as number | null,
        position: data.position as string | null,
      };
    } catch {
      return {
        id: player.id,
        oaa: null,
        defensiveInnings: null,
        position: null,
      };
    }
  })
);
const performanceResults = await Promise.all(
  rosterPlayers.map(async (player) => {
    try {
      const group =
        player.position === "P" ? "pitching" : "hitting";

      const response = await fetch(
        `/api/advanced-stats?id=${player.id}&group=${group}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        return { id: player.id, performanceIndex: null };
      }

      const data = await response.json();

      return {
        id: player.id,
        performanceIndex:
          group === "pitching"
            ? data.reliablePitchingIndex ?? null
            : data.reliableHittingIndex ?? null,
      };
    } catch {
      return { id: player.id, performanceIndex: null };
    }
  })
);
const rosterPerformanceMap: Record<
  number,
  {
    performanceIndex: number | null;
  }
> = {};
performanceResults.forEach((player) => {
  rosterPerformanceMap[player.id] = {
    performanceIndex: player.performanceIndex,
  };
});
const defenseMap: Record<
  number,
  {
    oaa: number | null;
    defensiveInnings: number | null;
    position: string | null;
  }
> = {};

defenseResults.forEach((player) => {
  defenseMap[player.id] = {
    oaa: player.oaa,
    defensiveInnings: player.defensiveInnings,
    position: player.position,
  };
});
      if (!controller.signal.aborted) {
        setRosterDefense(defenseMap);
        setRosterPerformance(rosterPerformanceMap);
        console.log(
  "DiamondIQ Roster Performance:",
  rosterPerformanceMap
);
        console.log("DiamondIQ Roster Defense:", defenseMap);
        console.log("Carson Benge Defense:", defenseMap[701807]);
        setTeamRoster(
          (rosterData.roster ?? []).map(
            (player: {
              person: { id: number; fullName: string };
              position: { abbreviation: string };
            }) => ({
              id: player.person.id,
              name: player.person.fullName,
              position: player.position.abbreviation,
            })
          )
        );
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setRosterError("Unable to load the selected team's roster.");
      }
    } finally {
      if (!controller.signal.aborted) {
        setRosterLoading(false);
      }
    }
  }

  loadRoster();

  return () => controller.abort();
}, [selectedTeam]);
const fitPosition =
  selectedPlayer?.position === "TWP"
    ? "DH"
    : selectedPlayer?.position;
const positionPerformanceValues = selectedPlayer
  ? teamRoster
      .filter((player) => player.position === fitPosition)
      .map(
        (player) =>
          rosterPerformance[player.id]?.performanceIndex ?? null
      )
      .filter((value): value is number => value !== null)
  : [];

const averagePositionPerformance =
  positionPerformanceValues.length > 0
    ? Math.round(
        positionPerformanceValues.reduce(
          (sum, value) => sum + value,
          0
        ) / positionPerformanceValues.length
      )
    : null;

const exactPositionCount = selectedPlayer
  ? teamRoster.filter(
      (player) =>
        player.position === fitPosition ||
        (fitPosition === "DH" && player.position === "TWP")
    ).length
  : 0;

const relatedPositionCount = selectedPlayer
  ? teamRoster.filter(
      (player) =>
        isRelatedPosition(
  fitPosition ?? "",
  player.position
) && player.position !== fitPosition
    ).length
  : 0;
const relevantDefenders = selectedPlayer
  ? teamRoster.filter(
      (player) =>
        player.position === fitPosition &&
        rosterDefense[player.id]?.oaa !== null &&
        rosterDefense[player.id]?.oaa !== undefined &&
        rosterDefense[player.id]?.position === fitPosition
    )
  : [];

const averagePositionOAA =
  relevantDefenders.length > 0
    ? relevantDefenders.reduce(
        (total, player) =>
          total + (rosterDefense[player.id].oaa ?? 0),
        0
      ) / relevantDefenders.length
    : null;
const totalDefensiveInnings = relevantDefenders.reduce(
  (total, player) =>
    total + (rosterDefense[player.id].defensiveInnings ?? 0),
  0
);

const totalOAA = relevantDefenders.reduce(
  (total, player) =>
    total + (rosterDefense[player.id].oaa ?? 0),
  0
);

const oaaPer1000Innings =
  totalDefensiveInnings >= 200
    ? (totalOAA / totalDefensiveInnings) * 1000
    : null;
const defensiveNeedScore =
  fitPosition !== "DH" && oaaPer1000Innings !== null
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(50 - oaaPer1000Innings * 5)
        )
      )
    : null;
const positionalNeedScore =
  selectedPlayer && selectedTeam && teamRoster.length > 0
    ? Math.max(
        20,
        Math.min(
          100,
          (fitPosition === "DH" ? 65 : 100) -
            exactPositionCount * 15 -
            relatedPositionCount * 5 +
            (averagePositionPerformance !== null
              ? Math.round((100 - averagePositionPerformance) * 0.3)
              : 0)
        )
      )
    : null;
    const performanceScore =
  selectedPlayer && playerStats
    ? selectedPlayer.position === "P"
      ? Number.isFinite(Number(playerStats.era)) &&
        Number.isFinite(Number(playerStats.whip)) &&
        playerStats.era != null &&
        playerStats.whip != null
        ? Math.max(
            0,
            Math.min(
              100,
              Math.round(
                50 +
                  (4.5 - Number(playerStats.era)) * 12 +
                  (1.3 - Number(playerStats.whip)) * 30
              )
            )
          )
        : null
      : playerStats.ops != null &&
          playerStats.ops !== "" &&
          Number.isFinite(Number(playerStats.ops))
        ? Math.max(
            0,
            Math.min(
              100,
              Math.round(
                50 + (Number(playerStats.ops) - 0.7) * 150
              )
            )
          )
        : null
    : null;

const advancedIndex =
  selectedPlayer?.position === "P"
    ? advancedStats?.reliablePitchingIndex
    : advancedStats?.reliableHittingIndex;

const advancedPerformanceScore =
  advancedIndex != null && Number.isFinite(advancedIndex)
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(50 + (advancedIndex - 100) * 0.5)
        )
      )
    : null;

const finalPerformanceScore =
  advancedPerformanceScore ?? performanceScore;

    
const overallFitScore =
  positionalNeedScore !== null && finalPerformanceScore !== null
    ? Math.round(
        positionalNeedScore * 0.4 +
        finalPerformanceScore * 0.6
      )
    : null;

  return (
    <div className="mt-6">
      <label
        htmlFor="team-fit-player-search"
        className="mb-2 block text-sm font-semibold text-slate-300"
      >
        Search MLB Players
      </label>

      <input
        id="team-fit-player-search"
        type="text"
        value={playerSearch}
        onChange={(event) => setPlayerSearch(event.target.value)}
        placeholder="Enter a player name..."
        className="w-full rounded-lg border border-slate-700 bg-[#081321] px-4 py-3 text-white outline-none focus:border-blue-500"
      />

{isLoading && (
  <p className="mt-3 text-sm text-gray-400">
    Searching MLB players...
  </p>
)}

{playerResults.length > 0 && (
  <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-slate-700 bg-[#081321]">
    {playerResults.map((player) => (
      <button
  type="button"
  key={player.id}
  onClick={() => {
    setSelectedPlayer(player);
    setPlayerSearch(player.name);
    setPlayerResults([]);
  }}
  className="block w-full border-b border-slate-800 px-4 py-3 text-left text-sm transition-colors hover:bg-slate-800 last:border-b-0"
>
        <span className="font-semibold text-white">
          {player.name}
        </span>
        <span className="ml-3 text-gray-400">
          {player.position} | {player.team}
        </span>
      </button>
    ))}
  </div>
)}
{selectedPlayer && (
  <div className="mt-6 rounded-xl border border-blue-800 bg-slate-900 p-5">
    <h3 className="mb-3 text-lg font-semibold text-white">
      Selected Player
    </h3>

    <p className="text-xl font-bold text-blue-400">
      {selectedPlayer.name}
    </p>

    <p className="mt-2 text-sm text-gray-300">
      Position: {selectedPlayer.position}
    </p>

    <p className="mt-1 text-sm text-gray-300">
      Current Team: {selectedPlayer.team}
    </p>
    <div className="mt-4 border-t border-slate-700 pt-4">
  <p className="mb-2 font-semibold text-white">
    2026 Player Performance
  </p>

  {statsLoading ? (
    <p className="text-sm text-gray-400">
      Loading player statistics...
    </p>
  ) : playerStats ? (
    <div className="grid grid-cols-2 gap-3 text-sm">
      {selectedPlayer.position === "P" ? (
        <>
          <p>ERA: {String(playerStats.era ?? "N/A")}</p>
          <p>WHIP: {String(playerStats.whip ?? "N/A")}</p>
          <p>SO: {String(playerStats.strikeOuts ?? "N/A")}</p>
          <p>IP: {String(playerStats.inningsPitched ?? "N/A")}</p>
        </>
      ) : (
        <>
          <p>AVG: {String(playerStats.avg ?? "N/A")}</p>
          <p>HR: {String(playerStats.homeRuns ?? "N/A")}</p>
          <p>RBI: {String(playerStats.rbi ?? "N/A")}</p>
          <p>OPS: {String(playerStats.ops ?? "N/A")}</p>
        </>
      )}
    </div>
  ) : (
    <p className="text-sm text-gray-400">
      No 2026 statistics available for this player.
    </p>
  )}
</div>
  </div>
  
)}
<div className="mt-6">
  <label
    htmlFor="team-selection"
    className="mb-2 block text-sm font-semibold text-slate-300"
  >
    Select MLB Team
  </label>

  <select
    id="team-selection"
    value={selectedTeam}
    onChange={(event) => setSelectedTeam(event.target.value)}
    className="w-full rounded-lg border border-slate-700 bg-[#081321] px-4 py-3 text-white outline-none focus:border-blue-500"
  >
    <option value="">Choose an MLB team...</option>

    {mlbTeams.map((team) => (
      <option key={team} value={team}>
        {team}
      </option>
    ))}
  </select>
</div>
{selectedPlayer && selectedTeam && (
  <div className="mt-8">
    <h3 className="mb-4 text-xl font-bold text-white">
      Player vs. Team Comparison
    </h3>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_minmax(0,1fr)] md:items-start">
      <div className="rounded-xl border border-blue-800 bg-slate-900 p-5">
        <p className="text-sm text-gray-400">Selected Player</p>
        <h4 className="mt-2 text-2xl font-bold text-blue-400">
          {selectedPlayer.name}
        </h4>
        <p className="mt-3 text-gray-300">
          Position: {selectedPlayer.position}
        </p>
        <p className="mt-1 text-gray-300">
          Current Team: {selectedPlayer.team}
        </p>
      </div>

     <div className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 p-5">
        <p className="text-sm text-gray-400">Potential Destination</p>
        <h4 className="mt-2 text-2xl font-bold text-white">
          {selectedTeam}
        </h4>
        <p className="mt-3 text-gray-300">
          Team Fit Evaluation
        </p>
        <div className="mt-3 text-sm text-gray-300">
  {rosterLoading ? (
    <p>Loading MLB roster...</p>
  ) : rosterError ? (
    <p className="text-red-400">{rosterError}</p>
  ) : teamRoster.length > 0 ? (
    <div className="space-y-3">
      <p>
        40-Man Roster Records: <strong>{teamRoster.length}</strong>
      </p>
      {overallFitScore !== null &&
  !teamRoster.some((player) => player.id === selectedPlayer?.id) && (
  <div className="rounded-lg border border-blue-500 bg-[#081321] p-5">
    <p className="text-sm font-semibold text-gray-300">
      DiamondIQ Overall Team Fit Score
    </p>

    <p className="mt-2 text-4xl font-bold text-blue-400">
      {overallFitScore}/100
    </p>

    <p className="mt-2 text-sm text-gray-300">
      {overallFitScore >= 80
        ? "Strong Potential Fit"
        : overallFitScore >= 65
        ? "Good Potential Fit"
        : overallFitScore >= 50
        ? "Moderate Potential Fit"
        : "Limited Potential Fit"}
    </p>

    <p className="mt-3 text-xs text-gray-400">
      Based on 40% positional need and 60% player performance.
      This is a preliminary DiamondIQ estimate, not an
      official MLB metric or a validated prediction.
    </p>
  </div>
)}

{advancedStats && (
  <div className="rounded-lg border border-blue-800 bg-[#081321] p-4">
    <p className="text-sm text-gray-400">
      DiamondIQ Advanced Performance Index
    </p>

    <p className="mt-2 text-3xl font-bold text-blue-400">
      {selectedPlayer?.position === "P"
        ? (advancedStats.reliablePitchingIndex ?? "N/A")
        : (advancedStats.reliableHittingIndex ?? "N/A")}
    </p>

    <p className="mt-2 text-xs text-gray-400">
      League average = 100. Adjusted for park factors and playing time.
      Experimental DiamondIQ metric, not official OPS+ or ERA+.
    </p>
  </div>
)}

<div className="rounded-lg border border-blue-800 bg-[#081321] p-4">
  <p className="text-sm text-gray-400">
    DiamondIQ Positional Need Score
  </p>
<p className="mt-2 text-3xl font-bold text-blue-400">
  {positionalNeedScore !== null
    ? `${positionalNeedScore}/100`
    : "N/A"}
</p>

  <p className="mt-2 text-xs text-gray-400">
  
Preliminary estimate based on roster depth and player performance
at the selected position. Teams with fewer players or
below-average performers receive higher need scores.
Player quality is measured using DiamondIQ's experimental
reliability-adjusted performance index.

</p>
</div>
<div className="rounded-lg border border-blue-800 bg-[#081321] p-4">
  <p className="text-sm text-gray-400">
    Team Average Positional Performance
  </p>

  <p className="mt-2 text-3xl font-bold text-blue-400">
    {averagePositionPerformance !== null
      ? averagePositionPerformance
      : "N/A"}
  </p>
{averagePositionPerformance !== null && (
  <p
    className={`mt-1 text-sm font-medium ${
      averagePositionPerformance > 100
        ? "text-green-400"
        : averagePositionPerformance < 100
        ? "text-red-400"
        : "text-gray-400"
    }`}
  >
    {averagePositionPerformance > 100
      ? "Above League Average"
      : averagePositionPerformance < 100
      ? "Below League Average"
      : "League Average"}
  </p>
)}
  <p className="mt-2 text-xs text-gray-400">
    DiamondIQ Performance Index for existing players at this position.
    League average = 100. Higher values indicate better performance.
  </p>
</div>
{defensiveNeedScore !== null && (
  <div className="rounded-lg border border-emerald-800 bg-[#081321] p-4">
    <p className="text-sm font-semibold text-gray-300">
      DiamondIQ Defensive Need Score
    </p>

    <p className="mt-2 text-3xl font-bold text-emerald-400">
      {defensiveNeedScore}/100
    </p>

    <p className="mt-2 text-sm text-gray-400">
  OAA per 1,000 Defensive Innings:{" "}
  {oaaPer1000Innings?.toFixed(2)}
</p>

    <p className="mt-2 text-xs text-gray-400">
  Preliminary estimate based on 2026 Outs Above Average
  adjusted for defensive innings at the selected position.
  A minimum of 200 combined defensive innings is required.
  Higher defensive performance reduces the team's defensive need.
</p>
  </div>
)}
{playerStats && (
  <div className="rounded-lg border border-slate-700 bg-[#081321] p-4">
    <p className="text-sm text-gray-400">
      DiamondIQ Player Performance Score
    </p>

      
<p className="mt-2 text-3xl font-bold text-green-400">
  {finalPerformanceScore !== null
    ? `${finalPerformanceScore}/100`
    : "N/A"}
</p>



    
<p className="mt-2 text-xs text-gray-400">
  Preliminary DiamondIQ performance score based on a
  reliability-adjusted, park-adjusted performance index
  when available. Otherwise, hitters are evaluated using
  OPS and pitchers using ERA and WHIP. This is an
  experimental estimate, not an official MLB metric.
</p>

  </div>
)}
      <p>
        Players at {fitPosition}:{" "}
        <strong>
          {
            teamRoster.filter(
              (player) =>
  player.position === fitPosition ||
  (fitPosition === "DH" && player.position === "TWP")
            ).length
          }
        </strong>
      </p>

      <div>
        <p className="mb-2 font-semibold">Players at This Position:</p>

        {teamRoster
          .filter(
            (player) =>
  player.position === fitPosition ||
  (fitPosition === "DH" && player.position === "TWP")
          )
          .map((player) => (
            <p key={player.id} className="text-gray-400">
              {player.name}
            </p>
          ))}
      </div>
      <div className="mt-4">
  <p className="mb-2 font-semibold">
    Players at Related Positions:
  </p>

  {teamRoster
    .filter(
      (player) =>
        isRelatedPosition(
  fitPosition ?? "",
  player.position
) &&
player.position !== fitPosition &&
!(fitPosition === "DH" && player.position === "TWP")
    )
    .map((player) => (
      <p key={player.id} className="text-gray-400">
        {player.name} ({player.position})
      </p>
    ))}
</div>
    </div>
  ) : (
    <p>No roster data available.</p>
  )}
</div>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
