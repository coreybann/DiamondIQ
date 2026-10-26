
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type SeasonData = {
  season: number;
  value: number | null;
};

type PerformanceTrendChartProps = {
  data: SeasonData[];
  isPitcher: boolean;
};

export default function PerformanceTrendChart({
  data,
  isPitcher,
}: PerformanceTrendChartProps) {
  const statLabel = isPitcher ? "ERA" : "OPS";

  const chartData = data.filter(
    (season) => season.value !== null
  );

  return (
    <section className="mt-12">
      <h2 className="mb-5 text-2xl font-bold">
        {statLabel} Performance Trend
      </h2>

      {chartData.length > 0 ? (
        <div className="h-80 rounded-xl border border-gray-800 bg-gray-900 p-5">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
              />
              <XAxis
                dataKey="season"
                stroke="#94a3b8"
              />
              <YAxis
                stroke="#94a3b8"
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0d1d30",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={statLabel}
                stroke="#38bdf8"
                strokeWidth={3}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-gray-400">
          No performance trend data available.
        </p>
      )}
    </section>
  );
}
