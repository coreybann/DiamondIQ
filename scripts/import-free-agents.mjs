
import fs from "node:fs";

const sourcePath = "public/data/free-agents-2027-source.txt";
const outputPath = "public/data/free-agents-2027.json";

const source = fs.readFileSync(sourcePath, "utf8");

const positions = {
  "CATCHERS": "C",
  "FIRST BASEMEN": "1B",
  "SECOND BASEMEN": "2B",
  "THIRD BASEMEN": "3B",
  "SHORTSTOPS": "SS",
  "LEFT FIELDERS": "LF",
  "CENTER FIELDERS": "CF",
  "RIGHT FIELDERS": "RF",
  "DESIGNATED HITTERS": "DH",
  "STARTING PITCHERS": "SP",
  "RELIEF PITCHERS": "RP",
};

let currentPosition = null;
const players = [];

const playerPattern =
  /^(?:(LHP|RHP)\s+)?(.+?)\s+\((\d+)(?:\s+years old)?,\s*(-?\d+(?:\.\d+)?)\s*(?:WAR)?\)(?:\s*--\s*(.*))?$/;

for (const rawLine of source.split(/\r?\n/)) {
  const line = rawLine
    .trim()
    .replace(/^#{1,6}\s*/, "")
    .replace(/^[•*-]\s+/, "");

  const heading = line.toUpperCase();

  if (positions[heading]) {
    currentPosition = positions[heading];
    continue;
  }

  if (!currentPosition) continue;

  const match = line.match(playerPattern);
  if (!match) continue;

  const [, throwingHand, name, age, war, option] = match;

  players.push({
    name: name.trim(),
    position: currentPosition,
    age: Number(age),
    war2025_2026: Number(war),
    throwingHand: throwingHand ?? null,
    contractOption: option?.trim() ?? null,
    status: "unverified",
  });
}

const database = {
  season: 2027,
  source: "https://www.mlb.com/news/mlb-free-agents-2026-2027",
  sourceDate: "2026-10-08",
  lastUpdated: new Date().toISOString(),
  players,
};

fs.writeFileSync(
  outputPath,
  JSON.stringify(database, null, 2) + "\n"
);

console.log(`Imported ${players.length} potential free agents.`);
console.log(`Saved to ${outputPath}`);
