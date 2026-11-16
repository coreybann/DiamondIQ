import type {
  GMPlayer,
  GMTeam,
  GMUniverse,
} from "./universeTypes";
import { validateUniverseRosters } from "./validateUniverseRosters";

type UniverseInput = {
  teams: GMTeam[];
  players: GMPlayer[];
  currentDate: string;
  season: number;
};

export function createUniverse({
  teams,
  players,
  currentDate,
  season,
}: UniverseInput): GMUniverse {
  validateUniverseRosters(teams, players);

  return {
    schemaVersion: 1,
    initializedAt: new Date().toISOString(),
    currentDate,
    season,
    teams: structuredClone(teams),
    players: structuredClone(players),
    transactions: [],
  };
}
