"""Generate public CI fixtures outside source; no provider-source imports.

Minimal Asia shape follows Platform tests/_site_content_test_utils.py at
70d21f8683cdbe3b7841e2a7f4e10f57d1c2a8be. Owner pack/verify remain authoritative.
"""

import argparse
import hashlib
import json
import shutil
from pathlib import Path


def write(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False) + "\n")


def generate(root: Path, output: Path, *, omit: str = "none") -> None:
    if omit not in {"none", "asia", "us", "weekly", "all"}:
        raise ValueError("unknown synthetic family omission")
    public = output / "artifacts/public"
    public.mkdir(parents=True, exist_ok=False)
    (public / "reports").mkdir()
    asia, us, weeks = [], [], []
    fixture = root / "tests/fixtures"
    for day in ("2026-10-23", "2026-10-22", "2026-10-21", "2026-10-20", "2026-10-19"):
        row = {
            "id": f"{day}-evening",
            "date": day,
            "kind": "evening",
            "title": "Synthetic public report",
            "sections": [{"title": "Market", "paragraphs": ["Synthetic facts."]}],
            "source_url": f"reports/{day}-evening.md",
            "summary": "Synthetic public observations.",
        }
        (public / row["source_url"]).write_text("# Synthetic public report\n\n## Market\nSynthetic facts.\n")
        asia.append(row)
        daily = json.loads((fixture / "market-daily-complete.json").read_text())
        daily["facts"] = json.loads(
            json.dumps(daily["facts"][:2]).replace("2026-09-29", day).replace("202609", "202610")
        )
        daily.update(
            {
                "run_id": f"daily-{day}",
                "as_of": f"{day}T23:00:00Z",
                "generated_at": f"{day}T23:00:00Z",
                "missing_sources": [],
                "quality_summary": {},
                "source_status": {},
                "events": [],
                "claims": [],
                "sections": [
                    {
                        "key": "market",
                        "title": "Synthetic Treasury observations",
                        "facts": [fact["id"] for fact in daily["facts"]],
                        "claims": [],
                    }
                ],
            }
        )
        us.append(daily)
        for suffix in ("md", "txt"):
            (public / f"reports/{day}-market-daily.{suffix}").write_text(
                "Synthetic public Treasury observations.\n"
            )
    for day in ("2026-10-23", "2026-10-16", "2026-10-09", "2026-10-02", "2026-09-25"):
        weekly = json.loads((fixture / "weekly/weekly_recap.json").read_text().replace("2026-10-23", day))
        weekly.pop("content_hash")
        weekly["content_hash"] = hashlib.sha256(
            json.dumps(weekly, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()
        ).hexdigest()
        weeks.append(weekly)
        for suffix in ("md", "png"):
            shutil.copyfile(
                fixture / f"weekly/2026-10-23-weekly.{suffix}", public / f"reports/{day}-weekly.{suffix}"
            )
    for name, value in {
        "reports": {"schema_version": "market_intel_pages.reports.v1", "reports": asia},
        "daily_summaries": {"schema_version": "market_intel_pages.daily_summaries.v1", "summaries": []},
        "market_daily_report": us[0],
        "market_daily_reports": {"schema_version": "market_intel_pages.us_daily_history.v1", "reports": us},
        "weekly_recap": weeks[0],
        "weekly_recaps": {"schema_version": "market_intel_pages.weekly_recaps.v1", "reports": weeks},
    }.items():
        write(public / f"data/{name}.json", value)

    _omit_generated_families(public, omit)


def _omit_generated_families(public: Path, omit: str) -> None:
    """Only mutate the newly created synthetic fixture, never an admitted snapshot."""
    for family in ("asia", "us", "weekly"):
        if omit not in {family, "all"}:
            continue
        if family == "asia":
            write(
                public / "data/reports.json",
                {"schema_version": "market_intel_pages.reports.v1", "reports": []},
            )
            pattern, indexes = "*-evening.md", []
        elif family == "us":
            pattern, indexes = "*-market-daily.*", ["market_daily_report.json", "market_daily_reports.json"]
        else:
            pattern, indexes = "*-weekly.*", ["weekly_recap.json", "weekly_recaps.json"]
        for name in indexes:
            (public / "data" / name).unlink()
        for path in (public / "reports").glob(pattern):
            path.unlink()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--omit", choices=("none", "asia", "us", "weekly", "all"), default="none")
    args = parser.parse_args()
    generate(args.root, args.output, omit=args.omit)


if __name__ == "__main__":
    main()
