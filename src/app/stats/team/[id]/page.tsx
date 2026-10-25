import PitchingStats from "./PitchingStats";
import BattingStats from "./BattingStats";
import Link from "next/link";
import { notFound } from "next/navigation";

type Team = {
  id: number;
  name: string;
  abbreviation: string;
  division?: { name: string };
  venue?: { name: string };
};

type RosterPlayer = {
  person: {
    id: number;
    fullName: string;
  };
  position: {
    abbreviation: string;
  };
  jerseyNumber?: string;
};

async function getTeam(id: string): Promise<Team | null> {
  const response = await fetch(
    `https://statsapi.mlb.com/api/v1/teams/${id}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("Unable to load MLB team");
  }

  const data = await response.json();
  return data.teams?.[0] ?? null;
}

async function getRoster(id: string): Promise<RosterPlayer[]> {
  const response = await fetch(
    `https://statsapi.mlb.com/api/v1/teams/${id}/roster?rosterType=40Man`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("Unable to load MLB roster");
  }

  const data = await response.json();
  return data.roster ?? [];
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const team = await getTeam(id);

  if (!team) {
    notFound();
  }

  let roster: RosterPlayer[] = [];
  let rosterError = false;

  try {
    roster = await getRoster(id);
  } catch {
    rosterError = true;
  }

  return (
    <main className="min-h-screen bg-[#081321] text-white">
      <header className="border-b border-white/10 bg-[#0d1d30] px-6 py-5">
        <nav className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-blue-400">◆</span> DiamondIQ
          </Link>
          <Link href="/stats" className="text-sm text-blue-400">
            ← All MLB Teams
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <p className="mb-4 text-sm font-bold uppercase tracking-widest text-blue-400">
          MLB Team Profile
        </p>

        <h1 className="text-4xl font-black md:text-5xl">
          {team.name}
        </h1>

        <p className="mt-4 text-slate-400">
          {team.division?.name ?? "Major League Baseball"}
          {team.venue?.name ? ` | ${team.venue.name}` : ""}
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-[#12243a] p-6">
            <p className="text-sm text-slate-400">
              Team Abbreviation
            </p>
            <p className="mt-2 text-2xl font-bold">
              {team.abbreviation}
            </p>
          </div>

          <div className="rounded-xl bg-[#12243a] p-6">
            <p className="text-sm text-slate-400">
              Players on Roster
            </p>
            <p className="mt-2 text-2xl font-bold">
              {rosterError ? "Unavailable" : roster.length}
            </p>
          </div>

          <div className="rounded-xl bg-[#12243a] p-6">
            <p className="text-sm text-slate-400">
              Roster Type
            </p>
            <p className="mt-2 text-2xl font-bold">
              40-Man
            </p>
          </div>
        </div>

        <h2 className="mb-6 mt-14 text-3xl font-bold">
          Team Roster
        </h2>

        {rosterError ? (
          <p className="text-red-300">
            The MLB roster could not be loaded. Try refreshing.
          </p>
        ) : roster.length === 0 ? (
          <p className="text-slate-400">
            No roster information is currently available.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-left">
              <thead className="bg-[#162a43] text-sm text-slate-300">
                <tr>
                  <th className="px-5 py-4">Number</th>
                  <th className="px-5 py-4">Player</th>
                  <th className="px-5 py-4">Position</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((player) => (
                  <tr
                    key={player.person.id}
                    className="border-t border-slate-700 hover:bg-white/5"
                  >
                    <td className="px-5 py-4">
                      {player.jerseyNumber ?? "—"}
                    </td>
                    <td className="px-5 py-4 font-medium">
                      {player.person.fullName}
                    </td>
                    <td className="px-5 py-4">
                      {player.position.abbreviation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}<BattingStats teamId={id} />
        <PitchingStats teamId={id} />
      </section>
    </main>
  );
}
