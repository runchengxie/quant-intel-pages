"""Build the static Pages frontend from a validated Platform snapshot."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

if __package__:
    from . import build_identity as identity
else:
    import build_identity as identity


def _snapshot_command() -> str:
    command = os.environ.get("MARKET_EXPORT_SITE_SNAPSHOT") or shutil.which("market-export-site-snapshot")
    if not command:
        raise RuntimeError("market-export-site-snapshot is required; install quant-intel-platform first")
    return command if Path(command).is_absolute() else (shutil.which(command) or command)


def _copy_tree(source: Path, destination: Path) -> None:
    if source.is_dir():
        shutil.copytree(source, destination, dirs_exist_ok=True)


def _render_astro(root: Path, snapshot: Path, built: Path, quality: Path | None = None) -> None:
    env = {**os.environ, "ASTRO_DATA_ROOT": str(snapshot), "ASTRO_OUT_DIR": str(built)}
    if quality:
        env["REPORT_VALIDATION_RECEIPT"] = str(quality)
    try:
        subprocess.run(
            ["npm", "run", "build"],
            cwd=root,
            env=env,
            check=True,
            capture_output=True,
            text=True,
            timeout=180,
        )
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
        raise RuntimeError("Astro static build failed") from error
    if not (built / "index.html").is_file():
        raise RuntimeError("Astro build did not produce index.html")


def _export(root: Path, snapshot: Path, summaries: Path | None, command: str) -> None:
    args = [command, "--root", str(root), "--output", str(snapshot)]
    if summaries is not None:
        args.extend(["--summaries", str(summaries.resolve())])
    try:
        subprocess.run(args, cwd=root, check=True, capture_output=True, text=True, timeout=180)
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
        raise RuntimeError("Platform public snapshot export failed") from error


def _prepare(root: Path, output: Path, options: identity.IdentityOptions, command: str) -> dict[str, Any]:
    identity.validate_paths(root, output, options)
    return {
        "schema_version": "market_intel_pages.build_identity.v1",
        "owner": "quant-intel-pages",
        "purpose": "public_site",
        "status": "completed",
        "task_id": options.task_id,
        "operator": None,
        "started_at_utc": identity.utc_now(),
        "source": identity.source_identity(root),
        "generator": {
            "builder_sha256": identity.file_record(Path(__file__))["sha256"],
            "command": ["python", "scripts/build_site.py", "--identity", "<external-receipt>"],
            "exporter": identity.exporter_provenance(command, options.exporter_revision),
            "versions": identity.runtime_versions(),
            "locks": {name: identity.file_record(root / name) for name in ("package-lock.json", "uv.lock")},
        },
        "retention": {"policy": "docs/archive-lifecycle.md", "automatic_deletion": False},
    }


def _frozen_inputs(
    root: Path, summaries: Path | None, work: Path
) -> tuple[Path, Path | None, dict[str, Any]]:
    public = root / "artifacts/public"
    before = {
        "public": identity.hash_tree(public),
        "summaries_override": identity.file_record(summaries) if summaries else None,
    }
    frozen = work / "inputs"
    shutil.copytree(public, frozen / "artifacts/public")
    override = None
    if summaries:
        override = frozen / "summaries.json"
        shutil.copy2(summaries, override)
    if identity.hash_tree(frozen / "artifacts/public") != before["public"]:
        raise ValueError("inputs changed while freezing")
    if override and identity.file_record(override) != before["summaries_override"]:
        raise ValueError("summary input changed while freezing")
    return frozen, override, before


def _finish(
    root: Path,
    summaries: Path | None,
    record: dict[str, Any],
    snapshot: Path,
    before: dict[str, identity.FileRecord],
    output: Path,
    options: identity.IdentityOptions,
) -> Path:
    if identity.hash_tree(snapshot) != before:
        raise ValueError("snapshot inputs changed during rendering")
    originals = record["original_inputs"]
    if (
        identity.hash_tree(root / "artifacts/public") != originals["public"]
        or (identity.file_record(summaries) if summaries else None) != originals["summaries_override"]
    ):
        raise ValueError("original inputs changed during build")
    if identity.source_identity(root) != record["source"]:
        raise ValueError("source identity changed during build")
    quality = identity.validate_quality(options.quality, before)
    record.update(
        {
            "completed_at_utc": identity.utc_now(),
            "exported_snapshot": before,
            "validation": {
                "sha256": identity.file_record(options.quality)["sha256"],
                "status": quality["status"],
                "validator_revision": quality.get("validator_revision"),
                "validator_sha256": quality.get("validator_sha256"),
            },
            "output": identity.hash_tree(output),
        }
    )
    return identity.stage_identity(options.identity, record)


class BuildRecoveryError(RuntimeError):
    """Recovery material must survive when rollback itself fails."""


def _promote(
    staging: Path, output: Path, work: Path, pending: Path | None, options: identity.IdentityOptions | None
) -> None:
    previous = work / "previous"
    if output.exists():
        output.replace(previous)
    try:
        staging.replace(output)
        if pending and options:
            identity.publish_identity(pending, options.identity)
    except BaseException:
        try:
            if output.exists():
                output.replace(staging)
            if previous.exists():
                previous.replace(output)
        except OSError as error:
            raise BuildRecoveryError(
                f"build rollback incomplete; retained recovery directory: {work}"
            ) from error
        raise


def build_site(
    root: Path,
    output: Path,
    summaries_path: Path | None = None,
    *,
    identity_options: identity.IdentityOptions | None = None,
) -> None:
    """Preserve previous output on build failure; formal builds also require identity."""
    root, output = identity.plain_path(root).resolve(), identity.plain_path(output).resolve()
    if output == root or output.is_relative_to(root) or root.is_relative_to(output):
        raise ValueError("build output must be separate from the repository")
    if output == output.parent:
        raise ValueError("build output cannot be a filesystem root")
    output.parent.mkdir(parents=True, exist_ok=True)
    command = _snapshot_command()
    record = _prepare(root, output, identity_options, command) if identity_options else None
    work = Path(tempfile.mkdtemp(prefix="quant-intel-pages-", dir=output.parent))
    pending = None
    retain = False
    try:
        export_root, summaries = root, summaries_path
        if record is not None:
            export_root, summaries, record["original_inputs"] = _frozen_inputs(root, summaries_path, work)
        snapshot, staging, rendered = work / "snapshot", work / "site", work / "rendered"
        _export(export_root, snapshot, summaries, command)
        before = identity.hash_tree(snapshot)
        _render_astro(root, snapshot, rendered, identity_options.quality if identity_options else None)
        shutil.copytree(snapshot, staging)
        shutil.copytree(rendered, staging, dirs_exist_ok=True)
        _copy_tree(root / "src/legacy", staging / "legacy")
        if record is not None and identity_options:
            pending = _finish(root, summaries_path, record, snapshot, before, staging, identity_options)
        _promote(staging, output, work, pending, identity_options)
    except BuildRecoveryError:
        retain = True
        raise
    finally:
        if pending:
            pending.unlink(missing_ok=True)
        if not retain:
            shutil.rmtree(work)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="Pages repository root")
    parser.add_argument("--output", type=Path, required=True, help="static site output directory")
    parser.add_argument("--summaries", type=Path, help="optional summary index override")
    parser.add_argument("--identity", type=Path)
    parser.add_argument("--quality-receipt", type=Path)
    parser.add_argument("--task-id")
    parser.add_argument("--exporter-revision")
    args = parser.parse_args()
    formal = [args.identity, args.quality_receipt, args.task_id, args.exporter_revision]
    if any(formal) and not all(formal):
        parser.error("identity, quality-receipt, task-id and exporter-revision are required together")
    options = identity.IdentityOptions(*formal) if all(formal) else None
    build_site(args.root, args.output, args.summaries, identity_options=options)
    print(f"Built public site at {args.output}")


if __name__ == "__main__":
    main()
