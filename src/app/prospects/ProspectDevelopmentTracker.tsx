"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type StatRecord = {
  season?: string;
  team?: { name?: string };
  sport?: { id?: number };
  stat?: Record<string, string | number>;
};

type Props = {
  playerName: string;
  isPitcher: boolean;
  records: StatRecord[];
};

const LEVELS: Record<number, string> = {
  11: "Triple-A",
  12: "Double-A",
  13: "High-A",
  14: "Single-A",
  16: "Rookie",
  17: "Rookie",
};

const METRICS = {
  hitting: [
    { key: "ops", label: "OPS", lowerBetter: false },
    { key: "avg", label: "AVG", lowerBetter: false },
    { key: "obp", label: "OBP", lowerBetter: false },
    { key: "slg", label: "SLG", lowerBetter: false },
    { key: "iso", label: "ISO", lowerBetter: false },
    { key: "bbRate", label: "BB%", lowerBetter: false },
    { key: "kRate", label: "K%", lowerBetter: true },
  ],
  pitching: [
    { key: "era", label: "ERA", lowerBetter: true },
    { key: "whip", label: "WHIP", lowerBetter: true },
    { key: "k9", label: "K/9", lowerBetter: false },
    { key: "bb9", label: "BB/9", lowerBetter: true },
    { key: "kbb", label: "K/BB", lowerBetter: false },
  ],
};

function number(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function inningsToOuts(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const match = String(value).match(/^(\d+)(?:\.([012]))?$/);
  if (!match) return null;

  return Number(match[1]) * 3 + Number(match[2] ?? 0);
}

function metricValue(
  stat: Record<string, string | number>,
  key: string
): number | null {
  const pa = number(stat.plateAppearances);
  const bb = number(stat.baseOnBalls);
  const so = number(stat.strikeOuts);
  const outs = inningsToOuts(stat.inningsPitched);

  switch (key) {
    case "iso": {
      const slg = number(stat.slg);
      const avg = number(stat.avg);
      return slg === null || avg === null ? null : slg - avg;
    }
    case "bbRate":
      return pa && bb !== null ? (bb / pa) * 100 : null;
    case "kRate":
      return pa && so !== null ? (so / pa) * 100 : null;
    case "k9":
      return outs && so !== null ? (so * 27) / outs : null;
    case "bb9":
      return outs && bb !== null ? (bb * 27) / outs : null;
    case "kbb":
      return bb && so !== null ? so / bb : null;
    default:
      return number(stat[key]);
  }
}

export default function ProspectDevelopmentTracker({
  playerName,
  isPitcher,
  records,
}: Props) {
  const metrics = isPitcher ? METRICS.pitching : METRICS.hitting;
  const [metric, setMetric] = useState(isPitcher ? "era" : "ops");

  const selected = metrics.find((item) => item.key === metric)!;

  const points = useMemo(
    () =>
      records
        .map((record, index) => {
          const value = metricValue(record.stat ?? {}, metric);
          if (value === null) return null;

          return {
            id: index,
            season: record.season ?? "Unknown",
            level: LEVELS[record.sport?.id ?? 0] ?? "Other",
            team: record.team?.name ?? "Unknown",
            label: `${record.season ?? "?"} ${LEVELS[record.sport?.id ?? 0] ?? "Other"}`,
            value: Number(value.toFixed(3)),
          };
        })
        .filter((point): point is NonNullable<typeof point> => point !== null),
    [records, metric]
  );

  const changes = points.slice(1).map((point, index) => {
    const previous = points[index];
    const difference = point.value - previous.value;
    const sameLevel = point.level === previous.level;

    return {
      ...point,
      previous,
      difference,
      sameLevel,
      favorable: selected.lowerBetter
        ? difference < 0
        : difference > 0,
    };
  });

  return (
    <section
      id="development-tracker"
      className="mt-12 rounded-xl border border-slate-700 bg-[#0d1d30] p-6"
    >
      <h2 className="text-2xl font-bold">
        Prospect Development Tracker
      </h2>

      <p className="mt-2 text-sm text-slate-400">
        Track {playerName}&apos;s statistical performance across
        seasons, teams, and minor-league levels.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {metrics.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setMetric(item.key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              metric === item.key
                ? "bg-blue-500 text-white"
                : "bg-[#12243a] text-slate-300 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {points.length === 0 ? (
        <p className="mt-8 text-slate-400">
          No recorded statistics are available for this metric.
        </p>
      ) : (
        <>
          <div className="mt-8 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={points}
                margin={{ top: 10, right: 15, left: 0, bottom: 20 }}
              >
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  angle={-20}
                  textAnchor="end"
                  height={65}
                />
                <YAxis stroke="#94a3b8" domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#12243a",
                    border: "1px solid #475569",
                    borderRadius: 8,
                  }}
                  formatter={(value) => [String(value), selected.label]}
                  labelFormatter={(_, payload) => {
                    const point = payload?.[0]?.payload;
                    return point
                      ? `${point.season} · ${point.level} · ${point.team}`
                      : "";
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#60a5fa"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h3 className="mt-8 text-lg font-bold">
            Statistical Changes — {selected.label}
          </h3>

          {changes.length === 0 ? (
            <p className="mt-3 text-slate-400">
              At least two recorded observations are needed for comparisons.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {changes.map((change) => (
                <div
                  key={change.id}
                  className="rounded-lg border border-slate-700 bg-[#12243a] p-4"
                >
                  <p className="font-semibold">
                    {change.previous.season} {change.previous.level}
                    {" → "}
                    {change.season} {change.level}
                  </p>

                  <p className="mt-2 text-sm text-slate-300">
                    {selected.label}: {change.previous.value.toFixed(3)}
                    {" → "}
                    {change.value.toFixed(3)}
                    {" · Change: "}
                    {change.difference > 0 ? "+" : ""}
                    {change.difference.toFixed(3)}
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    {change.sameLevel
                      ? "Same-level comparison. Review sample sizes before interpreting the change."
                      : "Competition level changed. This statistical difference does not establish improvement or regression."}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <p className="mt-6 text-xs text-slate-500">
        Source: MLB Stats API. Statistics are not adjusted for league,
        park, age, or competition quality. Changes are descriptive,
        not scouting grades or predictions of future performance.
      </p>
    </section>
  );
}
