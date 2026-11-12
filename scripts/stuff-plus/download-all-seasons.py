from datetime import date, timedelta
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
DOWNLOADER = ROOT / "scripts/stuff-plus/download-statcast.py"
RAW = ROOT / "data/stuff-plus/raw"

SEASONS = {
    2024: ("2024-03-20", "2024-09-30"),
    2025: ("2025-03-18", "2025-09-28"),
    2026: ("2026-03-25", "2026-09-27"),
}

for year, (start_text, end_text) in SEASONS.items():
    current = date.fromisoformat(start_text)
    end = date.fromisoformat(end_text)

    print(f"\n{'=' * 50}", flush=True)
    print(f"Downloading {year} Statcast data", flush=True)
    print(f"{'=' * 50}", flush=True)

    while current <= end:
        batch_end = min(current + timedelta(days=6), end)

        filename = (
            f"statcast_{current.isoformat()}_"
            f"{batch_end.isoformat()}.csv"
        )

        if (RAW / filename).exists():
            print(f"Skipping existing: {filename}", flush=True)
        else:
            command = [
                sys.executable,
                str(DOWNLOADER),
                "--start", current.isoformat(),
                "--end", batch_end.isoformat(),
            ]

            result = subprocess.run(command, cwd=ROOT)

            if result.returncode != 0:
                print(f"Download failed: {filename}", flush=True)
                sys.exit(result.returncode)

        current = batch_end + timedelta(days=1)

print("\nAll scheduled downloads completed!", flush=True)
