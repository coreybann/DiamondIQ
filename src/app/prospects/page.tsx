"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProspectLeaderboards from "./ProspectLeaderboards";
import { Search, Users, ArrowLeft } from "lucide-react";

type ProspectPlayer = {
  id: number;
  name: string;
  position: string;
};

type Organization = {
  id: number;
  name: string;
};

type Level = {
  id: number;
  name: string;
};

type Affiliate = {
  id: number;
  name: string;
  organizationId: number;
  level: string;
  sportId: number;
};

export default function ProspectsPage() {
  const [activeTab, setActiveTab] = useState<"directory" | "leaderboards">("directory");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [organizationId, setOrganizationId] = useState(147);
  const [levelId, setLevelId] = useState(11);
  const [players, setPlayers] = useState<ProspectPlayer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAffiliates() {
      try {
        const response = await fetch("/api/prospect-affiliates");

        if (!response.ok) {
          throw new Error("Unable to load affiliates");
        }

        const data = await response.json();

        setOrganizations(data.organizations ?? []);
        setLevels(data.levels ?? []);
        setAffiliates(data.affiliates ?? []);
      } catch {
        setError("Unable to load minor-league affiliates.");
      } finally {
        setDirectoryLoading(false);
      }
    }

    loadAffiliates();
  }, []);

  const selectedAffiliate = useMemo(
    () =>
      affiliates.find(
        (affiliate) =>
          affiliate.organizationId === organizationId &&
          affiliate.sportId === levelId
      ),
    [affiliates, organizationId, levelId]
  );

  useEffect(() => {
    if (directoryLoading || !selectedAffiliate) return;

    const controller = new AbortController();

    async function loadPlayers() {
      setLoading(true);
      setError("");
      setPlayers([]);

      try {
        const response = await fetch(
          `/api/prospects?teamId=${selectedAffiliate?.id}&season=2026`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Unable to load players");
        }

        const data = await response.json();
        setPlayers(data.players ?? []);
      } catch (error) {
        if (!controller.signal.aborted) {
          setError("Unable to load minor-league players.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPlayers();

    return () => controller.abort();
  }, [selectedAffiliate, directoryLoading]);

  const selectedOrganization = organizations.find(
    (organization) => organization.id === organizationId
  );

  const selectedLevel = levels.find(
    (level) => level.id === levelId
  );

  const filteredPlayers = useMemo(() => {
    return players.filter((player) =>
      player.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [players, search]);

  return (
    <main className="min-h-screen bg-[#081321] px-6 py-12 text-white md:py-16">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/more"
          className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400"
        >
          <ArrowLeft size={16} />
          Back to Tools Hub
        </Link>

        <p className="mb-3 text-sm font-bold uppercase tracking-widest text-blue-400">
          DiamondIQ · Player Development
        </p>

        <h1 className="text-4xl font-black md:text-5xl">
          Prospect Development Hub
        </h1>

        <p className="mt-4 max-w-2xl text-slate-400">
          Explore minor-league players across all 30 MLB organizations
          and track future MLB talent.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("directory")}
            className={`rounded-lg px-5 py-3 font-semibold transition-colors ${
              activeTab === "directory"
                ? "bg-blue-500 text-white"
                : "border border-slate-700 bg-[#12243a] text-slate-300 hover:text-white"
            }`}
          >
            Player Directory
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("leaderboards")}
            className={`rounded-lg px-5 py-3 font-semibold transition-colors ${
              activeTab === "leaderboards"
                ? "bg-blue-500 text-white"
                : "border border-slate-700 bg-[#12243a] text-slate-300 hover:text-white"
            }`}
          >
            Leaderboards
          </button>
        </div>

        {activeTab === "leaderboards" ? (
          <ProspectLeaderboards />
        ) : (
          <>
        <div className="mt-10 rounded-xl border border-slate-700 bg-[#0d1d30] p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                MLB Organization
              </label>
              <select
                value={organizationId}
                onChange={(event) => {
                  setOrganizationId(Number(event.target.value));
                  setSearch("");
                }}
                disabled={directoryLoading}
                className="w-full rounded-lg border border-slate-700 bg-[#081321] p-3 text-white"
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Minor-League Level
              </label>
              <select
                value={levelId}
                onChange={(event) => {
                  setLevelId(Number(event.target.value));
                  setSearch("");
                }}
                disabled={directoryLoading}
                className="w-full rounded-lg border border-slate-700 bg-[#081321] p-3 text-white"
              >
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <Users className="text-blue-400" size={24} />
            <div>
              <h2 className="text-xl font-bold">
                {selectedAffiliate?.name ?? "Loading affiliate..."}
              </h2>
              <p className="text-sm text-slate-400">
                {selectedOrganization?.name ?? "MLB Organization"}
                {" · "}
                {selectedLevel?.name ?? "Minor League"}
                {" · 2026"}
              </p>
            </div>
          </div>

          <div className="relative mt-6">
            <Search
              size={18}
              className="absolute left-4 top-3.5 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search minor-league players..."
              className="w-full rounded-lg border border-slate-700 bg-[#081321] py-3 pl-11 pr-4 text-white outline-none focus:border-blue-400"
            />
          </div>

          {directoryLoading || loading ? (
            <p className="mt-6 text-slate-400">
              Loading players...
            </p>
          ) : error ? (
            <p className="mt-6 text-red-400">{error}</p>
          ) : (
            <>
              <p className="mt-5 text-sm text-slate-400">
                Showing {filteredPlayers.length} of {players.length} players
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="rounded-lg border border-slate-700 bg-[#12243a] p-4"
                  >
                    <Link
                      href={`/prospects/player/${player.id}`}
                      className="font-semibold text-white transition-colors hover:text-blue-400 hover:underline"
                    >
                      {player.name}
                    </Link>
                    <p className="mt-1 text-sm text-slate-400">
                      Position: {player.position}
                    </p>
                  </div>
                ))}
              </div>

              {filteredPlayers.length === 0 && (
                <p className="mt-6 text-slate-400">
                  No players match your search.
                </p>
              )}
            </>
          )}
        </div>

        <p className="mt-6 text-sm text-slate-500">
          Data: MLB Stats API. Full-season rosters may include MLB rehab
          assignments and are not official prospect rankings.
        </p>
          </>
        )}
      </div>
    </main>
  );
}
