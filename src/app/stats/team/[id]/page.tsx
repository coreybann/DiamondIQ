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

        <BattingStats teamId={id} />
        <PitchingStats teamId={id} />
      </section>
    </main>
  );
}
