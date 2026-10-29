
import LineupBuilder from "./LineupBuilder";

type MLBTeam = {
  id: number;
  name: string;
  abbreviation: string;
};

export default async function LineupOptimizerPage() {
  let teams: MLBTeam[] = [];
  let error = false;

  try {
    const response = await fetch(
      "https://statsapi.mlb.com/api/v1/teams?sportId=1",
      { next: { revalidate: 86400 } }
    );

    if (!response.ok) {
      throw new Error("Unable to load MLB teams");
    }

    const data = await response.json();

    teams = (data.teams ?? [])
      .map(
        (team: {
          id: number;
          name: string;
          abbreviation: string;
        }) => ({
          id: team.id,
          name: team.name,
          abbreviation: team.abbreviation,
        })
      )
      .sort((a: MLBTeam, b: MLBTeam) =>
        a.name.localeCompare(b.name)
      );
  } catch {
    error = true;
  }

  return (
    <main className="min-h-screen bg-[#081321] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-400">
          DiamondIQ Front Office Tools
        </p>

        <h1 className="mb-3 text-3xl font-bold">
          MLB Lineup Optimizer
        </h1>

        <p className="mb-8 max-w-3xl text-slate-400">
          Build and evaluate MLB batting orders using player
          performance, offensive production, and matchup analysis.
        </p>

        {error ? (
          <p className="rounded-xl border border-red-500/30 bg-red-950/30 p-6 text-red-300">
            MLB team data could not be loaded. Please try again later.
          </p>
        ) : (
          <LineupBuilder teams={teams} />
        )}
      </div>
    </main>
  );
}
