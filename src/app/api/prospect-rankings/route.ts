import { NextRequest, NextResponse } from "next/server";
import developmentData from "../../../../public/data/prospect-development-scores-2026.json";
import projectionData from "../../../../public/data/prospect-projection-scores-2026.json";
import unrankedCandidates from "../../../../public/data/prospect-unranked-candidates-2026.json";

export const revalidate = 3600;

const LEVELS = [
  { id: 14, name: "Single-A", expectedAge: 20 },
  { id: 13, name: "High-A", expectedAge: 21 },
  { id: 12, name: "Double-A", expectedAge: 23 },
  { id: 11, name: "Triple-A", expectedAge: 25 },
];

type StatSplit = {
  player?: { id?: number; fullName?: string };
  team?: { id?: number; name?: string };
  stat?: Record<string, unknown>;
};

type Prospect = {
  id: number;
  name: string;
  organizationId: number | null;
  organization: string;
  teamId: number | null;
  team: string;
  level: string;
  levelId: number;
  position: string;
  age: number | null;
  ageScore: number;
  group: "hitting" | "pitching";
  stats: Record<string, unknown>;
  performanceScore: number;
  toolsScore: number | null;
  developmentScore: number | null;
  projectionScore: number | null;
  overallScore: number;
  grade: number;
  rank?: number;
  overallRank?: number;
};

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function ageOnJulyFirst(birthDate: string, season: number): number | null {
  const birth = new Date(`${birthDate}T00:00:00Z`);

  if (Number.isNaN(birth.getTime())) return null;

  let age = season - birth.getUTCFullYear();

  const beforeBirthday =
    birth.getUTCMonth() > 6 ||
    (birth.getUTCMonth() === 6 && birth.getUTCDate() > 1);

  if (beforeBirthday) age--;

  return age >= 15 && age <= 50 ? age : null;
}

function percentile(values: number[], value: number, lowerBetter = false) {
  if (values.length <= 1) return 50;

  const below = values.filter((item) => item < value).length;
  const equal = values.filter((item) => item === value).length;

  const result = ((below + equal / 2) / values.length) * 100;

  return lowerBetter ? 100 - result : result;
}

function medianAge(ages: number[]): number | null {
  if (ages.length === 0) return null;

  const sorted = [...ages].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function getAgePercentileScore(
  age: number | null,
  comparisonAges: number[]
): number | null {
  if (age === null || comparisonAges.length < 2) {
    return null;
  }

  return Number(
    percentile(comparisonAges, age, true).toFixed(2)
  );
}

function getAgeScore(age: number | null, expectedAge: number) {
  if (age === null) return 50;

  return clamp(50 + (expectedAge - age) * 12);
}

function getHittingMetrics(stats: Record<string, unknown>) {
  const pa = num(stats.plateAppearances);
  const bb = num(stats.baseOnBalls);
  const so = num(stats.strikeOuts);
  const slg = num(stats.slg);
  const avg = num(stats.avg);
  const sb = num(stats.stolenBases);
  const cs = num(stats.caughtStealing);

  return {
    ops: num(stats.ops),
    iso: slg !== null && avg !== null ? slg - avg : null,
    bbRate: pa && bb !== null ? (bb / pa) * 100 : null,
    kRate: pa && so !== null ? (so / pa) * 100 : null,
    avg,
    sbRate: pa && sb !== null ? (sb / pa) * 100 : null,
    adjustedSbSuccess:
      sb !== null && cs !== null && sb + cs > 0
        ? ((sb + 10 * 0.75) / (sb + cs + 10)) * 100
        : null,
    sbSuccess:
      sb !== null && cs !== null && sb + cs > 0
        ? (sb / (sb + cs)) * 100
        : null,
  };
}

function inningsToOuts(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const match = String(value).match(/^(\d+)(?:\.([012]))?$/);

  if (!match) return null;

  return Number(match[1]) * 3 + Number(match[2] ?? 0);
}

function getPitchingMetrics(stats: Record<string, unknown>) {
  const outs = inningsToOuts(stats.inningsPitched);
  const so = num(stats.strikeOuts);
  const bb = num(stats.baseOnBalls);
  const groundOuts = num(stats.groundOuts);
  const airOuts = num(stats.airOuts);

  return {
    era: num(stats.era),
    whip: num(stats.whip),
    k9: outs && so !== null ? (so * 27) / outs : null,
    bb9: outs && bb !== null ? (bb * 27) / outs : null,
    kbb: bb && so !== null ? so / bb : null,
    hr9:
      outs && num(stats.homeRuns) !== null
        ? ((num(stats.homeRuns) as number) * 27) / outs
        : null,
    groundOutShare:
      groundOuts !== null &&
      airOuts !== null &&
      groundOuts + airOuts > 0
        ? (groundOuts / (groundOuts + airOuts)) * 100
        : null,
    pitchesPerInning: num(stats.pitchesPerInning),
  };
}

function scoreToolsAndSkills(
  prospects: Prospect[],
  group: "hitting" | "pitching"
) {
  const definitions =
    group === "hitting"
      ? [
          { key: "kRate", weight: 0.25, lower: true },
          { key: "iso", weight: 0.25, lower: false },
          { key: "bbRate", weight: 0.30, lower: false },
          { key: "sbRate", weight: 0.10, lower: false },
          { key: "adjustedSbSuccess", weight: 0.10, lower: false },
        ]
      : [
          { key: "k9", weight: 0.35, lower: false },
          { key: "bb9", weight: 0.20, lower: true },
          { key: "hr9", weight: 0.20, lower: true },
          { key: "groundOutShare", weight: 0.10, lower: false },
          { key: "pitchesPerInning", weight: 0.15, lower: true },
        ];

  for (const level of LEVELS) {
    const levelPlayers = prospects.filter(
      (player) => player.levelId === level.id
    );

    const metrics: Record<string, number | null>[] =
      levelPlayers.map((player) =>
        group === "hitting"
          ? getHittingMetrics(player.stats)
          : getPitchingMetrics(player.stats)
      );

    for (let index = 0; index < levelPlayers.length; index++) {
      let weightedScore = 0;
      let availableWeight = 0;
      let availableMetrics = 0;

      for (const definition of definitions) {
        const value = metrics[index][definition.key];

        if (value === null || value === undefined) continue;

        const population = metrics
          .map((item) => item[definition.key])
          .filter(
            (item): item is number =>
              typeof item === "number" && Number.isFinite(item)
          );

        if (population.length < 10) continue;

        weightedScore +=
          percentile(population, value, definition.lower) *
          definition.weight;

        availableWeight += definition.weight;
        availableMetrics++;
      }

      levelPlayers[index].toolsScore =
        availableMetrics >= 3 && availableWeight >= 0.70
          ? Number((weightedScore / availableWeight).toFixed(2))
          : null;
    }
  }

  return prospects;
}

function scoreProspects(
  prospects: Prospect[],
  group: "hitting" | "pitching"
) {
  const metricDefinitions =
    group === "hitting"
      ? [
          { key: "ops", weight: 0.25, lower: false },
          { key: "iso", weight: 0.20, lower: false },
          { key: "bbRate", weight: 0.10, lower: false },
          { key: "kRate", weight: 0.10, lower: true },
          { key: "avg", weight: 0.15, lower: false },
          { key: "sbRate", weight: 0.05, lower: false },
          { key: "sbSuccess", weight: 0.05, lower: false },
        ]
      : [
          { key: "era", weight: 0.10, lower: true },
          { key: "whip", weight: 0.10, lower: true },
          { key: "k9", weight: 0.20, lower: false },
          { key: "bb9", weight: 0.12, lower: true },
          { key: "kbb", weight: 0.08, lower: false },
          { key: "hr9", weight: 0.08, lower: true },
          { key: "groundOutShare", weight: 0.07, lower: false },
          { key: "pitchesPerInning", weight: 0.05, lower: true },
        ];

  const ageWeight = group === "hitting" ? 0.10 : 0.20;
  const performanceWeight = 1 - ageWeight;

  for (const level of LEVELS) {
    const levelPlayers = prospects.filter(
      (player) => player.levelId === level.id
    );

    const metrics: Record<string, number | null>[] =
      levelPlayers.map((player) =>
        group === "hitting"
          ? getHittingMetrics(player.stats)
          : getPitchingMetrics(player.stats)
      );

    for (let index = 0; index < levelPlayers.length; index++) {
      const player = levelPlayers[index];
      const playerMetrics = metrics[index];

      let weightedScore = 0;
      let totalWeight = 0;

      for (const definition of metricDefinitions) {
        const value = playerMetrics[definition.key];

        if (value === null || value === undefined) continue;

        const population = metrics
          .map((item) => item[definition.key])
          .filter(
            (item): item is number =>
              typeof item === "number" && Number.isFinite(item)
          );

        if (population.length === 0) continue;

        weightedScore +=
          percentile(population, value, definition.lower) *
          definition.weight;

        totalWeight += definition.weight;
      }

      const performanceScore =
        totalWeight > 0 ? weightedScore / totalWeight : 50;

      player.performanceScore = Number(performanceScore.toFixed(2));

      player.overallScore = Number(
        (
          performanceScore * performanceWeight +
          player.ageScore * ageWeight
        ).toFixed(2)
      );

      player.grade = Math.round(20 + player.overallScore * 0.6);
    }
  }

  return prospects;
}

function calculateFinalProspectScore(player: Prospect) {
  const categories = [
    { score: player.performanceScore, weight: 0.35 },
    { score: player.ageScore, weight: 0.15 },
    { score: player.toolsScore, weight: 0.20 },
    { score: player.developmentScore, weight: 0.10 },
    { score: player.projectionScore, weight: 0.20 },
  ];

  let weightedTotal = 0;
  let availableWeight = 0;

  for (const category of categories) {
    if (
      category.score === null ||
      !Number.isFinite(category.score)
    ) {
      continue;
    }

    weightedTotal += category.score * category.weight;
    availableWeight += category.weight;
  }

  const score =
    availableWeight > 0 ? weightedTotal / availableWeight : 50;

  player.overallScore = Number(score.toFixed(2));
  player.grade = Math.round(20 + player.overallScore * 0.6);
}

async function fetchJSON(url: string) {
  const response = await fetch(url, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`MLB API request failed: ${response.status}`);
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  const season = Number(
    request.nextUrl.searchParams.get("season") ?? "2026"
  );

  if (
    !Number.isInteger(season) ||
    season < 2000 ||
    season > 2100
  ) {
    return NextResponse.json(
      { error: "Invalid season" },
      { status: 400 }
    );
  }

  try {
    const [affiliateResults, statResults] = await Promise.all([
      Promise.all(
        LEVELS.map(async (level) => {
          const data = await fetchJSON(
            `https://statsapi.mlb.com/api/v1/teams?sportId=${level.id}`
          );

          return data.teams ?? [];
        })
      ),

      Promise.all(
        LEVELS.flatMap((level) =>
          (["hitting", "pitching"] as const).map(async (group) => {
            const params = new URLSearchParams({
              stats: "season",
              group,
              sportIds: String(level.id),
              season: String(season),
              playerPool: "ALL",
              limit: "5000",
            });

            const data = await fetchJSON(
              `https://statsapi.mlb.com/api/v1/stats?${params}`
            );

            return {
              level,
              group,
              splits: (data.stats?.[0]?.splits ?? []) as StatSplit[],
            };
          })
        )
      ),
    ]);

    const affiliateMap = new Map<
      number,
      { organizationId: number; organization: string }
    >();

    for (const teams of affiliateResults) {
      for (const team of teams) {
        if (
          typeof team.id === "number" &&
          typeof team.parentOrgId === "number"
        ) {
          affiliateMap.set(team.id, {
            organizationId: team.parentOrgId,
            organization: team.parentOrgName ?? "Unknown",
          });
        }
      }
    }

    const rawProspects: Prospect[] = [];

    for (const result of statResults) {
      const minimumPlayingTime =
        result.group === "hitting" ? 200 : 40;

      for (const split of result.splits) {
        const id = split.player?.id;
        const stats = split.stat;

        if (!id || !stats || !split.team?.id) continue;

        const playingTime =
          result.group === "hitting"
            ? num(stats.plateAppearances) ?? 0
            : (inningsToOuts(stats.inningsPitched) ?? 0) / 3;

        if (playingTime < minimumPlayingTime) continue;

        const affiliate = affiliateMap.get(split.team.id);

        if (!affiliate) continue;

        rawProspects.push({
          id,
          name: split.player?.fullName ?? "Unknown",
          organizationId: affiliate.organizationId,
          organization: affiliate.organization,
          teamId: split.team.id,
          team: split.team.name ?? "Unknown",
          level: result.level.name,
          levelId: result.level.id,
          position: "N/A",
          age: null,
          ageScore: 50,
          group: result.group,
          stats,
          performanceScore: 50,
          toolsScore: null,
          developmentScore: null,
          projectionScore: null,
          overallScore: 50,
          grade: 50,
        });
      }
    }

    // Keep one ranking entry per player and category.
    // If a player appeared at multiple levels, use the highest level reached.
    const uniquePlayers = new Map<string, Prospect>();

    for (const player of rawProspects) {
      const key = `${player.group}-${player.id}`;
      const existing = uniquePlayers.get(key);

      if (!existing || player.levelId < existing.levelId) {
        uniquePlayers.set(key, player);
      }
    }

    const prospects = [...uniquePlayers.values()];

    // Retrieve age and position information in batches.
    const playerIds = [...new Set(prospects.map((player) => player.id))];
    const playerDetails = new Map<
      number,
      { birthDate?: string; position?: string }
    >();

    const batches: number[][] = [];

    for (let i = 0; i < playerIds.length; i += 100) {
      batches.push(playerIds.slice(i, i + 100));
    }

    await Promise.all(
      batches.map(async (batch) => {
        const data = await fetchJSON(
          `https://statsapi.mlb.com/api/v1/people?personIds=${batch.join(",")}`
        );

        for (const person of data.people ?? []) {
          playerDetails.set(person.id, {
            birthDate: person.birthDate,
            position: person.primaryPosition?.abbreviation,
          });
        }
      })
    );

    for (const player of prospects) {
      const details = playerDetails.get(player.id);
      const age = details?.birthDate
        ? ageOnJulyFirst(details.birthDate, season)
        : null;

      const level = LEVELS.find(
        (item) => item.id === player.levelId
      )!;

      player.age = age;
      player.position = details?.position ?? "N/A";
    }

    // Prospect eligibility: age 26 or younger.
    const eligibleProspects = prospects.filter(
      (player) => player.age !== null && player.age <= 26
    );

    const ageBenchmarks = LEVELS.flatMap((level) =>
      (["hitting", "pitching"] as const).map((group) => {
        const ages = eligibleProspects
          .filter(
            (player) =>
              player.levelId === level.id &&
              player.group === group &&
              player.age !== null
          )
          .map((player) => player.age as number);

        return {
          level: level.name,
          group,
          medianAge: medianAge(ages),
          sampleSize: ages.length,
        };
      })
    );

    console.log("Prospect age benchmarks:", ageBenchmarks);

    for (const player of eligibleProspects) {
      const benchmark = ageBenchmarks.find(
        (item) =>
          item.level === player.level &&
          item.group === player.group
      );

      const level = LEVELS.find(
        (item) => item.id === player.levelId
      )!;

      const comparisonAges = eligibleProspects
        .filter(
          (other) =>
            other.levelId === player.levelId &&
            other.group === player.group &&
            other.age !== null
        )
        .map((other) => other.age as number);

      player.ageScore =
        getAgePercentileScore(player.age, comparisonAges) ??
        getAgeScore(player.age, benchmark?.medianAge ?? level.expectedAge);
    }



    // Attach historical Development Trajectory scores.
    // Keep overall ranking weights unchanged until the full model is ready.
    if (season === 2026) {
      const developmentById = new Map(
        developmentData.players.map((entry) => [
          entry.id,
          entry.developmentScore,
        ])
      );

      for (const player of eligibleProspects) {
        player.developmentScore =
          developmentById.get(player.id) ?? null;
      }
    }

    // Attach historical Projection & Upside scores.
    // Preserve existing overall ranking weights until the full model is ready.
    if (season === 2026) {
      const projectionById = new Map(
        projectionData.players.map((entry) => [
          entry.id,
          entry.projectionScore,
        ])
      );

      for (const player of eligibleProspects) {
        player.projectionScore =
          projectionById.get(player.id) ?? null;
      }
    }

    const hitters = scoreProspects(
      scoreToolsAndSkills(
        eligibleProspects.filter((player) => player.group === "hitting"),
        "hitting"
      ),
      "hitting"
    ).sort((a, b) => b.overallScore - a.overallScore);

    const pitchers = scoreProspects(
      scoreToolsAndSkills(
        eligibleProspects.filter((player) => player.group === "pitching"),
        "pitching"
      ),
      "pitching"
    ).sort((a, b) => b.overallScore - a.overallScore);

    // Apply the five-category model before assigning final ranks.
    // Keep the original scoring formula for other seasons.
    if (season === 2026) {
      for (const player of [...hitters, ...pitchers]) {
        calculateFinalProspectScore(player);
      }

      hitters.sort((a, b) => b.overallScore - a.overallScore);
      pitchers.sort((a, b) => b.overallScore - a.overallScore);
    }

    const overall = [...hitters, ...pitchers].sort(
      (a, b) => b.overallScore - a.overallScore
    );

    overall.forEach((player, index) => {
      player.overallRank = index + 1;
    });

    hitters.forEach((player, index) => {
      player.rank = index + 1;
    });

    pitchers.forEach((player, index) => {
      player.rank = index + 1;
    });

    const organizations = Array.from(
      new Map(
        eligibleProspects
          .filter((player) => player.organizationId !== null)
          .map((player) => [
            player.organizationId,
            {
              id: player.organizationId,
              name: player.organization,
            },
          ])
      ).values()
    ).sort((a, b) => a.name.localeCompare(b.name));

    const rankedIds = new Set(overall.map((player) => player.id));

    const unranked = season === 2026
      ? unrankedCandidates.players
          .filter((player) => !rankedIds.has(player.id))
          .map((player) => ({
            ...player,
            rankingStatus: "unranked",
            overallScore: null,
            performanceScore: null,
            toolsScore: null,
            developmentScore: null,
            projectionScore: null,
            grade: null,
            rank: null,
            overallRank: null,
          }))
      : [];

    return NextResponse.json({
      season,
      count: overall.length,
      unranked,
      organizationCount: organizations.length,
      organizations,
      overall,
      hitters,
      pitchers,
      methodology: {
        minimumPlateAppearances: 200,
        minimumInningsPitched: 40,
        ageReferenceDate: `${season}-07-01`,
        performanceWeight: season === 2026
          ? { hitting: 0.35, pitching: 0.35 }
          : { hitting: 0.90, pitching: 0.80 },
        ageWeight: season === 2026
          ? { hitting: 0.15, pitching: 0.15 }
          : { hitting: 0.10, pitching: 0.20 },
        toolsAndSkillsWeight: season === 2026 ? 0.20 : 0,
        developmentTrajectoryWeight: season === 2026 ? 0.10 : 0,
        projectionAndUpsideWeight: season === 2026 ? 0.20 : 0,
        scoringNote: season === 2026
          ? "Five-category scouting index. Missing category weights are redistributed proportionally. Weights are selected, not historically optimized. Projection incorporates performance and age information."
          : "Overall scores use performance and age only.",
        gradeScale: "20-80 statistical grade",
        note:
          "Percentiles are calculated within minor-league levels. These are statistical rankings, not professional scouting grades.",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to generate prospect rankings" },
      { status: 502 }
    );
  }
}
