import { readFile } from "node:fs/promises";
import path from "node:path";

export type TeamWarSummary = {
  teamId: number;
  hittingWar: number;
  pitchingWar: number;
  totalWar: number;
};

export async function getTeamWarSummaries(
  season: number
): Promise<TeamWarSummary[]> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    `mlb-team-fwar-${season}.csv`
  );

  const contents = await readFile(filePath, "utf8");
  const lines = contents.trim().split(/\r?\n/);

  const summaries = new Map<number, TeamWarSummary>();

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;

    const [teamIdRaw, , seasonRaw, statType, warRaw] =
      line.split(",");

    if (Number(seasonRaw) !== season) continue;

    const teamId = Number(teamIdRaw);
    const war = Number(warRaw);

    if (
      !Number.isInteger(teamId) ||
      !Number.isFinite(war) ||
      !warRaw?.trim()
    ) {
      continue;
    }

    if (!summaries.has(teamId)) {
      summaries.set(teamId, {
        teamId,
        hittingWar: 0,
        pitchingWar: 0,
        totalWar: 0,
      });
    }

    const team = summaries.get(teamId)!;

    if (statType === "bat") {
      team.hittingWar += war;
    } else if (statType === "pit") {
      team.pitchingWar += war;
    }
  }

  return Array.from(summaries.values())
    .map((team) => ({
      ...team,
      hittingWar: Number(team.hittingWar.toFixed(2)),
      pitchingWar: Number(team.pitchingWar.toFixed(2)),
      totalWar: Number(
        (team.hittingWar + team.pitchingWar).toFixed(2)
      ),
    }))
    .sort((a, b) => b.totalWar - a.totalWar);
}
export type TeamNeedsRanking = TeamWarSummary & {
  hittingRank: number;
  pitchingRank: number;
  overallRank: number;
  hittingVsAverage: number;
  pitchingVsAverage: number;
};

export async function getTeamNeedsRankings(
  season: number
): Promise<{
  teams: TeamNeedsRanking[];
  leagueAverageHittingWar: number;
  leagueAveragePitchingWar: number;
}> {
  const summaries = await getTeamWarSummaries(season);

  if (summaries.length === 0) {
    return {
      teams: [],
      leagueAverageHittingWar: 0,
      leagueAveragePitchingWar: 0,
    };
  }

  const averageHitting =
    summaries.reduce((sum, team) => sum + team.hittingWar, 0) /
    summaries.length;

  const averagePitching =
    summaries.reduce((sum, team) => sum + team.pitchingWar, 0) /
    summaries.length;

  const hittingSorted = [...summaries].sort(
    (a, b) => b.hittingWar - a.hittingWar
  );

  const pitchingSorted = [...summaries].sort(
    (a, b) => b.pitchingWar - a.pitchingWar
  );

  const teams: TeamNeedsRanking[] = summaries.map((team, index) => ({
    ...team,
    overallRank: index + 1,
    hittingRank:
      hittingSorted.findIndex((t) => t.teamId === team.teamId) + 1,
    pitchingRank:
      pitchingSorted.findIndex((t) => t.teamId === team.teamId) + 1,
    hittingVsAverage: Number(
      (team.hittingWar - averageHitting).toFixed(2)
    ),
    pitchingVsAverage: Number(
      (team.pitchingWar - averagePitching).toFixed(2)
    ),
  }));

  return {
    teams,
    leagueAverageHittingWar: Number(averageHitting.toFixed(2)),
    leagueAveragePitchingWar: Number(averagePitching.toFixed(2)),
  };
}
export type TeamBwarSummary = {
  team: string;
  season: number;
  totalWar: number;
  pitchingWar: number;
  hittingWar: number;
  startingPitchingWar: number;
  reliefPitchingWar: number;
  positions: Record<string, number>;
};

export async function getTeamBwarSummaries(
  season: number
): Promise<TeamBwarSummary[]> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    `mlb-team-bwar-${season}.csv`
  );

  const contents = await readFile(filePath, "utf8");
  const lines = contents.trim().split(/\r?\n/);

  const headers = lines[0].split(",");

  const summaries: TeamBwarSummary[] = [];

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;

    const values = line.split(",");

    const record = Object.fromEntries(
      headers.map((header, index) => [
        header,
        values[index],
      ])
    );

    if (Number(record.season) !== season) continue;

    const positions = {
      C: Number(record.C),
      "1B": Number(record["1B"]),
      "2B": Number(record["2B"]),
      "3B": Number(record["3B"]),
      SS: Number(record.SS),
      LF: Number(record.LF),
      CF: Number(record.CF),
      RF: Number(record.RF),
      DH: Number(record.DH),
    };

    summaries.push({
      team: record.team,
      season,
      totalWar: Number(record.Total),
      pitchingWar: Number(record["All P"]),
      hittingWar: Number(record["Non-P"]),
      startingPitchingWar: Number(record.SP),
      reliefPitchingWar: Number(record.RP),
      positions,
    });
  }

  return summaries.sort((a, b) => b.totalWar - a.totalWar);
}
export function getTeamPositionRankings(
  teams: TeamBwarSummary[]
) {
  const positions = [
    "C", "1B", "2B", "3B", "SS",
    "LF", "CF", "RF", "DH", "SP", "RP",
  ];

  return positions.map((position) => {
    const values = teams.map((team) => ({
      team: team.team,
      war:
        position === "SP"
          ? team.startingPitchingWar
          : position === "RP"
          ? team.reliefPitchingWar
          : team.positions[position],
    }));

    values.sort((a, b) => b.war - a.war);

    const leagueAverage =
      values.reduce((sum, team) => sum + team.war, 0) /
      values.length;

    return {
      position,
      leagueAverage,
      rankings: values.map((team, index) => ({
        ...team,
        rank: index + 1,
        vsLeagueAverage: team.war - leagueAverage,
      })),
    };
  });
}