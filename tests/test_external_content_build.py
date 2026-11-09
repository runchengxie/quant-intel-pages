"""External input identity never falls back to committed report artifacts."""

from __future__ import annotations

import json

import pytest
from test_build_identity_integration import formal as formal

from scripts import build_identity as identity
from scripts import build_site


@pytest.fixture
def external(formal):
    root, output, options = formal
    inputs = output.parent / "verified"
    public = inputs / "artifacts/public/data"
    public.mkdir(parents=True)
    (public / "reports.json").write_text('{"external":true}')
    receipt = output.parent / "content.json"
    records = identity.hash_tree(inputs / "artifacts/public")
    receipt.write_text(
        json.dumps(
            {
                "schema_version": "market_intel.site_content_receipt.v1",
                "bundle_id": "b" * 64,
                "archive_sha256": "c" * 64,
                "producer_revision": options.exporter_revision,
                "created_at_utc": "2026-11-01T00:00:00Z",
                "files": [
                    {"path": path, "sha256": value["sha256"], "bytes": value["size"]}
                    for path, value in records.items()
                ],
            }
        )
    )
    return root, output, options, inputs, receipt


def build(external):
    root, output, options, inputs, receipt = external
    build_site.build_site(
        root, output, identity_options=options, public_inputs=inputs, content_receipt=receipt
    )


def test_external_input_selection_and_separate_identity(external):
    root, output, options, inputs, receipt = external
    original = identity.hash_tree(root / "artifacts/public")
    build(external)
    assert (output / "data/reports.json").read_text() == '{"external":true}'
    assert identity.hash_tree(root / "artifacts/public") == original
    value = json.loads(options.identity.read_text())
    assert value["schema_version"] == "market_intel_pages.build_identity.v2"
    assert value["source"]["root"] == str(root)
    assert value["original_inputs"]["root"] == str(inputs)
    assert value["content"]["receipt"] == identity.file_record(receipt)
    assert value["content"]["bundle_id"] == "b" * 64
    assert value["content"]["producer_revision"] == options.exporter_revision
    assert value["source"]["revision"] != value["content"]["bundle_id"]
    assert value["generator"]["command"][-4:] == [
        "--public-inputs",
        str(inputs),
        "--content-receipt",
        str(receipt),
    ]
    assert value["generator"]["exporter"]["revision"] == options.exporter_revision
    assert value["generator"]["snapshot_command"][:4] == [
        value["generator"]["exporter"]["interpreter"],
        "-I",
        value["generator"]["exporter"]["executable"],
        "--root",
    ]
    identity.verify_identity(options.identity, output, options.quality)


@pytest.mark.parametrize("missing", ["inputs", "receipt", "identity"])
def test_external_requires_paired_inputs_and_formal_identity(external, missing):
    root, output, options, inputs, receipt = external
    with pytest.raises(ValueError, match="external"):
        build_site.build_site(
            root,
            output,
            identity_options=None if missing == "identity" else options,
            public_inputs=None if missing == "inputs" else inputs,
            content_receipt=None if missing == "receipt" else receipt,
        )
    assert (output / "old").read_text() == "previous"


def test_external_rejects_summaries_override(external):
    root, output, options, inputs, receipt = external
    with pytest.raises(ValueError, match="summaries"):
        build_site.build_site(
            root, output, receipt, identity_options=options, public_inputs=inputs, content_receipt=receipt
        )


@pytest.mark.parametrize(
    "change",
    [
        "producer_revision",
        "archive_sha256",
        "bundle_id",
        "files",
        "extra",
        "duplicate",
        "size",
        "path",
        "time",
    ],
)
def test_external_receipt_is_strict(external, change):
    _, output, _, _, receipt = external
    value = json.loads(receipt.read_text())
    if change == "duplicate":
        value["files"] *= 2
    elif change == "size":
        value["files"][0]["bytes"] = True
    elif change == "path":
        value["files"][0]["path"] = "../data/reports.json"
    elif change == "time":
        value["created_at_utc"] = "2026-11-01"
    else:
        value[change] = "wrong"
    receipt.write_text(json.dumps(value))
    with pytest.raises(ValueError, match="content"):
        build(external)
    assert (output / "old").read_text() == "previous"


@pytest.mark.parametrize("change", ["missing", "changed", "extra", "root_extra", "symlink", "root_symlink"])
def test_external_tree_matches_receipt_without_source_fallback(external, change):
    _, output, _, inputs, _ = external
    entry = inputs / "artifacts/public/data/reports.json"
    if change == "missing":
        entry.unlink()
    elif change == "changed":
        entry.write_text("wrong")
    elif change in {"extra", "root_extra"}:
        (inputs / ("extra" if change == "root_extra" else "artifacts/public/extra")).write_text("extra")
    elif change == "symlink":
        entry.unlink()
        entry.symlink_to(output / "old")
    else:
        alias = inputs.parent / "linked"
        alias.symlink_to(inputs, target_is_directory=True)
        external = (*external[:3], alias, external[4])
    with pytest.raises(ValueError):
        build(external)
    assert (output / "old").read_text() == "previous"


@pytest.mark.parametrize("location", ["source", "output", "identity", "quality", "receipt", "ancestor"])
def test_external_paths_cannot_overlap(external, location):
    root, output, options, inputs, receipt = external
    choices = {
        "source": root,
        "output": output,
        "identity": options.identity,
        "quality": options.quality,
        "receipt": receipt,
        "ancestor": root.parent,
    }
    with pytest.raises(ValueError, match="separate"):
        build_site.build_site(
            root, output, identity_options=options, public_inputs=choices[location], content_receipt=receipt
        )
    assert (output / "old").read_text() == "previous"


@pytest.mark.parametrize("kind", ["input", "receipt", "source", "snapshot", "overwrite"])
def test_external_mutation_blocks_promotion(external, monkeypatch, kind):
    root, output, options, inputs, receipt = external
    render = build_site._render_astro

    def mutate(*args, **kwargs):
        render(*args, **kwargs)
        targets = {
            "input": inputs / "artifacts/public/data/reports.json",
            "receipt": receipt,
            "source": root / "src/legacy/app.js",
            "snapshot": args[1] / "data/reports.json",
        }
        if kind == "overwrite":
            (args[2] / "data").mkdir()
            (args[2] / "data/reports.json").write_text("changed")
        else:
            targets[kind].write_text("changed")

    monkeypatch.setattr(build_site, "_render_astro", mutate)
    with pytest.raises(ValueError):
        build(external)
    assert (output / "old").read_text() == "previous"
    assert not options.identity.exists()


def test_external_dirty_source_rejected(external):
    root = external[0]
    (root / "src/legacy/app.js").write_text("changed")
    with pytest.raises(ValueError, match="clean"):
        build(external)


def test_external_identity_promotion_failure_restores_output(external, monkeypatch):
    def fail(*_args):
        raise OSError("injected identity failure")

    monkeypatch.setattr(identity, "publish_identity", fail)
    with pytest.raises(OSError, match="injected"):
        build(external)
    assert (external[1] / "old").read_text() == "previous"


@pytest.mark.parametrize(
    "change",
    [
        "extra",
        "content_extra",
        "digest",
        "producer",
        "source_root",
        "input_root",
        "snapshot_hash",
        "input_size",
        "receipt_hash",
    ],
)
def test_v2_verifier_rejects_invalid_fields_and_hashes(external, change):
    build(external)
    _, output, options, _, _ = external
    value = json.loads(options.identity.read_text())
    if change == "extra":
        value["unexpected"] = True
    elif change == "content_extra":
        value["content"]["unexpected"] = True
    elif change == "digest":
        value["content"]["bundle_id"] = "not-a-hash"
    elif change == "producer":
        value["content"]["producer_revision"] = "d" * 40
    elif change == "source_root":
        value["source"]["root"] = "relative"
    elif change == "input_root":
        value["original_inputs"]["root"] = value["source"]["root"]
    elif change == "snapshot_hash":
        value["exported_snapshot"]["data/reports.json"]["sha256"] = "wrong"
    elif change == "input_size":
        value["original_inputs"]["public"]["data/reports.json"]["size"] = True
    else:
        value["content"]["receipt"]["sha256"] = "wrong"
    options.identity.write_text(json.dumps(value))
    with pytest.raises(ValueError):
        identity.verify_identity(options.identity, output, options.quality)


def test_external_receipt_symlink_rejected(external):
    alias = external[4].parent / "receipt-link"
    alias.symlink_to(external[4])
    with pytest.raises(ValueError, match="symbolic"):
        build((*external[:4], alias))


def test_external_receipt_duplicate_json_rejected(external):
    receipt = external[4]
    receipt.write_text(
        receipt.read_text().replace('{"schema_version":', '{"bundle_id":"duplicate","schema_version":', 1)
    )
    with pytest.raises(ValueError, match="duplicate"):
        build(external)


def test_legacy_v1_golden_remains_byte_identical_and_verifiable(tmp_path):
    import hashlib
    from pathlib import Path

    golden = Path("tests/fixtures/build-identity-v1.json")
    original = golden.read_bytes()
    output = tmp_path / "site"
    (output / "data").mkdir(parents=True)
    (output / "index.html").write_bytes(b"")
    (output / "data/empty").write_bytes(b"")
    quality = tmp_path / "quality.json"
    quality.write_bytes(
        b'{"schema_version":"market_intel.report_quality.v1","status":"passed","input_sha256":{"data/empty":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}}\n'
    )
    assert json.loads(original)["validation"]["sha256"] == hashlib.sha256(quality.read_bytes()).hexdigest()
    identity.verify_identity(golden, output, quality)
    assert golden.read_bytes() == original


def test_legacy_emitted_identity_shape_does_not_acquire_content_fields(formal):
    root, output, options = formal
    build_site.build_site(root, output, identity_options=options)
    value = json.loads(options.identity.read_text())
    assert value["schema_version"] == "market_intel_pages.build_identity.v1"
    assert set(value) == {
        "schema_version",
        "owner",
        "purpose",
        "status",
        "task_id",
        "operator",
        "started_at_utc",
        "completed_at_utc",
        "source",
        "generator",
        "retention",
        "original_inputs",
        "exported_snapshot",
        "validation",
        "output",
    }
    assert set(value["source"]) == {"revision", "dirty", "declared_ci_revision"}
    assert set(value["original_inputs"]) == {"public", "summaries_override"}
    assert set(value["generator"]) == {"builder_sha256", "command", "exporter", "versions", "locks"}


def test_v2_duplicate_identity_fields_rejected(external):
    build(external)
    _, output, options, _, _ = external
    raw = options.identity.read_text()
    options.identity.write_text(raw.replace("{", '{"status":"untrusted",', 1))
    with pytest.raises(ValueError, match="duplicate"):
        identity.verify_identity(options.identity, output, options.quality)
