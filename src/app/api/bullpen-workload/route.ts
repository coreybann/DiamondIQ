import { NextRequest, NextResponse } from "next/server";
import { calculateBullpenFatigue } from "@/lib/bullpenFatigue";
import {
  calculateBullpenWorkload,
  type PitchingAppearance,
} from "@/lib/bullpenWorkload";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const playerId = Number(searchParams.get("playerId"));
  const asOfDate =
    searchParams.get("date") ??
    new Date().toISOString().slice(0, 10);

  const parsedDate = new Date(`${asOfDate}T00:00:00Z`);

  if (!Number.isInteger(playerId) || playerId <= 0) {
    return NextResponse.json(
      { error: "Invalid player ID" },
      { status: 400 }
    );
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(asOfDate) ||
    !Number.isFinite(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== asOfDate
  ) {
    return NextResponse.json(
      { error: "Invalid date" },
      { status: 400 }
    );
  }

  const todayUTC = new Date().toISOString().slice(0, 10);

  if (asOfDate > todayUTC) {
    return NextResponse.json(
      { error: "Future dates are not supported" },
      { status: 400 }
    );
  }

  const season = parsedDate.getUTCFullYear();
  const revalidate = asOfDate === todayUTC ? 300 : 3600;

  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/people/${playerId}/stats` +
        `?stats=gameLog&group=pitching&season=${season}`,
      { next: { revalidate } }
    );

    if (!response.ok) {
      throw new Error("MLB game-log request failed");
    }

    const data = await response.json();

    const appearances: PitchingAppearance[] = (
      data.stats ?? []
    ).flatMap(
      (group: {
        splits?: {
          date?: string;
          stat?: {
            numberOfPitches?: number;
          };
        }[];
      }) =>
        (group.splits ?? [])
          .filter((game) => Boolean(game.date))
          .map((game) => ({
            date: game.date as string,
            pitches: Number(
              game.stat?.numberOfPitches ?? 0
            ),
          }))
    );

    const workload = calculateBullpenWorkload(
      appearances,
      asOfDate
    );

    const fatigue = calculateBullpenFatigue(workload);

    return NextResponse.json({
      playerId,
      asOfDate,
      season,
      workload,
      fatigue,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to retrieve bullpen workload" },
      { status: 502 }
    );
  }
}
