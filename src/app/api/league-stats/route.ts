
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const season = 2026;

    const url =
      `https://statsapi.mlb.com/api/v1/teams/` +
      `stats?stats=season&group=hitting,pitching` +
      `&leagueIds=103,104&season=${season}`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch MLB league stats");
    }

    const data = await response.json();

    
const hitting = data.stats.find(
  (group: any) => group.group.displayName === "hitting"
);

const pitching = data.stats.find(
  (group: any) => group.group.displayName === "pitching"
);

const hittingTotals = {
  hits: 0,
  walks: 0,
  hitByPitch: 0,
  sacFlies: 0,
  totalBases: 0,
  atBats: 0,
};

for (const team of hitting.splits) {
  const s = team.stat;

  hittingTotals.hits += s.hits;
  hittingTotals.walks += s.baseOnBalls;
  hittingTotals.hitByPitch += s.hitByPitch;
  hittingTotals.sacFlies += s.sacFlies;
  hittingTotals.totalBases += s.totalBases;
  hittingTotals.atBats += s.atBats;
}

const leagueOBP =
  (hittingTotals.hits +
    hittingTotals.walks +
    hittingTotals.hitByPitch) /
  (hittingTotals.atBats +
    hittingTotals.walks +
    hittingTotals.hitByPitch +
    hittingTotals.sacFlies);

const leagueSLG =
  hittingTotals.totalBases / hittingTotals.atBats;

let earnedRuns = 0;
let pitchingOuts = 0;

for (const team of pitching.splits) {
  earnedRuns += team.stat.earnedRuns;
  pitchingOuts += team.stat.outs;
}

const leagueERA = (earnedRuns * 27) / pitchingOuts;

return NextResponse.json({
  season,
  leagueOBP: Number(leagueOBP.toFixed(3)),
  leagueSLG: Number(leagueSLG.toFixed(3)),
  leagueOPS: Number((leagueOBP + leagueSLG).toFixed(3)),
  leagueERA: Number(leagueERA.toFixed(2)),
});

  } catch (error) {
    console.error("League stats API error:", error);

    return NextResponse.json(
      { error: "Failed to load league statistics" },
      { status: 500 }
    );
  }
}
