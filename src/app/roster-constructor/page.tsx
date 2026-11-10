
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

  // IDs of players selected for the 26-man active roster.
  const [activeRosterIds, setActiveRosterIds] = useState<number[]>([]);

  // Store optimizer recommendations separately from manual selections.
  const [optimizerMessage, setOptimizerMessage] = useState("");

  const [optimizerPreview, setOptimizerPreview] = useState<{
    playerIds: number[];
    projectedWar: number;
    rosterSignature: string;
    projectionSignature: string;
    teamId: string;
  } | null>(null);

  const activeRosterPlayers = players.filter((player) =>
    activeRosterIds.includes(player.person.id)
  );

  const activeRosterCount = activeRosterPlayers.length;
  const activeRosterLimit = 26;

  // Standard regular-season active roster validation.
  const activePitcherCount = activeRosterPlayers.filter((player) =>
    ["P", "SP", "RP"].includes(
      player.position?.abbreviation?.toUpperCase() ?? ""
    )
  ).length;

  const activePositionPlayerCount =
    activeRosterCount - activePitcherCount;

  const activeRosterIsFull =
    activeRosterCount === activeRosterLimit;

  const activeRosterPitcherLimitExceeded =
    activePitcherCount > 13;

  const activeRosterIsValid =
    activeRosterIsFull && !activeRosterPitcherLimitExceeded;


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

// Calculate active roster payroll using existing constructed roster estimates.
const activeRosterPlayerIds = new Set(activeRosterIds);

const activeRosterSalaryDetails = players
  .map((player, index) => ({
    player,
    confirmed: constructedSalaryValues[index],
    arbitration: constructedArbitrationValues[index],
    preArbitration: constructedPreArbitrationValues[index],
    freeAgent: constructedFreeAgentProjections[index]?.aavMillions ?? null,
  }))
  .filter(({ player }) =>
    activeRosterPlayerIds.has(player.person.id)
  );

const activeKnownPayroll = activeRosterSalaryDetails.reduce(
  (total, entry) => total + (entry.confirmed ?? 0),
  0
);

const activeArbitrationPayroll = activeRosterSalaryDetails.reduce(
  (total, entry) => total + (entry.arbitration ?? 0),
  0
);

const activePreArbitrationPayroll = activeRosterSalaryDetails.reduce(
  (total, entry) => total + (entry.preArbitration ?? 0),
  0
);

const activeFreeAgentPayroll = activeRosterSalaryDetails.reduce(
  (total, entry) => total + (entry.freeAgent ?? 0),
  0
);

const activeProjectedPayroll =
  activeKnownPayroll +
  activeArbitrationPayroll +
  activePreArbitrationPayroll +
  activeFreeAgentPayroll;

const activeMissingSalaries = activeRosterSalaryDetails.filter(
  (entry) =>
    entry.confirmed === null &&
    entry.arbitration === null &&
    entry.preArbitration === null &&
    entry.freeAgent === null
).length;

const activePayrollDifference =
  activeProjectedPayroll - constructedProjectedPayroll;

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
  const activeRosterWar = calculateRosterWar(activeRosterPlayers);
  const projectedWarChange =
    constructedWar.total - originalWar.total;

  const activeRosterWarDifference =
    activeRosterWar.total - constructedWar.total;

  type RosterPositionFilter =
    | "All"
    | "Pitchers"
    | "Catchers"
    | "Infielders"
    | "Outfielders / DH";

  const [rosterPositionFilter, setRosterPositionFilter] =
    useState<RosterPositionFilter>("All");

  const rosterPositionFilters: RosterPositionFilter[] = [
    "All",
    "Pitchers",
    "Catchers",
    "Infielders",
    "Outfielders / DH",
  ];

  function getRosterPositionGroup(
    position: string | undefined
  ): RosterPositionFilter {
    const code = (position ?? "").toUpperCase();

    if (["P", "SP", "RP", "TWP"].includes(code)) {
      return "Pitchers";
    }

    if (code === "C") {
      return "Catchers";
    }

    if (["1B", "2B", "3B", "SS", "IF"].includes(code)) {
      return "Infielders";
    }

    return "Outfielders / DH";
  }

  const filteredRosterPlayers =
    rosterPositionFilter === "All"
      ? players
      : players.filter(
          (player) =>
            getRosterPositionGroup(
              player.position?.abbreviation
            ) === rosterPositionFilter
        );

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
  setActiveRosterIds([]);
  return;
}

    let cancelled = false;

    async function loadRoster() {
      setLoading(true);
      setError("");
      setPlayers([]);
      setActiveRosterIds([]);

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

type OptimizerPositionGroup =
  | "Starting Pitcher"
  | "Relief Pitcher"
  | "Pitcher"
  | "Catcher"
  | "Infielder"
  | "Outfielder / DH"
  | "Unknown";

function getOptimizerPositionGroup(
  player: RosterPlayer
): OptimizerPositionGroup {
  const position = player.position?.abbreviation?.toUpperCase() ?? "";

  if (position === "SP") return "Starting Pitcher";
  if (position === "RP") return "Relief Pitcher";
  if (position === "P" || position === "TWP") return "Pitcher";
  if (position === "C") return "Catcher";

  if (["1B", "2B", "3B", "SS", "IF"].includes(position)) {
    return "Infielder";
  }

  if (["LF", "CF", "RF", "OF", "DH"].includes(position)) {
    return "Outfielder / DH";
  }

  return "Unknown";
}

const rosterSignature = players
  .map((player) => player.person.id)
  .sort((a, b) => a - b)
  .join(",");

const projectionSignature = warProjections
  .map((projection) =>
    `${projection.player_name}:${projection.projected_total_fwar}`
  )
  .sort()
  .join("|");

const optimizerPreviewIsCurrent =
  optimizerPreview !== null &&
  optimizerPreview.teamId === selectedTeam &&
  optimizerPreview.rosterSignature === rosterSignature &&
  optimizerPreview.projectionSignature === projectionSignature;

function generateOptimizedRoster() {
  if (warLoading || warError || players.length === 0) {
    return null;
  }

  const targets = {
    pitchers: 13,
    catchers: 2,
    infielders: 6,
    outfielders: 5,
  };

  const rankedPlayers = players
    .map((player) => ({
      player,
      group: getOptimizerPositionGroup(player),
      war: warProjectionMap.get(
        normalizeWarName(player.person.fullName)
      ),
    }))
    .filter(
      (entry): entry is typeof entry & { war: number } =>
        entry.war !== undefined
    )
    .sort((a, b) =>
      b.war - a.war ||
      a.player.person.id - b.player.person.id
    );

  const pitchers = rankedPlayers.filter((entry) =>
    ["Starting Pitcher", "Relief Pitcher", "Pitcher"].includes(
      entry.group
    )
  );

  const catchers = rankedPlayers.filter(
    (entry) => entry.group === "Catcher"
  );

  const infielders = rankedPlayers.filter(
    (entry) => entry.group === "Infielder"
  );

  const outfielders = rankedPlayers.filter(
    (entry) => entry.group === "Outfielder / DH"
  );

  // Require enough projected players in every position group.
  if (
    pitchers.length < targets.pitchers ||
    catchers.length < targets.catchers ||
    infielders.length < targets.infielders ||
    outfielders.length < targets.outfielders
  ) {
    return null;
  }

  const selected = [
    ...pitchers.slice(0, targets.pitchers),
    ...catchers.slice(0, targets.catchers),
    ...infielders.slice(0, targets.infielders),
    ...outfielders.slice(0, targets.outfielders),
  ];

  return {
    playerIds: selected.map((entry) => entry.player.person.id),
    projectedWar: selected.reduce(
      (total, entry) => total + entry.war,
      0
    ),
  };
}

function toggleActiveRosterPlayer(playerId: number) {
  // Only players on the constructed roster can be selected.
  if (!players.some((player) => player.person.id === playerId)) {
    return;
  }

  setActiveRosterIds((current) => {
    // Deselect an existing active roster player.
    if (current.includes(playerId)) {
      return current.filter((id) => id !== playerId);
    }

    // Prevent selecting more than 26 players.
    if (current.length >= activeRosterLimit) {
      return current;
    }

    return [...current, playerId];
  });
}

function removePlayer(playerId: number) {
  const player = players.find(
    (p) => p.person.id === playerId
  );

  if (!player) return;

  setPlayers((current) =>
    current.filter((p) => p.person.id !== playerId)
  );
  setActiveRosterIds((current) =>
    current.filter((id) => id !== playerId)
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
  setActiveRosterIds([]);
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
  players.length === originalPlayers.length &&
  activeRosterCount === 0
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
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      26-Man Active Roster
                    </h3>
                    <p className="text-sm text-slate-400">
                      Select up to 26 players from your constructed roster.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const recommendation = generateOptimizedRoster();
                        setOptimizerMessage(
                          recommendation
                            ? ""
                            : "Unable to generate a complete 26-man roster. This team may not have enough players with 2027 WAR projections to meet the positional targets (13 pitchers, 2 catchers, 6 infielders, and 5 outfielders/DH)."
                        );
                        setOptimizerPreview(
                          recommendation
                            ? {
                                ...recommendation,
                                rosterSignature,
                                projectionSignature,
                                teamId: selectedTeam,
                              }
                            : null
                        );
                      }}
                      disabled={warLoading || !!warError || players.length === 0}
                      className="rounded-lg border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Generate Optimized Roster
                    </button>

                  <span className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    activeRosterCount === activeRosterLimit
                      ? "border-green-500/40 bg-green-500/10 text-green-400"
                      : "border-blue-500/40 bg-blue-500/10 text-blue-300"
                  }`}>
                    {activeRosterCount} / {activeRosterLimit} Selected
                  </span>
                  </div>
                </div>

                <div className="mb-4 rounded-xl border border-slate-700 bg-[#0d1d30] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white">
                      Active Roster Validation
                    </h3>
                    <span
                      role="status"
                      className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                        activeRosterPitcherLimitExceeded
                          ? "border-red-500/40 bg-red-500/10 text-red-400"
                          : activeRosterIsValid
                            ? "border-green-500/40 bg-green-500/10 text-green-400"
                            : "border-amber-500/40 bg-amber-500/10 text-amber-300"
                      }`}
                    >
                      {activeRosterPitcherLimitExceeded
                        ? "Pitcher Limit Exceeded"
                        : activeRosterIsValid
                          ? "Valid Roster"
                          : "Incomplete Roster"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-[#12243a] p-3">
                      <p className="text-xs text-slate-400">Active Players</p>
                      <p className="mt-1 text-xl font-bold text-white">
                        {activeRosterCount} / {activeRosterLimit}
                      </p>
                    </div>

                    <div className="rounded-lg bg-[#12243a] p-3">
                      <p className="text-xs text-slate-400">Pitchers</p>
                      <p className={`mt-1 text-xl font-bold ${
                        activeRosterPitcherLimitExceeded
                          ? "text-red-400"
                          : "text-white"
                      }`}>
                        {activePitcherCount} / 13
                      </p>
                    </div>

                    <div className="rounded-lg bg-[#12243a] p-3">
                      <p className="text-xs text-slate-400">Position Players</p>
                      <p className="mt-1 text-xl font-bold text-white">
                        {activePositionPlayerCount}
                      </p>
                    </div>
                  </div>

                  {activeRosterPitcherLimitExceeded && (
                    <p className="mt-3 text-sm text-red-400">
                      Standard regular-season rosters cannot exceed 13 pitchers.
                      Deselect a pitcher to resolve this warning.
                    </p>
                  )}
                </div>

                {optimizerMessage && !optimizerPreviewIsCurrent && (
                  <p
                    role="status"
                    className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-300"
                  >
                    {optimizerMessage}
                  </p>
                )}

                {optimizerPreviewIsCurrent && optimizerPreview && (
                  <div className="mb-4 rounded-xl border border-emerald-500/40 bg-[#0d1d30] p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          Optimized 26-Man Roster
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          Recommended using projected 2027 fWAR and positional targets.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={
                          !optimizerPreviewIsCurrent ||
                          !optimizerPreview ||
                          optimizerPreview.playerIds.length !== activeRosterLimit
                        }
                        onClick={() => {
                          if (
                            !optimizerPreviewIsCurrent ||
                            !optimizerPreview ||
                            optimizerPreview.playerIds.length !== activeRosterLimit
                          ) {
                            return;
                          }

                          setActiveRosterIds([...optimizerPreview.playerIds]);
                        }}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Apply Recommendation
                      </button>
                    </div>

                    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-lg bg-[#12243a] p-3">
                        <p className="text-xs text-slate-400">Recommended Players</p>
                        <p className="mt-1 text-xl font-bold text-white">
                          {optimizerPreview.playerIds.length}
                        </p>
                      </div>
                      <div className="rounded-lg bg-[#12243a] p-3">
                        <p className="text-xs text-slate-400">Projected 2027 fWAR</p>
                        <p className="mt-1 text-xl font-bold text-white">
                          {optimizerPreview.projectedWar.toFixed(1)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-[#12243a] p-3">
                        <p className="text-xs text-slate-400">vs. Current Active Roster</p>
                        <p className="mt-1 text-xl font-bold text-emerald-400">
                          {(optimizerPreview.projectedWar - activeRosterWar.total >= 0 ? "+" : "") +
                            (optimizerPreview.projectedWar - activeRosterWar.total).toFixed(1)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {optimizerPreview.playerIds.map((id) => {
                        const player = players.find((p) => p.person.id === id);
                        if (!player) return null;

                        const war = warProjectionMap.get(
                          normalizeWarName(player.person.fullName)
                        );

                        return (
                          <div
                            key={id}
                            className="flex items-center justify-between rounded-lg bg-[#12243a] px-3 py-2 text-sm"
                          >
                            <div>
                              <span className="font-medium text-white">
                                {player.person.fullName}
                              </span>
                              <span className="ml-2 text-slate-400">
                                {player.position?.abbreviation ?? "—"}
                              </span>
                            </div>
                            <span className="font-semibold text-emerald-400">
                              {war === undefined ? "—" : war.toFixed(1)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mb-4 flex flex-wrap gap-2">
                  {rosterPositionFilters.map((filter) => {
                    const count =
                      filter === "All"
                        ? players.length
                        : players.filter(
                            (player) =>
                              getRosterPositionGroup(
                                player.position?.abbreviation
                              ) === filter
                          ).length;

                    return (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setRosterPositionFilter(filter)}
                        aria-pressed={rosterPositionFilter === filter}
                        className={`rounded-lg border px-3 py-2 text-sm transition ${
                          rosterPositionFilter === filter
                            ? "border-blue-500 bg-blue-500/20 text-blue-300"
                            : "border-slate-700 text-slate-300 hover:bg-[#12243a]"
                        }`}
                      >
                        {filter} ({count})
                      </button>
                    );
                  })}
                </div>

                <div className="max-h-[480px] overflow-auto rounded-xl border border-slate-700 bg-[#0d1d30]">
                  <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="border-b border-slate-700 bg-[#12243a] text-slate-300">
                    <tr>
                      <th className="px-4 py-3 text-center font-semibold">
                        Active 26
                      </th>
                      <th className="px-4 py-3 font-semibold">Player</th>
                      <th className="px-4 py-3 font-semibold">Position</th>
                      <th className="px-4 py-3 font-semibold">Acquisition</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        2027 fWAR
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {filteredRosterPlayers.map((player) => {
                      const projectedWar = warProjectionMap.get(
                        normalizeWarName(player.person.fullName)
                      );

                      return (
                        <tr
                          key={player.person.id}
                          className={`transition hover:bg-[#12243a] ${
                            activeRosterIds.includes(player.person.id)
                              ? "bg-blue-500/10"
                              : ""
                          }`}
                        >
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              aria-label={`Select ${player.person.fullName} for active roster`}
                              checked={activeRosterIds.includes(player.person.id)}
                              disabled={
                                !activeRosterIds.includes(player.person.id) &&
                                activeRosterCount >= activeRosterLimit
                              }
                              onChange={() =>
                                toggleActiveRosterPlayer(player.person.id)
                              }
                              className="h-4 w-4 cursor-pointer accent-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {player.person.fullName}
                          </td>

                          <td className="px-4 py-3 text-slate-300">
                            {player.position?.abbreviation ?? "N/A"}
                          </td>

                          <td className="px-4 py-3 text-slate-300">
                            {player.acquisitionType === "trade"
                              ? "Trade"
                              : player.acquisitionType === "free-agent"
                                ? "Free Agent"
                                : "Original Roster"}
                          </td>

                          <td className="px-4 py-3 text-right font-semibold tabular-nums">
                            {warLoading
                              ? "..."
                              : warError || projectedWar === undefined
                                ? "—"
                                : projectedWar.toFixed(2)}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removePlayer(player.person.id)}
                              className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
              </>
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

        <div className="rounded-lg border border-blue-500/30 bg-[#12243a] p-4">
          <p className="text-sm text-blue-300">
            26-Man Active Roster WAR
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {activeRosterWar.total.toFixed(1)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {activeRosterWar.matched} of {activeRosterCount} selected players
            with projections
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {activeRosterCount} / {activeRosterLimit} roster spots filled
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
            Constructed vs. Original Roster
          </p>

          <div className="mt-4 border-t border-slate-700 pt-3">
            <p className="text-xs text-slate-400">
              26-Man Active vs. Constructed Roster
            </p>
            <p className={`mt-2 text-2xl font-bold tabular-nums ${
              activeRosterWarDifference > 0
                ? "text-green-400"
                : activeRosterWarDifference < 0
                  ? "text-red-400"
                  : "text-white"
            }`}>
              {activeRosterWarDifference > 0 ? "+" : ""}
              {activeRosterWarDifference.toFixed(1)} WAR
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-400">
        Projection coverage: {originalWar.matched} of{" "}
        {originalPlayers.length} original players and{" "}
        {constructedWar.matched} of {players.length} constructed
        players. Missing projections are excluded from totals.
      </p>

      <p className="mt-2 text-xs text-slate-500">
        WAR values are summed 2027 player fWAR projections.
        The active roster total includes only selected players,
        using their full-season projections. These totals do not
        account for playing-time overlap and are not projected team wins.
      </p>
    </>
  )}
</div>

{!loading && selectedTeam && !error && (
  <div className="mt-8 rounded-xl border border-slate-700 bg-[#0d1d30] p-6">
    <h2 className="mb-5 text-xl font-bold">
      2027 Projected Roster Payroll
    </h2>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <div className="rounded-lg border border-blue-500/30 bg-[#12243a] p-4">
        <p className="text-sm text-blue-300">
          26-Man Active Roster Payroll
        </p>
        <p className="mt-2 text-2xl font-bold">
          ${activeProjectedPayroll.toFixed(1)}M
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Confirmed: ${activeKnownPayroll.toFixed(1)}M
        </p>
        <p className="text-xs text-blue-400">
          Arbitration estimates: ${activeArbitrationPayroll.toFixed(1)}M
        </p>
        <p className="text-xs text-emerald-400">
          Pre-arbitration estimates: ${activePreArbitrationPayroll.toFixed(1)}M
        </p>
        <p className="text-xs text-purple-400">
          Free-agent projections: ${activeFreeAgentPayroll.toFixed(1)}M
        </p>
        <p className="mt-2 text-xs text-slate-400">
          {activeMissingSalaries} players with unknown salaries
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {activeRosterCount} / {activeRosterLimit} players selected
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
  Constructed vs. Original Roster
</p>

<div className="mt-4 border-t border-slate-700 pt-3">
  <p className="text-xs text-slate-400">
    26-Man Active vs. Constructed Roster
  </p>
  <p className={`mt-2 text-2xl font-bold tabular-nums ${
    activePayrollDifference > 0
      ? "text-red-400"
      : activePayrollDifference < 0
        ? "text-green-400"
        : "text-white"
  }`}>
    {activePayrollDifference >= 0 ? "+" : "-"}$
    {Math.abs(activePayrollDifference).toFixed(1)}M
  </p>
</div>
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
  unmodeled costs are excluded. The active roster payroll
  represents estimated salaries allocated to selected players,
  not actual payroll savings from excluding other players.
  These figures are not complete team payroll or luxury-tax
  calculations.
</p>
  </div>
)}

      </div>
    </main>
  );
}
