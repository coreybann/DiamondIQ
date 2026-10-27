import fs from "node:fs";
import path from "node:path";
import type { HistoricalContract } from "../src/lib/historicalContracts";

const filePath = path.join(
  process.cwd(),
  "public/data/mlb-contract-comparables.json"
);

const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

// Pending FanGraphs WAR verification:
// Teoscar Hernández: 2025 Dodgers, 3 years, $66M
// Anthony Santander: 2025 Blue Jays, 5 years, $92.5M

const newContracts: HistoricalContract[] = [
  {
    player: "Christian Walker",
    position: "1B",
    ageAtSigning: 33,
    priorTwoYearWar: 6.9,
    team: "Houston Astros",
    contractStartYear: 2025,
    years: 3,
    totalMillions: 60,
    aavMillions: 20,
    source: "https://www.mlb.com/astros/news/christian-walker-contract-with-astros"
  },
  {
    player: "Tanner Scott",
    position: "RP",
    ageAtSigning: 30,
    priorTwoYearWar: 4.5,
    team: "Los Angeles Dodgers",
    contractStartYear: 2025,
    years: 4,
    totalMillions: 72,
    aavMillions: 18,
    source: "https://www.mlb.com/news/tanner-scott-dodgers-contract",
    notes: "Includes deferred salary and signing bonus."
  },
  {
    player: "Jeff Hoffman",
    position: "RP",
    ageAtSigning: 32,
    priorTwoYearWar: 3.6,
    team: "Toronto Blue Jays",
    contractStartYear: 2025,
    years: 3,
    totalMillions: 33,
    aavMillions: 11,
    source: "https://www.fangraphs.com/statss.aspx?playerid=17432&position=P"
  },
  {
    player: "Sean Manaea",
    position: "SP",
    ageAtSigning: 32,
    priorTwoYearWar: 4.0,
    team: "New York Mets",
    contractStartYear: 2025,
    years: 3,
    totalMillions: 75,
    aavMillions: 25,
    source: "https://www.mlb.com/mets/news/sean-manaea-mets-contract",
    notes: "Includes deferred money."
  },
  {
    player: "Nathan Eovaldi",
    position: "SP",
    ageAtSigning: 34,
    priorTwoYearWar: 4.9,
    team: "Texas Rangers",
    contractStartYear: 2025,
    years: 3,
    totalMillions: 75,
    aavMillions: 25,
    source: "https://www.mlb.com/news/nathan-eovaldi-rangers-contract"
  },
  {
    player: "Yusei Kikuchi",
    position: "SP",
    ageAtSigning: 33,
    priorTwoYearWar: 6.2,
    team: "Los Angeles Angels",
    contractStartYear: 2025,
    years: 3,
    totalMillions: 63,
    aavMillions: 21,
    source: "https://www.mlb.com/press-release/press-release-angels-sign-lhp-yusei-kikuchi"
  },
  {
    player: "Teoscar Hernández",
    position: "RF",
    ageAtSigning: 32,
    priorTwoYearWar: 5.3,
    team: "Los Angeles Dodgers",
    contractStartYear: 2025,
    years: 3,
    totalMillions: 66,
    aavMillions: 22,
    source: "https://www.mlb.com/dodgers/news/teoscar-hernandez-contract-with-dodgers",
    notes: "Includes deferred money, signing bonus, and a 2028 club option."
  },
  {
    player: "Anthony Santander",
    position: "RF",
    ageAtSigning: 30,
    priorTwoYearWar: 5.8,
    team: "Toronto Blue Jays",
    contractStartYear: 2025,
    years: 5,
    totalMillions: 92.5,
    aavMillions: 18.5,
    source: "https://www.mlb.com/bluejays/news/anthony-santander-blue-jays-contract",
    notes: "Includes deferred money and opt-out provisions."
  },
  {
    player: "Pete Alonso",
    position: "1B",
    ageAtSigning: 30,
    priorTwoYearWar: 4.8,
    team: "New York Mets",
    contractStartYear: 2025,
    years: 2,
    totalMillions: 54,
    aavMillions: 27,
    source: "https://www.mlb.com/mets/news/pete-alonso-mets-contract"
  },
  {
    player: "Gleyber Torres",
    position: "2B",
    ageAtSigning: 28,
    priorTwoYearWar: 5.4,
    team: "Detroit Tigers",
    contractStartYear: 2025,
    years: 1,
    totalMillions: 15,
    aavMillions: 15,
    source: "https://www.mlb.com/tigers/news/gleyber-torres-tigers-contract"
  },
  {
    player: "Joc Pederson",
    position: "DH",
    ageAtSigning: 32,
    priorTwoYearWar: 3.8,
    team: "Texas Rangers",
    contractStartYear: 2025,
    years: 2,
    totalMillions: 37,
    aavMillions: 18.5,
    source: "https://www.mlb.com/rangers/news/joc-pederson-rangers-contract"
  },
  {
    player: "Jurickson Profar",
    position: "LF",
    ageAtSigning: 32,
    priorTwoYearWar: 2.8,
    team: "Atlanta Braves",
    contractStartYear: 2025,
    years: 3,
    totalMillions: 42,
    aavMillions: 14,
    source: "https://www.mlb.com/braves/news/jurickson-profar-braves-contract"
  },
  {
    player: "Nick Pivetta",
    position: "SP",
    ageAtSigning: 32,
    priorTwoYearWar: 3.8,
    team: "San Diego Padres",
    contractStartYear: 2025,
    years: 4,
    totalMillions: 55,
    aavMillions: 13.75,
    source: "https://www.mlb.com/padres/news/nick-pivetta-padres-contract"
  },
  {
    player: "Luis Severino",
    position: "SP",
    ageAtSigning: 31,
    priorTwoYearWar: 1.6,
    team: "Athletics",
    contractStartYear: 2025,
    years: 3,
    totalMillions: 67,
    aavMillions: 67 / 3,
    source: "https://www.mlb.com/news/luis-severino-athletics-contract"
  },
  {
    player: "Walker Buehler",
    position: "SP",
    ageAtSigning: 30,
    priorTwoYearWar: -0.1,
    team: "Boston Red Sox",
    contractStartYear: 2025,
    years: 1,
    totalMillions: 21.05,
    aavMillions: 21.05,
    source: "https://www.mlb.com/redsox/news/walker-buehler-red-sox-contract"
  },
  {
    player: "Kyle Gibson",
    position: "SP",
    ageAtSigning: 37,
    priorTwoYearWar: 4.2,
    team: "St. Louis Cardinals",
    contractStartYear: 2025,
    years: 1,
    totalMillions: 5.25,
    aavMillions: 5.25,
    source: "https://www.mlb.com/cardinals/news/kyle-gibson-cardinals-contract"
  }
];

for (const contract of newContracts) {
  if (
    !contract.player ||
    !Number.isFinite(contract.priorTwoYearWar) ||
    !Number.isFinite(contract.ageAtSigning) ||
    contract.years <= 0 ||
    contract.totalMillions <= 0
  ) {
    throw new Error(`Invalid contract: ${contract.player}`);
  }

  const exists = data.contracts.some(
    (existing: HistoricalContract) =>
      existing.player === contract.player &&
      existing.contractStartYear === contract.contractStartYear
  );

  if (!exists) {
    data.contracts.push(contract);
  }
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");

console.log(`Historical contracts: ${data.contracts.length}`);
