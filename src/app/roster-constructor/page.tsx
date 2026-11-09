
"use client";

import { useEffect, useState } from "react";
import { freeAgents } from "@/lib/freeAgency";
import {
  getPlayer2027Salary,
  getPlayer2027ArbitrationEstimate,
  getPlayer2027PreArbitrationEstimate,
  getPlayer2027FreeAgentProjection,
  normalizeTeamCode,
} from "@/lib/rosterSalaries";
type MLBTeam = {
  id: number;
  name: string;
  abbreviation?: string;
};


type RosterPlayer = {
  person: { id: number; fullName: string };
  position: { abbreviation: string };
  status?: { description: string };
  currentTeam?: string;
  acquisitionType?: "trade" | "free-agent";
};


export default function RosterConstructorPage() {
  const [teams, setTeams] = useState<MLBTeam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const selectedTeamCode = normalizeTeamCode(
  teams.find((team) => String(team.id) === selectedTeam)
    ?.abbreviation ?? ""
);
  const [players, setPlayers] = useState<RosterPlayer[]>([]);

  type WarProjection = {
    player_name: string;
    projected_total_fwar: number;
  };

  const [warProjections, setWarProjections] = useState<WarProjection[]>([]);
  const [warLoading, setWarLoading] = useState(true);
  const [warError, setWarError] = useState("");
  const [transactions, setTransactions] = useState<
  {
    playerId: number;
    playerName: string;
    type: "trade" | "free-agent" | "removal";
    action: "added" | "removed";
  }[]
>([]);
  const [originalPlayers, setOriginalPlayers] = useState<RosterPlayer[]>([]);
  
const originalSalaryValues = originalPlayers.map((player) =>
  getPlayer2027Salary(
    player.person.fullName,
    selectedTeamCode
  )
);

const originalKnownPayroll = originalSalaryValues.reduce<number>(
  (total, salary) => total + (salary ?? 0),
  0
);

const originalMissingSalaries = originalSalaryValues.filter(
  (salary) => salary === null
).length;

const constructedSalaryValues = players.map((player) =>
  player.acquisitionType === "free-agent"
    ? null
    : getPlayer2027Salary(
        player.person.fullName,
        player.acquisitionType === "trade"
          ? normalizeTeamCode(
              teams.find(
                (team) => team.name === player.currentTeam
              )?.abbreviation ?? ""
            )
          : selectedTeamCode
      )
);
const constructedKnownPayroll =
  constructedSalaryValues.reduce<number>(
    (total, salary) => total + (salary ?? 0),
    0
  );

const constructedMissingSalaries =
  constructedSalaryValues.filter(
    (salary) => salary === null
  ).length;

const knownPayrollChange =
  constructedKnownPayroll - originalKnownPayroll;
const originalArbitrationValues = originalPlayers.map((player, index) =>
  originalSalaryValues[index] !== null
    ? null
    : getPlayer2027ArbitrationEstimate(
        player.person.fullName,
        selectedTeamCode
      )
);

const originalArbitrationPayroll = originalArbitrationValues.reduce<number>(
  (total, salary) => total + (salary ?? 0),
  0
);

const constructedArbitrationValues = players.map((player, index) =>
  player.acquisitionType === "free-agent" ||
  constructedSalaryValues[index] !== null
    ? null
    : getPlayer2027ArbitrationEstimate(
        player.person.fullName,
        player.acquisitionType === "trade"
          ? normalizeTeamCode(
              teams.find(
                (team) => team.name === player.currentTeam
              )?.abbreviation ?? ""
            )
          : selectedTeamCode
      )
);

const constructedArbitrationPayroll =
  constructedArbitrationValues.reduce<number>(
    (total, salary) => total + (salary ?? 0),
    0
  );

const originalPreArbitrationValues = originalPlayers.map(
  (player, index) =>
    originalSalaryValues[index] !== null ||
    originalArbitrationValues[index] !== null
      ? null
      : getPlayer2027PreArbitrationEstimate(
          player.person.fullName,
          selectedTeamCode
        )
);

const originalPreArbitrationPayroll =
  originalPreArbitrationValues.reduce<number>(
    (total, salary) => total + (salary ?? 0),
    0
  );

const constructedPreArbitrationValues = players.map(
  (player, index) =>
    player.acquisitionType === "free-agent" ||
    constructedSalaryValues[index] !== null ||
    constructedArbitrationValues[index] !== null
      ? null
      : getPlayer2027PreArbitrationEstimate(
          player.person.fullName,
          player.acquisitionType === "trade"
            ? normalizeTeamCode(
                teams.find(
                  (team) => team.name === player.currentTeam
                )?.abbreviation ?? ""
              )
            : selectedTeamCode
        )
);

const constructedPreArbitrationPayroll =
  constructedPreArbitrationValues.reduce<number>(
    (total, salary) => total + (salary ?? 0),
    0
  );
const constructedFreeAgentProjections = players.map((player) =>
  player.acquisitionType === "free-agent"
    ? getPlayer2027FreeAgentProjection(player.person.fullName)
    : null
);

const constructedFreeAgentPayroll =
  constructedFreeAgentProjections.reduce<number>(
    (total, projection) =>
      total + (projection?.aavMillions ?? 0),
    0
  );
const originalProjectedPayroll =
  originalKnownPayroll +
  originalArbitrationPayroll +
  originalPreArbitrationPayroll;

const constructedProjectedPayroll =
  constructedKnownPayroll +
  constructedArbitrationPayroll +
  constructedPreArbitrationPayroll +
  constructedFreeAgentPayroll;

const projectedPayrollChange =
  constructedProjectedPayroll - originalProjectedPayroll;

const originalStillMissing = originalPlayers.filter(
  (_, index) =>
    originalSalaryValues[index] === null &&
    originalArbitrationValues[index] === null &&
    originalPreArbitrationValues[index] === null
).length;

const constructedStillMissing = players.filter(
  (_, index) =>
    constructedSalaryValues[index] === null &&
    constructedArbitrationValues[index] === null &&
    constructedPreArbitrationValues[index] === null &&
    constructedFreeAgentProjections[index] === null
).length;
  // Match projections by normalized player name.
  // Ambiguous duplicate names are excluded rather than guessed.
  function normalizeWarName(name: string): string {
    return name
      .normalize("NFD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  const warProjectionMap = new Map<string, number>();
  const duplicateWarNames = new Set<string>();

  for (const projection of warProjections) {
    const key = normalizeWarName(projection.player_name);
    const value = Number(projection.projected_total_fwar);

    if (!Number.isFinite(value)) continue;

    if (warProjectionMap.has(key)) {
      duplicateWarNames.add(key);
    } else {
      warProjectionMap.set(key, value);
    }
  }

  for (const key of duplicateWarNames) {
    warProjectionMap.delete(key);
  }

  function calculateRosterWar(roster: RosterPlayer[]) {
    let total = 0;
    let missing = 0;

    for (const player of roster) {
      const projectedWar = warProjectionMap.get(
        normalizeWarName(player.person.fullName)
      );

      if (projectedWar === undefined) {
        missing += 1;
      } else {
        total += projectedWar;
      }
    }

    return {
      total,
      missing,
      matched: roster.length - missing,
    };
  }

  const originalWar = calculateRosterWar(originalPlayers);
  const constructedWar = calculateRosterWar(players);
  const projectedWarChange =
    constructedWar.total - originalWar.total;

  const [playerSearch, setPlayerSearch] = useState("");
  const [transactionType, setTransactionType] = useState<
  "trade" | "free-agent"
>("trade");
const [searchResults, setSearchResults] = useState<RosterPlayer[]>([]);
const [searchLoading, setSearchLoading] = useState(false);
const [searchError, setSearchError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadWarProjections() {
      try {
        const response = await fetch(
          "/data/trade-war-projections-2027.json"
        );

        if (!response.ok) {
          throw new Error("Unable to load 2027 WAR projections.");
        }

        const data = (await response.json()) as WarProjection[];

        if (!cancelled) setWarProjections(data);
      } catch {
        if (!cancelled) {
          setWarError("Unable to load 2027 WAR projections.");
        }
      } finally {
        if (!cancelled) setWarLoading(false);
      }
    }

    loadWarProjections();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    async function loadTeams() {
      try {
        const response = await fetch(
          "https://statsapi.mlb.com/api/v1/teams?sportId=1"
        );

        if (!response.ok) throw new Error("Unable to load teams");

        const data = await response.json();
        setTeams(
          (data.teams ?? []).sort((a: MLBTeam, b: MLBTeam) =>
            a.name.localeCompare(b.name)
          )
        );
      } catch {
        setError("Unable to load MLB teams.");
      }
    }

    loadTeams();
  }, []);

  useEffect(() => {
if (!selectedTeam) {
  setPlayers([]);
  setOriginalPlayers([]);
  return;
}

    let cancelled = false;

    async function loadRoster() {
      setLoading(true);
      setError("");
      setPlayers([]);

      try {
        const response = await fetch(
          `https://statsapi.mlb.com/api/v1/teams/${selectedTeam}/roster?rosterType=40Man`
        );

        if (!response.ok) throw new Error("Unable to load roster");

        const data = await response.json();

        if (!cancelled) {
const roster = data.roster ?? [];

setPlayers(roster);
setOriginalPlayers(roster);
        }
      } catch {
        if (!cancelled) setError("Unable to load team roster.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRoster();

    return () => {
      cancelled = true;
    };
  }, [selectedTeam]);

function removePlayer(playerId: number) {
  const player = players.find(
    (p) => p.person.id === playerId
  );

  if (!player) return;

  setPlayers((current) =>
    current.filter((p) => p.person.id !== playerId)
  );

  setTransactions((current) => [
    ...current,
    {
      playerId: player.person.id,
      playerName: player.person.fullName,
      type: "removal",
      action: "removed",
    },
  ]);
}

function resetRoster() {
  setPlayers([...originalPlayers]);
  setTransactions([]);
}

function restorePlayer(playerId: number) {
  const player = originalPlayers.find(
    (player) => player.person.id === playerId
  );

  if (!player) return;

  setPlayers((current) => {
    if (current.some((p) => p.person.id === playerId)) {
      return current;
    }

    return [...current, player];
  });
  setTransactions((current) => [
  ...current,
  {
    playerId: player.person.id,
    playerName: player.person.fullName,
    type: "removal",
    action: "added",
  },
]);
}


async function searchPlayers() {
  const query = playerSearch.trim();

  if (query.length < 2) {
    setSearchResults([]);
    setSearchError("Enter at least 2 characters.");
    return;
  }

  setSearchLoading(true);
  setSearchError("");
  setSearchResults([]);

  try {
    const response = await fetch(
      `/api/players?search=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error("Player search failed");
    }

    const data = await response.json();

    const results: RosterPlayer[] = (data.players ?? []).map(
      (player: {
        id: number;
        name: string;
        position: string;
        team: string;
      }) => ({
        person: {
          id: player.id,
          fullName: player.name,
        },
        position: {
          abbreviation: player.position,
        },
        currentTeam: player.team,
      })
    );

    setSearchResults(results);
  } catch {
    setSearchError("Unable to search MLB players.");
  } finally {
    setSearchLoading(false);
  }
}

function addPlayer(player: RosterPlayer) {
  if (!selectedTeam) {
    setSearchError("Select an MLB team first.");
    return;
  }

  if (players.some((p) => p.person.id === player.person.id)) {
    setSearchError("This player is already on your roster.");
    return;
  }

if (transactionType === "free-agent") {
  const freeAgent = freeAgents.find(
    (fa) => fa.id === player.person.id
  );

  if (!freeAgent || freeAgent.status !== "Available") {
    setSearchError(
      `${player.person.fullName} is not confirmed as Available in DiamondIQ's Free Agency Hub.`
    );
    return;
  }
}

setPlayers((current) => [
  ...current,
  {
    ...player,
    acquisitionType: transactionType,
  },
]);

setTransactions((current) => [
  ...current,
  {
    playerId: player.person.id,
    playerName: player.person.fullName,
    type: transactionType,
    action: "added",
  },
]);

setSearchError("");
}

return (
    <main className="min-h-screen bg-[#081321] px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="mb-2 text-sm font-semibold text-blue-400">
          DiamondIQ · Front Office Tools
        </p>

        <h1 className="text-3xl font-bold">
          Roster Construction Simulator
        </h1>

        <p className="mt-3 text-slate-400">
          Build MLB rosters and evaluate front-office decisions
          using player projections, payroll, and roster depth.
        </p>

        <div className="mt-8 rounded-xl border border-slate-700 bg-[#0d1d30] p-6">
          <label
            htmlFor="team-select"
            className="mb-3 block font-semibold"
          >
            Select MLB Team
          </label>

          <select
            id="team-select"
            value={selectedTeam}
            onChange={(event) => setSelectedTeam(event.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-[#12243a] p-3 text-white"
          >
            <option value="">Choose a team...</option>

            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

<div className="mt-6 rounded-xl border border-slate-700 bg-[#0d1d30] p-6">
  <h2 className="mb-3 text-lg font-bold">
    Search MLB Players
  </h2>

<div className="mb-4">
  <label
    htmlFor="transaction-type"
    className="mb-2 block text-sm font-semibold text-slate-300"
  >
    Transaction Type
  </label>

  <select
    id="transaction-type"
    value={transactionType}
    onChange={(event) =>
      setTransactionType(
        event.target.value as "trade" | "free-agent"
      )
    }
    className="w-full rounded-lg border border-slate-600 bg-[#12243a] p-3 text-white sm:max-w-xs"
  >
    <option value="trade">Trade Acquisition</option>
    <option value="free-agent">Free-Agent Signing</option>
  </select>
</div>

  <div className="flex flex-col gap-3 sm:flex-row">
    <input
      type="text"
      value={playerSearch}
      onChange={(event) => setPlayerSearch(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") searchPlayers();
      }}
      placeholder="Search player name..."
      className="flex-1 rounded-lg border border-slate-600 bg-[#12243a] p-3 text-white"
    />

    <button
      type="button"
      onClick={searchPlayers}
      disabled={searchLoading}
      className="rounded-lg bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
    >
      {searchLoading ? "Searching..." : "Search"}
    </button>
  </div>

  {searchError && (
    <p className="mt-3 text-sm text-red-400">
      {searchError}
    </p>
  )}

{searchResults.length > 0 && (
  <div className="mt-5">
    <h3 className="mb-3 font-semibold">
      Search Results ({searchResults.length})
    </h3>

    <div className="grid gap-3 md:grid-cols-2">
      {searchResults.map((player) => (
        <div
          key={player.person.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-[#12243a] p-4"
        >
          <div>
            <p className="font-semibold">
              {player.person.fullName}
            </p>
            <p className="text-sm text-slate-400">
              Position: {player.position.abbreviation}
            </p>
<p className="mt-1 text-sm text-slate-400">
  Current Team: {player.currentTeam ?? "Unknown"}
</p>

{(() => {
  const freeAgent = freeAgents.find(
    (fa) => fa.id === player.person.id
  );

  if (!freeAgent) return null;

  return (
    <p
      className={`mt-1 text-sm font-medium ${
        freeAgent.status === "Available"
          ? "text-green-400"
          : "text-amber-400"
      }`}
    >
      Free Agency Status: {freeAgent.status}
    </p>
  );
})()}

          </div>

<button
  type="button"
  onClick={() => addPlayer(player)}

disabled={
  !selectedTeam ||
  players.some((p) => p.person.id === player.person.id) ||
  (transactionType === "free-agent" &&
    !freeAgents.some(
      (fa) =>
        fa.id === player.person.id &&
        fa.status === "Available"
    ))
}

  className="rounded-lg border border-green-500/40 px-3 py-2 text-sm font-medium text-green-400 transition hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-40"
>
  {players.some((p) => p.person.id === player.person.id)
    ? "On Roster"
    : "Add to Roster"}
</button>

        </div>
      ))}
    </div>
  </div>
)}

</div>

        {loading && (
          <p className="mt-6 text-slate-400">Loading roster...</p>
        )}

        {error && (
          <p className="mt-6 text-red-400">{error}</p>
        )}

        {!loading && selectedTeam && !error && (
          <div className="mt-8">
<div className="mb-4 flex flex-wrap items-center justify-between gap-4">
  <h2 className="text-xl font-bold">
    Constructed Roster ({players.length} Players)
  </h2>

  <button
    type="button"
    onClick={resetRoster}
    disabled={
  transactions.length === 0 &&
  players.length === originalPlayers.length
}
    className="rounded-lg border border-blue-500 px-4 py-2 text-sm font-medium text-blue-400 transition hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-40"
  >
    Reset Roster
  </button>
</div>

            {players.length === 0 ? (
              <p className="text-slate-400">
                No roster players were returned.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {players.map((player) => (
                  <div
                    key={player.person.id}
                    className="rounded-xl border border-slate-700 bg-[#0d1d30] p-4"
                  >
                    <p className="font-semibold">
                      {player.person.fullName}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Position: {player.position?.abbreviation ?? "N/A"}
                    </p>

{player.acquisitionType && (
  <p className="mt-2 text-sm font-medium text-blue-400">
    Acquisition:{" "}
    {player.acquisitionType === "trade"
      ? "Trade Acquisition"
      : "Free-Agent Signing"}
  </p>
)}

                    <button
  type="button"
  onClick={() => removePlayer(player.person.id)}
  className="mt-4 rounded-lg border border-red-500/40 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
>
  Remove from Roster
</button>
                  </div>
                ))}
              </div>
            )}

{originalPlayers.some(
  (player) =>
    !players.some((p) => p.person.id === player.person.id)
) && (
  <div className="mt-8 rounded-xl border border-slate-700 bg-[#0d1d30] p-6">
    <h3 className="mb-4 text-lg font-bold">
      Removed Players
    </h3>

    <div className="space-y-3">
      {originalPlayers
        .filter(
          (player) =>
            !players.some((p) => p.person.id === player.person.id)
        )
        .map((player) => (
          <div
            key={player.person.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-slate-700 p-3"
          >
            <div>
              <p className="font-semibold">
                {player.person.fullName}
              </p>
              <p className="text-sm text-slate-400">
                {player.position?.abbreviation ?? "N/A"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => restorePlayer(player.person.id)}
              className="rounded-lg border border-green-500/40 px-3 py-2 text-sm font-medium text-green-400 hover:bg-green-500/10"
            >
              Add Back
            </button>
          </div>
        ))}
    </div>
  </div>
)}

{transactions.length > 0 && (
  <div className="mt-8 rounded-xl border border-slate-700 bg-[#0d1d30] p-6">
    <h3 className="mb-4 text-lg font-bold">
      Transaction History
    </h3>

    <div className="space-y-3">
      {transactions.map((transaction, index) => (
        <div
          key={index}
          className="flex items-center justify-between gap-4 rounded-lg border border-slate-700 bg-[#12243a] p-4"
        >
          <div>
            <p className="font-semibold">
              {transaction.playerName}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              {transaction.type === "trade"
                ? "Trade Acquisition"
                : transaction.type === "free-agent"
                ? "Free-Agent Signing"
                : transaction.action === "removed"
                ? "Player Removed"
                : "Player Restored"}
            </p>
          </div>

          <span
            className={`text-sm font-semibold ${
              transaction.action === "added"
                ? "text-green-400"
                : "text-red-400"
            }`}
          >
            {transaction.action === "added"
              ? "Added"
              : "Removed"}
          </span>
        </div>
      ))}
    </div>
  </div>
)}

          </div>
        )}
<div className="mt-6 rounded-xl border border-slate-700 bg-[#0d1d30] p-6">
  <h2 className="mb-4 text-lg font-bold">
    2027 Projected Roster WAR
  </h2>

  {warLoading ? (
    <p className="text-sm text-slate-400">
      Loading 2027 WAR projections...
    </p>
  ) : warError ? (
    <p className="text-sm text-red-400">{warError}</p>
  ) : (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-[#12243a] p-4">
          <p className="text-sm text-slate-400">
            Original Roster WAR
          </p>
          <p className="mt-2 text-2xl font-bold">
            {originalWar.total.toFixed(1)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {originalWar.matched} players with projections
          </p>
        </div>

        <div className="rounded-lg bg-[#12243a] p-4">
          <p className="text-sm text-slate-400">
            Constructed Roster WAR
          </p>
          <p className="mt-2 text-2xl font-bold">
            {constructedWar.total.toFixed(1)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {constructedWar.matched} players with projections
          </p>
        </div>

        <div className="rounded-lg bg-[#12243a] p-4">
          <p className="text-sm text-slate-400">
            Change in Projected WAR
          </p>
          <p className={`mt-2 text-2xl font-bold ${
            projectedWarChange > 0
              ? "text-green-400"
              : projectedWarChange < 0
                ? "text-red-400"
                : "text-white"
          }`}>
            {projectedWarChange > 0 ? "+" : ""}
            {projectedWarChange.toFixed(1)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Compared with original roster
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-400">
        Projection coverage: {originalWar.matched} of{" "}
        {originalPlayers.length} original players and{" "}
        {constructedWar.matched} of {players.length} constructed
        players. Missing projections are excluded from totals.
      </p>

      <p className="mt-2 text-xs text-slate-500">
        WAR values are summed 2027 player fWAR projections
        across the 40-man roster. They do not account for
        playing-time overlap and are not projected team wins.
      </p>
    </>
  )}
</div>

{!loading && selectedTeam && !error && (
  <div className="mt-8 rounded-xl border border-slate-700 bg-[#0d1d30] p-6">
    <h2 className="mb-5 text-xl font-bold">
      2027 Projected Roster Payroll
    </h2>

    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-lg bg-[#12243a] p-4">
        <p className="text-sm text-slate-400">
          Original Projected Payroll
        </p>
        <p className="mt-2 text-2xl font-bold">
          ${originalProjectedPayroll.toFixed(1)}M
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Confirmed: ${originalKnownPayroll.toFixed(1)}M
        </p>
        <p className="text-xs text-blue-400">
          Arbitration estimates: ${originalArbitrationPayroll.toFixed(1)}M
        </p>
<p className="text-xs text-emerald-400">
  Pre-arbitration estimates: ${originalPreArbitrationPayroll.toFixed(1)}M
</p>
        <p className="mt-2 text-xs text-slate-400">
          {originalStillMissing} players with unknown salaries
        </p>
      </div>

      <div className="rounded-lg bg-[#12243a] p-4">
        <p className="text-sm text-slate-400">
          Constructed Projected Payroll
        </p>
        <p className="mt-2 text-2xl font-bold">
          ${constructedProjectedPayroll.toFixed(1)}M
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Confirmed: ${constructedKnownPayroll.toFixed(1)}M
        </p>
        <p className="text-xs text-blue-400">
          Arbitration estimates: ${constructedArbitrationPayroll.toFixed(1)}M
        </p>
<p className="text-xs text-emerald-400">
  Pre-arbitration estimates: ${constructedPreArbitrationPayroll.toFixed(1)}M
</p>
<p className="text-xs text-purple-400">
  Free-agent contract projections: ${constructedFreeAgentPayroll.toFixed(1)}M
</p>
        <p className="mt-2 text-xs text-slate-400">
          {constructedStillMissing} players with unknown salaries
        </p>
      </div>

      <div className="rounded-lg bg-[#12243a] p-4">
        <p className="text-sm text-slate-400">
          Change in Projected Payroll
        </p>
        <p className="mt-2 text-2xl font-bold text-blue-400">
          {projectedPayrollChange >= 0 ? "+" : "-"}$
          {Math.abs(projectedPayrollChange).toFixed(1)}M
        </p>
<p className="mt-2 text-xs text-slate-400">
  Includes confirmed salaries, arbitration estimates,
  pre-arbitration estimates, and projected free-agent
  contract AAV.
</p>
      </div>
    </div>

<p className="mt-4 text-xs text-slate-400">
  Payroll figures combine listed 2027 contract salaries,
  provisional arbitration projections, estimated
  pre-arbitration salaries, and projected free-agent contract
  annual values (AAV) for hypothetical signings.
  Pre-arbitration estimates use a $780,000 per-player baseline
  based on the 2026 MLB minimum salary, not an official 2027
  minimum. Free-agent projections use DiamondIQ's contract
  projection model and are not actual signed contracts or
  guaranteed 2027 salaries. Actual eligibility, roster status,
  and salaries may differ. Unknown salaries and other
  unmodeled costs are excluded. These figures are not complete
  team payroll or luxury-tax calculations.
</p>
  </div>
)}

      </div>
    </main>
  );
}
