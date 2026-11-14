import BullpenDashboard from "./BullpenDashboard";

type MLBTeam = {
  id: number;
  name: string;
  abbreviation: string;
};

async function getTeams(): Promise<MLBTeam[]> {
  const response = await fetch(
    "https://statsapi.mlb.com/api/v1/teams?sportId=1",
    { next: { revalidate: 86400 } }
  );

  if (!response.ok) {
    throw new Error("Unable to retrieve MLB teams");
  }

  const data = await response.json();

  return (data.teams ?? [])
    .map((team: MLBTeam) => ({
      id: team.id,
      name: team.name,
      abbreviation: team.abbreviation,
    }))
    .sort((a: MLBTeam, b: MLBTeam) =>
      a.name.localeCompare(b.name)
    );
}

export default async function BullpenUsagePage() {
  const teams = await getTeams();

  return (
    <main className="min-h-screen bg-[#081321] px-5 py-10 pb-28 text-white md:px-8 md:pb-12">
      <div className="mx-auto max-w-7xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-400">
          DiamondIQ | Front Office
        </p>

        <h1 className="text-3xl font-bold md:text-4xl">
          Bullpen Usage & Fatigue
        </h1>

        <p className="mt-3 max-w-3xl text-slate-400">
          Analyze MLB bullpen workloads, recent pitching activity,
          rest days, and experimental fatigue indicators.
        </p>

        <p className="mt-6 text-sm text-slate-500">
          {teams.length} MLB teams available
        </p>

        <BullpenDashboard teams={teams} />
      </div>
    </main>
  );
}
