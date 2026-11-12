"use client";

import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  LabelList,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

type PitchMovement = {
  pitch_type: string;
  pitches: number;
  stuff_plus: number;
  avg_velocity: number | null;
  avg_spin: number | null;
  avg_h_break: number | null;
  avg_v_break: number | null;
};

type Props = {
  pitches: PitchMovement[];
};

const COLORS: Record<string, string> = {
  FF: "#ef4444",
  SI: "#f97316",
  FC: "#eab308",
  SL: "#22c55e",
  ST: "#14b8a6",
  CU: "#3b82f6",
  KC: "#6366f1",
  CH: "#a855f7",
  FS: "#ec4899",
};

export default function PitchMovementChart({ pitches }: Props) {
  const data = pitches
    .filter(
      (pitch) =>
        pitch.avg_h_break != null &&
        pitch.avg_v_break != null
    )
    .map((pitch) => ({
      ...pitch,
      x: pitch.avg_h_break!,
      y: pitch.avg_v_break!,
    }));

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1d30] p-5">
      <h3 className="text-lg font-semibold text-white">
        Pitch Movement Profile
      </h3>

      <p className="mt-2 text-sm text-slate-400">
        Average horizontal and vertical pitch movement,
        measured in inches. Movement signs follow
        Statcast&apos;s coordinate convention.
      </p>

      <div className="mt-5 h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 10 }}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />

            <XAxis
              type="number"
              dataKey="x"
              name="Horizontal Break"
              unit=" in"
              domain={["auto", "auto"]}
              tick={{ fill: "#94a3b8" }}
              label={{
                value: "Horizontal Movement (in)",
                position: "insideBottom",
                offset: -15,
                fill: "#94a3b8",
              }}
            />

            <YAxis
              type="number"
              dataKey="y"
              name="Vertical Break"
              unit=" in"
              domain={["auto", "auto"]}
              tick={{ fill: "#94a3b8" }}
              label={{
                value: "Vertical Movement (in)",
                angle: -90,
                position: "insideLeft",
                fill: "#94a3b8",
              }}
            />

            <ZAxis range={[150, 150]} />

            <ReferenceLine x={0} stroke="#64748b" />
            <ReferenceLine y={0} stroke="#64748b" />

            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;

                const pitch = payload[0].payload as (typeof data)[number];

                return (
                  <div className="rounded-lg border border-white/10 bg-[#081321] p-3 text-sm text-white shadow-xl">
                    <p className="font-bold">{pitch.pitch_type}</p>
                    <p>Horizontal: {pitch.x.toFixed(1)} in</p>
                    <p>Vertical: {pitch.y.toFixed(1)} in</p>
                    <p>Velocity: {pitch.avg_velocity?.toFixed(1) ?? "—"} mph</p>
                    <p>Spin: {pitch.avg_spin?.toLocaleString() ?? "—"} rpm</p>
                    <p>Stuff+: {pitch.stuff_plus.toFixed(2)}</p>
                  </div>
                );
              }}
            />

            {data.map((pitch) => (
              <Scatter
                key={pitch.pitch_type}
                name={pitch.pitch_type}
                data={[pitch]}
                fill={COLORS[pitch.pitch_type] ?? "#94a3b8"}
              >
                <LabelList
                  dataKey="pitch_type"
                  position="top"
                  offset={12}
                  fill="#e2e8f0"
                  fontSize={12}
                  fontWeight={600}
                />
              </Scatter>
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap gap-4">
        {data.map((pitch) => (
          <div
            key={pitch.pitch_type}
            className="flex items-center gap-2 text-sm text-slate-300"
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor:
                  COLORS[pitch.pitch_type] ?? "#94a3b8",
              }}
            />
            {pitch.pitch_type}
          </div>
        ))}
      </div>
    </div>
  );
}
