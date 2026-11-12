"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Pitch = {
  pitch_type: string;
  pitches: number;
  stuff_plus: number;
};

type Props = {
  pitches: Pitch[];
  totalPitches: number;
};

export default function PitchUsageChart({
  pitches,
  totalPitches,
}: Props) {
  if (totalPitches <= 0 || pitches.length === 0) {
    return null;
  }

  const data = pitches.map((pitch) => ({
    pitch_type: pitch.pitch_type,
    pitches: pitch.pitches,
    usage: (pitch.pitches / totalPitches) * 100,
    stuff_plus: pitch.stuff_plus,
  }));

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1d30] p-5">
      <h3 className="text-lg font-semibold text-white">
        Pitch Usage vs. Stuff+
      </h3>

      <p className="mt-2 text-sm text-slate-400">
        Compare how frequently each pitch is thrown with
        its DiamondIQ Stuff+ rating. A Stuff+ of 100
        represents the model baseline.
      </p>

      <div className="mt-5 h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{
              top: 20,
              right: 25,
              bottom: 15,
              left: 5,
            }}
          >
            <CartesianGrid
              stroke="#334155"
              strokeDasharray="3 3"
            />

            <XAxis
              dataKey="pitch_type"
              tick={{ fill: "#94a3b8" }}
            />

            <YAxis
              yAxisId="usage"
              tick={{ fill: "#94a3b8" }}
              tickFormatter={(value: number) => `${value}%`}
              domain={[0, "auto"]}
            />

            <YAxis
              yAxisId="stuff"
              orientation="right"
              tick={{ fill: "#94a3b8" }}
              domain={[
                (dataMin: number) => Math.min(95, Math.floor(dataMin - 5)),
                (dataMax: number) => Math.max(105, Math.ceil(dataMax + 5)),
              ]}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) {
                  return null;
                }

                const pitch = payload[0].payload as
                  (typeof data)[number];

                return (
                  <div className="rounded-lg border border-white/10 bg-[#081321] p-3 text-sm text-white shadow-xl">
                    <p className="font-bold">
                      {pitch.pitch_type}
                    </p>
                    <p>
                      Pitches: {pitch.pitches.toLocaleString()}
                    </p>
                    <p>
                      Usage: {pitch.usage.toFixed(1)}%
                    </p>
                    <p>
                      Stuff+: {pitch.stuff_plus.toFixed(2)}
                    </p>
                  </div>
                );
              }}
            />

            <ReferenceLine
              yAxisId="stuff"
              y={100}
              stroke="#94a3b8"
              strokeDasharray="5 5"
            />

            <Bar
              yAxisId="usage"
              dataKey="usage"
              name="Usage %"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              maxBarSize={65}
            />

            <Line
              yAxisId="stuff"
              type="monotone"
              dataKey="stuff_plus"
              name="Stuff+"
              stroke="#f97316"
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 7 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap gap-6 text-sm text-slate-300">
        <span>🔵 Bars: Pitch Usage %</span>
        <span>🟠 Line: Stuff+</span>
        <span>Dashed line: Stuff+ 100</span>
      </div>
    </div>
  );
}
