import WarDashboard from "./WarDashboard";
import { getFreeAgentRecommendations } from "@/lib/freeAgency";
import {
  getTeamBwarSummaries,
  getTeamPositionRankings,
} from "@/lib/teamNeeds";

export default async function TeamNeedsPage() {
const bwarTeams = await getTeamBwarSummaries(2026);
const positionRankings = getTeamPositionRankings(bwarTeams);
const freeAgentRecommendations = Object.fromEntries(
  positionRankings.map((position) => [
    position.position,
    getFreeAgentRecommendations(position.position, 3),
  ])
);
  const response = await fetch(
    "https://statsapi.mlb.com/api/v1/teams?sportId=1",
    { next: { revalidate: 86400 } }
  );

  if (!response.ok) {
    throw new Error("Unable to load MLB team names");
  }

  const teamData: {
    teams: { id: number; name: string }[];
  } = await response.json();

  const teamNames = new Map(
    teamData.teams.map((team) => [team.id, team.name])
  );
  return (
    <main className="min-h-screen bg-[#081321] px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="mb-2 text-sm font-semibold text-blue-400">
          DiamondIQ · Front Office Tools
        </p>

        <h1 className="text-3xl font-bold">
          Team Needs & Roster Gap Analysis
        </h1>

        <p className="mt-3 text-slate-400">
          Evaluate MLB team strengths and weaknesses using
          2026 FanGraphs WAR and league-wide comparisons.
        </p>
        <WarDashboard
  bwarTeams={bwarTeams}
  positionRankings={positionRankings}
  freeAgentRecommendations={freeAgentRecommendations}
  teamNames={Object.fromEntries(teamNames)}
/>

       

        <p className="mt-4 text-xs text-slate-500">
          Rankings reflect 2026 historical FanGraphs fWAR,
          not projected 2027 performance. Team totals reflect
          the records available in DiamondIQ&apos;s dataset.
        </p>
      </div>
    </main>
  );
}