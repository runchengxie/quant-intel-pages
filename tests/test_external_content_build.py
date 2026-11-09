"""External input identity never falls back to committed report artifacts."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from test_build_identity_integration import formal as formal

from scripts import build_identity as identity
from scripts import build_site


@pytest.fixture
def external(formal, monkeypatch):
    provenance = identity.exporter_provenance

    def complete_provenance(command, revision):
        return {
            **provenance(command, revision),
            "vcs": "git",
            "executable_sha256": identity.file_record(Path(command))["sha256"],
            "module_origin": command,
            "module_sha256": "e" * 64,
            "verified_distribution_files": 2,
            "installed_distributions": [["market-intel", "1"]],
            "dependency_lock": None,
        }

    monkeypatch.setattr(identity, "exporter_provenance", complete_provenance)
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


@pytest.mark.parametrize("kind", ["schema", "order", "oversize", "bad_time"])
def test_external_rejects_malformed_receipt_contract(external, kind):
    receipt = external[4]
    value = json.loads(receipt.read_text())
    if kind == "schema":
        value["schema_version"] = "market_intel.site_content_receipt.v0"
    elif kind == "order":
        value["files"].append({**value["files"][0], "path": "data/aaa.json"})
    elif kind == "bad_time":
        value["created_at_utc"] = "not-a-dateZ"
    else:
        receipt.write_text(" " * 2_000_001)
    if kind != "oversize":
        receipt.write_text(json.dumps(value))
    with pytest.raises(ValueError, match="content"):
        build(external)


def test_receipt_mutation_while_reading_blocks_build(external, monkeypatch):
    from scripts import content_identity

    read = content_identity.read_receipt

    def changed(path):
        value = read(path)
        path.write_text("{}")
        return value

    monkeypatch.setattr(content_identity, "read_receipt", changed)
    with pytest.raises(ValueError, match="changed during validation"):
        build(external)


def test_added_file_outside_public_root_during_render_blocks_build(external, monkeypatch):
    render = build_site._render_astro

    def changed(*args, **kwargs):
        render(*args, **kwargs)
        (external[3] / "unexpected").write_text("extra")

    monkeypatch.setattr(build_site, "_render_astro", changed)
    with pytest.raises(ValueError, match="original content"):
        build(external)


@pytest.mark.parametrize("kind", ["snapshot_type", "dirty", "dotdot", "input_hash", "validator"])
def test_v2_requires_consistent_source_inputs_and_validator(external, kind):
    build(external)
    _, output, options, _, _ = external
    value = json.loads(options.identity.read_text())
    if kind == "snapshot_type":
        value["exported_snapshot"] = []
    elif kind == "dirty":
        value["source"]["dirty"] = True
    elif kind == "dotdot":
        value["source"]["root"] += "/../other"
    elif kind == "input_hash":
        value["original_inputs"]["public"]["data/reports.json"]["sha256"] = "d" * 64
    else:
        value["validation"]["status"] = "failed"
    options.identity.write_text(json.dumps(value))
    with pytest.raises(ValueError):
        identity.verify_identity(options.identity, output, options.quality)


def test_v1_rejects_unknown_identity_schema(tmp_path):
    path = tmp_path / "identity.json"
    path.write_text(json.dumps({"schema_version": "market_intel_pages.build_identity.v0"}))
    with pytest.raises(ValueError, match="invalid completed"):
        identity.verify_identity(path, tmp_path / "site", tmp_path / "quality")


def test_identity_paths_reject_same_receipt_target(formal):
    root, output, options = formal
    repeated = identity.IdentityOptions(
        options.identity, options.identity, options.task_id, options.exporter_revision
    )
    with pytest.raises(ValueError, match="paths must differ"):
        build_site.build_site(root, output, identity_options=repeated)


def test_formal_identity_rejects_noncommit_exporter_revision(formal):
    root, output, options = formal
    invalid = identity.IdentityOptions(options.identity, options.quality, options.task_id, "main")
    with pytest.raises(ValueError, match="invalid task or exporter"):
        build_site.build_site(root, output, identity_options=invalid)


@pytest.mark.parametrize(
    "section", ["generator", "generator.exporter", "generator.versions", "generator.locks", "validation"]
)
@pytest.mark.parametrize("change", ["missing", "unexpected", "wrong_type"])
def test_v2_nested_provenance_requires_exact_fields(external, section, change):
    build(external)
    _, output, options, _, _ = external
    value = json.loads(options.identity.read_text())
    parent = value
    keys = section.split(".")
    for key in keys[:-1]:
        parent = parent[key]
    target = parent[keys[-1]]
    if change == "missing":
        target.pop(next(iter(target)))
    elif change == "unexpected":
        target["unexpected"] = True
    else:
        parent[keys[-1]] = []
    options.identity.write_text(json.dumps(value))
    with pytest.raises(ValueError):
        identity.verify_identity(options.identity, output, options.quality)


@pytest.mark.parametrize(
    ("field", "replacement"),
    [
        ("generator", {"exporter": {"revision": "a" * 40}}),
        ("generator.builder_sha256", "not-a-hash"),
        ("generator.exporter.executable_sha256", "not-a-hash"),
        ("generator.exporter.module_sha256", "not-a-hash"),
        ("generator.exporter.revision", 1),
        ("generator.exporter.version", ""),
        ("generator.exporter.vcs", "directory"),
        ("generator.exporter.interpreter", False),
        ("generator.exporter.executable", "relative"),
        ("generator.exporter.module_origin", "relative"),
        ("generator.exporter.verified_distribution_files", True),
        ("generator.exporter.verified_distribution_files", 0),
        ("generator.exporter.installed_distributions", {}),
        ("generator.exporter.installed_distributions", []),
        ("generator.exporter.installed_distributions", [["market-intel"]]),
        ("generator.exporter.installed_distributions", [["market-intel", 1]]),
        ("generator.exporter.installed_distributions", [["market-intel", "wrong"]]),
        ("generator.exporter.dependency_lock", {"sha256": "bad", "size": 1}),
        ("generator.exporter.dependency_lock", {"sha256": "a" * 64, "size": True}),
        ("generator.locks.uv.lock", None),
        ("generator.versions.python", 3),
        ("generator.versions.node", ""),
        ("generator.command", "python scripts/build_site.py"),
        ("generator.command", []),
        ("generator.command", ["python", None]),
        ("generator.snapshot_command", []),
        ("generator.snapshot_command", ["python", "--root", "/tmp"]),
        ("validation.sha256", "bad"),
        ("validation.validator_revision", 1),
        ("validation.validator_sha256", "bad"),
    ],
)
def test_v2_rejects_malformed_nested_provenance(external, field, replacement):
    build(external)
    _, output, options, _, _ = external
    value = json.loads(options.identity.read_text())
    if field == "generator.locks.uv.lock":
        value["generator"]["locks"]["uv.lock"] = replacement
    else:
        parent = value
        keys = field.split(".")
        for key in keys[:-1]:
            parent = parent[key]
        parent[keys[-1]] = replacement
    options.identity.write_text(json.dumps(value))
    with pytest.raises(ValueError):
        identity.verify_identity(options.identity, output, options.quality)


@pytest.mark.parametrize(
    "kind",
    [
        "source_root",
        "input_root",
        "producer",
        "task",
        "isolation",
        "interpreter",
        "exporter",
        "frozen_root",
        "snapshot",
    ],
)
def test_v2_observed_commands_are_bound_to_recorded_provenance(external, kind):
    build(external)
    _, output, options, _, _ = external
    value = json.loads(options.identity.read_text())
    generator = value["generator"]
    command = generator["command"]
    if kind in {"source_root", "input_root", "producer", "task"}:
        flag = {
            "source_root": "--root",
            "input_root": "--public-inputs",
            "producer": "--exporter-revision",
            "task": "--task-id",
        }[kind]
        command[command.index(flag) + 1] = "wrong"
    else:
        index = {"isolation": 1, "interpreter": 0, "exporter": 2, "frozen_root": 4, "snapshot": 6}[kind]
        generator["snapshot_command"][index] = "wrong"
    options.identity.write_text(json.dumps(value))
    with pytest.raises(ValueError):
        identity.verify_identity(options.identity, output, options.quality)


@pytest.mark.parametrize("field", ["validator_sha256", "validator_revision"])
def test_v2_validator_metadata_matches_hash_bound_quality(external, field):
    build(external)
    _, output, options, _, _ = external
    value = json.loads(options.identity.read_text())
    quality = json.loads(options.quality.read_text())
    quality[field] = "0" * (64 if field.endswith("sha256") else 40)
    options.quality.write_text(json.dumps(quality))
    value["validation"]["sha256"] = identity.file_record(options.quality)["sha256"]
    options.identity.write_text(json.dumps(value))
    with pytest.raises(ValueError, match="validator"):
        identity.verify_identity(options.identity, output, options.quality)


def test_v2_rejects_well_formed_but_unbound_validator_hash(external):
    build(external)
    _, output, options, _, _ = external
    value = json.loads(options.identity.read_text())
    value["validation"]["validator_sha256"] = "0" * 64
    options.identity.write_text(json.dumps(value))
    with pytest.raises(ValueError, match="validator"):
        identity.verify_identity(options.identity, output, options.quality)


def test_v2_accepts_recorded_dependency_lock(external):
    build(external)
    _, output, options, _, _ = external
    value = json.loads(options.identity.read_text())
    value["generator"]["exporter"]["dependency_lock"] = value["generator"]["locks"]["uv.lock"]
    options.identity.write_text(json.dumps(value))
    identity.verify_identity(options.identity, output, options.quality)


@pytest.mark.parametrize(
    "field",
    [
        "command",
        "snapshot_command",
        "exporter.module_origin",
        "exporter.module_sha256",
        "exporter.executable_sha256",
        "exporter.installed_distributions",
    ],
)
def test_v2_cannot_omit_observed_command_or_installation_evidence(external, field):
    build(external)
    _, output, options, _, _ = external
    value = json.loads(options.identity.read_text())
    parent = value["generator"]
    keys = field.split(".")
    for key in keys[:-1]:
        parent = parent[key]
    del parent[keys[-1]]
    options.identity.write_text(json.dumps(value))
    with pytest.raises(ValueError):
        identity.verify_identity(options.identity, output, options.quality)


def test_v2_rejects_unknown_recorded_build_option(external):
    build(external)
    _, output, options, _, _ = external
    value = json.loads(options.identity.read_text())
    value["generator"]["command"][2] = "--unknown-root"
    options.identity.write_text(json.dumps(value))
    with pytest.raises(ValueError, match="build command"):
        identity.verify_identity(options.identity, output, options.quality)
