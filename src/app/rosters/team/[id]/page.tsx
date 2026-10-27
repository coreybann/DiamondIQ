import Link from "next/link";

type MLBPlayer = {
  id: number;
  name: string;
  number: string | null;
  position: string;
};

type MLBTeam = {
  id: number;
  name: string;
  abbreviation: string;
};

const groups = [
  { title: "Pitchers", positions: ["P", "SP", "RP", "TWP"] },
  { title: "Catchers", positions: ["C"] },
  { title: "Infielders", positions: ["1B", "2B", "3B", "SS", "IF"] },
  { title: "Outfielders", positions: ["LF", "CF", "RF", "OF"] },
  { title: "Designated Hitters", positions: ["DH"] },
];

async function getRoster(teamId: number): Promise<MLBPlayer[]> {
  const response = await fetch(
    `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=active&hydrate=person`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("Unable to load roster");
  }

  const data = await response.json();

  return (data.roster ?? []).map(
    (entry: {
      person: { id: number; fullName: string };
      jerseyNumber?: string;
      position?: { abbreviation: string };
    }) => ({
      id: entry.person.id,
      name: entry.person.fullName,
      number: entry.jerseyNumber ?? null,
      position: entry.position?.abbreviation ?? "N/A",
    })
  );
}

async function getTeam(teamId: number): Promise<MLBTeam> {
  const response = await fetch(
    `https://statsapi.mlb.com/api/v1/teams/${teamId}`,
    { next: { revalidate: 86400 } }
  );

  if (!response.ok) {
    throw new Error("Unable to load team");
  }

  const data = await response.json();
  const team = data.teams?.[0];

  if (!team) {
    throw new Error("Team not found");
  }

  return team;
}

export default async function TeamRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teamId = Number(id);

  let team: MLBTeam | null = null;
  let players: MLBPlayer[] = [];
  let error = false;

  if (!Number.isInteger(teamId) || teamId <= 0) {
    error = true;
  } else {
    try {
      [team, players] = await Promise.all([
        getTeam(teamId),
        getRoster(teamId),
      ]);
    } catch {
      error = true;
    }
  }

  const sortedPlayers = [...players].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const otherPlayers = sortedPlayers.filter(
    (player) =>
      !groups.some((group) =>
        group.positions.includes(player.position)
      )
  );

  return (
    <main className="min-h-screen bg-[#081321] px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/rosters"
          className="text-sm font-semibold text-blue-400 hover:text-blue-300"
        >
          ← All MLB Rosters
        </Link>

        {error || !team ? (
          <div className="mt-10 rounded-xl border border-red-500/30 bg-red-950/20 p-6 text-red-300">
            This team's roster could not be loaded.
          </div>
        ) : (
          <>
            <p className="mt-10 text-sm font-bold uppercase tracking-widest text-blue-400">
              DiamondIQ · MLB Rosters
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-5xl">
              {team.name}
            </h1>

            <p className="mt-3 text-slate-400">
              Active Roster · {players.length} Players
            </p>

            <div className="mt-10 space-y-6">
              {groups.map((group) => {
                const members = sortedPlayers.filter((player) =>
                  group.positions.includes(player.position)
                );

                if (members.length === 0) return null;

                return (
                  <section
                    key={group.title}
                    className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1d30]"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 bg-[#12243a] px-6 py-4">
                      <h2 className="text-xl font-bold">{group.title}</h2>
                      <span className="text-sm text-slate-400">
                        {members.length} players
                      </span>
                    </div>

                    <div className="divide-y divide-white/5">
                      {members.map((player) => (
                        <div
                          key={player.id}
                          className="grid grid-cols-[60px_1fr_70px] items-center gap-4 px-6 py-4 hover:bg-white/[0.03]"
                        >
                          <span className="font-semibold text-blue-400">
                            #{player.number ?? "—"}
                          </span>
                          <span className="font-medium">
                            {player.name}
                          </span>
                          <span className="text-right text-sm text-slate-400">
                            {player.position}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}

              {otherPlayers.length > 0 && (
                <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1d30]">
                  <h2 className="border-b border-white/10 bg-[#12243a] px-6 py-4 text-xl font-bold">
                    Other Players
                  </h2>
                  <div className="divide-y divide-white/5">
                    {otherPlayers.map((player) => (
                      <div
                        key={player.id}
                        className="grid grid-cols-[60px_1fr_70px] gap-4 px-6 py-4"
                      >
                        <span className="text-blue-400">
                          #{player.number ?? "—"}
                        </span>
                        <span>{player.name}</span>
                        <span className="text-right text-slate-400">
                          {player.position}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {players.length === 0 && (
              <p className="mt-8 text-slate-400">
                No active roster players were returned.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
