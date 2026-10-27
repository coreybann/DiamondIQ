"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type MLBTeam = {
  id: number;
  name: string;
  abbreviation: string;
  division: { name: string };
};

export default function RosterDirectory({
  teams,
}: {
  teams: MLBTeam[];
}) {
  const [search, setSearch] = useState("");

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase();

    return teams
      .filter(
        (team) =>
          team.name.toLowerCase().includes(query) ||
          team.abbreviation.toLowerCase().includes(query)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teams, search]);

  return (
    <div>
      <div className="mb-5">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search MLB teams..."
          aria-label="Search MLB teams"
          className="w-full rounded-xl border border-slate-700 bg-[#12243a] px-4 py-3.5 text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
        />
      </div>

      <p className="mb-4 text-sm text-slate-400">
        {filteredTeams.length} teams
      </p>

      {filteredTeams.length === 0 ? (
        <p className="rounded-xl border border-white/10 p-6 text-slate-400">
          No teams match your search.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTeams.map((team) => (
            <Link
              key={team.id}
              href={`/rosters/team/${team.id}`}
              className="rounded-xl border border-white/10 bg-[#0d1d30] p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-400/50 hover:bg-[#12243a]"
            >
              <span className="text-xs font-bold tracking-wider text-blue-400">
                {team.abbreviation}
              </span>
              <span className="mt-1 block font-semibold text-white">
                {team.name}
              </span>
              <span className="mt-2 block text-xs text-slate-500">
                {team.division?.name ?? "MLB"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
