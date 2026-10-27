
import { NextResponse } from "next/server";

import fs from "fs";
import path from "path";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const origin = url.origin;

const playerId = url.searchParams.get("id");

const group = url.searchParams.get("group") ?? "hitting";

if (!playerId || !/^\d+$/.test(playerId)) {
  return NextResponse.json(
    { error: "A valid player ID is required" },
    { status: 400 }
  );
}

    const response = await fetch(
      `${origin}/api/league-stats`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("Failed to load league averages");
    }

    const leagueStats = await response.json();


const playerResponse = await fetch(
  `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=season&group=${group}&season=2026`,
  { cache: "no-store" }
);


if (!playerResponse.ok) {
  throw new Error("Failed to load player statistics");
}

const playerData = await playerResponse.json();

const playerStats =
  playerData.stats?.[0]?.splits?.[0]?.stat ?? null;

const playerTeam =
  playerData.stats?.[0]?.splits?.[0]?.team ?? null;

const playerTeamId = playerTeam?.id ?? null;

const parkFactorsPath = path.join(
  process.cwd(),
  "public",
  "data",
  "mlb-park-factors-2026.csv"
);

const parkFactorsCSV = fs.readFileSync(
  parkFactorsPath,
  "utf8"
);

const parkFactorRows = parkFactorsCSV
  .trim()
  .split(/\r?\n/);


const teamNames: Record<number, string> = {
  108: "Angels",
  109: "D-backs",
  110: "Orioles",
  111: "Red Sox",
  112: "Cubs",
  113: "Reds",
  114: "Guardians",
  115: "Rockies",
  116: "Tigers",
  117: "Astros",
  118: "Royals",
  119: "Dodgers",
  120: "Nationals",
  121: "Mets",
  133: "Athletics",
  134: "Pirates",
  135: "Padres",
  136: "Mariners",
  137: "Giants",
  138: "Cardinals",
  139: "Rays",
  140: "Rangers",
  141: "Blue Jays",
  142: "Twins",
  143: "Phillies",
  144: "Braves",
  145: "White Sox",
  146: "Marlins",
  147: "Yankees",
  158: "Brewers",
};

const teamName = playerTeamId
  ? teamNames[playerTeamId]
  : null;

const parkFactorRow = parkFactorRows.find(
  (row) => row.split(",")[1] === teamName
);

const parkFactorValue = parkFactorRow
  ?.split(",")[4]?.trim();

const parkFactor =
  parkFactorValue &&
  Number.isFinite(Number(parkFactorValue))
    ? Number(parkFactorValue)
    : null;


const playerOPS = Number(playerStats?.ops);

const playerOBP = Number(playerStats?.obp);
const playerSLG = Number(playerStats?.slg);

const unadjustedOPSPlus =
  playerStats &&
  Number.isFinite(playerOBP) &&
  Number.isFinite(playerSLG) &&
  leagueStats.leagueOBP > 0 &&
  leagueStats.leagueSLG > 0
    ? Math.round(
        100 *
          (
            playerOBP / leagueStats.leagueOBP +
            playerSLG / leagueStats.leagueSLG -
            1
          )
      )
    : null;

const leagueRelativeOPS =
  playerStats &&
  Number.isFinite(playerOPS) &&
  leagueStats.leagueOPS > 0
    ? Math.round(
        (playerOPS / leagueStats.leagueOPS) * 100
      )
    : null;

    
const parkAdjustedHittingIndex =
  unadjustedOPSPlus !== null &&
  parkFactor !== null &&
  parkFactor > 0
    ? Math.round(
        unadjustedOPSPlus * (100 / parkFactor)
      )
    : null;

const hittingPlateAppearances =
  group === "hitting" && playerStats?.plateAppearances != null
    ? Number(playerStats.plateAppearances)
    : null;

const hittingReliability =
  hittingPlateAppearances !== null
    ? Math.min(1, hittingPlateAppearances / 500)
    : null;

const reliableHittingIndex =
  parkAdjustedHittingIndex !== null &&
  hittingReliability !== null
    ? Math.round(
        100 +
          (parkAdjustedHittingIndex - 100) *
            hittingReliability
      )
    : null;

const playerERA = Number(playerStats?.era);

const pitchingInnings =
  group === "pitching" && playerStats?.outs != null
    ? Number(playerStats.outs) / 3
    : null;

const pitchingReliability =
  pitchingInnings !== null
    ? Math.min(1, pitchingInnings / 150)
    : null;


const leagueRelativeERA =
  group === "pitching" &&
  playerStats?.era != null &&
  Number.isFinite(playerERA) &&
  playerERA > 0 &&
  leagueStats.leagueERA > 0
    ? Math.round(
        (leagueStats.leagueERA / playerERA) * 100
      )
    : null;

const parkAdjustedPitchingIndex =
  leagueRelativeERA !== null &&
  parkFactor !== null &&
  parkFactor > 0
    ? Math.round(
        leagueRelativeERA * (parkFactor / 100)
      )
    : null;

const reliablePitchingIndex =
  parkAdjustedPitchingIndex !== null &&
  pitchingReliability !== null
    ? Math.round(
        100 +
          (parkAdjustedPitchingIndex - 100) *
            pitchingReliability
      )
    : null;


return NextResponse.json({
  playerId: Number(playerId),
  season: 2026,
  leagueStats,
  playerStats,
  playerTeam,
  playerTeamId,
  parkFactor,
  
leagueRelativeOPS:
  group === "hitting" ? leagueRelativeOPS : null,
unadjustedOPSPlus:
  group === "hitting" ? unadjustedOPSPlus : null,
parkAdjustedHittingIndex:
  group === "hitting" ? parkAdjustedHittingIndex : null,
  hittingPlateAppearances,
hittingReliability,
reliableHittingIndex,
leagueRelativeERA,
parkAdjustedPitchingIndex,
pitchingInnings,
pitchingReliability,
reliablePitchingIndex,
status: "ready",
});


  } catch (error) {
    console.error("Advanced stats error:", error);

    return NextResponse.json(
      { error: "Failed to load advanced stats" },
      { status: 500 }
    );
  }
}
