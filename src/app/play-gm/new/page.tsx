import FranchiseSelector from "./FranchiseSelector";

export const metadata = {
  title: "New Franchise | Play GM | DiamondIQ",
  description: "Choose your MLB franchise in DiamondIQ Play GM.",
};

type MLBTeam = {
  id: number;
  name: string;
  abbreviation: string;
  division: {
    name: string;
  };
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

export default async function NewFranchisePage() {
  let teams: MLBTeam[] = [];
  let error = false;

  try {
    teams = await getTeams();
  } catch {
    error = true;
  }

  return (
    <main className="min-h-screen bg-[#081321] px-5 py-12 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="mb-3 text-sm font-bold uppercase tracking-widest text-blue-400">
          Play GM / New Franchise
        </p>

        <h1 className="text-4xl font-black">
          Choose Your Franchise
        </h1>

        <p className="mt-4 max-w-2xl text-slate-400">
          Take control of one of MLB's 30 franchises and build
          your organization into a championship contender.
        </p>

        <div className="mt-10">
          {error ? (
            <p className="rounded-xl border border-red-500/30 bg-red-950/30 p-6 text-red-300">
              MLB team data could not be loaded. Please try again later.
            </p>
          ) : (
            <FranchiseSelector teams={teams} />
          )}
        </div>
      </div>
    </main>
  );
}
