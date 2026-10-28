import { readFile } from "node:fs/promises";
import path from "node:path";

type WarType = "bat" | "pit";

export async function getTeamFwar(
  teamId: string,
  season: number,
  statType: WarType
): Promise<Map<number, number>> {
  const result = new Map<number, number>();

  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    `mlb-team-fwar-${season}.csv`
  );

  let contents: string;

  try {
    contents = await readFile(filePath, "utf8");
  } catch (error) {
    // Missing data is expected until the download completes.
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return result;
    }

    throw error;
  }

  const lines = contents.trim().split(/\r?\n/);
  const headers = lines[0]?.split(",") ?? [];

  const indexes = {
    team: headers.indexOf("mlb_team_id"),
    player: headers.indexOf("mlb_player_id"),
    season: headers.indexOf("season"),
    type: headers.indexOf("stat_type"),
    war: headers.indexOf("fwar"),
  };

  if (Object.values(indexes).some((index) => index < 0)) {
    throw new Error("Invalid team fWAR CSV headers");
  }

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;

    const cells = line.split(",");

    if (
      cells[indexes.team] !== teamId ||
      Number(cells[indexes.season]) !== season ||
      cells[indexes.type] !== statType
    ) {
      continue;
    }

    const playerId = Number(cells[indexes.player]);
    const warValue = Number(cells[indexes.war]);

    if (
      !Number.isInteger(playerId) ||
      !cells[indexes.war]?.trim() ||
      !Number.isFinite(warValue)
    ) {
      continue;
    }

    result.set(playerId, warValue);
  }

  return result;
}
