
import type { LineupHitter } from "./lineupOptimizer";

export type HitterProbabilities = {
  single: number;
  double: number;
  triple: number;
  homeRun: number;
  walk: number;
  out: number;
  doublePlay: number;
  sacrificeFly: number;
};

export function calculateHitterProbabilities(
  hitter: LineupHitter
): HitterProbabilities | null {
  const pa = hitter.plateAppearances ?? 0;
  const hits = hitter.hits ?? 0;
  const doubles = hitter.doubles ?? 0;
  const triples = hitter.triples ?? 0;
  const homeRuns = hitter.homeRuns ?? 0;
  const walks = hitter.walks ?? 0;
  const hbp = hitter.hitByPitch ?? 0;

  if (pa <= 0) return null;

  const singles = hits - doubles - triples - homeRuns;
  const onBaseEvents = hits + walks + hbp;
  const outs = pa - onBaseEvents;

  const doublePlays = hitter.groundIntoDoublePlay ?? 0;
  const sacrificeFlies = hitter.sacFlies ?? 0;

  const counts = [
    singles,
    doubles,
    triples,
    homeRuns,
    walks + hbp,
    outs,
    doublePlays,
    sacrificeFlies,
  ];

  if (
    counts.some((count) => !Number.isFinite(count) || count < 0)
  ) {
    return null;
  }

  return {
    single: singles / pa,
    double: doubles / pa,
    triple: triples / pa,
    homeRun: homeRuns / pa,
    walk: (walks + hbp) / pa,
    out: Math.max(0, outs - doublePlays - sacrificeFlies) / pa,
    doublePlay: Math.min(doublePlays, outs) / pa,
    sacrificeFly: Math.min(sacrificeFlies, Math.max(0, outs - doublePlays)) / pa,
  };
}

type Bases = {
  first: boolean;
  second: boolean;
  third: boolean;
};

export type PlateAppearanceOutcome = keyof HitterProbabilities;

export function applyPlateAppearance(
  bases: Bases,
  outcome: PlateAppearanceOutcome,
  random: () => number = Math.random
): {
  bases: Bases;
  runs: number;
  outs: number;
} {
  const next = { ...bases };
  let runs = 0;

  switch (outcome) {
    case "walk": {
      if (bases.first && bases.second && bases.third) runs++;

      next.third =
        bases.third || (bases.second && bases.first);
      next.second =
        bases.second || bases.first;
      next.first = true;
      break;
    }

    case "single": {
      const secondScores =
        bases.second && random() < 0.6;

      runs =
        Number(bases.third) +
        Number(secondScores);

      next.third = bases.second && !secondScores;
      next.second = bases.first;
      next.first = true;
      break;
    }

    case "double": {
      const firstScores =
        bases.first && random() < 0.4;

      runs =
        Number(bases.third) +
        Number(bases.second) +
        Number(firstScores);

      next.third = bases.first && !firstScores;
      next.second = true;
      next.first = false;
      break;
    }

    case "triple": {
      runs =
        Number(bases.first) +
        Number(bases.second) +
        Number(bases.third);

      next.first = false;
      next.second = false;
      next.third = true;
      break;
    }

    case "homeRun": {
      runs =
        1 +
        Number(bases.first) +
        Number(bases.second) +
        Number(bases.third);

      next.first = false;
      next.second = false;
      next.third = false;
      break;
    }

    case "sacrificeFly":
      return {
        bases: {
          ...next,
          third: false,
        },
        runs: bases.third ? 1 : 0,
        outs: 1,
      };

    case "doublePlay":
      return {
        bases: { ...next, first: false },
        runs: 0,
        outs: 2,
      };

    case "out":
      return { bases: next, runs: 0, outs: 1 };
  }

  return { bases: next, runs, outs: 0 };
}

function sampleOutcome(
  probabilities: HitterProbabilities,
  bases: Bases,
  outs: number,
  random: () => number = Math.random
): PlateAppearanceOutcome {
  const adjusted = { ...probabilities };

  if (!bases.first || outs >= 2) {
    adjusted.out += adjusted.doublePlay;
    adjusted.doublePlay = 0;
  }

  if (!bases.third || outs >= 2) {
    adjusted.out += adjusted.sacrificeFly;
    adjusted.sacrificeFly = 0;
  }

  const roll = random();
  let cumulative = 0;

  const outcomes: PlateAppearanceOutcome[] = [
    "single",
    "double",
    "triple",
    "homeRun",
    "walk",
    "out",
    "doublePlay",
    "sacrificeFly",
  ];

  for (const outcome of outcomes) {
    cumulative += adjusted[outcome];

    if (roll < cumulative) {
      return outcome;
    }
  }

  return "out";
}


export function simulateNineInnings(
  hitters: LineupHitter[],
  random: () => number = Math.random
): number | null {
  if (hitters.length !== 9) return null;

  const probabilities = hitters.map(calculateHitterProbabilities);

  if (probabilities.some((value) => value === null)) {
    return null;
  }

  const validProbabilities =
    probabilities as HitterProbabilities[];

  type RunnerBases = {
    first: number | null;
    second: number | null;
    third: number | null;
  };

  const emptyBases = (): RunnerBases => ({
    first: null,
    second: null,
    third: null,
  });

  // Estimate steal attempts per time on base.
  // This is a proxy, not an official opportunity rate.
  const stealRates = hitters.map((hitter) => {
    const attempts =
      (hitter.stolenBases ?? 0) +
      (hitter.caughtStealing ?? 0);

    const timesOnBase =
      (hitter.hits ?? 0) +
      (hitter.walks ?? 0) +
      (hitter.hitByPitch ?? 0);

    return {
      attempt: timesOnBase > 0
        ? Math.min(0.5, attempts / timesOnBase)
        : 0,
      success: attempts > 0
        ? (hitter.stolenBases ?? 0) / attempts
        : 0,
    };
  });

  let runs = 0;
  let battingIndex = 0;

  for (let inning = 0; inning < 9; inning++) {
    let outs = 0;
    let bases = emptyBases();
    let plateAppearances = 0;

    while (outs < 3 && plateAppearances < 100) {

      // Situational stolen-base decision model.
      const stealCandidate =
        bases.second !== null && bases.third === null
          ? { base: "second" as const, target: "third" as const }
          : bases.first !== null && bases.second === null
            ? { base: "first" as const, target: "second" as const }
            : null;

if (stealCandidate && outs < 3) {
        const runnerId = bases[stealCandidate.base];
        const rate = stealRates[runnerId!];

        const nextHitter = hitters[battingIndex];

        // Reduce attempts when a power hitter is batting.
        const powerAdjustment =
          nextHitter.slg >= 0.500 ? 0.65 :
          nextHitter.slg >= 0.450 ? 0.80 : 1;

        // Be more conservative with two outs.
const outsAdjustment =
  outs === 2 ? 0.50 :
  outs === 1 ? 0.80 : 1;

        const situationalAttemptRate =
          rate.attempt *
          powerAdjustment *
          outsAdjustment;

        if (random() < situationalAttemptRate) {
          if (random() < rate.success) {
            bases[stealCandidate.target] = runnerId;
            bases[stealCandidate.base] = null;
          } else {
            bases[stealCandidate.base] = null;
            outs++;
          }
        }
      }
      if (outs >= 3) break;

      const hitter = validProbabilities[battingIndex];

      const occupiedBases = {
        first: bases.first !== null,
        second: bases.second !== null,
        third: bases.third !== null,
      };

      const outcome = sampleOutcome(
        hitter,
        occupiedBases,
        outs,
        random
      );

      switch (outcome) {
        case "walk": {
          if (
            bases.first !== null &&
            bases.second !== null &&
            bases.third !== null
          ) runs++;

          if (bases.first !== null) {
            if (bases.second !== null) {
              if (bases.third !== null) {
                bases.third = bases.second;
              }
              bases.second = bases.first;
            }
            bases.first = battingIndex;
          } else {
            bases.first = battingIndex;
          }
          break;
        }

        case "single": {
          const secondScores =
            bases.second !== null && random() < 0.6;

          runs += Number(bases.third !== null);
          runs += Number(secondScores);

          bases.third = secondScores ? null : bases.second;
          bases.second = bases.first;
          bases.first = battingIndex;
          break;
        }

        case "double": {
          const firstScores =
            bases.first !== null && random() < 0.4;

          runs += Number(bases.third !== null);
          runs += Number(bases.second !== null);
          runs += Number(firstScores);

          bases.third = firstScores ? null : bases.first;
          bases.second = battingIndex;
          bases.first = null;
          break;
        }

        case "triple": {
          runs +=
            Number(bases.first !== null) +
            Number(bases.second !== null) +
            Number(bases.third !== null);

          bases = {
            first: null,
            second: null,
            third: battingIndex,
          };
          break;
        }

        case "homeRun": {
          runs +=
            1 +
            Number(bases.first !== null) +
            Number(bases.second !== null) +
            Number(bases.third !== null);

          bases = emptyBases();
          break;
        }

        case "sacrificeFly": {
          runs += Number(bases.third !== null);
          bases.third = null;
          outs++;
          break;
        }

        case "doublePlay": {
          bases.first = null;
          outs += 2;
          break;
        }

        case "out":
          outs++;
          break;
      }

      battingIndex = (battingIndex + 1) % 9;
      plateAppearances++;
    }
  }

  return runs;
}

export function estimateRunsPerGame(
  hitters: LineupHitter[],
  simulations = 5000,
  seed = 12345
): number | null {
  if (
    hitters.length !== 9 ||
    !Number.isInteger(simulations) ||
    simulations < 1
  ) {
    return null;
  }

  let totalRuns = 0;
const random = createSeededRandom(seed);
  for (let i = 0; i < simulations; i++) {
const runs = simulateNineInnings(hitters, random);

    if (runs === null) {
      return null;
    }

    totalRuns += runs;
  }

  return totalRuns / simulations;
}
export function shuffleLineup<T>(players: T[]): T[] {
  const shuffled = [...players];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[j]] = [
      shuffled[j],
      shuffled[i],
    ];
  }

  return shuffled;
}


export function findBestSimulatedLineup(
  hitters: LineupHitter[],
  candidates = 100,
  simulationsPerCandidate = 200
): LineupHitter[] {
  if (hitters.length !== 9) return [];

  const testedLineups: {
    lineup: LineupHitter[];
    score: number;
  }[] = [];

  for (let i = 0; i < candidates; i++) {
    const candidate =
      i === 0 ? [...hitters] : shuffleLineup(hitters);

    const score = estimateRunsPerGame(
      candidate,
      simulationsPerCandidate
    );

    if (score === null) return [];

    testedLineups.push({
      lineup: candidate,
      score,
    });
  }

  testedLineups.sort((a, b) => b.score - a.score);

const finalists = [
  { lineup: [...hitters], score: 0 },
  ...testedLineups.slice(0, 10),
];

  let bestLineup = finalists[0].lineup;
  let bestScore = -Infinity;

  for (const finalist of finalists) {
    const score = estimateRunsPerGame(
      finalist.lineup,
      5000
    );

    if (score !== null && score > bestScore) {
      bestScore = score;
      bestLineup = finalist.lineup;
    }
  }

  return bestLineup;
}

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
