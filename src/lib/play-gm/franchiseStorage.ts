import type { GMUniverse } from "./universeTypes";

const DATABASE_NAME = "diamondiq-play-gm";
const DATABASE_VERSION = 1;
const STORE_NAME = "franchises";

export type FranchiseSave = {
  id: string;
  name: string;
  teamId: number;
  teamName: string;
  teamAbbreviation: string;
  currentDate: string;
  currentSeason: number;
  phase: "offseason" | "spring-training" | "regular-season" | "postseason";
  createdAt: string;
  updatedAt: string;

  // Optional for compatibility with existing franchise saves.
  revision?: number;

  universe?: GMUniverse;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable in this browser."));
      return;
    }

    const request = indexedDB.open(
      DATABASE_NAME,
      DATABASE_VERSION
    );

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
      }
    };

    request.onsuccess = () => resolve(request.result);

    request.onerror = () =>
      reject(request.error ?? new Error("Unable to open database."));
  });
}

export async function saveFranchise(
  franchise: FranchiseSave
): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        STORE_NAME,
        "readwrite"
      );

      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(franchise.id);

      let conflictError: Error | null = null;

      request.onsuccess = () => {
        const existing = request.result as
          | FranchiseSave
          | undefined;

        const expectedRevision = franchise.revision ?? 0;
        const storedRevision = existing?.revision ?? 0;

        if (
          (existing && expectedRevision !== storedRevision) ||
          (!existing && expectedRevision !== 0)
        ) {
          conflictError = new Error(
            "Franchise save conflict: this franchise was updated elsewhere. Reload before saving."
          );

          transaction.abort();
          return;
        }

        store.put({
          ...franchise,
          revision: storedRevision + 1,
        });
      };

      transaction.oncomplete = () => resolve();

      transaction.onerror = () =>
        reject(
          conflictError ??
          transaction.error ??
          new Error("Unable to save franchise.")
        );

      transaction.onabort = () =>
        reject(
          conflictError ??
          transaction.error ??
          new Error("Franchise save aborted.")
        );
    });
  } finally {
    database.close();
  }
}

export async function getFranchise(
  id: string
): Promise<FranchiseSave | undefined> {
  const database = await openDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(
        STORE_NAME,
        "readonly"
      );

      const request = transaction.objectStore(STORE_NAME).get(id);

      request.onsuccess = () =>
        resolve(request.result as FranchiseSave | undefined);

      request.onerror = () =>
        reject(request.error ?? new Error("Unable to load franchise."));
    });
  } finally {
    database.close();
  }
}

export async function getAllFranchises(): Promise<FranchiseSave[]> {
  const database = await openDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(
        STORE_NAME,
        "readonly"
      );

      const request = transaction.objectStore(STORE_NAME).getAll();

      request.onsuccess = () => {
        const franchises = request.result as FranchiseSave[];

        resolve(
          franchises.sort((a, b) =>
            b.updatedAt.localeCompare(a.updatedAt)
          )
        );
      };

      request.onerror = () =>
        reject(request.error ?? new Error("Unable to load franchises."));
    });
  } finally {
    database.close();
  }
}

export async function deleteFranchise(
  id: string
): Promise<void> {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        STORE_NAME,
        "readwrite"
      );

      transaction.objectStore(STORE_NAME).delete(id);

      transaction.oncomplete = () => resolve();

      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Unable to delete franchise."));

      transaction.onabort = () =>
        reject(transaction.error ?? new Error("Franchise deletion aborted."));
    });
  } finally {
    database.close();
  }
}
