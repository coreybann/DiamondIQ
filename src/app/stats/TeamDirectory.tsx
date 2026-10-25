
"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

type MLBTeam = {
  id: number;
  name: string;
  abbreviation: string;
  division: { name: string };
};

export default function TeamDirectory({
  teams,
}: {
  teams: MLBTeam[];
}) {
  const [search, setSearch] = useState("");
  const [league, setLeague] = useState("All");
  const [division, setDivision] = useState("All");

  const filteredTeams = useMemo(() => {
    return teams
      .filter((team) => {
        const name = team.name.toLowerCase();
        const abbreviation = team.abbreviation.toLowerCase();
        const divisionName = team.division?.name ?? "";

        const matchesSearch =
          name.includes(search.toLowerCase()) ||
          abbreviation.includes(search.toLowerCase());

        const matchesLeague =
          league === "All" ||
          divisionName.startsWith(league);

        const matchesDivision =
          division === "All" ||
          divisionName.endsWith(division);

        return matchesSearch && matchesLeague && matchesDivision;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teams, search, league, division]);

  return (
    <div>
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <input
          type="text"
          placeholder="Search MLB teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-700 bg-[#12243a] px-4 py-3 text-white outline-none focus:border-blue-400"
        />

        <select
          value={league}
          onChange={(e) => setLeague(e.target.value)}
          className="rounded-lg border border-slate-700 bg-[#12243a] px-4 py-3 text-white"
        >
          <option value="All">All Leagues</option>
          <option value="American League">American League</option>
          <option value="National League">National League</option>
        </select>

        <select
          value={division}
          onChange={(e) => setDivision(e.target.value)}
          className="rounded-lg border border-slate-700 bg-[#12243a] px-4 py-3 text-white"
        >
          <option value="All">All Divisions</option>
          <option value="East">East</option>
          <option value="Central">Central</option>
          <option value="West">West</option>
        </select>
      </div>

      <h2 className="mb-6 text-2xl font-bold">
        MLB Teams ({filteredTeams.length})
      </h2>

      {filteredTeams.length === 0 ? (
        <p className="text-slate-400">
          No teams match your filters.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => (
            
<Link
  key={team.id}
  href={`/stats/team/${team.id}`}
  className="block rounded-xl border border-slate-700 bg-[#12243a] p-6 transition hover:-translate-y-1 hover:border-blue-400"
>

              <p className="text-sm font-semibold text-blue-400">
                {team.abbreviation}
              </p>
              <h3 className="mt-2 text-xl font-bold">
                {team.name}
              </h3>
              <p className="mt-3 text-sm text-slate-400">
                {team.division?.name ?? "MLB"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
