"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Prospect = {
  id: number;
  name: string;
  organizationId: number | null;
  organization: string;
  team: string;
  level: string;
  position: string;
  age: number | null;
  group: "hitting" | "pitching";
  overallScore: number | null;
  performanceScore: number;
  toolsScore: number | null;
  developmentScore: number | null;
  projectionScore: number | null;
  grade: number | null;
  rank?: number;
  overallRank?: number;
};

type RankingsData = {
  season: number;
  count: number;
  organizations: { id: number; name: string }[];
  overall: Prospect[];
  hitters: Prospect[];
  pitchers: Prospect[];
  unranked: Prospect[];
};

type Category = "overall" | "hitting" | "pitching" | "unranked";

export default function ProspectRankings() {
  const [season, setSeason] = useState(2026);
  const [category, setCategory] = useState<Category>("overall");
  const [organization, setOrganization] = useState("all");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<RankingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadRankings() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/prospect-rankings?season=${season}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Unable to load prospect rankings.");
        }

        const result = await response.json();

        if (!controller.signal.aborted) {
          setData(result);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("Unable to load prospect rankings.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadRankings();

    return () => controller.abort();
  }, [season]);

  const prospects = useMemo(() => {
    if (!data) return [];

    const source =
      category === "overall"
        ? data.overall
        : category === "hitting"
          ? data.hitters
          : category === "pitching"
            ? data.pitchers
            : data.unranked ?? [];

    return source
      .filter(
        (player) =>
          organization === "all" ||
          String(player.organizationId) === organization
      )
      .filter((player) =>
        player.name.toLowerCase().includes(search.toLowerCase())
      )
      .slice(0, category === "unranked" ? undefined : 100);
  }, [data, category, organization, search]);

  function changeCategory(next: Category) {
    setCategory(next);
    setOrganization("all");
    setSearch("");
  }

  return (
    <section className="mt-8 rounded-xl border border-slate-700 bg-[#0d1d30] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Prospect Rankings</h2>
          <p className="mt-2 text-sm text-slate-400">
            Statistical prospect evaluations across all 30 MLB organizations.
          </p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-[#12243a] px-4 py-2">
          <p className="text-xs text-slate-400">Eligible Prospects</p>
          <p className="text-xl font-bold">
            {data?.count.toLocaleString() ?? "—"}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {([
          ["overall", "Overall"],
          ["hitting", "Top Hitters"],
          ["pitching", "Top Pitchers"],
          ["unranked", "Unranked Prospects"],
        ] as [Category, string][]).map(([value, label]) => (
          <button
            key={value}
            onClick={() => changeCategory(value)}
            className={`rounded-lg px-4 py-2 font-semibold ${
              category === value
                ? "bg-blue-500 text-white"
                : "bg-[#12243a] text-slate-300 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-slate-300">
          Season
          <select
            value={season}
            onChange={(event) => setSeason(Number(event.target.value))}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-[#081321] p-3 text-white"
          >
            {[2026, 2025, 2024, 2023].map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-300">
          Organization
          <select
            value={organization}
            onChange={(event) => setOrganization(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-[#081321] p-3 text-white"
          >
            <option value="all">All Organizations</option>
            {data?.organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search prospects..."
        className="mt-4 w-full rounded-lg border border-slate-700 bg-[#081321] p-3 text-white outline-none focus:border-blue-400"
      />

      {loading ? (
        <p className="mt-6 text-slate-400">Loading prospect rankings...</p>
      ) : error ? (
        <p className="mt-6 text-red-400">{error}</p>
      ) : (
        <>
          <p className="mt-5 text-sm text-slate-400">
            Showing {prospects.length} prospects
            {organization !== "all"
              ? " · Filtered by organization"
              : category === "unranked"
                ? " · Unranked prospects"
                : " · Top 100"}
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="px-3 py-3">Rank</th>
                  <th className="px-3 py-3">Player</th>
                  <th className="px-3 py-3">Organization</th>
                  <th className="px-3 py-3">Level</th>
                  <th className="px-3 py-3">Age</th>
                  <th className="px-3 py-3">Score</th>
                  <th className="px-3 py-3">Tools and Skills</th>
                  <th className="px-3 py-3">Development Trajectory</th>
                  <th className="px-3 py-3">Projection &amp; Upside</th>
                  <th className="px-3 py-3">Grade</th>
                </tr>
              </thead>

              <tbody>
                {prospects.map((player) => (
                  <tr
                    key={player.id}
                    className="border-b border-slate-800 hover:bg-[#12243a]"
                  >
                    <td className="px-3 py-4 font-bold text-blue-400">
                      {category === "unranked"
                        ? "Unranked"
                        : `#${category === "overall"
                            ? player.overallRank
                            : player.rank}`}
                    </td>

                    <td className="px-3 py-4">
                      <Link
                        href={`/prospects/player/${player.id}`}
                        className="font-semibold text-white hover:text-blue-400 hover:underline"
                      >
                        {player.name}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">
                        {player.position}
                      </p>
                    </td>

                    <td className="px-3 py-4 text-slate-300">
                      {player.organization}
                    </td>

                    <td className="px-3 py-4 text-slate-300">
                      {player.level ?? "N/A"}
                    </td>

                    <td className="px-3 py-4 text-slate-300">
                      {player.age ?? "—"}
                    </td>

                    <td className="px-3 py-4 font-semibold text-white">
                      {player.overallScore != null ? player.overallScore.toFixed(1) : "N/A"}
                    </td>

                    <td className="px-3 py-4 font-semibold text-slate-200">
                      {player.toolsScore != null
                        ? player.toolsScore.toFixed(1)
                        : "N/A"}
                    </td>

                    <td className="px-3 py-4 font-semibold text-slate-200">
                      {player.developmentScore != null
                        ? player.developmentScore.toFixed(1)
                        : "N/A"}
                    </td>

                    <td className="px-3 py-4 font-semibold text-slate-200">
                      {player.projectionScore != null
                        ? player.projectionScore.toFixed(1)
                        : "N/A"}
                    </td>

                    <td className="px-3 py-4 font-semibold text-blue-400">
                      {player.grade ?? "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {prospects.length === 0 && (
            <p className="mt-6 text-center text-slate-400">
              No prospects match your filters.
            </p>
          )}
        </>
      )}

      <p className="mt-5 text-xs text-slate-500">
        Rankings are based on statistical performance and age-adjusted scores.
        Grades use a 20–80 scale and are not official scouting grades.
      </p>
    </section>
  );
}
