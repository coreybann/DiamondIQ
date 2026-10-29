
export type ContractProjectionInput = {
  age: number;
  position: string;
  war2025_2026: number;
};

export type ContractProjection = {
  years: number;
  aavMillions: number;
  totalMillions: number;
  averageWar: number;
};

export function projectContract(
  player: ContractProjectionInput
): ContractProjection {
  // Convert two-season WAR into an annual average.
  const averageWar = Math.max(0, player.war2025_2026 / 2);

  
  // Preliminary contract length based on performance and age.
  let years = 1;

  if (player.position === "SP") {
    // Starting pitchers have a separate contract-length model.
    if (averageWar >= 1.5) years = 2;
    if (averageWar >= 2.5) years = 3;
    if (averageWar >= 3.5) years = 4;
    if (averageWar >= 4.5) years = 5;
    if (averageWar >= 5.5) years = 6;

    // Additional years for elite pitchers entering free agency younger.
    if (averageWar >= 3 && player.age <= 31) {
      years += 2;
    }
  
  } else if (player.position === "RP") {
    // Relief pitchers generally receive shorter contracts.
    if (averageWar >= 0.5) years = 2;
    if (averageWar >= 1.5) years = 3;
    if (averageWar >= 2.5) years = 4;
  } else {
    // Position-player contract lengths.
    if (averageWar >= 1) years = 2;
    if (averageWar >= 2) years = 3;
    if (averageWar >= 3) years = 4;
    if (averageWar >= 4) years = 5;
    if (averageWar >= 5) years = 6;
    if (averageWar >= 6) years = 7;

    // Young, elite position players can receive longer deals.
    if (averageWar >= 4 && player.age <= 29) {
      years += 2;
    }

    if (averageWar >= 6 && player.age <= 27) {
      years += 4;
    }
  }


  // Age-related contract length limits.
  if (player.age >= 32) years = Math.min(years, 4);
  if (player.age >= 35) years = Math.min(years, 2);
  if (player.age >= 38) years = 1;

  // Allow longer contracts for exceptional young position players.
const maxYears =
  player.position !== "SP" &&
  player.position !== "RP" &&
  player.age <= 27 &&
  averageWar >= 6
    ? 15
    : 8;

years = Math.min(years, maxYears);


  // Preliminary annual salary estimate in millions.
  // These are model assumptions, not historical market estimates.
  const baselineAav = 3;
  const dollarsPerWar = 5;

  const positionMultipliers: Record<string, number> = {
    C: 1.05,
    "1B": 0.95,
    "2B": 1,
    "3B": 1,
    SS: 1.1,
    LF: 0.95,
    CF: 1.05,
    RF: 1,
    DH: 0.9,
    SP: 1.1,
    RP: 0.85,
  };

  const positionMultiplier = positionMultipliers[player.position] ?? 1;

  const ageMultiplier =
    player.age <= 29 ? 1.1 :
    player.age <= 32 ? 1 :
    player.age <= 35 ? 0.85 : 0.7;

  const aavMillions = Math.round(
    Math.max(
      1,
      (baselineAav + averageWar * dollarsPerWar) *
        positionMultiplier *
        ageMultiplier
    ) * 10
  ) / 10;

  const totalMillions =
    Math.round(years * aavMillions * 10) / 10;

  return {
    years,
    aavMillions,
    totalMillions,
    averageWar,
  };
}
