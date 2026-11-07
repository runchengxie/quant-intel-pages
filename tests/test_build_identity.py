"""Identity checks reject stale receipts, unsafe trees and unproven generators."""

from __future__ import annotations

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
    quality = write_quality(tmp_path / "quality.json", {"data/empty": EMPTY_SHA})
    record = {
        "schema_version": "market_intel_pages.build_identity.v1",
        "owner": "quant-intel-pages",
        "purpose": "public_site",
        "status": "completed",
        "exported_snapshot": {"data/empty": {"sha256": EMPTY_SHA, "size": 0}},
        "validation": {"sha256": hashlib.sha256(quality.read_bytes()).hexdigest()},
        "output": {"index.html": {"sha256": EMPTY_SHA, "size": 0}},
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
