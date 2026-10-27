
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const playerId = request.nextUrl.searchParams.get("id");

  if (!playerId || !/^\d+$/.test(playerId)) {
    return NextResponse.json(
      { error: "A valid player ID is required" },
      { status: 400 }
    );
  }

  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      "data",
      "outs_above_average.csv"
    );

    const csv = await readFile(filePath, "utf8");
    const lines = csv.trim().split(/\r?\n/);

    const headers = lines[0]
      .replace(/^\uFEFF/, "")
      .split(",")
      .map((header) => header.replace(/^"|"$/g, "").trim());

    const idIndex = headers.indexOf("player_id");
    const oaaIndex = headers.indexOf("outs_above_average");
    const positionIndex = headers.indexOf("primary_pos_formatted");
    const yearIndex = headers.indexOf("year");

    if (
      idIndex === -1 ||
      oaaIndex === -1 ||
      positionIndex === -1 ||
      yearIndex === -1
    ) {
      throw new Error("Required CSV columns are missing");
    }

    const records = lines.slice(1).map((line) =>
      line.split(",").map((value) => value.replace(/^"|"$/g, "").trim())
    );

    const player = records.find(
      (record) => record[idIndex] === playerId
    );

    if (!player) {
      return NextResponse.json({
        playerId,
        oaa: null,
        position: null,
        year: null,
      });
    }

    const rawOaa = player[oaaIndex];
    const oaa =
      rawOaa !== "" && Number.isFinite(Number(rawOaa))
        ? Number(rawOaa)
        : null;
const year = player[yearIndex];

const fieldingResponse = await fetch(
  `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=season&group=fielding&season=${year}`,
  { cache: "no-store" }
);

let defensiveInnings: number | null = null;

if (fieldingResponse.ok) {
  const fieldingData = await fieldingResponse.json();

  const fieldingSplits = fieldingData.stats?.[0]?.splits ?? [];

  const matchingPosition = fieldingSplits.find(
    (split: {
      stat: {
        position?: { abbreviation?: string };
        innings?: string;
      };
    }) =>
      split.stat.position?.abbreviation === player[positionIndex]
  );

  if (matchingPosition?.stat.innings) {
    const innings = matchingPosition.stat.innings;
    const [whole, partial = "0"] = innings.split(".");

    defensiveInnings =
      Number(whole) +
      (partial === "1" ? 1 / 3 : partial === "2" ? 2 / 3 : 0);
  }
}
    return NextResponse.json({
      playerId,
      oaa,
      defensiveInnings,
      position: player[positionIndex],
      year: player[yearIndex],
    });
  } catch (error) {
    console.error("Defensive statistics error:", error);

    return NextResponse.json(
      { error: "Unable to load defensive statistics" },
      { status: 500 }
    );
  }
}
