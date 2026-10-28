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
      <div className="mx-auto max-w-7xl px-6 pt-6">
  <Link
    href="/stats"
    className="inline-block text-sm text-blue-400 hover:text-blue-300"
  >
    ← All MLB Teams
  </Link>
</div>

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
