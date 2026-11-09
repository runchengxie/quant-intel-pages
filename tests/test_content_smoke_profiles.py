"""Production smoke discovery follows the renderer contract; CI supplies real owner admission."""

import json
import os
import subprocess
from pathlib import Path

import pytest

from tools.synthetic_content import generate


@pytest.mark.parametrize("omit", ["none", "weekly", "us", "asia", "all"])
def test_production_smoke_discovery_handles_family_presence(tmp_path, omit):
    root = Path.cwd()
    source = tmp_path / "source"
    generate(root, source, omit=omit)
    identity = tmp_path / "identity.json"
    identity.write_text("{}")  # Discovery only; formal bytes are tested by the shared CI profile.
    result = subprocess.run(
        [
            "node",
            "node_modules/@playwright/test/cli.js",
            "test",
            "--config",
            "playwright.content.config.ts",
            "--list",
        ],
        env={
            **os.environ,
            "CONTENT_SITE_ROOT": str(source / "artifacts/public"),
            "CONTENT_BUILD_IDENTITY": str(identity),
            "PLAYWRIGHT_OUTPUT_DIR": str(tmp_path / "browser"),
        },
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stderr + result.stdout
    assert "Total: 5 tests" in result.stdout


def test_present_empty_weekly_remains_rejected_by_production_smoke(tmp_path):
    source = tmp_path / "source"
    generate(Path.cwd(), source)
    public = source / "artifacts/public"
    (public / "data/weekly_recaps.json").write_text(
        json.dumps({"schema_version": "market_intel_pages.weekly_recaps.v1", "reports": []})
    )
    identity = tmp_path / "identity.json"
    identity.write_text("{}")
    result = subprocess.run(
        [
            "node",
            "node_modules/@playwright/test/cli.js",
            "test",
            "--config",
            "playwright.content.config.ts",
            "--list",
        ],
        env={
            **os.environ,
            "CONTENT_SITE_ROOT": str(public),
            "CONTENT_BUILD_IDENTITY": str(identity),
            "PLAYWRIGHT_OUTPUT_DIR": str(tmp_path / "browser"),
        },
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode != 0
    assert "Invalid public weekly" in result.stdout + result.stderr


def test_all_absent_still_fails_unchanged_pages_quality(tmp_path):
    source = tmp_path / "source"
    generate(Path.cwd(), source, omit="all")
    receipt = tmp_path / "quality.json"
    result = subprocess.run(
        [
            "npm",
            "run",
            "verify:reports",
            "--",
            "--snapshot",
            str(source / "artifacts/public"),
            "--receipt",
            str(receipt),
        ],
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode != 0
    assert "no_reports" in result.stdout + result.stderr
    assert not receipt.exists()
