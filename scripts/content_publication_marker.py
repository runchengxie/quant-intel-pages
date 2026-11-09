"""Pages-owned publication identity; context must come from the trusted caller."""

from __future__ import annotations

import hashlib
import json
import os
import re
from pathlib import Path
from typing import Any

if __package__:
    from . import build_identity as identity
    from . import content_identity as content
else:
    import build_identity as identity
    import content_identity as content

MARKER_PATH = "data/site-publication.json"
CONTEXT_KEYS = {
    "candidate_id",
    "content_sha256",
    "producer_revision",
    "renderer_revision",
    "workflow_run_id",
    "workflow_run_attempt",
}
MARKER_KEYS = {
    "schema_version",
    "publication_id",
    "bundle_id",
    "archive_sha256",
    "producer_revision",
    "renderer_revision",
    "workflow_run_id",
    "workflow_run_attempt",
}


def publication_mode(value: str) -> str:
    if value not in {"", "legacy", "artifact-v1"}:
        raise ValueError("unknown content publication mode")
    return value or "legacy"


def validate_context(value: Any) -> None:
    content.exact_keys(value, CONTEXT_KEYS)
    if not isinstance(value["candidate_id"], str) or not re.fullmatch(
        r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", value["candidate_id"]
    ):
        raise ValueError("invalid publication candidate")
    content.digest(value["content_sha256"])
    for key in ("producer_revision", "renderer_revision"):
        content.digest(value[key], 40)
    for key in ("workflow_run_id", "workflow_run_attempt"):
        if not isinstance(value[key], str) or not re.fullmatch(r"[1-9][0-9]{0,19}", value[key]):
            raise ValueError("invalid publication run")


def marker(context: dict[str, Any], bundle_id: str) -> dict[str, Any]:
    validate_context(context)
    content.digest(bundle_id)
    return {
        "schema_version": "market_intel_pages.site_publication.v1",
        "publication_id": context["candidate_id"],
        "bundle_id": bundle_id,
        "archive_sha256": context["content_sha256"],
        **{
            key: context[key]
            for key in ("producer_revision", "renderer_revision", "workflow_run_id", "workflow_run_attempt")
        },
    }


def validate_marker(value: Any) -> None:
    content.exact_keys(value, MARKER_KEYS)
    if value["schema_version"] != "market_intel_pages.site_publication.v1":
        raise ValueError("invalid publication marker schema")
    context = {
        "candidate_id": value["publication_id"],
        "content_sha256": value["archive_sha256"],
        **{key: value[key] for key in CONTEXT_KEYS - {"candidate_id", "content_sha256"}},
    }
    marker(context, value["bundle_id"])


def encoded(value: dict[str, Any]) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n").encode()


def prepare(record: dict[str, Any] | None, path: Path | None) -> None:
    if path is None:
        return
    if record is None or "content" not in record:
        raise ValueError("publication context requires external content identity")
    path = identity.plain_path(path).resolve()
    arguments = dict(
        zip(record["generator"]["command"][2::2], record["generator"]["command"][3::2], strict=True)
    )
    content.separate_paths(
        [path]
        + [
            Path(arguments[flag])
            for flag in (
                "--root",
                "--output",
                "--identity",
                "--quality-receipt",
                "--public-inputs",
                "--content-receipt",
            )
        ]
    )
    before = identity.file_record(path)
    if before["size"] > 4096:
        raise ValueError("publication context too large")
    value = json.loads(path.read_bytes(), object_pairs_hook=content.unique_object)
    validate_context(value)
    for key, env in (("workflow_run_id", "GITHUB_RUN_ID"), ("workflow_run_attempt", "GITHUB_RUN_ATTEMPT")):
        if env in os.environ and value[key] != os.environ[env]:
            raise ValueError("publication run differs from trusted workflow")
    if identity.file_record(path) != before:
        raise ValueError("publication context changed during validation")
    result = marker(value, record["content"]["bundle_id"])
    bind(result, record)
    record["publication"] = {
        "context_path": str(path),
        "context": before,
        "marker": result,
    }
    record["generator"]["command"].extend(["--publication-context", str(path)])


def bind(value: dict[str, Any], record: dict[str, Any]) -> None:
    validate_marker(value)
    expected = {
        "bundle_id": record["content"]["bundle_id"],
        "archive_sha256": record["content"]["archive_sha256"],
        "producer_revision": record["content"]["producer_revision"],
        "renderer_revision": record["source"]["revision"],
    }
    if any(value[key] != item for key, item in expected.items()):
        raise ValueError("publication marker differs from build identity")


def stage(record: dict[str, Any], output: Path) -> None:
    if "publication" not in record:
        return
    publication = record["publication"]
    if identity.file_record(Path(publication["context_path"])) != publication["context"]:
        raise ValueError("publication context changed during build")
    destination = output / MARKER_PATH
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("xb") as stream:
        stream.write(encoded(publication["marker"]))


def verify(record: dict[str, Any]) -> None:
    publication = record["publication"]
    content.exact_keys(publication, {"context_path", "context", "marker"})
    content.absolute_path(publication["context_path"])
    content.file_records({"context": publication["context"]})
    bind(publication["marker"], record)
    data = encoded(publication["marker"])
    if record["output"].get(MARKER_PATH) != {"size": len(data), "sha256": hashlib.sha256(data).hexdigest()}:
        raise ValueError("publication marker output differs from identity")
    if MARKER_PATH in record["exported_snapshot"]:
        raise ValueError("publication marker must be Pages-owned")


def check_parent(current: Any, expected: str, proposed: dict[str, Any], *, first: bool) -> str:
    validate_marker(proposed)
    if current is None:
        if expected != "__bootstrap__" or not first:
            raise ValueError("publication bootstrap requires validated first deployment")
        return "publish"
    validate_marker(current)
    if current["publication_id"] == proposed["publication_id"]:
        fields = MARKER_KEYS - {"workflow_run_id", "workflow_run_attempt"}
        if any(current[key] != proposed[key] for key in fields):
            raise ValueError("publication candidate already exists with different identity")
        return "already-published"
    if expected != current["publication_id"]:
        raise ValueError("publication parent mismatch")
    return "publish"
