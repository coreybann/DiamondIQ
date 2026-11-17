import "fake-indexeddb/auto";

import {
  saveFranchise,
  getFranchise,
  type FranchiseSave,
} from "../../src/lib/play-gm/franchiseStorage";

import { updateFranchiseUniverse } from "../../src/lib/play-gm/updateFranchiseUniverse";

import type {
  GMPlayer,
  GMTeam,
  GMUniverse,
} from "../../src/lib/play-gm/universeTypes";

async function main() {
  const teams: GMTeam[] = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    name: `Test Team ${i + 1}`,
    abbreviation: `T${i + 1}`,
    playerIds: i === 0 ? [100] : [],
    payrollMillions: 0,
    payrollKnown: false,
  }));

  const player: GMPlayer = {
    id: 100,
    name: "Test Player",
    age: 25,
    position: "P",
    bats: "R",
    throws: "R",
    organizationId: 1,
    rosterStatus: "active",
    onFortyMan: true,
    onActiveRoster: true,
    salaryMillions: 1,
    salaryType: "simulated",
    contractStatus: "Test",
    prospectProjectionScore: null,
    prospectDevelopmentScore: null,
  };

  const universe: GMUniverse = {
    schemaVersion: 1,
    initializedAt: "2026-11-17T00:00:00.000Z",
    currentDate: "2026-11-17",
    season: 2026,
    teams,
    players: [player],
    transactions: [],
  };

  const franchise: FranchiseSave = {
    id: "isolated-roster-validation-test",
    name: "Isolated Test",
    teamId: 1,
    teamName: "Test Team 1",
    teamAbbreviation: "T1",
    currentDate: universe.currentDate,
    currentSeason: universe.season,
    phase: "offseason",
    createdAt: universe.initializedAt,
    updatedAt: universe.initializedAt,
    universe,
  };

  await saveFranchise(franchise);

  const updated = await updateFranchiseUniverse(
    franchise.id,
    (current) => ({
      ...current,
      currentDate: "2026-11-18",
    })
  );

  if (updated.currentDate !== "2026-11-18") {
    throw new Error("Valid update was not saved.");
  }

  console.log("Valid franchise update: PASS");

  let rejected = false;

  try {
    await updateFranchiseUniverse(
      franchise.id,
      (current) => ({
        ...current,
        players: current.players.map((p) => ({
          ...p,
          organizationId: 2,
        })),
      })
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Invalid player 100 on team 1")
    ) {
      rejected = true;
    } else {
      throw error;
    }
  }

  if (!rejected) {
    throw new Error("Invalid ownership was accepted.");
  }

  console.log("Invalid ownership rejected: PASS");

  const saved = await getFranchise(franchise.id);

  if (
    saved?.universe?.players[0]?.organizationId !== 1 ||
    saved?.currentDate !== "2026-11-18"
  ) {
    throw new Error("Rejected update modified the saved franchise.");
  }

  console.log("Saved franchise unchanged after rejection: PASS");
  console.log("FRANCHISE UPDATE INTEGRATION TEST PASS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
