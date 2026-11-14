"use client";

import { useEffect, useRef, useState } from "react";

type MLBTeam = {
  id: number;
  name: string;
  abbreviation: string;
};

type BullpenReliever = {
  id: number;
  name: string;
  role: string;
  workload: {
    pitchesLast3Days: number;
    pitchesLast7Days: number;
    appearancesLast3Days: number;
    appearancesLast7Days: number;
    daysRest: number | null;
    pitchedConsecutiveDays: boolean;
  } | null;
  fatigue: {
    score: number | null;
    level: string;
  } | null;
  dataStatus: "Available" | "Unavailable";
};

export default function BullpenDashboard({
  teams,
}: {
  teams: MLBTeam[];
}) {
  const [teamId, setTeamId] = useState<number>(
    teams[0]?.id ?? 0
  );
  const [today, setToday] = useState("");
  const [asOfDate, setAsOfDate] = useState("");

  useEffect(() => {
    const currentDate = new Date().toISOString().slice(0, 10);
    setToday(currentDate);
    setAsOfDate(currentDate);
  }, []);

  const [bullpen, setBullpen] = useState<BullpenReliever[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const previousSelection = useRef<string | null>(null);

  useEffect(() => {
    if (!today || !asOfDate) return;

    const interval = window.setInterval(() => {
      const currentDate = new Date().toISOString().slice(0, 10);

      if (currentDate !== today) {
        setAsOfDate((selected) =>
          selected === today ? currentDate : selected
        );
        setToday(currentDate);
      } else if (asOfDate === currentDate) {
        setRefreshKey((value) => value + 1);
      }
    }, 300000);

    return () => window.clearInterval(interval);
  }, [asOfDate, today]);

  const selectedTeam = teams.find(
    (team) => team.id === teamId
  );

  useEffect(() => {
    if (!teamId || !asOfDate) return;

    const controller = new AbortController();

    const selection = `${teamId}:${asOfDate}`;
    const selectionChanged =
      previousSelection.current !== selection;
    previousSelection.current = selection;

    async function loadBullpen() {
      if (selectionChanged) {
        setLoading(true);
        setBullpen(null);
      }
      setError(null);

      try {
        const response = await fetch(
          `/api/bullpen-team?teamId=${teamId}&date=${asOfDate}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Unable to load bullpen data");
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          setBullpen(data.bullpen);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError(
            selectionChanged
              ? "Unable to retrieve bullpen statistics."
              : "Unable to refresh bullpen statistics. Showing the last successful results."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadBullpen();

    return () => controller.abort();
  }, [teamId, asOfDate, refreshKey]);

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-xl border border-white/10 bg-[#0d1d30] p-6">
        <label
          htmlFor="bullpen-team"
          className="mb-3 block text-sm font-semibold text-slate-300"
        >
          Select MLB Team
        </label>

        <select
          id="bullpen-team"
          value={teamId}
          onChange={(event) =>
            setTeamId(Number(event.target.value))
          }
          className="w-full rounded-lg border border-slate-700 bg-[#12243a] px-4 py-3 text-white outline-none focus:border-blue-400 md:max-w-md"
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0d1d30] p-6">
        <label
          htmlFor="bullpen-date"
          className="mb-3 block text-sm font-semibold text-slate-300"
        >
          Workload Date
        </label>

        <input
          id="bullpen-date"
          type="date"
          min="2026-01-01"
          max={today}
          value={asOfDate}
          onChange={(event) => setAsOfDate(event.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-[#12243a] px-4 py-3 text-white outline-none focus:border-blue-400 md:max-w-xs"
        />

        <p className="mt-3 text-xs text-slate-500">
          Select a date to analyze bullpen workload. The dashboard defaults to today and updates as new MLB statistics become available.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0d1d30] p-6">
        <h2 className="text-xl font-bold text-white">
          {selectedTeam?.name ?? "Select a Team"} Bullpen
        </h2>

        {error && bullpen !== null && (
          <p role="alert" className="mt-3 text-sm text-amber-400">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-3 text-sm text-slate-400">
            Loading bullpen statistics...
          </p>
        ) : bullpen === null && error ? (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {error}
          </p>
        ) : bullpen !== null ? (
          <div className="mt-5">
            <p className="mb-4 text-sm text-slate-400">
              {bullpen.length} relievers identified from {asOfDate.slice(0, 4)} statistics.
              Workload as of {asOfDate}.
            </p>

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Total Relievers",
                  value: bullpen.length,
                },
                {
                  label: "High Workload",
                  value: bullpen.filter(
                    (player) =>
                      player.fatigue?.level === "High" ||
                      player.fatigue?.level === "Very High"
                  ).length,
                },
                {
                  label: "Average Fatigue Score",
                  value: (() => {
                    const scores = bullpen
                      .map((player) => player.fatigue?.score)
                      .filter((score): score is number => score != null);

                    return scores.length
                      ? (
                          scores.reduce((sum, score) => sum + score, 0) /
                          scores.length
                        ).toFixed(1)
                      : "—";
                  })(),
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-lg border border-white/10 bg-[#12243a] p-4"
                >
                  <p className="text-xs font-medium text-slate-400">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-3">Pitcher</th>
                    <th className="px-3 py-3 text-right">3D Pitches</th>
                    <th className="px-3 py-3 text-right">7D Pitches</th>
                    <th className="px-3 py-3 text-right">3D Apps</th>
                    <th className="px-3 py-3 text-right">7D Apps</th>
                    <th className="px-3 py-3 text-right">Rest Days</th>
                    <th className="px-3 py-3 text-right">Score</th>
                    <th className="px-3 py-3">Workload Level</th>
                  </tr>
                </thead>

                <tbody>
                  {[...bullpen]
                    .sort((a, b) => {
                      const scoreA = a.fatigue?.score ?? -1;
                      const scoreB = b.fatigue?.score ?? -1;

                      return scoreB - scoreA ||
                        a.name.localeCompare(b.name);
                    })
                    .map((player) => {
                    const workload = player.workload;
                    const fatigue = player.fatigue;

                    const level = fatigue?.level ?? "Unknown";

                    const levelColor =
                      level === "Very High"
                        ? "text-red-400"
                        : level === "High"
                          ? "text-orange-400"
                          : level === "Moderate"
                            ? "text-yellow-400"
                            : level === "Low"
                              ? "text-green-400"
                              : "text-slate-400";

                    return (
                      <tr
                        key={player.id}
                        className="border-b border-white/5 hover:bg-white/5"
                      >
                        <td className="px-3 py-4 font-semibold text-white">
                          {player.name}
                        </td>
                        <td className="px-3 py-4 text-right">
                          {workload?.pitchesLast3Days ?? "—"}
                        </td>
                        <td className="px-3 py-4 text-right">
                          {workload?.pitchesLast7Days ?? "—"}
                        </td>
                        <td className="px-3 py-4 text-right">
                          {workload?.appearancesLast3Days ?? "—"}
                        </td>
                        <td className="px-3 py-4 text-right">
                          {workload?.appearancesLast7Days ?? "—"}
                        </td>
                        <td className="px-3 py-4 text-right">
                          {workload?.daysRest ?? "—"}
                        </td>
                        <td className="px-3 py-4 text-right font-semibold">
                          {fatigue?.score ?? "—"}
                        </td>
                        <td className={"px-3 py-4 font-semibold " + levelColor}>
                          {level}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-slate-500">
              Fatigue scores are experimental workload indicators based
              on recent pitch counts, appearances, and rest. They are
              not medical assessments or measures of player availability.
              Low recent workload does not necessarily indicate that
              a pitcher is healthy or available.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
