import type { GMPlayer } from "./universeTypes";

type MLBPerson = {
  id: number;
  birthDate?: string;
  primaryPosition?: {
    abbreviation?: string;
  };
  batSide?: {
    code?: string;
  };
  pitchHand?: {
    code?: string;
  };
};

type MLBPeopleResponse = {
  people?: MLBPerson[];
};

function ageOnDate(
  birthDate: string,
  referenceDate: string
): number | null {
  const birth = new Date(`${birthDate}T00:00:00Z`);
  const reference = new Date(`${referenceDate}T00:00:00Z`);

  if (
    Number.isNaN(birth.getTime()) ||
    Number.isNaN(reference.getTime()) ||
    birth > reference
  ) {
    return null;
  }

  let age = reference.getUTCFullYear() - birth.getUTCFullYear();

  const birthdayPassed =
    reference.getUTCMonth() > birth.getUTCMonth() ||
    (
      reference.getUTCMonth() === birth.getUTCMonth() &&
      reference.getUTCDate() >= birth.getUTCDate()
    );

  if (!birthdayPassed) age--;

  return age;
}

export async function enrichFreeAgentPlayers(
  players: GMPlayer[],
  referenceDate = "2026-11-14"
): Promise<GMPlayer[]> {
  if (players.length === 0) return [];

  const ids = players.map((player) => player.id);

  if (new Set(ids).size !== ids.length) {
    throw new Error("Duplicate free-agent IDs.");
  }

  const people = new Map<number, MLBPerson>();

  // Use small batches to avoid oversized MLB API requests.
  for (let index = 0; index < ids.length; index += 50) {
    const batch = ids.slice(index, index + 50);

    const params = new URLSearchParams({
      personIds: batch.join(","),
    });

    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/people?${params}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(
        `Unable to retrieve MLB player details: HTTP ${response.status}`
      );
    }

    const data = (await response.json()) as MLBPeopleResponse;

    if (!Array.isArray(data.people)) {
      throw new Error("Invalid MLB player details response.");
    }

    for (const person of data.people) {
      if (people.has(person.id)) {
        throw new Error(`Duplicate MLB person: ${person.id}`);
      }

      people.set(person.id, person);
    }
  }

  return players.map((player) => {
    const person = people.get(player.id);

    if (!person) {
      throw new Error(
        `Missing MLB player details for ${player.name} (${player.id}).`
      );
    }

    return {
      ...player,
      age: person.birthDate
        ? ageOnDate(person.birthDate, referenceDate)
        : null,
      position: person.primaryPosition?.abbreviation ?? "N/A",
      bats: person.batSide?.code ?? "—",
      throws: person.pitchHand?.code ?? "—",
    };
  });
}
