"""Tests for the Pages adapter around Platform's snapshot exporter."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

from scripts import build_site


def test_missing_platform_cli_preserves_previous_output(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    output = tmp_path / "site"
    output.mkdir()
    (output / "keep.txt").write_text("previous", encoding="utf-8")

    def missing_cli() -> str:
        raise RuntimeError("missing Platform CLI")

    monkeypatch.setattr(build_site, "_snapshot_command", missing_cli)

    with pytest.raises(RuntimeError, match="missing"):
        build_site.build_site(tmp_path / "repo", output)

    assert (output / "keep.txt").read_text(encoding="utf-8") == "previous"


def test_snapshot_failure_preserves_previous_output(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    output = tmp_path / "site"
    output.mkdir()
    (output / "keep.txt").write_text("previous", encoding="utf-8")
    monkeypatch.setattr(build_site, "_snapshot_command", lambda: "market-export-site-snapshot")

    def fail(*args: object, **kwargs: object) -> None:
        del args, kwargs
        raise subprocess.CalledProcessError(1, "market-export-site-snapshot")

    monkeypatch.setattr(build_site.subprocess, "run", fail)
    with pytest.raises(RuntimeError, match="export failed"):
        build_site.build_site(tmp_path / "repo", output)

    assert (output / "keep.txt").read_text(encoding="utf-8") == "previous"


def test_success_exports_snapshot_and_renders_frontend(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    root = tmp_path / "repo"
    (root / "src/legacy").mkdir(parents=True)
    (root / "src/legacy/index.html").write_text("legacy", encoding="utf-8")
    output = tmp_path / "published"
    output.mkdir()
    (output / "old.txt").write_text("old", encoding="utf-8")
    summaries = root / "override.json"
    summaries.write_text("{}", encoding="utf-8")
    monkeypatch.setattr(build_site, "_snapshot_command", lambda: "market-export-site-snapshot")
    commands: list[list[str]] = []

    def run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
        commands.append(command)
        if command[0] == "market-export-site-snapshot":
            destination = Path(command[command.index("--output") + 1])
            (destination / "data").mkdir(parents=True)
            (destination / "data/reports.json").write_text("{}", encoding="utf-8")
        else:
            site = Path(kwargs["env"]["ASTRO_OUT_DIR"])
            (site / "reports/demo").mkdir(parents=True)
            (site / "index.html").write_text("home", encoding="utf-8")
            (site / "reports/demo/index.html").write_text("report", encoding="utf-8")
            (site / "_astro").mkdir()
            (site / "_astro/site.js").write_text("asset", encoding="utf-8")
        return subprocess.CompletedProcess(command, 0, "", "")

    monkeypatch.setattr(build_site.subprocess, "run", run)
    build_site.build_site(root, output, summaries)

    assert "--summaries" in commands[0]
    assert commands[0][-1] == str(summaries)
    assert (output / "data/reports.json").is_file()
    assert (output / "index.html").read_text(encoding="utf-8") == "home"
    assert (output / "reports/demo/index.html").is_file()
    assert (output / "_astro/site.js").is_file()
    assert (output / "legacy/index.html").read_text(encoding="utf-8") == "legacy"


def test_build_rejects_output_inside_repository(tmp_path: Path) -> None:
    root = tmp_path / "repo"
    root.mkdir()
    with pytest.raises(ValueError, match="separate"):
        build_site.build_site(root, root / "dist")


def test_main_parses_arguments_and_prints_success(monkeypatch: pytest.MonkeyPatch, capsys) -> None:
    calls: list[tuple[Path, Path, Path | None]] = []
    monkeypatch.setattr(
        build_site, "build_site", lambda root, output, summaries: calls.append((root, output, summaries))
    )
    monkeypatch.setattr(sys, "argv", ["build_site.py", "--root", ".", "--output", "/tmp/site"])

    build_site.main()

    assert calls == [(Path("."), Path("/tmp/site"), None)]
    assert "Built public site at /tmp/site" in capsys.readouterr().out


def test_astro_failure_preserves_previous_output(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    root = tmp_path / "repo"
    (root / "src/legacy").mkdir(parents=True)
    output = tmp_path / "published"
    output.mkdir()
    (output / "keep.txt").write_text("previous", encoding="utf-8")
    monkeypatch.setattr(build_site, "_snapshot_command", lambda: "market-export-site-snapshot")
    calls = 0

    def run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
        nonlocal calls
        calls += 1
        if calls == 1:
            destination = Path(command[command.index("--output") + 1])
            (destination / "data").mkdir(parents=True)
            (destination / "data/reports.json").write_text("{}", encoding="utf-8")
            return subprocess.CompletedProcess(command, 0, "", "")
        raise subprocess.CalledProcessError(1, command)

    monkeypatch.setattr(build_site.subprocess, "run", run)
    with pytest.raises(RuntimeError, match="Astro static build failed"):
        build_site.build_site(root, output)

    assert (output / "keep.txt").read_text(encoding="utf-8") == "previous"


def test_workflow_uses_public_owner_cli_without_generation_secrets() -> None:
    workflow = Path(".github/workflows/public-site.yml").read_text(encoding="utf-8")
    assert "market-export-site-snapshot --help" in workflow
    assert "name: Public website" in workflow
    assert "  build:" in workflow
    assert "GEMINI_API_KEY" not in workflow
    assert "DEEPSEEK_API_KEY" not in workflow
    assert "MINIMAX_API_KEY" not in workflow
    assert "Generate latest daily" not in workflow


def test_pages_adapter_has_no_platform_source_imports() -> None:
    source = Path("scripts/build_site.py").read_text(encoding="utf-8")
    assert "market_intel_" not in source
    assert "sys.path" not in source
