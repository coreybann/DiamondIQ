"use client";

import { useEffect, useState } from "react";

type Player = {
  id: number;
  name: string;
};

type PitchRating = {
  pitcher: number;
  pitch_type: string;
  pitches: number;
  predicted_rv: number;
  stuff_plus: number;
  metrics_pitches: number | null;
  avg_velocity: number | null;
  avg_spin: number | null;
  avg_h_break: number | null;
  avg_v_break: number | null;
};

type SeasonData = {
  pitcher: number;
  season: number;
  overall: {
    pitcher: number;
    pitches: number;
    predicted_rv: number;
    stuff_plus: number;
  } | null;
  pitches: PitchRating[];
  arsenal: {
    pitch_type: string;
    metrics_pitches: number;
    avg_velocity: number;
    avg_spin: number;
    avg_h_break: number;
    avg_v_break: number;
  }[];
};

const SEASONS = [2024, 2025, 2026];

export default function YearOverYearComparison({
  player,
}: {
  player: Player;
}) {
  const [data, setData] = useState<SeasonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<
    "overview" | "development" | "characteristics" | "usage"
  >("overview");

  useEffect(() => {
    const controller = new AbortController();

    async function loadHistory() {
      setLoading(true);
      setError("");
      setData([]);

      try {
        const results = await Promise.all(
          SEASONS.map(async (season) => {
            const response = await fetch(
              `/api/stuff-plus?pitcher=${player.id}&season=${season}`,
              { signal: controller.signal }
            );

            if (!response.ok) {
              throw new Error(`Unable to load ${season} data.`);
            }

            return (await response.json()) as SeasonData;
          })
        );

        if (!controller.signal.aborted) {
          setData(results);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("Could not load historical Stuff+ data.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => controller.abort();
  }, [player.id]);

  if (loading) {
    return (
      <p className="text-sm text-slate-400">
        Loading historical Stuff+ data...
      </p>
    );
  }

  if (error) {
    return <p className="text-sm text-red-300">{error}</p>;
  }

  const pitchTypes = Array.from(
    new Set(data.flatMap((season) =>
      season.pitches.map((pitch) => pitch.pitch_type)
    ))
  ).sort();

  const usagePitchTypes = Array.from(
    new Set(data.flatMap((season) =>
      season.arsenal.map((pitch) => pitch.pitch_type)
    ))
  ).sort();

  const pitchNames: Record<string, string> = {
    FF: "Four-Seam Fastball",
    SI: "Sinker",
    FC: "Cutter",
    SL: "Slider",
    ST: "Sweeper",
    SV: "Slurve",
    CU: "Curveball",
    KC: "Knuckle Curve",
    CH: "Changeup",
    FS: "Splitter",
  };

  const getPitchRating = (season: number, pitchType: string) =>
    data.find((item) => item.season === season)
      ?.pitches.find((pitch) => pitch.pitch_type === pitchType);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">
          {player.name} — Year-over-Year Stuff+
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          Historical comparison across the 2024, 2025, and 2026 seasons.
        </p>
      </div>

        <div className="flex flex-wrap gap-2">
          {([
            ["overview", "Overview"],
            ["development", "Pitch Development"],
            ["characteristics", "Characteristics"],
            ["usage", "Pitch Usage"],
          ] as const).map(([section, label]) => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeSection === section
                  ? "bg-blue-600 text-white"
                  : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

      {activeSection === "overview" && (
      <div className="rounded-xl border border-white/10 bg-[#0d1d30] p-4">
        <h4 className="font-semibold text-white">
          Seasonal Data
        </h4>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[550px] text-sm">
            <thead className="border-b border-white/10 text-slate-400">
              <tr>
                <th className="px-3 py-3 text-left">Season</th>
                <th className="px-3 py-3 text-right">Stuff+</th>
                <th className="px-3 py-3 text-right">Pitches</th>
              </tr>
            </thead>
            <tbody>
              {data.map((season) => (
                <tr
                  key={season.season}
                  className="border-b border-white/5"
                >
                  <td className="px-3 py-3 font-semibold">
                    {season.season}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-blue-400">
                    {season.overall
                      ? season.overall.stuff_plus.toFixed(2)
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-300">
                    {season.overall
                      ? season.overall.pitches.toLocaleString()
                      : "No qualifying data"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      )}
      {activeSection === "development" && (
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1d30]">
        <div className="p-4">
          <h4 className="font-semibold text-white">
            Individual Pitch Development
          </h4>
          <p className="mt-2 text-sm text-slate-400">
            Compare individual pitch Stuff+ ratings across seasons.
            Changes compare 2024 with 2026 when both ratings exist.
          </p>
        </div>

        {pitchTypes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm text-left">
              <thead className="border-y border-white/10 bg-white/5 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Pitch Type</th>
                  <th className="px-4 py-3 text-right">2024</th>
                  <th className="px-4 py-3 text-right">2025</th>
                  <th className="px-4 py-3 text-right">2026</th>
                  <th className="px-4 py-3 text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                {pitchTypes.map((pitchType) => {
                  const rating2024 = getPitchRating(2024, pitchType);
                  const rating2025 = getPitchRating(2025, pitchType);
                  const rating2026 = getPitchRating(2026, pitchType);

                  const change =
                    rating2024 && rating2026
                      ? rating2026.stuff_plus - rating2024.stuff_plus
                      : null;

                  return (
                    <tr
                      key={pitchType}
                      className="border-b border-white/5"
                    >
                      <td className="px-4 py-3 font-semibold text-white">
                        {pitchNames[pitchType]
                          ? `${pitchNames[pitchType]} (${pitchType})`
                          : pitchType}
                      </td>
                      {[rating2024, rating2025, rating2026].map(
                        (rating, index) => (
                          <td
                            key={index}
                            className="px-4 py-3 text-right text-slate-300"
                          >
                            {rating
                              ? rating.stuff_plus.toFixed(2)
                              : "—"}
                          </td>
                        )
                      )}
                      <td className={`px-4 py-3 text-right font-bold ${
                        change === null
                          ? "text-slate-400"
                          : change > 0
                            ? "text-green-400"
                            : change < 0
                              ? "text-red-400"
                              : "text-slate-300"
                      }`}>
                        {change === null
                          ? "—"
                          : `${change > 0 ? "+" : ""}${change.toFixed(2)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 pb-4 text-sm text-slate-400">
            No qualifying pitch-type data available.
          </p>
        )}
      </div>

      )}
      {activeSection === "characteristics" && (
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1d30]">
        <div className="p-4">
          <h4 className="font-semibold text-white">
            Pitch Characteristics Comparison
          </h4>
          <p className="mt-2 text-sm text-slate-400">
            Compare velocity, spin rate, and pitch movement across seasons.
            Velocity is measured in mph, spin in rpm, and movement in inches.
          </p>
        </div>

        {pitchTypes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-y border-white/10 bg-white/5 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Pitch Type</th>
                  <th className="px-4 py-3 text-right">Season</th>
                  <th className="px-4 py-3 text-right">Velocity</th>
                  <th className="px-4 py-3 text-right">Spin Rate</th>
                  <th className="px-4 py-3 text-right">H-Break</th>
                  <th className="px-4 py-3 text-right">V-Break</th>
                </tr>
              </thead>
              <tbody>
                {pitchTypes.flatMap((pitchType) =>
                  SEASONS.map((season) => {
                    const pitch = getPitchRating(season, pitchType);

                    const format = (
                      value: number | null | undefined,
                      signed = false
                    ) => {
                      if (value == null || !Number.isFinite(value)) {
                        return "—";
                      }

                      return `${signed && value > 0 ? "+" : ""}${value.toFixed(1)}`;
                    };

                    return (
                      <tr
                        key={`${pitchType}-${season}`}
                        className="border-b border-white/5"
                      >
                        <td className="px-4 py-3 font-semibold text-white">
                          {pitchNames[pitchType]
                            ? `${pitchNames[pitchType]} (${pitchType})`
                            : pitchType}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {season}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {format(pitch?.avg_velocity)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {pitch?.avg_spin != null &&
                          Number.isFinite(pitch.avg_spin)
                            ? Math.round(pitch.avg_spin).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {format(pitch?.avg_h_break, true)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {format(pitch?.avg_v_break, true)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 pb-4 text-sm text-slate-400">
            No qualifying pitch characteristic data available.
          </p>
        )}
      </div>

      )}
      {activeSection === "usage" && (
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1d30]">
        <div className="p-4">
          <h4 className="font-semibold text-white">
            Pitch Usage Evolution
          </h4>
          <p className="mt-2 text-sm text-slate-400">
            Percentage of each pitch type thrown by season.
            Includes all recorded pitch types, even those without
            qualifying Stuff+ ratings. Changes compare 2024 and 2026
            when both seasons have data.
          </p>
        </div>

        {usagePitchTypes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="border-y border-white/10 bg-white/5 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Pitch Type</th>
                  <th className="px-4 py-3 text-right">2024</th>
                  <th className="px-4 py-3 text-right">2025</th>
                  <th className="px-4 py-3 text-right">2026</th>
                  <th className="px-4 py-3 text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                {usagePitchTypes.map((pitchType) => {
                  const usage = SEASONS.map((season) => {
                    const seasonData = data.find(
                      (item) => item.season === season
                    );

                    if (!seasonData?.overall?.pitches) {
                      return null;
                    }

                    const pitch = seasonData.arsenal.find(
                      (item) => item.pitch_type === pitchType
                    );

                    return pitch
                      ? (pitch.metrics_pitches / seasonData.overall.pitches) * 100
                      : 0;
                  });

                  const change =
                    usage[0] != null && usage[2] != null
                      ? usage[2] - usage[0]
                      : null;

                  return (
                    <tr
                      key={pitchType}
                      className="border-b border-white/5"
                    >
                      <td className="px-4 py-3 font-semibold text-white">
                        {pitchNames[pitchType]
                          ? `${pitchNames[pitchType]} (${pitchType})`
                          : pitchType}
                      </td>
                      {usage.map((value, index) => (
                        <td
                          key={SEASONS[index]}
                          className="px-4 py-3 text-right text-slate-300"
                        >
                          {value != null
                            ? `${value.toFixed(1)}%`
                            : "—"}
                        </td>
                      ))}
                      <td className={`px-4 py-3 text-right font-bold ${
                        change == null
                          ? "text-slate-400"
                          : change > 0
                            ? "text-green-400"
                            : change < 0
                              ? "text-red-400"
                              : "text-slate-300"
                      }`}>
                        {change == null
                          ? "—"
                          : `${change > 0 ? "+" : ""}${change.toFixed(1)} pp`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 pb-4 text-sm text-slate-400">
            No qualifying pitch usage data available.
          </p>
        )}
      </div>
      )}
    </div>
  );
}
