export type MLBFreeAgencyEventType =
  | "Option Exercised"
  | "Option Declined"
  | "Became Free Agent";

export type MLBFreeAgencyEvent = {
  playerId: number | null;
  playerName: string;
  date: string;
  type: MLBFreeAgencyEventType;
  description: string;
};
export type MLBTransaction = {
  id: number;
  date: string;
  description: string;
  playerId: number | null;
  playerName: string;
  fromTeam: string | null;
  toTeam: string | null;
  position: string | null;
};

export async function getMLBTransactions(
  startDate: string,
  endDate: string
): Promise<MLBTransaction[]> {
  const url = new URL(
    "https://statsapi.mlb.com/api/v1/transactions"
  );

  url.searchParams.set("startDate", startDate);
  url.searchParams.set("endDate", endDate);

  const response = await fetch(url.toString(), {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error("Unable to load MLB transactions");
  }

  const data = await response.json();

  return (data.transactions ?? []).map(
    (transaction: any): MLBTransaction => ({
      id: transaction.id,
      date: transaction.date ?? "",
      description: transaction.description ?? "",
      playerId: transaction.person?.id ?? null,
      playerName:
        transaction.person?.fullName ?? "Unknown Player",
      fromTeam: transaction.fromTeam?.name ?? null,
      toTeam: transaction.toTeam?.name ?? null,
      position: null,
    })
  );
}

export async function getMLBTransactionsInBatches(
  startDate: string,
  endDate: string
): Promise<MLBTransaction[]> {
  if (startDate > endDate) {
    return [];
  }

  const allTransactions: MLBTransaction[] = [];
  let cursor = new Date(`${startDate}T00:00:00Z`);
  const finalDate = new Date(`${endDate}T00:00:00Z`);

  while (cursor <= finalDate) {
    const batchStart = cursor.toISOString().slice(0, 10);

    const batchEndDate = new Date(
      Math.min(
        cursor.getTime() + 6 * 86400000,
        finalDate.getTime()
      )
    );

    const batchEnd = batchEndDate.toISOString().slice(0, 10);

    const transactions = await getMLBTransactions(
      batchStart,
      batchEnd
    );

    allTransactions.push(...transactions);
    cursor = new Date(batchEndDate.getTime() + 86400000);
  }

  return allTransactions;
}
export async function getFreeAgentSignings(
  startDate: string,
  endDate: string
): Promise<MLBTransaction[]> {
  if (startDate > endDate) {
    return [];
  }

  const allTransactions: MLBTransaction[] = [];
  let cursor = new Date(`${startDate}T00:00:00Z`);
  const finalDate = new Date(`${endDate}T00:00:00Z`);

  while (cursor <= finalDate) {
    const batchStart = cursor.toISOString().slice(0, 10);

    const batchEndDate = new Date(
      Math.min(
        cursor.getTime() + 6 * 86400000,
        finalDate.getTime()
      )
    );

    const batchEnd = batchEndDate.toISOString().slice(0, 10);

    const transactions = await getMLBTransactions(
      batchStart,
      batchEnd
    );

    allTransactions.push(...transactions);
    cursor = new Date(batchEndDate.getTime() + 86400000);
  }

  return allTransactions.filter((transaction) => {
    const description = transaction.description;

    const isFreeAgentSigning =
      /\bsigned (?:a )?free agent\b/i.test(description);

    const isMinorLeagueContract =
      /minor league contract/i.test(description);

    return isFreeAgentSigning && !isMinorLeagueContract;
  });
}
export function detectFreeAgentSignings(
  transactions: MLBTransaction[]
): MLBTransaction[] {
  return transactions.filter((transaction) => {
    const description = transaction.description;

    const isFreeAgentSigning =
      /\bsigned (?:a )?free agent\b/i.test(description);

    const isMinorLeagueContract =
      /minor[\s-]+league contract/i.test(description);

    return isFreeAgentSigning && !isMinorLeagueContract;
  });
}
export function detectFreeAgencyEvents(
  transactions: MLBTransaction[]
): MLBFreeAgencyEvent[] {
  return transactions.flatMap((transaction) => {
    const description = transaction.description;

    let type: MLBFreeAgencyEventType | null = null;

    if (/\b(option|contract option)\s+(?:was\s+)?exercised\b/i.test(description)) {
      type = "Option Exercised";
    } else if (
      /\b(option|contract option)\s+(?:was\s+)?declined\b/i.test(description)
    ) {
      type = "Option Declined";
    } else if (
      /\b(elected|declared)\s+free agency\b/i.test(description) &&
      !/\bminor[\s-]+league\b/i.test(description)
    ) {
      type = "Became Free Agent";
    }

    if (!type || transaction.playerId === null) {
      return [];
    }

    return [{
      playerId: transaction.playerId,
      playerName: transaction.playerName,
      date: transaction.date,
      type,
      description,
    }];
  });
}
export async function getMLBPlayerPositions(
  playerIds: number[]
): Promise<Record<number, string>> {
  const uniqueIds = [...new Set(playerIds)].filter(
    (id) => Number.isInteger(id) && id > 0
  );

  if (uniqueIds.length === 0) {
    return {};
  }

  const positions: Record<number, string> = {};

  // Fetch players in batches to avoid excessively long URLs.
  for (let i = 0; i < uniqueIds.length; i += 50) {
    const batch = uniqueIds.slice(i, i + 50);

    const url = new URL(
      "https://statsapi.mlb.com/api/v1/people"
    );

    url.searchParams.set("personIds", batch.join(","));

    const response = await fetch(url.toString(), {
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      throw new Error("Unable to load MLB player positions");
    }

    const data = await response.json();

    for (const player of data.people ?? []) {
      if (player.id && player.primaryPosition?.abbreviation) {
        positions[player.id] =
          player.primaryPosition.abbreviation;
      }
    }
  }

  return positions;
}
