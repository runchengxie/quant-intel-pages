"""Identity checks reject stale receipts, unsafe trees and unproven generators."""

from __future__ import annotations

import base64
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from scripts import build_identity as identity

EMPTY_SHA = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
REVISION = "a" * 40


def write_quality(path: Path, hashes: dict[str, str], **overrides: object) -> Path:
    path.write_text(
        json.dumps(
            {
                "schema_version": "market_intel.report_quality.v1",
                "status": "passed",
                "input_sha256": hashes,
                "validator_revision": REVISION,
                "validator_sha256": EMPTY_SHA,
                **overrides,
            }
        )
    )
    return path


def test_hash_tree_records_relative_bytes(tmp_path: Path) -> None:
    (tmp_path / "empty").write_bytes(b"")
    assert identity.hash_tree(tmp_path) == {"empty": {"sha256": EMPTY_SHA, "size": 0}}


@pytest.mark.parametrize("kind", ["symlink", "fifo", "root_symlink"])
def test_hash_tree_rejects_symlink_and_special_file(tmp_path: Path, kind: str) -> None:
    tree = tmp_path / "tree"
    tree.mkdir()
    if kind == "fifo":
        os.mkfifo(tree / "entry")
    elif kind == "root_symlink":
        (tmp_path / "link").symlink_to(tree, target_is_directory=True)
        tree = tmp_path / "link"
    else:
        (tree / "entry").symlink_to(tmp_path / "missing")
    with pytest.raises(ValueError):
        identity.hash_tree(tree)


@pytest.mark.parametrize("change", ["status", "schema", "hash"])
def test_quality_requires_exact_snapshot_and_passed_schema(tmp_path: Path, change: str) -> None:
    receipt = write_quality(tmp_path / "quality.json", {"empty": EMPTY_SHA})
    valid = identity.validate_quality(receipt, {"empty": {"sha256": EMPTY_SHA, "size": 0}})
    assert valid["status"] == "passed"
    value = json.loads(receipt.read_text())
    value[{"status": "status", "schema": "schema_version", "hash": "input_sha256"}[change]] = "bad"
    receipt.write_text(json.dumps(value))
    with pytest.raises(ValueError, match="quality"):
        identity.validate_quality(receipt, {"empty": {"sha256": EMPTY_SHA, "size": 0}})


@pytest.mark.parametrize(
    "metadata",
    [
        {},
        {"url": "file:///project", "dir_info": {"editable": True}},
        {"vcs_info": {"vcs": "git", "commit_id": "b" * 40}},
    ],
)
def test_declared_revision_is_not_exporter_attestation(metadata: dict, tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="exporter"):
        identity.validate_exporter_metadata({"version": "1", "direct_url": metadata}, REVISION)


def test_exporter_accepts_observed_immutable_commit() -> None:
    data = {
        "version": "1",
        "direct_url": {
            "url": "https://github.com/runchengxie/quant-intel-platform",
            "vcs_info": {"vcs": "git", "commit_id": REVISION},
        },
    }
    assert identity.validate_exporter_metadata(data, REVISION)["revision"] == REVISION


def test_receipt_paths_cannot_overlap_public_output(tmp_path: Path) -> None:
    root = tmp_path / "repo"
    root.mkdir()
    output = tmp_path / "output"
    output.mkdir()
    options = identity.IdentityOptions(output / "identity.json", tmp_path / "quality.json", "task", REVISION)
    with pytest.raises(ValueError, match="receipt"):
        identity.validate_paths(root, output, options)


@pytest.mark.parametrize("change", ["changed", "extra", "missing", "quality"])
def test_identity_verifier_rejects_missing_extra_changed_output(tmp_path: Path, change: str) -> None:
    output = tmp_path / "site"
    output.mkdir()
    (output / "index.html").write_bytes(b"")
    (output / "data").mkdir()
    (output / "data/empty").write_bytes(b"")
    quality = write_quality(tmp_path / "quality.json", {"data/empty": EMPTY_SHA})
    record = {
        "schema_version": "market_intel_pages.build_identity.v1",
        "owner": "quant-intel-pages",
        "purpose": "public_site",
        "status": "completed",
        "exported_snapshot": {"data/empty": {"sha256": EMPTY_SHA, "size": 0}},
        "validation": {"sha256": hashlib.sha256(quality.read_bytes()).hexdigest()},
        "output": {
            "index.html": {"sha256": EMPTY_SHA, "size": 0},
            "data/empty": {"sha256": EMPTY_SHA, "size": 0},
        },
    }
    path = tmp_path / "identity.json"
    path.write_text(json.dumps(record))
    identity.verify_identity(path, output, quality)
    if change == "changed":
        (output / "index.html").write_text("bad")
    if change == "extra":
        (output / "extra").write_text("bad")
    if change == "missing":
        (output / "index.html").unlink()
    if change == "quality":
        quality.write_text("{}")
    with pytest.raises(ValueError):
        identity.verify_identity(path, output, quality)


def test_verifier_cli_rejects_invalid_receipt(tmp_path: Path) -> None:
    result = subprocess.run(
        [
            sys.executable,
            "scripts/build_identity.py",
            "verify",
            "--identity",
            str(tmp_path / "absent"),
            "--output",
            str(tmp_path / "site"),
            "--quality",
            str(tmp_path / "quality"),
        ],
        capture_output=True,
    )
    assert result.returncode != 0


def add_owned_module(purelib: Path, metadata: Path) -> None:
    package = purelib / "market_intel_publication"
    package.mkdir()
    with (metadata / "RECORD").open("a") as stream:
        for name in ("__init__.py", "export_site_snapshot.py"):
            path = package / name
            path.write_text("")
            stream.write(
                f"market_intel_publication/{name},sha256={base64.urlsafe_b64encode(hashlib.sha256(b'').digest()).decode().rstrip('=')},0\n"
            )


def test_exporter_probe_reads_its_own_installed_distribution(tmp_path: Path) -> None:
    subprocess.run([sys.executable, "-m", "venv", "--without-pip", str(tmp_path / "env")], check=True)
    python = tmp_path / "env/bin/python"
    purelib = Path(
        subprocess.check_output(
            [str(python), "-c", 'import sysconfig;print(sysconfig.get_path("purelib"))'], text=True
        ).strip()
    )
    metadata = purelib / "market_intel-1.0.dist-info"
    metadata.mkdir()
    (metadata / "METADATA").write_text("Metadata-Version: 2.1\nName: market-intel\nVersion: 1.0\n")
    (metadata / "direct_url.json").write_text(
        json.dumps(
            {"url": "https://example.invalid/project", "vcs_info": {"vcs": "git", "commit_id": REVISION}}
        )
    )
    command = tmp_path / "env/bin/market-export-site-snapshot"
    command.write_text(f'#!{python}\nprint("exporter")\n')
    encoded = base64.urlsafe_b64encode(hashlib.sha256(command.read_bytes()).digest()).decode().rstrip("=")
    (metadata / "RECORD").write_text(
        f"../../../bin/market-export-site-snapshot,sha256={encoded},{command.stat().st_size}\n"
    )
    add_owned_module(purelib, metadata)
    record = identity.exporter_provenance(str(command), REVISION)
    assert record["version"] == "1.0"
    assert record["revision"] == REVISION
    assert record["executable_sha256"] == hashlib.sha256(command.read_bytes()).hexdigest()
    (metadata / "direct_url.json").write_text("{}")
    with pytest.raises(ValueError, match="exporter"):
        identity.exporter_provenance(str(command), REVISION)
    command.write_text("#!/bin/sh\nexec python anything\n")
    with pytest.raises(ValueError, match="exporter"):
        identity.exporter_provenance(str(command), REVISION)


def test_source_ci_revision_mismatch_rejected(tmp_path: Path, monkeypatch) -> None:
    subprocess.run(["git", "init", "-q", str(tmp_path)], check=True)
    subprocess.run(
        [
            "git",
            "-C",
            str(tmp_path),
            "-c",
            "user.name=Fixture",
            "-c",
            "user.email=fixture@example.invalid",
            "commit",
            "--allow-empty",
            "-qm",
            "fixture",
        ],
        check=True,
    )
    monkeypatch.setenv("GITHUB_SHA", "b" * 40)
    with pytest.raises(ValueError, match="CI source"):
        identity.source_identity(tmp_path)


def test_existing_identity_is_not_overwritten(tmp_path: Path) -> None:
    target = tmp_path / "identity.json"
    target.write_text("existing")
    pending = identity.stage_identity(target, {"status": "completed"})
    try:
        with pytest.raises(FileExistsError):
            identity.publish_identity(pending, target)
        assert target.read_text() == "existing"
    finally:
        pending.unlink()


def test_exporter_probe_rejects_replaced_launcher_with_valid_distribution(tmp_path: Path) -> None:
    subprocess.run([sys.executable, "-m", "venv", "--without-pip", str(tmp_path / "env")], check=True)
    python = tmp_path / "env/bin/python"
    purelib = Path(
        subprocess.check_output(
            [str(python), "-c", 'import sysconfig;print(sysconfig.get_path("purelib"))'], text=True
        ).strip()
    )
    metadata = purelib / "market_intel-1.0.dist-info"
    metadata.mkdir()
    (metadata / "METADATA").write_text("Metadata-Version: 2.1\nName: market-intel\nVersion: 1.0\n")
    (metadata / "direct_url.json").write_text(json.dumps({"vcs_info": {"vcs": "git", "commit_id": REVISION}}))
    (metadata / "RECORD").write_text("../../../bin/market-export-site-snapshot,sha256=INVALID,1\n")
    command = tmp_path / "env/bin/market-export-site-snapshot"
    command.write_text(f'#!{python}\nprint("replaced")\n')
    add_owned_module(purelib, metadata)
    with pytest.raises(ValueError, match="launcher"):
        identity.exporter_provenance(str(command), REVISION)


def test_receipt_dotdot_cannot_escape_overlap_detection(tmp_path: Path) -> None:
    root = tmp_path / "repo"
    root.mkdir()
    other = tmp_path / "other"
    other.mkdir()
    options = identity.IdentityOptions(
        other / ".." / "repo" / "identity.json", tmp_path / "quality.json", "task", REVISION
    )
    with pytest.raises(ValueError, match="receipt"):
        identity.validate_paths(root, tmp_path / "site", options)


def test_verifier_links_snapshot_to_served_output(tmp_path: Path) -> None:
    output = tmp_path / "site"
    (output / "data").mkdir(parents=True)
    (output / "data/file").write_text("UNVALIDATED")
    quality = write_quality(tmp_path / "quality.json", {"data/file": EMPTY_SHA})
    record = {
        "schema_version": "market_intel_pages.build_identity.v1",
        "owner": "quant-intel-pages",
        "purpose": "public_site",
        "status": "completed",
        "exported_snapshot": {"data/file": {"sha256": EMPTY_SHA, "size": 0}},
        "validation": {"sha256": hashlib.sha256(quality.read_bytes()).hexdigest()},
        "output": {"data/file": {"sha256": hashlib.sha256(b"UNVALIDATED").hexdigest(), "size": 11}},
    }
    receipt = tmp_path / "identity.json"
    receipt.write_text(json.dumps(record))
    with pytest.raises(ValueError, match="snapshot"):
        identity.verify_identity(receipt, output, quality)


def test_exporter_rejects_installed_module_modified_after_install(tmp_path: Path) -> None:
    subprocess.run([sys.executable, "-m", "venv", "--without-pip", str(tmp_path / "env")], check=True)
    python = tmp_path / "env/bin/python"
    purelib = Path(
        subprocess.check_output(
            [str(python), "-c", 'import sysconfig;print(sysconfig.get_path("purelib"))'], text=True
        ).strip()
    )
    metadata = purelib / "market_intel-1.0.dist-info"
    metadata.mkdir()
    (metadata / "METADATA").write_text("Metadata-Version: 2.1\nName: market-intel\nVersion: 1.0\n")
    (metadata / "direct_url.json").write_text(json.dumps({"vcs_info": {"vcs": "git", "commit_id": REVISION}}))
    package = purelib / "market_intel_publication"
    package.mkdir()
    (package / "__init__.py").write_text("")
    module = package / "export_site_snapshot.py"
    module.write_text('print("original")\n')
    command = tmp_path / "env/bin/market-export-site-snapshot"
    command.write_text(f"#!{python}\nfrom market_intel_publication.export_site_snapshot import main\n")
    rows = []
    for name, path in (
        ("../../../bin/market-export-site-snapshot", command),
        ("market_intel_publication/__init__.py", package / "__init__.py"),
        ("market_intel_publication/export_site_snapshot.py", module),
    ):
        encoded = base64.urlsafe_b64encode(hashlib.sha256(path.read_bytes()).digest()).decode().rstrip("=")
        rows.append(f"{name},sha256={encoded},{path.stat().st_size}")
    (metadata / "RECORD").write_text("\n".join(rows) + "\n")
    assert (
        identity.exporter_provenance(str(command), REVISION)["module_sha256"]
        == hashlib.sha256(module.read_bytes()).hexdigest()
    )
    module.write_text('print("changed")\n')
    with pytest.raises(ValueError, match="exporter"):
        identity.exporter_provenance(str(command), REVISION)
