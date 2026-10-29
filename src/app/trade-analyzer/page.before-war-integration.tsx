"use client";

import { useEffect, useMemo, useState } from "react";

type Player = {
  name: string;
  team: string;
  position: string;
  salary: number;
  war: number | null;
};

type TradePlayer = Player & {
  yearsRemaining: number;
  annualSalary: number;
  projectedWar: number | null;
};

type Projection = {
  year: number;
  war: number;
  salary: number;
  warValue: number;
  surplus: number;
};

const DEFAULT_WAR_PRICE = 9;
const DEFAULT_DECLINE = 5;

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
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(1)}M`;
}

function projectPlayer(
  player: TradePlayer,
  warPrice: number,
  decline: number
): Projection[] | null {
  if (player.projectedWar === null) return null;

  const projections: Projection[] = [];

  for (let year = 1; year <= player.yearsRemaining; year++) {
    const projectedWar =
      player.projectedWar! * Math.pow(1 - decline / 100, year - 1);

    const warValue = projectedWar * warPrice;
    const salary = player.annualSalary;

    projections.push({
      year,
      war: projectedWar,
      salary,
      warValue,
      surplus: warValue - salary,
    });
  }

  return projections;
}

function totalProjection(
  players: TradePlayer[],
  warPrice: number,
  decline: number
) {
  let totalWar = 0;
  let totalSalary = 0;
  let totalSurplus = 0;
  let incomplete = false;

  for (const player of players) {
    const projection = projectPlayer(player, warPrice, decline);

    if (!projection) {
      incomplete = true;
      continue;
    }

    for (const season of projection) {
      totalWar += season.war;
      totalSalary += season.salary;
      totalSurplus += season.surplus;
    }
  }

  return {
    war: totalWar,
    salary: totalSalary,
    surplus: incomplete ? null : totalSurplus,
  };
}

export default function TradeAnalyzerPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamA, setTeamA] = useState<TradePlayer[]>([]);
  const [teamB, setTeamB] = useState<TradePlayer[]>([]);
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const [warPrice, setWarPrice] = useState(DEFAULT_WAR_PRICE);
  const [decline, setDecline] = useState(DEFAULT_DECLINE);
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
          .map((row) => ({
            name: row[0].trim(),
            team: row[1]?.trim() || "Unknown",
            position: row[2]?.trim() || "Unknown",
            salary: Number(row[3].replace(/[$,]/g, "")),
            war: warMap.get(normalize(row[0])) ?? null,
          }))
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

  const selectedNames = useMemo(
    () => new Set([...teamA, ...teamB].map((player) => normalize(player.name))),
    [teamA, teamB]
  );

  const totalsA = totalProjection(teamA, warPrice, decline);
  const totalsB = totalProjection(teamB, warPrice, decline);

  function addPlayer(player: Player, side: "A" | "B") {
    const tradePlayer: TradePlayer = {
      ...player,
      yearsRemaining: 1,
      annualSalary: player.salary / 1_000_000,
      projectedWar: player.war,
    };

    if (side === "A") {
      setTeamA((current) => [...current, tradePlayer]);
      setSearchA("");
    } else {
      setTeamB((current) => [...current, tradePlayer]);
      setSearchB("");
    }
  }

  function updatePlayer(
    side: "A" | "B",
    name: string,
    field: "yearsRemaining" | "annualSalary" | "projectedWar",
    value: number | null
  ) {
    const setter = side === "A" ? setTeamA : setTeamB;

    setter((current) =>
      current.map((player) =>
        player.name === name
          ? { ...player, [field]: value }
          : player
      )
    );
  }

  function tradeSide(
    title: string,
    side: "A" | "B",
    search: string,
    setSearch: (value: string) => void,
    selected: TradePlayer[],
    setSelected: (players: TradePlayer[]) => void
  ) {
    const results = search.trim()
      ? players
          .filter(
            (player) =>
              normalize(player.name).includes(normalize(search)) &&
              !selectedNames.has(normalize(player.name))
          )
          .slice(0, 8)
      : [];

    const totals = side === "A" ? totalsA : totalsB;

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
                onClick={() => addPlayer(player, side)}
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

        <div className="mt-5 space-y-4">
          {selected.length === 0 && (
            <p className="text-sm text-slate-400">
              No players selected yet.
            </p>
          )}

          {selected.map((player) => {
            const projection = projectPlayer(player, warPrice, decline);
            const surplus = projection?.reduce(
              (sum, season) => sum + season.surplus,
              0
            );

            return (
              <div
                key={player.name}
                className="rounded-xl bg-[#081321] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{player.name}</p>
                    <p className="text-sm text-slate-400">
                      {player.team} · {player.position}
                    </p>
                    <p className="mt-2 text-sm">
                      2026 WAR: {player.war?.toFixed(2) ?? "Unavailable"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelected(
                        selected.filter((item) => item.name !== player.name)
                      )
                    }
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-4">
                  <label className="text-sm text-slate-400">
                    Projected Year 1 WAR (editable assumption)
                    <input
                      type="number"
                      step={0.1}
                      value={player.projectedWar ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        updatePlayer(
                          side,
                          player.name,
                          "projectedWar",
                          value === "" ? null : Number(value)
                        );
                      }}
                      className="mt-2 w-full rounded-lg border border-slate-600 bg-[#12243a] p-3 text-white"
                    />
                  </label>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-slate-400">
                    Years Remaining
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={player.yearsRemaining === 0 ? "" : player.yearsRemaining}
                      onChange={(event) => {
                        const value = event.target.value;

                        if (value === "") {
                          updatePlayer(side, player.name, "yearsRemaining", 0);
                          return;
                        }

                        updatePlayer(
                          side,
                          player.name,
                          "yearsRemaining",
                          Math.min(10, Math.max(1, Number(value)))
                        );
                      }}
                      onBlur={() => {
                        if (player.yearsRemaining < 1) {
                          updatePlayer(side, player.name, "yearsRemaining", 1);
                        }
                      }}
                      className="mt-2 w-full rounded-lg border border-slate-600 bg-[#12243a] p-3 text-white"
                    />
                  </label>

                  <label className="text-sm text-slate-400">
                    Annual Salary ($M)
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={player.annualSalary}
                      onChange={(event) =>
                        updatePlayer(
                          side,
                          player.name,
                          "annualSalary",
                          Math.max(0, Number(event.target.value) || 0)
                        )
                      }
                      className="mt-2 w-full rounded-lg border border-slate-600 bg-[#12243a] p-3 text-white"
                    />
                  </label>
                </div>

                <div className="mt-5 border-t border-slate-700 pt-4">
                  <p className="text-sm text-slate-400">
                    Projected multi-year surplus
                  </p>
                  <p className="mt-1 text-2xl font-black text-blue-400">
                    {surplus === undefined
                      ? "Unavailable"
                      : money(surplus)}
                  </p>
                </div>

                {projection && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-slate-400">
                        <tr>
                          <th className="pb-2">Year</th>
                          <th className="pb-2">WAR</th>
                          <th className="pb-2">Salary</th>
                          <th className="pb-2">Surplus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projection.map((season) => (
                          <tr
                            key={season.year}
                            className="border-t border-slate-800"
                          >
                            <td className="py-2">{season.year}</td>
                            <td>{season.war.toFixed(2)}</td>
                            <td>{money(season.salary)}</td>
                            <td>{money(season.surplus)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 border-t border-slate-700 pt-5">
          <p className="text-slate-400">
            Projected WAR:{" "}
            <span className="text-white">{totals.war.toFixed(2)}</span>
          </p>
          <p className="text-slate-400">
            Salary Obligations:{" "}
            <span className="text-white">{money(totals.salary)}</span>
          </p>
          <p className="mt-3 text-sm text-slate-400">
            Total Projected Surplus
          </p>
          <p className="text-3xl font-black text-blue-400">
            {totals.surplus === null
              ? "Incomplete data"
              : money(totals.surplus)}
          </p>
        </div>
      </section>
    );
  }

  const ready = teamA.length > 0 && teamB.length > 0;
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
          Build hypothetical MLB trades using projected WAR,
          contract length, salary obligations, and estimated surplus value.
        </p>

        <section className="mt-8 grid gap-5 rounded-2xl border border-slate-700 bg-[#12243a] p-6 sm:grid-cols-2">
          <label className="text-sm text-slate-400">
            Market Value per WAR ($M)
            <input
              type="number"
              min={1}
              max={30}
              step={0.5}
              value={warPrice}
              onChange={(event) =>
                setWarPrice(
                  Math.max(1, Math.min(30, Number(event.target.value) || 1))
                )
              }
              className="mt-2 w-full rounded-lg border border-slate-600 bg-[#081321] p-3 text-white"
            />
          </label>

          <label className="text-sm text-slate-400">
            Annual WAR Decline (%)
            <input
              type="number"
              min={0}
              max={30}
              step={1}
              value={decline}
              onChange={(event) =>
                setDecline(
                  Math.max(0, Math.min(30, Number(event.target.value) || 0))
                )
              }
              className="mt-2 w-full rounded-lg border border-slate-600 bg-[#081321] p-3 text-white"
            />
          </label>
        </section>

        {loading && (
          <p className="mt-8 text-blue-400">Loading MLB player data...</p>
        )}

        {error && (
          <p className="mt-8 text-red-400">{error}</p>
        )}

        {!loading && !error && (
          <>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {tradeSide(
                "Team A receives",
                "A",
                searchA,
                setSearchA,
                teamA,
                setTeamA
              )}

              {tradeSide(
                "Team B receives",
                "B",
                searchB,
                setSearchB,
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
                  One or more players are missing WAR data.
                  The comparison cannot be completed.
                </p>
              ) : (
                <div className="mt-5">
                  <p className="text-lg font-semibold">
                    {Math.abs(difference!) < 1
                      ? "Approximately balanced by projected surplus value"
                      : difference! > 0
                        ? "Team A receives more projected surplus value"
                        : "Team B receives more projected surplus value"}
                  </p>

                  <p className="mt-3 text-3xl font-black text-blue-400">
                    Difference: {money(Math.abs(difference!))}
                  </p>

                  <p className="mt-3 text-slate-400">
                    Team A receives {totalsA.war.toFixed(2)} projected WAR
                    with {money(totalsA.salary)} in salary obligations.
                    Team B receives {totalsB.war.toFixed(2)} projected WAR
                    with {money(totalsB.salary)} in salary obligations.
                  </p>
                </div>
              )}
            </section>

            <p className="mt-6 max-w-4xl text-sm text-slate-500">
              Methodology: future WAR is estimated from reported 2026
              Baseball-Reference WAR using a constant annual decline.
              Projected surplus equals WAR multiplied by the selected
              market value per WAR, minus assumed annual salary.
              Years remaining and salary are editable assumptions,
              not verified contract terms. This is an illustrative
              scenario model, not a validated trade valuation system.
              Prospects, injuries, arbitration, inflation, discounting,
              and roster fit are not included.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
