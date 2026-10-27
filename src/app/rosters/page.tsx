import RosterDirectory from "./RosterDirectory";

type MLBTeam = {
  id: number;
  name: string;
  abbreviation: string;
  division: { name: string };
};

export default async function RostersPage() {
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

    teams = (data.teams ?? []).map(
      (team: {
        id: number;
        name: string;
        abbreviation: string;
        division?: { name: string };
      }) => ({
        id: team.id,
        name: team.name,
        abbreviation: team.abbreviation,
        division: { name: team.division?.name ?? "MLB" },
      })
    );
  } catch {
    error = true;
  }

  return (
    <main className="min-h-screen bg-[#081321] px-6 py-12 text-white md:py-16">
      <div className="mx-auto max-w-7xl">
        <p className="mb-3 text-sm font-bold uppercase tracking-widest text-blue-400">
          DiamondIQ · MLB Directory
        </p>

        <h1 className="text-4xl font-black md:text-5xl">
          MLB Team Rosters
        </h1>

        <p className="mt-4 max-w-2xl text-slate-400">
          Find a team and view its active roster. No stats, projections,
          or extra clutter. Just the players.
        </p>

        <div className="mt-10">
          {error ? (
            <p className="rounded-xl border border-red-500/30 bg-red-950/30 p-6 text-red-300">
              MLB team data could not be loaded. Please try again later.
            </p>
          ) : (
            <RosterDirectory teams={teams} />
          )}
        </div>
      </div>
    </main>
  );
}
