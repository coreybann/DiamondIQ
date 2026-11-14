import { NextRequest, NextResponse } from "next/server";
import { classifyPitcherRoleWithFallback } from "@/lib/bullpenRoles";
import { calculateBullpenFatigue } from "@/lib/bullpenFatigue";
import {
  calculateBullpenWorkload,
  type PitchingAppearance,
} from "@/lib/bullpenWorkload";

type RosterEntry = {
  person?: {
    id?: number;
    fullName?: string;
  };
  position?: {
    abbreviation?: string;
  };
};

export async function GET(request: NextRequest) {
  const teamId = Number(
    request.nextUrl.searchParams.get("teamId")
  );

  if (!Number.isInteger(teamId) || teamId <= 0) {
    return NextResponse.json(
      { error: "Invalid team ID" },
      { status: 400 }
    );
  }

  try {
    const asOfDate =
      request.nextUrl.searchParams.get("date") ??
      new Date().toISOString().slice(0, 10);

    const parsedDate = new Date(`${asOfDate}T00:00:00Z`);

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

    const today = new Date().toISOString().slice(0, 10);
    const currentDataRevalidate = asOfDate >= today ? 300 : 3600;

    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=active&date=${asOfDate}`,
      { next: { revalidate: currentDataRevalidate } }
    );

    if (!response.ok) {
      throw new Error("MLB roster request failed");
    }

    const data = await response.json();

    const pitchers = (data.roster ?? [])
      .filter((entry: RosterEntry) =>
        ["P", "RP", "SP"].includes(
          entry.position?.abbreviation ?? ""
        )
      )
      .map((entry: RosterEntry) => ({
        id: entry.person?.id,
        name: entry.person?.fullName,
        position: entry.position?.abbreviation,
      }))
      .filter(
        (player: { id?: number; name?: string }) =>
          Number.isInteger(player.id) &&
          Boolean(player.name)
      );

    const classifiedPitchers = await Promise.all(
      pitchers.map(async (player: { id: number; name: string; position: string }) => {
        try {
          const statsResponse = await fetch(
            `https://statsapi.mlb.com/api/v1/people/${player.id}/stats` +
              `?stats=byDateRange&group=pitching&startDate=${season}-01-01&endDate=${asOfDate}`,
            { next: { revalidate: currentDataRevalidate } }
          );

          if (!statsResponse.ok) {
            throw new Error("Pitching stats request failed");
          }

          const statsData = await statsResponse.json();
          const stats = statsData.stats?.[0]?.splits?.[0]?.stat;

          const gamesPlayed = Number(stats?.gamesPlayed ?? 0);
          const gamesStarted = Number(stats?.gamesStarted ?? 0);

          let previousGamesPlayed = 0;
          let previousGamesStarted = 0;

          if (gamesPlayed < 5) {
            try {
              const previousResponse = await fetch(
                `https://statsapi.mlb.com/api/v1/people/${player.id}/stats` +
                  `?stats=season&group=pitching&season=${season - 1}`,
                { next: { revalidate: 3600 } }
              );

              if (previousResponse.ok) {
                const previousData = await previousResponse.json();
                const previousStats =
                  previousData.stats?.[0]?.splits?.[0]?.stat;

                previousGamesPlayed = Number(
                  previousStats?.gamesPlayed ?? 0
                );
                previousGamesStarted = Number(
                  previousStats?.gamesStarted ?? 0
                );
              }
            } catch {
              // Keep insufficient-data classification if unavailable.
            }
          }

          return {
            ...player,
            gamesPlayed,
            gamesStarted,
            role: classifyPitcherRoleWithFallback(
              gamesPlayed,
              gamesStarted,
              previousGamesPlayed,
              previousGamesStarted
            ),
          };
        } catch {
          return {
            ...player,
            gamesPlayed: null,
            gamesStarted: null,
            role: "Insufficient Data" as const,
          };
        }
      })
    );

    const bullpen = await Promise.all(
      classifiedPitchers
        .filter((player) => player.role === "Reliever")
        .map(async (player) => {
          try {
            const response = await fetch(
              `https://statsapi.mlb.com/api/v1/people/${player.id}/stats` +
                `?stats=gameLog&group=pitching&season=${season}`,
              { next: { revalidate: currentDataRevalidate } }
            );

            if (!response.ok) {
              throw new Error("Game-log request failed");
            }

            const data = await response.json();

            const appearances: PitchingAppearance[] = (
              data.stats ?? []
            ).flatMap(
              (group: {
                splits?: {
                  date?: string;
                  stat?: { numberOfPitches?: number };
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

            return {
              ...player,
              workload,
              fatigue: calculateBullpenFatigue(workload),
              dataStatus: "Available" as const,
            };
          } catch {
            return {
              ...player,
              workload: null,
              fatigue: null,
              dataStatus: "Unavailable" as const,
            };
          }
        })
    );

    return NextResponse.json({
      teamId,
      season,
      asOfDate,
      pitchers: classifiedPitchers,
      bullpen,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to retrieve team pitchers" },
      { status: 502 }
    );
  }
}
