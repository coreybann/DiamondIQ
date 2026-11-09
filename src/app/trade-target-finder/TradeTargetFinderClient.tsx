"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Player = {
  name: string;
  team: string;
  position: string;
  salary: number;
  war: number;
  age: number | null;
  contractYears: number | null;
  contractNote: string | null;
  teamControl: string;
  salary2027: number | null;
  salaryType: "listed" | "arbitration" | "pre-arbitration" | "proxy";
};

type ContractRecord = {
  player: string;
  team_code: string;
  contract_status: string;
  salary_by_year: Record<string, {
    salary_millions: number | null;
    status: string;
  }>;
};

type Projection = {
  player_name: string;
  projected_total_fwar: number;
  projected_age: number;
};

const WAR_PRICE = 9;

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseCSV(text: string) {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(","));
}

type Props = {
  positionRankings: ReturnType<
    typeof import("@/lib/teamNeeds").getTeamPositionRankings
  >;
  excludedFreeAgentNames: string[];
  salaryEstimates: Record<
    string,
    { salary: number; type: "arbitration" | "pre-arbitration" }
  >;
};

export default function TradeTargetFinderClient({
  positionRankings,
  excludedFreeAgentNames,
  salaryEstimates,
}: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [position, setPosition] = useState("All");
  const [sortBy, setSortBy] = useState("fit");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    const requestedTeam = searchParams.get("team");
    const requestedPosition = searchParams.get("position");

    if (requestedTeam && teams.includes(requestedTeam)) {
      setSelectedTeam(requestedTeam);
    }

    const validPositions = [
      "All", "P", "C", "1B", "2B", "3B", "SS", "OF", "DH",
    ];

    const normalizedPosition =
      requestedPosition === "SP" || requestedPosition === "RP"
        ? "P"
        : ["LF", "CF", "RF"].includes(requestedPosition ?? "")
          ? "OF"
          : requestedPosition;

    if (
      normalizedPosition &&
      validPositions.includes(normalizedPosition)
    ) {
      setPosition(normalizedPosition);
    }
  }, [searchParams, teams]);

  useEffect(() => {
    async function load() {
      try {
        const [salaryResponse, projectionResponse, contractResponse, overrideResponse] = await Promise.all([
          fetch("/data/mlb-salaries-2026.csv"),
          fetch("/data/trade-war-projections-2027.json"),
          fetch("/data/mlb-contracts-2026.json"),
          fetch("/data/verified-contract-overrides.json"),
        ]);

        if (!salaryResponse.ok || !projectionResponse.ok) {
          throw new Error("Unable to load player datasets.");
        }

        const rows = parseCSV(await salaryResponse.text());

        setTeams(
          [...new Set(
            rows.slice(1)
              .filter((row) => row.length >= 4 && row[1]?.trim())
              .map((row) => row[1].trim())
          )].sort()
        );
        const projections = (await projectionResponse.json()) as Projection[];

        const contracts: { records: ContractRecord[] } =
          contractResponse.ok
            ? await contractResponse.json()
            : { records: [] };

        type ContractOverride = {
          team: string;
          base_contract_end: number;
          first_opt_out_after?: number;
          team_option_end?: number;
          notes?: string;
        };

        const overrides: Record<string, ContractOverride> =
          overrideResponse.ok ? await overrideResponse.json() : {};

        const contractMap = new Map<string, ContractRecord>();

        for (const record of contracts.records) {
          contractMap.set(normalize(record.player) + ":" + record.team_code, record);
        }

        const teamCodes: Record<string, string> = {
          "Arizona Diamondbacks": "ARI",
          "Athletics": "OAK",
          "Atlanta Braves": "ATL",
          "Baltimore Orioles": "BAL",
          "Boston Red Sox": "BOS",
          "Chicago Cubs": "CHC",
          "Chicago White Sox": "CHW",
          "Cincinnati Reds": "CIN",
          "Cleveland Guardians": "CLE",
          "Colorado Rockies": "COL",
          "Detroit Tigers": "DET",
          "Houston Astros": "HOU",
          "Kansas City Royals": "KCR",
          "Los Angeles Angels": "LAA",
          "Los Angeles Dodgers": "LAD",
          "Miami Marlins": "MIA",
          "Milwaukee Brewers": "MIL",
          "Minnesota Twins": "MIN",
          "New York Mets": "NYM",
          "New York Yankees": "NYY",
          "Philadelphia Phillies": "PHI",
          "Pittsburgh Pirates": "PIT",
          "San Diego Padres": "SDP",
          "San Francisco Giants": "SFG",
          "Seattle Mariners": "SEA",
          "St. Louis Cardinals": "STL",
          "Tampa Bay Rays": "TBR",
          "Texas Rangers": "TEX",
          "Toronto Blue Jays": "TOR",
          "Washington Nationals": "WSN",
        };

        const projectionMap = new Map<string, Projection>();
        const duplicates = new Set<string>();

        for (const projection of projections) {
          const key = normalize(projection.player_name);
          if (projectionMap.has(key)) duplicates.add(key);
          else projectionMap.set(key, projection);
        }

        for (const key of duplicates) projectionMap.delete(key);

        const loaded = rows.slice(1).flatMap((row) => {
          if (row.length < 4) return [];

          const salary = Number(row[3].replace(/[$,]/g, ""));
          const projection = projectionMap.get(normalize(row[0]));

          if (
            !Number.isFinite(salary) ||
            !projection ||
            !Number.isFinite(Number(projection.projected_total_fwar))
          ) return [];

          const contract = contractMap.get(
            normalize(row[0]) + ":" + (teamCodes[row[1]] ?? "")
          );

          // Ignore separately stated option years.
          const baseTerms = (contract?.contract_status ?? "")
            .split(/\s*&\s*/)[0];

          // Support multiple guaranteed contract ranges.
          const ranges = [
            ...baseTerms.matchAll(/\((\d{2})-(\d{2})\)/g),
          ];

          const activeTerm = ranges
            .map((match) => ({
              start: 2000 + Number(match[1]),
              end: 2000 + Number(match[2]),
            }))
            .filter((term) => term.start <= 2027 && term.end >= 2027)
            .sort((a, b) => b.start - a.start)[0];

          const override = overrides[row[0]];
          const verifiedOverride =
            override?.team === (teamCodes[row[1]] ?? "");

          const endYear = verifiedOverride
            ? override.base_contract_end
            : activeTerm?.end ?? null;

          const contractNote = verifiedOverride
            ? [
                `Base contract through ${override.base_contract_end}`,
                override.first_opt_out_after
                  ? `First possible opt-out after ${override.first_opt_out_after}`
                  : null,
                override.team_option_end
                  ? `Team options through ${override.team_option_end}`
                  : null,
              ].filter(Boolean).join("; ")
            : null;
          const entry = contract?.salary_by_year?.["2027"];

          const salary2027 =
            entry?.status === "salary_listed" &&
            typeof entry.salary_millions === "number" &&
            Number.isFinite(entry.salary_millions) &&
            entry.salary_millions > 0
              ? entry.salary_millions
              : null;

          const estimatedSalary =
            salaryEstimates[row[0] + ":" + (teamCodes[row[1]] ?? "")];

          const resolvedSalary =
            salary2027 ??
            (estimatedSalary?.salary > 0 ? estimatedSalary.salary : null);

          const salaryType: Player["salaryType"] =
            salary2027 !== null
              ? "listed"
              : resolvedSalary !== null
                ? estimatedSalary.type
                : "proxy";

          const contractYears =
            endYear !== null &&
            endYear >= 2027 &&
            endYear <= 2040 &&
            salary2027 !== null
              ? endYear - 2027 + 1
              : null;

          const contractStatus = contract?.contract_status ?? "";
          const entryStatus = entry?.status ?? "";

          const hasOption =
            /(?:team|club|player|mutual) option/i.test(contractStatus);

          const teamControl =
            contractYears !== null
              ? `${contractYears} yrs · Contract${contractNote ? "*" : ""}`
              : hasOption
                ? "Option · TBD"
                : entryStatus === "arbitration" ||
                    salaryType === "arbitration"
                  ? "Arb · TBD"
                  : salaryType === "pre-arbitration"
                    ? "Pre-arb · TBD"
                    : "—";

          return [{
            name: row[0],
            team: row[1],
            position: row[2],
            salary,
            contractYears,
            contractNote,
            teamControl,
            salary2027: resolvedSalary,
            salaryType,
            war: Number(projection.projected_total_fwar),
            age: Number.isFinite(Number(projection.projected_age))
              ? Number(projection.projected_age)
              : null,
          }];
        });

        setPlayers(loaded);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load data.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);


  const teamCodes: Record<string, string> = {
    "Arizona Diamondbacks": "ARI",
    "Athletics": "ATH",
    "Atlanta Braves": "ATL",
    "Baltimore Orioles": "BAL",
    "Boston Red Sox": "BOS",
    "Chicago Cubs": "CHC",
    "Chicago White Sox": "CHW",
    "Cincinnati Reds": "CIN",
    "Cleveland Guardians": "CLE",
    "Colorado Rockies": "COL",
    "Detroit Tigers": "DET",
    "Houston Astros": "HOU",
    "Kansas City Royals": "KCR",
    "Los Angeles Angels": "LAA",
    "Los Angeles Dodgers": "LAD",
    "Miami Marlins": "MIA",
    "Milwaukee Brewers": "MIL",
    "Minnesota Twins": "MIN",
    "New York Mets": "NYM",
    "New York Yankees": "NYY",
    "Philadelphia Phillies": "PHI",
    "Pittsburgh Pirates": "PIT",
    "San Diego Padres": "SDP",
    "San Francisco Giants": "SFG",
    "Seattle Mariners": "SEA",
    "St. Louis Cardinals": "STL",
    "Tampa Bay Rays": "TBR",
    "Texas Rangers": "TEX",
    "Toronto Blue Jays": "TOR",
    "Washington Nationals": "WSN",
  };

  const teamCode = teamCodes[selectedTeam];

  const positionNeeds = useMemo(() => {
    const needs: Record<string, number> = {};

    for (const item of positionRankings) {
      const team = item.rankings.find((r) => r.team === teamCode);

      if (team) {
        needs[item.position] = Math.max(0, -team.vsLeagueAverage);
      }
    }

    needs.OF =
      (needs.LF ?? 0) +
      (needs.CF ?? 0) +
      (needs.RF ?? 0);

    needs.P = (needs.SP ?? 0) + (needs.RP ?? 0);

    return needs;
  }, [positionRankings, teamCode]);

  function acquisitionDifficulty(player: Player): {
    level: "High" | "Moderate" | "Lower";
    explanation: string;
  } {
    const estimatedSurplus =
      player.war * WAR_PRICE -
      (player.salary2027 ?? player.salary / 1_000_000);

    let score = 0;
    const reasons: string[] = [];

    if (player.war >= 5) {
      score += 4;
      reasons.push("elite projected production");
    } else if (player.war >= 3) {
      score += 2;
      reasons.push("strong projected production");
    } else if (player.war >= 2) {
      score += 1;
    }

    if (player.age !== null && player.age <= 27 && player.war >= 2) {
      score += 2;
      reasons.push("young, productive player");
    }

    if (estimatedSurplus >= 30) {
      score += 2;
      reasons.push("substantial estimated surplus value");
    } else if (estimatedSurplus >= 15) {
      score += 1;
    }

    if (player.contractYears !== null) {
      if (player.contractYears >= 7) {
        score += 4;
        reasons.push("seven or more contract years remaining");
      } else if (player.contractYears >= 4) {
        score += 2;
        reasons.push("four to six contract years remaining");
      } else if (player.contractYears >= 2) {
        score += 1;
        reasons.push("multiple contract years remaining");
      }
    }

    const level =
      score >= 6 ? "High" :
      score >= 2 ? "Moderate" : "Lower";

    const explanation = reasons.length
      ? reasons.join(", ")
      : "Limited projected production or estimated surplus";

    return {
      level,
      explanation:
        explanation +
        (player.contractYears === null
          ? "; contract control not verified, difficulty may be understated"
          : "") +
        (player.salaryType === "proxy"
          ? "; 2026 salary used as proxy"
          : player.salaryType !== "listed"
            ? "; 2027 salary is a projection"
            : ""),
    };
  }

  const targets = useMemo(() => {
    if (!selectedTeam) return [];

    const excludedNames = new Set(
      excludedFreeAgentNames.map(normalize)
    );

    return players
      .filter((p) => !excludedNames.has(normalize(p.name)))
      .filter((p) => p.team !== selectedTeam)
      .filter((p) => position === "All" || p.position === position)
      .map((p) => ({
        ...p,
        acquisition: acquisitionDifficulty(p),
        surplus: p.war * WAR_PRICE - (p.salary2027 ?? p.salary / 1_000_000),
        teamNeed: positionNeeds[p.position] ?? 0,
        fitScore:
          p.war * 2 +
          Math.max(0, positionNeeds[p.position] ?? 0) * 1.5 +
          Math.max(0, p.war * WAR_PRICE - (p.salary2027 ?? p.salary / 1_000_000)) * 0.1,
      }))
      .sort((a, b) =>
        sortBy === "fit"
          ? b.fitScore - a.fitScore
          : sortBy === "war"
          ? b.war - a.war
          : sortBy === "salary"
          ? a.salary - b.salary
          : b.surplus - a.surplus
      )
      .slice(0, 30);
  }, [players, selectedTeam, position, sortBy, positionNeeds, excludedFreeAgentNames]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 text-white">
      <h1 className="text-3xl font-bold">Trade Target Finder</h1>

      <p className="mt-3 max-w-3xl text-slate-400">
        Discover potential MLB trade targets using 2027 projected WAR,
        2026 salary, and estimated one-year surplus value.
      </p>

      <div className="mt-8 grid gap-4 rounded-xl border border-slate-700 bg-slate-900 p-6 md:grid-cols-3">
        <label className="text-sm text-slate-300">
          Your Team
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 p-3"
          >
            <option value="">Select a team</option>
            {teams.map((team) => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-300">
          Position
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 p-3"
          >
            {["All", "P", "C", "1B", "2B", "3B", "SS", "OF", "DH"].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-300">
          Rank By
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 p-3"
          >
            <option value="fit">Team Fit Score</option>
            <option value="surplus">Estimated Surplus Value</option>
            <option value="war">Projected WAR</option>
            <option value="salary">Lowest Salary</option>
          </select>
        </label>
      </div>

      {loading && <p className="mt-8 text-slate-400">Loading players...</p>}
      {error && <p className="mt-8 text-red-400">{error}</p>}

      {!loading && !error && !selectedTeam && (
        <p className="mt-8 text-slate-400">
          Select your team to discover potential targets from other organizations.
        </p>
      )}

      {selectedTeam && !loading && !error && (
        <section className="mt-8">
          <h2 className="text-xl font-bold">
            Potential Targets for {selectedTeam}
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Showing {targets.length} ranked players.
          </p>

          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full min-w-max text-left text-xs lg:text-sm">
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  {["Rank", "Player", "Team", "Position", "Age", "2027 WAR", "2026 Salary", "2027 Salary", "Team Control", "Est. Surplus", "Team Fit", "Acquisition Difficulty"].map((heading) => (
                    <th
                      key={heading}
                      className={`whitespace-nowrap px-3 py-3 ${
                        heading === "Player"
                          ? "sticky left-0 z-20 bg-slate-800"
                          : ""
                      }`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {targets.map((player, index) => (
                  <tr key={`${player.team}-${player.name}`} className="border-t border-slate-700">
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-[#081321] px-3 py-3 font-medium">
                      {player.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{player.team}</td>
                    <td className="px-4 py-3">{player.position}</td>
                    <td className="px-4 py-3">{player.age ?? "—"}</td>
                    <td className="px-4 py-3">{player.war.toFixed(2)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      ${(player.salary / 1_000_000).toFixed(2)}M
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {player.salary2027 === null
                        ? "—"
                        : `$${player.salary2027.toFixed(2)}M${
                            player.salaryType === "listed" ? "" : " (Est.)"
                          }`}
                    </td>
                    <td
                      className="whitespace-nowrap px-4 py-3"
                      title={player.contractNote ?? undefined}
                    >
                      {player.teamControl || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-blue-400">
                      ${player.surplus.toFixed(2)}M
                    </td>
                    <td className="px-4 py-3 font-semibold text-blue-400">
                      {player.fitScore.toFixed(1)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        title={player.acquisition.explanation}
                        className={`inline-flex cursor-help rounded-md px-2 py-1 text-xs font-semibold ${
                          player.acquisition.level === "High"
                            ? "bg-red-500/15 text-red-400"
                            : player.acquisition.level === "Moderate"
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-emerald-500/15 text-emerald-400"
                        }`}
                      >
                        {player.acquisition.level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Link
            href="/trade-analyzer"
            className="mt-6 inline-block text-blue-400 hover:underline"
          >
            Evaluate a hypothetical deal in Trade Analyzer →
          </Link>
        </section>
      )}

      <p className="mt-10 max-w-4xl text-xs leading-5 text-slate-500">
        Methodology: Estimated one-year surplus equals projected 2027 fWAR
        multiplied by $9 million per WAR, minus listed 2027 salary
        when available. Otherwise, 2026 salary is used as an unverified
        proxy. This is a simplified screening estimate, not a complete
        contract valuation. Player availability, trade cost, contract control,
        and roster eligibility are not verified. Salary data and WAR
        projections may cover different seasons. Acquisition Difficulty
        is a relative model estimate based on projected WAR, age,
        estimated surplus, and known contract years. Hover over a rating
        for its explanation. Missing contract data does not imply that
        a player is easy to acquire.
      </p>
    </main>
  );
}
