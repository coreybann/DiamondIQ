import TradeTargetFinderClient from "./TradeTargetFinderClient";
import { freeAgents } from "@/lib/freeAgency";
import {
  getPlayer2027ArbitrationEstimate,
  getPlayer2027PreArbitrationEstimate,
} from "@/lib/rosterSalaries";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  getTeamBwarSummaries,
  getTeamPositionRankings,
} from "@/lib/teamNeeds";

export default async function TradeTargetFinderPage() {
  const teams = await getTeamBwarSummaries(2026);
  const positionRankings = getTeamPositionRankings(teams);

  const csv = await readFile(
    path.join(process.cwd(), "public/data/mlb-salaries-2026.csv"),
    "utf8"
  );

  const teamCodes: Record<string, string> = {
    "Arizona Diamondbacks": "ARI",
    "Athletics": "OAK",
    "Atlanta Braves": "ATL",
    "Baltimore Orioles": "BAL",
    "Boston Red Sox": "BOS",
    "Chicago Cubs": "CHC",
    "Chicago White Sox": "CHW",
    "Cincinnati Reds": "CIN",
    "Cleveland Guardians": "CLE",
    "Colorado Rockies": "COL",
    "Detroit Tigers": "DET",
    "Houston Astros": "HOU",
    "Kansas City Royals": "KCR",
    "Los Angeles Angels": "LAA",
    "Los Angeles Dodgers": "LAD",
    "Miami Marlins": "MIA",
    "Milwaukee Brewers": "MIL",
    "Minnesota Twins": "MIN",
    "New York Mets": "NYM",
    "New York Yankees": "NYY",
    "Philadelphia Phillies": "PHI",
    "Pittsburgh Pirates": "PIT",
    "San Diego Padres": "SDP",
    "San Francisco Giants": "SFG",
    "Seattle Mariners": "SEA",
    "St. Louis Cardinals": "STL",
    "Tampa Bay Rays": "TBR",
    "Texas Rangers": "TEX",
    "Toronto Blue Jays": "TOR",
    "Washington Nationals": "WSN",
  };

  const salaryEstimates: Record<
    string,
    { salary: number; type: "arbitration" | "pre-arbitration" }
  > = {};

  for (const line of csv.split(/\r?\n/).slice(1)) {
    const columns = line.split(",");
    if (columns.length < 4) continue;

    const player = columns[0].trim();
    const team = teamCodes[columns[1].trim()];
    if (!player || !team) continue;

    const arbitration = getPlayer2027ArbitrationEstimate(player, team);
    const preArbitration =
      getPlayer2027PreArbitrationEstimate(player, team);

    if (arbitration !== null && arbitration > 0) {
      salaryEstimates[player + ":" + team] = {
        salary: arbitration,
        type: "arbitration",
      };
    } else if (preArbitration !== null && preArbitration > 0) {
      salaryEstimates[player + ":" + team] = {
        salary: preArbitration,
        type: "pre-arbitration",
      };
    }
  }

  return (
    <TradeTargetFinderClient
      positionRankings={positionRankings}
      salaryEstimates={salaryEstimates}
      excludedFreeAgentNames={freeAgents
        .filter((player) =>
          [
            "Available",
            "Pending Option",
            "Potential Free Agent",
            "Signing Reported",
            "Signed",
          ].includes(player.status)
        )
        .map((player) => player.name)}
    />
  );
}
