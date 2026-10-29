
"use client";

import { useEffect, useRef, useState } from "react";
import { recommendLineup } from "@/lib/lineupOptimizer";
import {
  estimateRunsPerGame,
  findBestSimulatedLineup,
} from "@/lib/lineupSimulation";
type MLBTeam = {
  id: number;
  name: string;
  abbreviation: string;
};

type MLBPlayer = {
  id: number;
  name: string;
  number: string | null;
  position: string;
};


type HittingStats = {
  avg: string;
  obp: string;
  slg: string;
  ops: string;

  plateAppearances: number;
  atBats: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  baseOnBalls: number;
  hitByPitch: number;
  strikeOuts: number;
  stolenBases: number;
  sacFlies: number;
  sacBunts: number;
  groundIntoDoublePlay: number;
};


export default function LineupBuilder({
  teams,
}: {
  teams: MLBTeam[];
}) {
  const [selectedTeam, setSelectedTeam] = useState("");
  const [players, setPlayers] = useState<MLBPlayer[]>([]);

const [playerStats, setPlayerStats] = useState<
  Record<number, HittingStats | null>
>({});

  const [lineup, setLineup] = useState<MLBPlayer[]>([]);
  const [originalLineup, setOriginalLineup] = useState<MLBPlayer[]>([]);
  const [optimizedLineup, setOptimizedLineup] = useState<MLBPlayer[]>([]);
const [showComparison, setShowComparison] = useState(false);

const [runComparison, setRunComparison] = useState<{
  original: number;
  optimized: number;
} | null>(null);

  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const optimizerWorkerRef = useRef<Worker | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedTeam) {
      return;
    }

    const controller = new AbortController();

    async function loadRoster() {
      setLoading(true);
      setError("");
      setPlayers([]);

      try {
        const response = await fetch(
          `/api/lineup-roster?teamId=${selectedTeam}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Unable to load roster");
        }

        const data = await response.json();
        if (!controller.signal.aborted) {
          setPlayers(data.players ?? []);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError("Unable to load this team's roster.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadRoster();

    return () => controller.abort();
  }, [selectedTeam]);

useEffect(() => {
  if (lineup.length === 0) return;

  const controller = new AbortController();

  async function loadStats() {
    const missingPlayers = lineup.filter(
      (player) => !(player.id in playerStats)
    );

    if (missingPlayers.length === 0) return;

    const results = await Promise.all(
      missingPlayers.map(async (player) => {
        try {
          const response = await fetch(
            `/api/player-stats?id=${player.id}&season=2026&group=hitting`,
            { signal: controller.signal }
          );

          if (!response.ok) {
            throw new Error("Unable to load stats");
          }

          const data = await response.json();

          return {
            id: player.id,
            stats: data.stats as HittingStats | null,
          };
        } catch {
  return {
    id: player.id,
    stats: null,
  };
}
      })
    );

    if (controller.signal.aborted) return;

    setPlayerStats((current) => {
      const updated = { ...current };

      for (const result of results) {
        updated[result.id] = result.stats;
      }

      return updated;
    });
  }

  loadStats();

  return () => controller.abort();
}, [lineup, playerStats]);

function togglePlayer(player: MLBPlayer) {
    optimizerWorkerRef.current?.terminate();
optimizerWorkerRef.current = null;
setOptimizing(false);
  setShowComparison(false);
  setOptimizedLineup([]);

  setLineup((current) => {
    const alreadySelected = current.some(
      (item) => item.id === player.id
    );

    if (alreadySelected) {
      return current.filter((item) => item.id !== player.id);
    }

    if (current.length >= 9) {
      return current;
    }

    return [...current, player];
  });
}

function movePlayer(index: number, direction: -1 | 1) {
  setLineup((current) => {
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= current.length) {
      return current;
    }

    const updated = [...current];

    [updated[index], updated[newIndex]] = [
      updated[newIndex],
      updated[index],
    ];

    return updated;
  });
}

function optimizeLineup() {
  if (lineup.length !== 9) return;

  const hitters = lineup.map((player) => {
    const stats = playerStats[player.id];

    if (!stats) return null;

    const obp = Number.parseFloat(stats.obp);
    const slg = Number.parseFloat(stats.slg);

    if (!Number.isFinite(obp) || !Number.isFinite(slg)) {
      return null;
    }


return {
  id: player.id,
  name: player.name,
  obp,
  slg,

  avg: Number(stats.avg),
  plateAppearances: Number(stats.plateAppearances),
  atBats: Number(stats.atBats),
  hits: Number(stats.hits),
  doubles: Number(stats.doubles),
  triples: Number(stats.triples),
  homeRuns: Number(stats.homeRuns),
  walks: Number(stats.baseOnBalls),
  hitByPitch: Number(stats.hitByPitch),
  strikeouts: Number(stats.strikeOuts),
  stolenBases: Number(stats.stolenBases),
};

  });

  if (hitters.some((hitter) => hitter === null)) {
    return;
  }

  const validHitters = hitters.filter(
  (hitter): hitter is NonNullable<typeof hitter> =>
    hitter !== null
);

if (validHitters.length !== 9) return;


  if (optimizerWorkerRef.current) {
    optimizerWorkerRef.current.terminate();
  }

  const worker = new Worker(
    new URL("./lineupOptimizer.worker.ts", import.meta.url)
  );

  optimizerWorkerRef.current = worker;
  setOptimizing(true);
  setError("");

  worker.onmessage = (event) => {
    if (optimizerWorkerRef.current !== worker) return;

    worker.terminate();
    optimizerWorkerRef.current = null;
    setOptimizing(false);

    const result = event.data as {
      success: boolean;
      lineup?: typeof validHitters;
      error?: string;
    };

    if (
      !result.success ||
      !result.lineup ||
      result.lineup.length !== 9
    ) {
      setError(result.error ?? "Unable to optimize lineup.");
      return;
    }

    const playerMap = new Map(
      lineup.map((player) => [player.id, player])
    );

    const optimizedPlayers = result.lineup
      .map((hitter) => playerMap.get(hitter.id))
      .filter(
        (player): player is MLBPlayer => player !== undefined
      );

    if (optimizedPlayers.length !== 9) {
      setError("Unable to match optimized players.");
      return;
    }

    const originalRuns = estimateRunsPerGame(validHitters, 5000);
    const optimizedRuns = estimateRunsPerGame(
      result.lineup,
      5000
    );

    if (originalRuns !== null && optimizedRuns !== null) {
      setRunComparison({
        original: originalRuns,
        optimized: optimizedRuns,
      });
    } else {
      setRunComparison(null);
    }

    setOriginalLineup([...lineup]);
    setOptimizedLineup([...optimizedPlayers]);
    setLineup(optimizedPlayers);
    setShowComparison(true);
  };

  worker.onerror = () => {
    if (optimizerWorkerRef.current !== worker) return;

    worker.terminate();
    optimizerWorkerRef.current = null;
    setOptimizing(false);
    setError("An error occurred while optimizing the lineup.");
  };

  worker.postMessage(validHitters);
}

return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700 bg-[#0d1d30] p-6">
        <h2 className="mb-4 text-xl font-bold">
          Select an MLB Team
        </h2>

        <select
          value={selectedTeam}
          onChange={(event) => {
            optimizerWorkerRef.current?.terminate();
optimizerWorkerRef.current = null;
setOptimizing(false);
  setPlayers([]);
  setLineup([]);
  setError("");
  setSelectedTeam(event.target.value);
  setOriginalLineup([]);
  setOptimizedLineup([]);
setShowComparison(false);
}}
          className="w-full rounded-lg border border-slate-700 bg-[#12243a] px-4 py-3 text-white outline-none focus:border-blue-400"
        >
          <option value="">Choose a team...</option>

          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <p className="text-sm text-slate-400">
          Loading active roster...
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-950/20 p-4 text-red-300">
          {error}
        </p>
      )}

      {selectedTeam && !loading && !error && (
        <div className="rounded-xl border border-slate-700 bg-[#0d1d30] p-6">
          <h2 className="mb-5 text-xl font-bold">
            Available Hitters
          </h2>

          <p className="mb-5 text-sm text-slate-400">
            {players.length} position players on the active roster
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((player) => {
  const selected = lineup.some(
    (item) => item.id === player.id
  );

  return (
    <button
      type="button"
      key={player.id}
      onClick={() => togglePlayer(player)}
      disabled={!selected && lineup.length >= 9}
      aria-pressed={selected}
      className={`rounded-lg border p-4 text-left transition ${
        selected
          ? "border-blue-400 bg-blue-500/15"
          : "border-slate-700 bg-[#12243a] hover:border-blue-400/50"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
                <p className="font-semibold text-white">
                  {player.name}
                </p>

                <p className="mt-1 text-sm text-slate-400">
  #{player.number ?? "—"} · {player.position}
</p>
</button>
);
})}
          </div>
<div className="mt-8 rounded-xl border border-slate-700 bg-[#081321] p-6">
  <h2 className="mb-2 text-xl font-bold">
    Your Batting Order
  </h2>

  <p className="mb-5 text-sm text-slate-400">
    {lineup.length} of 9 hitters selected
  </p>

<button
  type="button"
  onClick={optimizeLineup}
  disabled={
  optimizing ||
  lineup.length !== 9 ||
    lineup.some((player) => {
      const stats = playerStats[player.id];

      return (
        !stats ||
        !Number.isFinite(Number.parseFloat(stats.obp)) ||
        !Number.isFinite(Number.parseFloat(stats.slg))
      );
    })
  }
  className="mb-6 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
>
{optimizing ? "Optimizing Lineup..." : "Optimize Lineup"}
</button>

  <div className="space-y-2">
    {lineup.map((player, index) => (
      <div
        key={player.id}
        className="flex items-center gap-4 rounded-lg border border-slate-700 bg-[#12243a] p-3"
      >
        <span className="w-8 font-bold text-blue-400">
          {index + 1}.
        </span>

        <span className="flex-1 font-medium">
          {player.name}
        </span>

        <span className="text-sm text-slate-400">
          {player.position}
        </span>

<div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-300">
  {playerStats[player.id] ? (
    <>
      <span>
        AVG: {playerStats[player.id]?.avg ?? "—"}
      </span>
      <span>
        OBP: {playerStats[player.id]?.obp ?? "—"}
      </span>
      <span>
        SLG: {playerStats[player.id]?.slg ?? "—"}
      </span>
      <span className="font-semibold text-blue-400">
        OPS: {playerStats[player.id]?.ops ?? "—"}
      </span>
    </>
  ) : (
    <span className="text-slate-500">
      Stats unavailable or loading...
    </span>
  )}
</div>

<div className="flex gap-2">
  <button
    type="button"
    onClick={() => movePlayer(index, -1)}
    disabled={index === 0}
    aria-label={`Move ${player.name} up`}
    className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-white hover:border-blue-400 disabled:cursor-not-allowed disabled:opacity-30"
  >
    ↑
  </button>

  <button
    type="button"
    onClick={() => movePlayer(index, 1)}
    disabled={index === lineup.length - 1}
    aria-label={`Move ${player.name} down`}
    className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-white hover:border-blue-400 disabled:cursor-not-allowed disabled:opacity-30"
  >
    ↓
  </button>
</div>

      </div>
    ))}
    
  </div>

  {lineup.length === 9 && (
    <p className="mt-5 text-sm font-semibold text-green-400">
      Your nine-player lineup is complete!
    </p>
  )}

{showComparison && originalLineup.length === 9 && (
  <div className="mt-8 rounded-xl border border-blue-400/30 bg-[#0d1d30] p-6">
    <h3 className="mb-2 text-xl font-bold text-white">
      Lineup Optimization Comparison
    </h3>

    <p className="mb-6 text-sm text-slate-400">
Compare your original batting order with DiamondIQ's simulation-based recommendation.
    </p>

{runComparison && (
  <div className="mb-6 rounded-xl border border-blue-400/20 bg-[#0d1d30] p-5">
    <h4 className="mb-4 font-semibold text-white">
      Experimental Run Simulation
    </h4>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-sm text-slate-400">
          Original Lineup
        </p>
        <p className="text-2xl font-bold text-white">
          {runComparison.original.toFixed(2)}
        </p>
      </div>

      <div>
        <p className="text-sm text-slate-400">
          Optimized Lineup
        </p>
        <p className="text-2xl font-bold text-blue-400">
          {runComparison.optimized.toFixed(2)}
        </p>
      </div>
    </div>

    <p className="mt-4 text-xs text-slate-400">
      Estimated runs per nine offensive innings using 5,000
      simulations per lineup. Experimental model based on
      historical hitting statistics and simplified baserunning.
      Differences may reflect random simulation variation.
    </p>
  </div>
)}

    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h4 className="mb-4 font-semibold text-slate-300">
          Original Lineup
        </h4>

        <div className="space-y-2">
          {originalLineup.map((player, index) => (
            <div
              key={player.id}
              className="flex items-center gap-3 rounded-lg bg-[#12243a] p-3"
            >
              <span className="w-6 font-bold text-slate-400">
                {index + 1}.
              </span>
              <span className="text-sm text-white">
                {player.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-4 font-semibold text-blue-400">
          Optimized Lineup
        </h4>

        <div className="space-y-2">
{optimizedLineup.map((player, index) => {
            const oldPosition = originalLineup.findIndex(
              (item) => item.id === player.id
            );

            const change = oldPosition - index;

            return (
              <div
                key={player.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-blue-400/20 bg-[#12243a] p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 font-bold text-blue-400">
                    {index + 1}.
                  </span>
                  <span className="text-sm text-white">
                    {player.name}
                  </span>
                </div>

                <span
                  className={`text-xs font-semibold ${
                    change > 0
                      ? "text-green-400"
                      : change < 0
                        ? "text-amber-400"
                        : "text-slate-400"
                  }`}
                >
                  {change > 0
                    ? `↑ ${change}`
                    : change < 0
                      ? `↓ ${Math.abs(change)}`
                      : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>

    <p className="mt-5 text-xs text-slate-500">
This recommendation uses an experimental run simulation to search for higher-scoring batting orders. Results are estimates, not validated projections, and the search does not guarantee the best possible lineup.
    </p>
  </div>
)}

</div>
         {players.length === 0 && (
  <p className="text-slate-400">
    No position players were returned.
  </p>
)}
        </div>
      )}
    </div>
  );
}
