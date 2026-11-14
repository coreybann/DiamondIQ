export type PitcherRole =
  | "Reliever"
  | "Starter"
  | "Insufficient Data";

export function classifyPitcherRole(
  gamesPlayed: number,
  gamesStarted: number
): PitcherRole {
  if (
    !Number.isFinite(gamesPlayed) ||
    !Number.isFinite(gamesStarted) ||
    gamesPlayed < 5 ||
    gamesStarted < 0 ||
    gamesStarted > gamesPlayed
  ) {
    return "Insufficient Data";
  }

  return gamesStarted / gamesPlayed >= 0.5
    ? "Starter"
    : "Reliever";
}

export function classifyPitcherRoleWithFallback(
  currentGamesPlayed: number,
  currentGamesStarted: number,
  previousGamesPlayed: number,
  previousGamesStarted: number
): PitcherRole {
  const currentRole = classifyPitcherRole(
    currentGamesPlayed,
    currentGamesStarted
  );

  if (currentRole !== "Insufficient Data") {
    return currentRole;
  }

  // Prioritize clear current-season starting usage.
  if (
    Number.isFinite(currentGamesPlayed) &&
    Number.isFinite(currentGamesStarted) &&
    currentGamesPlayed > 0 &&
    currentGamesStarted === currentGamesPlayed
  ) {
    return "Starter";
  }

  return classifyPitcherRole(
    previousGamesPlayed,
    previousGamesStarted
  );
}
