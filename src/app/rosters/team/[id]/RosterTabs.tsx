"use client";

import { useState } from "react";
import Link from "next/link";
import DepthChart from "./DepthChart";
import PayrollContracts from "./PayrollContracts";
import type { TeamSalaryRecord, TeamSalaryProjection } from "@/lib/teamPayroll";

type MLBPlayer = {
  id: number;
  name: string;
  number: string | null;
  position: string;
  status: string;
  age: number | null;
  bats: string;
  throws: string;
};

type RosterView = "active" | "40man" | "depth" | "payroll";

const groups = [
  { title: "Pitchers", positions: ["P", "SP", "RP", "TWP"] },
  { title: "Catchers", positions: ["C"] },
  { title: "Infielders", positions: ["1B", "2B", "3B", "SS", "IF"] },
  { title: "Outfielders", positions: ["LF", "CF", "RF", "OF"] },
  { title: "Designated Hitters", positions: ["DH"] },
];

export default function RosterTabs({
  activePlayers,
  fortyManPlayers,
  depthChartPlayers,
  teamSalaryRecords,
  teamSalaryProjections,
  activeRosterLabel = "Active Roster",
  activeRosterDescription,
}: {
  activePlayers: MLBPlayer[];
  fortyManPlayers: MLBPlayer[];
  depthChartPlayers: MLBPlayer[];
  teamSalaryRecords: TeamSalaryRecord[];
  teamSalaryProjections: TeamSalaryProjection[];
  activeRosterLabel?: string;
  activeRosterDescription?: string;
}) {
  const [view, setView] = useState<RosterView>("active");

  const players = view === "active" ? activePlayers : fortyManPlayers;
  const sortedPlayers = [...players].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const sections = [
    ...groups.map((group) => ({
      title: group.title,
      players: sortedPlayers.filter((player) =>
        group.positions.includes(player.position)
      ),
    })),
    {
      title: "Other Players",
      players: sortedPlayers.filter(
        (player) =>
          !groups.some((group) =>
            group.positions.includes(player.position)
          )
      ),
    },
  ].filter((section) => section.players.length > 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {([
          ["active", activeRosterLabel],
          ["40man", "40-Man Roster"],
          ["depth", "Depth Chart"],
          ["payroll", "Payroll & Contracts"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setView(value)}
            className={`rounded-lg px-5 py-3 text-sm font-semibold transition ${
              view === value
                ? "bg-blue-600 text-white"
                : "border border-white/10 bg-[#142940] text-slate-300 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "depth" ? (
        <DepthChart players={depthChartPlayers} />
      ) : view === "payroll" ? (
        <PayrollContracts
          records={teamSalaryRecords}
          projections={teamSalaryProjections}
          fortyManPlayers={fortyManPlayers}
        />
      ) : (
        <>
      <p className="mb-2 text-sm text-slate-400">
        {view === "active" ? activeRosterLabel : "40-Man Roster"}
        {" · "}
        {players.length} Players
      </p>

      {view === "active" && activeRosterDescription && (
        <p className="mb-6 text-sm text-slate-500">
          {activeRosterDescription}
        </p>
      )}

      <div className="space-y-6">
        {sections.map((section) => (
          <section
            key={section.title}
            className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1d30]"
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-[#12243a] px-6 py-4">
              <h2 className="text-xl font-bold">{section.title}</h2>
              <span className="text-sm text-slate-400">
                {section.players.length} players
              </span>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[620px]">
                <div className="grid grid-cols-[55px_minmax(170px,1fr)_65px_65px_45px_45px] gap-3 border-b border-white/10 px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <span>#</span>
                  <span>Player</span>
                  <span>POS</span>
                  <span>Age</span>
                  <span>B</span>
                  <span>T</span>
                </div>

                <div className="divide-y divide-white/5">
                  {section.players.map((player) => (
                    <div
                      key={player.id}
                      className="grid grid-cols-[55px_minmax(170px,1fr)_65px_65px_45px_45px] items-center gap-3 px-6 py-4 text-sm hover:bg-white/[0.03]"
                    >
                      <span className="font-semibold text-blue-400">
                        #{player.number ?? "—"}
                      </span>

                      <div className="min-w-0">
                        <Link
                          href={`/players/${player.id}`}
                          className="font-medium text-white transition hover:text-blue-400 hover:underline"
                        >
                          {player.name}
                        </Link>

                        {view === "40man" && (
                          <p className="mt-1 text-xs text-slate-400">
                            {player.status}
                          </p>
                        )}
                      </div>

                      <span className="text-slate-300">
                        {player.position}
                      </span>

                      <span className="text-slate-300">
                        {player.age ?? "—"}
                      </span>

                      <span className="text-slate-300">
                        {player.bats}
                      </span>

                      <span className="text-slate-300">
                        {player.throws}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {players.length === 0 && (
        <p className="rounded-xl border border-white/10 p-6 text-slate-400">
          No players were returned for this roster.
        </p>
      )}
        </>
      )}
    </div>
  );
}
