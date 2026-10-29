
import json
import unicodedata
from pathlib import Path

BASE = Path("public/data")

ORIGINAL = BASE / "mlb-contract-comparables-2024.json"
EXPANDED = BASE / "mlb-contract-comparables-2024-expanded.json"
OUTPUT = BASE / "mlb-contract-comparables-2024-merged.json"


def normalize(name):
    name = unicodedata.normalize("NFKD", name)
    return "".join(
        char for char in name
        if not unicodedata.combining(char)
    ).lower().strip()


def main():
    original_data = json.loads(ORIGINAL.read_text())
    expanded_data = json.loads(EXPANDED.read_text())

    original = original_data["contracts"]
    expanded = expanded_data["contracts"]

    merged = {}
    for contract in expanded:
        merged[normalize(contract["player"])] = contract

    recovered = []

    # Preserve all original verified records.
    for contract in original:
        key = normalize(contract["player"])

        if key not in merged:
            merged[key] = contract
            recovered.append(contract["player"])
        else:
            # Original verified records take priority.
            merged[key] = contract

    contracts = sorted(
        merged.values(),
        key=lambda contract: contract["player"].lower()
    )

    result = {
        "description": (
            "Expanded 2024 MLB free-agent contracts. "
            "Original verified records are preserved; new records "
            "remain provisional until WAR and contract details are verified."
        ),
        "season": 2024,
        "currency": "USD",
        "valueUnit": "millions",
        "contracts": contracts,
    }

    OUTPUT.write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print("2024 CONTRACT MERGE COMPLETE")
    print("Original verified contracts:", len(original))
    print("New provisional contracts:", len(expanded))
    print("Recovered original records:", len(recovered))
    for name in recovered:
        print("  Recovered:", name)

    print("Merged unique contracts:", len(contracts))
    print("Output:", OUTPUT)
    print("\nOriginal datasets were not modified.")
    print("New records still require WAR verification.")


if __name__ == "__main__":
    main()
