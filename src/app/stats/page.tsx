import TeamDirectory from "./TeamDirectory";
import Link from "next/link";

type MLBTeam = {
  id: number;
  name: string;
  abbreviation: string;
  division: { name: string };
};

async function getTeams(): Promise<MLBTeam[]> {
  const response = await fetch(
    "https://statsapi.mlb.com/api/v1/teams?sportId=1",
    { next: { revalidate: 86400 } }
  );

  if (!response.ok) {
    throw new Error("Unable to load MLB teams");
  }

  const data = await response.json();
  return data.teams;
}

export default async function StatsPage() {
  let teams: MLBTeam[] = [];
  let error = false;

  try {
    teams = await getTeams();
  } catch {
    error = true;
  }

  return (
    <main className="min-h-screen bg-[#081321] text-white">
      

      <section className="mx-auto max-w-7xl px-6 py-16">
        <p className="mb-4 text-sm font-bold uppercase tracking-widest text-blue-400">
          MLB Data Center
        </p>

        <h1 className="text-4xl font-black md:text-5xl">
          MLB Statistics
        </h1>

        <p className="mt-5 max-w-2xl text-slate-400">
          Explore Major League Baseball teams and build a deeper
          understanding of performance through data.
        </p>

        
        <div className="mt-12">
          {error ? (
            <p className="rounded-xl border border-red-500/30 bg-red-950/30 p-6 text-red-300">
              MLB team data could not be loaded. Please try again later.
            </p>
          ) : (
            <TeamDirectory teams={teams} />
          )}
        </div>
      </section>
    </main>
  );
}

