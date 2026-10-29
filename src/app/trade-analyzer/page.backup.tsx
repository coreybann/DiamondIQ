"use client";

import { useEffect, useMemo, useState } from "react";

type Player = {
  name: string;
  team: string;
  position: string;
  salary: number;
  war: number | null;
};

const DOLLARS_PER_WAR = 9_000_000;

function normalize(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function parseCSV(text: string): string[][] {
  return text
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const cells: string[] = [];
      let current = "";
      let quoted = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          if (quoted && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            quoted = !quoted;
          }
        } else if (char === "," && !quoted) {
          cells.push(current);
          current = "";
        } else {
          current += char;
        }
      }

      cells.push(current);
      return cells;
    });
}

function money(value: number) {
  return `$${(value / 1_000_000).toFixed(1)}M`;
}

function playerValue(player: Player) {
  return player.war === null
    ? null
    : player.war * DOLLARS_PER_WAR - player.salary;
}

export default function TradeAnalyzerPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamA, setTeamA] = useState<string[]>([]);
  const [teamB, setTeamB] = useState<string[]>([]);
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [salaryResponse, warResponse] = await Promise.all([
          fetch("/data/mlb-salaries-2026.csv"),
          fetch("/data/player-war-2026.csv"),
        ]);

        if (!salaryResponse.ok || !warResponse.ok) {
          throw new Error("Unable to load player datasets.");
        }

        const salaryRows = parseCSV(await salaryResponse.text());
        const warRows = parseCSV(await warResponse.text());

        const warMap = new Map<string, number>();

        for (const row of warRows.slice(1)) {
          const name = row[1];
          const war = Number(row[2]);

          if (name && row[2]?.trim() !== "" && Number.isFinite(war)) {
            warMap.set(normalize(name), war);
          }
        }

        const loadedPlayers: Player[] = salaryRows
          .slice(1)
          .filter((row) => row.length >= 4 && row[0]?.trim())
          .map((row) => {
            const salary = Number(row[3].replace(/[$,]/g, ""));

            return {
              name: row[0].trim(),
              team: row[1]?.trim() || "Unknown",
              position: row[2]?.trim() || "Unknown",
              salary,
              war: warMap.get(normalize(row[0])) ?? null,
            };
          })
          .filter((player) => Number.isFinite(player.salary));

        setPlayers(loadedPlayers);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Data loading failed.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const playerMap = useMemo(
    () => new Map(players.map((player) => [player.name, player])),
    [players]
  );

  const selectedA = teamA
    .map((name) => playerMap.get(name))
    .filter((player): player is Player => Boolean(player));

  const selectedB = teamB
    .map((name) => playerMap.get(name))
    .filter((player): player is Player => Boolean(player));

  function totals(selected: Player[]) {
    const complete = selected.every((player) => player.war !== null);

    return {
      war: selected.reduce((sum, player) => sum + (player.war ?? 0), 0),
      salary: selected.reduce((sum, player) => sum + player.salary, 0),
      surplus: complete
        ? selected.reduce((sum, player) => sum + (playerValue(player) ?? 0), 0)
        : null,
    };
  }

  const totalsA = totals(selectedA);
  const totalsB = totals(selectedB);

  function tradeSide(
    title: string,
    search: string,
    setSearch: (value: string) => void,
    selected: Player[],
    names: string[],
    setNames: (names: string[]) => void
  ) {
    const results = search.trim()
      ? players
          .filter(
            (player) =>
              normalize(player.name).includes(normalize(search)) &&
              !teamA.includes(player.name) &&
              !teamB.includes(player.name)
          )
          .slice(0, 8)
      : [];

    const summary = totals(selected);

    return (
      <section className="rounded-2xl border border-slate-700 bg-[#12243a] p-6">
        <h2 className="mb-5 text-xl font-bold">{title}</h2>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search MLB players..."
          className="w-full rounded-lg border border-slate-600 bg-[#081321] p-3 text-white outline-none focus:border-blue-400"
        />

        {results.length > 0 && (
          <div className="mt-2 overflow-hidden rounded-lg border border-slate-700">
            {results.map((player) => (
              <button
                key={player.name}
                type="button"
                onClick={() => {
                  setNames([...names, player.name]);
                  setSearch("");
                }}
                className="block w-full border-b border-slate-700 p-3 text-left hover:bg-slate-700"
              >
                <span className="font-semibold">{player.name}</span>
                <span className="ml-2 text-sm text-slate-400">
                  {player.team} · {player.position}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 space-y-3">
          {selected.length === 0 && (
            <p className="text-sm text-slate-400">
              No players selected yet.
            </p>
          )}

          {selected.map((player) => (
            <div
              key={player.name}
              className="flex items-start justify-between gap-3 rounded-lg bg-[#081321] p-4"
            >
              <div>
                <p className="font-semibold">{player.name}</p>
                <p className="text-sm text-slate-400">
                  {player.team} · {player.position}
                </p>
                <p className="mt-2 text-sm">
                  WAR: {player.war?.toFixed(2) ?? "Unavailable"}
                </p>
                <p className="text-sm">
                  Salary: {money(player.salary)}
                </p>
                <p className="text-sm text-blue-300">
                  Surplus:{" "}
                  {playerValue(player) === null
                    ? "Unavailable"
                    : money(playerValue(player)!)}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setNames(names.filter((name) => name !== player.name))
                }
                className="text-sm text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-slate-700 pt-5">
          <p className="text-slate-400">
            Total WAR: <span className="text-white">{summary.war.toFixed(2)}</span>
          </p>
          <p className="text-slate-400">
            Total Salary:{" "}
            <span className="text-white">{money(summary.salary)}</span>
          </p>
          <p className="mt-3 text-sm text-slate-400">
            Estimated single-season surplus
          </p>
          <p className="text-3xl font-black text-blue-400">
            {summary.surplus === null
              ? "Incomplete data"
              : money(summary.surplus)}
          </p>
        </div>
      </section>
    );
  }

  const ready = selectedA.length > 0 && selectedB.length > 0;
  const complete =
    ready && totalsA.surplus !== null && totalsB.surplus !== null;

  const difference = complete
    ? totalsA.surplus! - totalsB.surplus!
    : null;

  return (
    <main className="min-h-screen bg-[#081321] px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <p className="mb-4 text-sm font-bold uppercase tracking-widest text-blue-400">
          DiamondIQ Front Office Tools
        </p>

        <h1 className="text-4xl font-black md:text-5xl">
          MLB Trade Analyzer
        </h1>

        <p className="mt-5 max-w-3xl text-slate-400">
          Build hypothetical MLB trades and compare 2026 player WAR,
          salaries, and estimated single-season surplus value.
        </p>

        {loading && (
          <p className="mt-8 text-blue-400">Loading MLB player data...</p>
        )}

        {error && (
          <p className="mt-8 text-red-400">{error}</p>
        )}

        {!loading && !error && (
          <>
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {tradeSide(
                "Team A receives",
                searchA,
                setSearchA,
                selectedA,
                teamA,
                setTeamA
              )}

              {tradeSide(
                "Team B receives",
                searchB,
                setSearchB,
                selectedB,
                teamB,
                setTeamB
              )}
            </div>

            <section className="mt-8 rounded-2xl border border-slate-700 bg-[#12243a] p-6">
              <h2 className="text-2xl font-bold">Trade Evaluation</h2>

              {!ready ? (
                <p className="mt-4 text-slate-400">
                  Add at least one player to each side to evaluate the trade.
                </p>
              ) : !complete ? (
                <p className="mt-4 text-yellow-300">
                  One or more selected players are missing WAR data.
                  A complete surplus-value comparison is unavailable.
                </p>
              ) : (
                <div className="mt-5">
                  <p className="text-lg font-semibold">
                    {Math.abs(difference!) < 1_000_000
                      ? "Approximately balanced by estimated surplus value"
                      : difference! > 0
                        ? "Team A receives more estimated surplus value"
                        : "Team B receives more estimated surplus value"}
                  </p>

                  <p className="mt-3 text-3xl font-black text-blue-400">
                    Difference: {money(Math.abs(difference!))}
                  </p>

                  <p className="mt-3 text-slate-400">
                    Team A receives {totalsA.war.toFixed(2)} WAR and{" "}
                    {money(totalsA.salary)} in salary.
                    Team B receives {totalsB.war.toFixed(2)} WAR and{" "}
                    {money(totalsB.salary)} in salary.
                  </p>
                </div>
              )}
            </section>

            <p className="mt-6 max-w-4xl text-sm text-slate-500">
              Methodology: estimated single-season surplus equals 2026
              Baseball-Reference WAR multiplied by an illustrative
              $9 million per WAR, minus listed 2026 salary.
              This is a descriptive comparison, not a prediction of
              future performance or actual trade fairness. Contract
              control, prospects, injuries, and roster fit are not yet
              included.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
