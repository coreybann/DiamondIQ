"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Search, ShieldCheck } from "lucide-react";
import { saveFranchise } from "@/lib/play-gm/franchiseStorage";
import { loadStartingUniverse } from "@/lib/play-gm/loadStartingUniverse";

type MLBTeam = {
  id: number;
  name: string;
  abbreviation: string;
  division: {
    name: string;
  };
};

const divisionOrder = [
  "American League East",
  "American League Central",
  "American League West",
  "National League East",
  "National League Central",
  "National League West",
];

export default function FranchiseSelector({
  teams,
}: {
  teams: MLBTeam[];
}) {
  const [search, setSearch] = useState("");
  const [league, setLeague] = useState("All");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedTeam = teams.find((team) => team.id === selectedId);

  async function handleCreateFranchise() {
    if (!selectedTeam || saving) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const now = new Date().toISOString();

      // Every franchise receives an independent MLB universe.
      const universe = await loadStartingUniverse();

      await saveFranchise({
        id: crypto.randomUUID(),
        name: `${selectedTeam.name} Franchise`,
        teamId: selectedTeam.id,
        teamName: selectedTeam.name,
        teamAbbreviation: selectedTeam.abbreviation,
        currentDate: universe.currentDate,
        currentSeason: universe.season,
        phase: "offseason",
        createdAt: now,
        updatedAt: now,
        universe,
      });

      setMessage(`${selectedTeam.name} franchise created successfully!`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create franchise."
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const matchesSearch =
        team.name.toLowerCase().includes(search.toLowerCase()) ||
        team.abbreviation.toLowerCase().includes(search.toLowerCase());

      const matchesLeague =
        league === "All" || team.division?.name.startsWith(league);

      return matchesSearch && matchesLeague;
    });
  }, [teams, search, league]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search MLB franchises..."
            className="w-full rounded-xl border border-white/10 bg-[#12243a] py-3 pl-11 pr-4 text-white outline-none focus:border-blue-400"
          />
        </div>

        <select
          value={league}
          onChange={(event) => setLeague(event.target.value)}
          className="rounded-xl border border-white/10 bg-[#12243a] px-5 py-3 text-white"
        >
          <option value="All">All Leagues</option>
          <option value="American League">American League</option>
          <option value="National League">National League</option>
        </select>
      </div>

      <p className="text-sm text-slate-400">
        Showing {filteredTeams.length} of {teams.length} MLB franchises
      </p>

      {divisionOrder.map((division) => {
        const divisionTeams = filteredTeams
          .filter((team) => team.division?.name === division)
          .sort((a, b) => a.name.localeCompare(b.name));

        if (divisionTeams.length === 0) return null;

        return (
          <section key={division}>
            <h2 className="mb-4 text-lg font-bold text-blue-300">
              {division}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {divisionTeams.map((team) => {
                const selected = selectedId === team.id;

                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setSelectedId(team.id)}
                    aria-pressed={selected}
                    className={`relative flex min-h-44 flex-col items-center justify-center rounded-2xl border p-5 text-center transition-all hover:-translate-y-1 ${
                      selected
                        ? "border-blue-400 bg-blue-500/15 shadow-lg shadow-blue-500/10"
                        : "border-white/10 bg-[#102035] hover:border-blue-400/50"
                    }`}
                  >
                    {selected && (
                      <CheckCircle2
                        size={20}
                        className="absolute right-3 top-3 text-blue-400"
                      />
                    )}

                    <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-white p-3 shadow-lg shadow-black/20">
                      <img
                        src={`https://www.mlbstatic.com/team-logos/${team.id}.svg`}
                        alt={`${team.name} logo`}
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <span className="text-sm font-bold text-white">
                      {team.name}
                    </span>

                    <span className="mt-1 text-xs text-slate-400">
                      {team.abbreviation}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {filteredTeams.length === 0 && (
        <p className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-slate-400">
          No MLB franchises match your search.
        </p>
      )}

      <section className="rounded-2xl border border-blue-400/20 bg-[#10253e] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <ShieldCheck size={28} className="shrink-0 text-blue-400" />

          <div>
            <h2 className="text-xl font-bold">
              {selectedTeam
                ? `Manage the ${selectedTeam.name}`
                : "Select Your Franchise"}
            </h2>

            <p className="mt-2 text-sm text-slate-300">
              {selectedTeam
                ? "Your franchise will begin in the 2026–27 MLB offseason."
                : "Choose an MLB team above to begin your front office career."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateFranchise}
          disabled={!selectedTeam || saving}
          className="mt-6 w-full rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {saving ? "Creating Franchise..." : "Create Franchise"}
        </button>

        {message && (
          <p role="status" className="mt-4 text-sm text-green-400">
            {message}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
