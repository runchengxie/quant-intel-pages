"""Publication context belongs to Pages, never to a content bundle."""

import json

import pytest
from test_build_identity_integration import formal as formal
from test_external_content_build import external as external

from scripts import build_identity, build_site


@pytest.fixture(autouse=True)
def trusted_run(monkeypatch):
    monkeypatch.setenv("GITHUB_RUN_ID", "123")
    monkeypatch.setenv("GITHUB_RUN_ATTEMPT", "2")


def context_file(external):
    root, output, options, _, _ = external
    path = output.parent / "publication.json"
    path.write_text(
        json.dumps(
            {
                "candidate_id": "candidate-1",
                "content_sha256": "c" * 64,
                "producer_revision": options.exporter_revision,
                "renderer_revision": build_identity.source_identity(root)["revision"],
                "workflow_run_id": "123",
                "workflow_run_attempt": "2",
            }
        )
    )
    return path


def publish(external, context):
    root, output, options, inputs, receipt = external
    build_site.build_site(
        root,
        output,
        identity_options=options,
        public_inputs=inputs,
        content_receipt=receipt,
        publication_context=context,
    )


def test_marker_is_bound_after_quality_and_before_output_hash(external):
    context = context_file(external)
    publish(external, context)
    _, output, options, _, _ = external
    marker = json.loads((output / "data/site-publication.json").read_text())
    record = json.loads(options.identity.read_text())
    assert marker["publication_id"] == "candidate-1"
    assert marker["bundle_id"] == "b" * 64
    assert marker["workflow_run_id"] == "123"
    assert marker["workflow_run_attempt"] == "2"
    assert record["publication"]["marker"] == marker
    assert record["publication"]["context"] == build_identity.file_record(context)
    assert "data/site-publication.json" not in record["exported_snapshot"]
    assert "data/site-publication.json" in record["output"]
    build_identity.verify_identity(options.identity, output, options.quality)


@pytest.mark.parametrize(
    "key,value",
    [
        ("renderer_revision", "f" * 40),
        ("producer_revision", "f" * 40),
        ("content_sha256", "f" * 64),
        ("workflow_run_id", "../123"),
        ("workflow_run_attempt", 2),
        ("candidate_id", "bad\nvalue"),
        ("extra", "no"),
    ],
)
def test_reject_mismatched_or_malformed_context(external, key, value):
    context = context_file(external)
    data = json.loads(context.read_text())
    data[key] = value
    context.write_text(json.dumps(data))
    with pytest.raises(ValueError):
        publish(external, context)
    assert (external[1] / "old").read_text() == "previous"


def test_context_run_must_match_workflow_environment(external, monkeypatch):
    context = context_file(external)
    monkeypatch.setenv("GITHUB_RUN_ID", "999")
    with pytest.raises(ValueError, match="run"):
        publish(external, context)


def test_marker_cannot_be_supplied_by_bundle(external):
    from scripts import content_identity

    receipt = json.loads(external[4].read_text())
    receipt["files"][0]["path"] = "data/site-publication.json"
    with pytest.raises(ValueError, match="Pages"):
        content_identity.receipt_records(receipt, external[2].exporter_revision)


@pytest.mark.parametrize(
    "mode,expected", [("", "legacy"), ("legacy", "legacy"), ("artifact-v1", "artifact-v1")]
)
def test_mode_default_and_opt_in(mode, expected):
    from scripts import content_publication_marker

    assert content_publication_marker.publication_mode(mode) == expected


def test_unknown_mode_fails():
    from scripts import content_publication_marker

    with pytest.raises(ValueError, match="mode"):
        content_publication_marker.publication_mode("artifacts")


def test_parent_and_idempotency(external):
    from scripts import content_publication_marker as publication

    context = json.loads(context_file(external).read_text())
    marker = publication.marker(context, "b" * 64)
    assert publication.check_parent(None, "__bootstrap__", marker, first=True) == "publish"
    for first, parent in [(False, "__bootstrap__"), (True, "unknown")]:
        with pytest.raises(ValueError):
            publication.check_parent(None, parent, marker, first=first)
    assert publication.check_parent(marker, "old", marker, first=False) == "already-published"
    next_marker = {**marker, "publication_id": "candidate-2"}
    assert publication.check_parent(marker, "candidate-1", next_marker, first=False) == "publish"
    with pytest.raises(ValueError, match="parent"):
        publication.check_parent(marker, "wrong", next_marker, first=False)
    with pytest.raises(ValueError, match="candidate"):
        publication.check_parent(marker, "old", {**marker, "bundle_id": "f" * 64}, first=False)


def test_context_requires_external_identity(formal):
    root, output, options = formal
    with pytest.raises(ValueError, match="external"):
        build_site.build_site(
            root, output, identity_options=options, publication_context=output.parent / "context.json"
        )


@pytest.mark.parametrize("mutation", ["schema", "missing", "run", "output", "snapshot", "context", "path"])
def test_offline_verifier_rejects_invalid_publication_identity(external, mutation):
    context = context_file(external)
    publish(external, context)
    _, output, options, _, _ = external
    value = json.loads(options.identity.read_text())
    if mutation == "schema":
        value["publication"]["marker"]["schema_version"] = "wrong"
    elif mutation == "missing":
        value["publication"]["marker"].pop("workflow_run_id")
    elif mutation == "run":
        value["publication"]["marker"]["workflow_run_id"] = "999"
    elif mutation == "output":
        value["output"]["data/site-publication.json"]["size"] += 1
    elif mutation == "snapshot":
        value["exported_snapshot"]["data/site-publication.json"] = value["output"][
            "data/site-publication.json"
        ]
    elif mutation == "context":
        value["publication"]["context"]["size"] = True
    else:
        value["publication"]["context_path"] = "relative"
    options.identity.write_text(json.dumps(value))
    with pytest.raises(ValueError):
        build_identity.verify_identity(options.identity, output, options.quality)


def test_context_changes_during_render_cannot_promote(external, monkeypatch):
    context = context_file(external)
    original = build_site._render_astro

    def render(*args):
        original(*args)
        context.write_text("{}")

    monkeypatch.setattr(build_site, "_render_astro", render)
    with pytest.raises(ValueError, match="context changed"):
        publish(external, context)
    assert (external[1] / "old").exists()


def test_large_context_rejected(external):
    context = context_file(external)
    context.write_text(" " * 4097)
    with pytest.raises(ValueError, match="large"):
        publish(external, context)


def test_context_cannot_overlap_content_or_output(external):
    context = context_file(external)
    overlapping = external[1] / "context.json"
    overlapping.write_bytes(context.read_bytes())
    with pytest.raises(ValueError, match="separate"):
        publish(external, overlapping)


def test_context_hash_cannot_be_refreshed_after_validation(external, monkeypatch):
    context = context_file(external)
    original = build_identity.file_record
    calls = 0

    def observe(path):
        nonlocal calls
        if path == context:
            calls += 1
            if calls == 3:
                value = json.loads(context.read_text())
                value["workflow_run_id"] = "999"
                context.write_text(json.dumps(value))
        return original(path)

    monkeypatch.setattr(build_identity, "file_record", observe)
    with pytest.raises(ValueError, match="context changed"):
        publish(external, context)
    assert (external[1] / "old").exists()
