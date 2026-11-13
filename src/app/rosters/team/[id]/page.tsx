import Link from "next/link";
import RosterTabs from "./RosterTabs";
import { getTeamSalaryRecords, getTeamSalaryProjections } from "@/lib/teamPayroll";
import { getMLBSeasonCalendar } from "@/lib/mlbSeasonCalendar";

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

type MLBTeam = {
  id: number;
  name: string;
  abbreviation: string;
};

async function getRoster(
  teamId: number,
  rosterType: "active" | "40Man" | "depthChart" | "fullRoster" = "active",
  date?: string
): Promise<MLBPlayer[]> {
  const params = new URLSearchParams({
    rosterType,
    hydrate: "person",
  });

  if (date) {
    params.set("date", date);
  }

  const response = await fetch(
    `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?${params.toString()}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("Unable to load roster");
  }

  const data = await response.json();

  return (data.roster ?? []).map(
    (entry: {
      person: {
        id: number;
        fullName: string;
        currentAge?: number;
        batSide?: { code?: string };
        pitchHand?: { code?: string };
      };
      jerseyNumber?: string;
      position?: { abbreviation: string };
      status?: { description?: string };
    }) => ({
      id: entry.person.id,
      name: entry.person.fullName,
      number: entry.jerseyNumber ?? null,
      position: entry.position?.abbreviation ?? "N/A",
      status: entry.status?.description ?? "Unknown",
      age: entry.person.currentAge ?? null,
      bats: entry.person.batSide?.code ?? "—",
      throws: entry.person.pitchHand?.code ?? "—",
    })
  );
}

async function getTeam(teamId: number): Promise<MLBTeam> {
  const response = await fetch(
    `https://statsapi.mlb.com/api/v1/teams/${teamId}`,
    { next: { revalidate: 86400 } }
  );

  if (!response.ok) {
    throw new Error("Unable to load team");
  }

  const data = await response.json();
  const team = data.teams?.[0];

  if (!team) {
    throw new Error("Team not found");
  }

  return team;
}

export default async function TeamRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teamId = Number(id);

  let team: MLBTeam | null = null;
  let players: MLBPlayer[] = [];
  let fortyManPlayers: MLBPlayer[] = [];
  let depthChartPlayers: MLBPlayer[] = [];
  let fullRosterPlayers: MLBPlayer[] = [];
  let teamSalaryRecords: ReturnType<typeof getTeamSalaryRecords> = [];
  let teamSalaryProjections: ReturnType<typeof getTeamSalaryProjections> = [];
  let activeRosterLabel = "Active Roster";
  let activeRosterDescription: string | undefined;
  let error = false;

  if (!Number.isInteger(teamId) || teamId <= 0) {
    error = true;
  } else {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const year = Number(today.slice(0, 4));

      const currentSeason = await getMLBSeasonCalendar(year);

      const inRegularSeason =
        today >= currentSeason.firstDate &&
        today <= currentSeason.lastDate;

      let snapshotDate: string | undefined;

      if (!inRegularSeason) {
        if (today < currentSeason.firstDate) {
          const previousSeason = await getMLBSeasonCalendar(year - 1);
          snapshotDate = previousSeason.lastDate;
        } else {
          snapshotDate = currentSeason.lastDate;
        }

        activeRosterLabel = "Last Regular-Season Roster";
        activeRosterDescription =
          `Historical active-roster snapshot: ${snapshotDate}. ` +
          "This is not the current active roster.";
      }

      [team, players, fortyManPlayers, depthChartPlayers, fullRosterPlayers] =
        await Promise.all([
          getTeam(teamId),
          getRoster(teamId, "active", snapshotDate),
          getRoster(teamId, "40Man"),
          getRoster(teamId, "depthChart"),
          getRoster(teamId, "fullRoster"),
        ]);
    } catch {
      error = true;
    }
  }

  if (!error && team) {
    const currentFortyManIds = new Set(
      fortyManPlayers.map((player) => player.id)
    );

    teamSalaryRecords = getTeamSalaryRecords(
      team.abbreviation,
      2027,
      fortyManPlayers.map((player) => player.id)
    ).filter(
      (record) =>
        record.mlbPlayerId !== null &&
        currentFortyManIds.has(record.mlbPlayerId)
    );
    const fortyManIds = new Set(
      fortyManPlayers.map((player) => player.id)
    );

    teamSalaryProjections = getTeamSalaryProjections(
      team.abbreviation,
      fortyManPlayers.map((player) => player.id)
    ).filter((projection) =>
      fortyManIds.has(projection.mlbPlayerId)
    );
  }

  return (
    <main className="min-h-screen bg-[#081321] px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/rosters"
          className="text-sm font-semibold text-blue-400 hover:text-blue-300"
        >
          ← All MLB Rosters
        </Link>

        {error || !team ? (
          <div className="mt-10 rounded-xl border border-red-500/30 bg-red-950/20 p-6 text-red-300">
            This team's roster could not be loaded.
          </div>
        ) : (
          <>
            <p className="mt-10 text-sm font-bold uppercase tracking-widest text-blue-400">
              DiamondIQ · MLB Rosters
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-5xl">
              {team.name}
            </h1>

            <div className="mt-8">
              <RosterTabs
                activePlayers={players}
                fortyManPlayers={fortyManPlayers}
                depthChartPlayers={depthChartPlayers}
                teamSalaryRecords={teamSalaryRecords}
                teamSalaryProjections={teamSalaryProjections}
                activeRosterLabel={activeRosterLabel}
                activeRosterDescription={activeRosterDescription}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
