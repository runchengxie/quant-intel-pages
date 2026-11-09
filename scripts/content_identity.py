"""Strict external content receipt and additive v2 build identity checks."""

from __future__ import annotations

import json
import re
from datetime import datetime
from itertools import combinations
from pathlib import Path
from typing import Any

if __package__:
    from . import build_identity as identity
else:
    import build_identity as identity

RECEIPT_KEYS = {
    "schema_version",
    "bundle_id",
    "archive_sha256",
    "producer_revision",
    "created_at_utc",
    "files",
}
IDENTITY_KEYS = {
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
    "content",
}


def exact_keys(value: Any, keys: set[str]) -> None:
    if not isinstance(value, dict) or set(value) != keys:
        raise ValueError("invalid content identity fields")


def digest(value: Any, length: int = 64) -> None:
    if not isinstance(value, str) or not re.fullmatch(f"[a-f0-9]{{{length}}}", value):
        raise ValueError("invalid content digest")


def file_records(value: Any) -> None:
    if not isinstance(value, dict):
        raise ValueError("invalid content file records")
    for path, record in value.items():
        safe_relative(path)
        exact_keys(record, {"sha256", "size"})
        digest(record["sha256"])
        if type(record["size"]) is not int or record["size"] < 0:
            raise ValueError("invalid content file size")


def safe_relative(value: Any) -> None:
    if (
        not isinstance(value, str)
        or not value
        or "\\" in value
        or ":" in value
        or any(part in {"", ".", ".."} for part in value.split("/"))
    ):
        raise ValueError("invalid content file path")


def receipt_records(value: dict[str, Any], revision: str) -> dict[str, identity.FileRecord]:
    exact_keys(value, RECEIPT_KEYS)
    if value["schema_version"] != "market_intel.site_content_receipt.v1":
        raise ValueError("invalid content receipt schema")
    digest(value["bundle_id"])
    digest(value["archive_sha256"])
    digest(value["producer_revision"], 40)
    if value["producer_revision"] != revision:
        raise ValueError("content producer does not match installed exporter")
    timestamp = value["created_at_utc"]
    if not isinstance(timestamp, str) or not timestamp.endswith("Z"):
        raise ValueError("invalid content creation time")
    try:
        datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError("invalid content creation time") from error
    return ordered_records(value["files"])


def ordered_records(files: Any) -> dict[str, identity.FileRecord]:
    if not isinstance(files, list) or not files or len(files) > 4096:
        raise ValueError("invalid content file list")
    records: dict[str, identity.FileRecord] = {}
    for row in files:
        exact_keys(row, {"path", "sha256", "bytes"})
        path = row["path"]
        safe_relative(path)
        if not path.startswith(("data/", "reports/")) or path in records:
            raise ValueError("invalid content payload path")
        records[path] = {"sha256": row["sha256"], "size": row["bytes"]}
    file_records(records)
    if list(records) != sorted(records):
        raise ValueError("content files must be ordered")
    return records


def unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    value: dict[str, Any] = {}
    for key, item in pairs:
        if key in value:
            raise ValueError("duplicate content JSON key")
        value[key] = item
    return value


def read_receipt(path: Path) -> dict[str, Any]:
    if identity.file_record(path)["size"] > 2_000_000:
        raise ValueError("content receipt too large")
    value = json.loads(path.read_bytes(), object_pairs_hook=unique_object)
    exact_keys(value, RECEIPT_KEYS)
    return value


def separate_paths(paths: list[Path]) -> None:
    for first, second in combinations(paths, 2):
        if first.is_relative_to(second) or second.is_relative_to(first):
            raise ValueError("external content paths must be separate")


def request(
    root: Path,
    output: Path,
    summaries: Path | None,
    options: identity.IdentityOptions | None,
    inputs: Path | None,
    receipt: Path | None,
) -> tuple[Path, Path] | None:
    if inputs is None and receipt is None:
        return None
    if inputs is None or receipt is None or options is None:
        raise ValueError("external inputs require content receipt and formal identity together")
    if summaries is not None:
        raise ValueError("external inputs do not accept a summaries override")
    inputs, receipt = identity.plain_path(inputs).resolve(), identity.plain_path(receipt).resolve()
    separate_paths(
        [
            root,
            output,
            inputs,
            receipt,
            identity.plain_path(options.identity).resolve(),
            identity.plain_path(options.quality).resolve(),
        ]
    )
    return inputs, receipt


def prepare(record: dict[str, Any], root: Path, inputs: Path, receipt: Path, revision: str) -> None:
    before = identity.file_record(receipt)
    value = read_receipt(receipt)
    expected = receipt_records(value, revision)
    actual = identity.hash_tree(inputs)
    if actual != {f"artifacts/public/{path}": info for path, info in expected.items()}:
        raise ValueError("external content inputs do not match receipt")
    if identity.file_record(receipt) != before:
        raise ValueError("content receipt changed during validation")
    record["schema_version"] = "market_intel_pages.build_identity.v2"
    record["source"]["root"] = str(root)
    record["content"] = {**value, "receipt_path": str(receipt), "receipt": before}
    record["generator"]["command"].extend(["--public-inputs", str(inputs), "--content-receipt", str(receipt)])


def unchanged(record: dict[str, Any]) -> None:
    content = record["content"]
    if identity.file_record(Path(content["receipt_path"])) != content["receipt"]:
        raise ValueError("content receipt changed during build")
    expected = receipt_records({key: content[key] for key in RECEIPT_KEYS}, content["producer_revision"])
    inputs = record["original_inputs"]
    actual = identity.hash_tree(Path(inputs["root"]))
    if actual != {f"artifacts/public/{path}": info for path, info in expected.items()}:
        raise ValueError("original content inputs changed during build")


def absolute_path(value: Any) -> Path:
    if not isinstance(value, str) or not Path(value).is_absolute() or str(Path(value)) != value:
        raise ValueError("invalid content identity root")
    if ".." in Path(value).parts:
        raise ValueError("invalid content identity root")
    return Path(value)


def verify(value: dict[str, Any]) -> None:
    exact_keys(value, IDENTITY_KEYS)
    source, inputs, content = value["source"], value["original_inputs"], value["content"]
    exact_keys(source, {"revision", "dirty", "declared_ci_revision", "root"})
    digest(source["revision"], 40)
    if source["dirty"] is not False or source["declared_ci_revision"] not in {None, source["revision"]}:
        raise ValueError("invalid content source identity")
    exact_keys(inputs, {"root", "public", "summaries_override"})
    exact_keys(content, RECEIPT_KEYS | {"receipt_path", "receipt"})
    separate_paths(
        [absolute_path(source["root"]), absolute_path(inputs["root"]), absolute_path(content["receipt_path"])]
    )
    expected = receipt_records(
        {key: content[key] for key in RECEIPT_KEYS}, value["generator"]["exporter"]["revision"]
    )
    file_records({"receipt": content["receipt"]})
    file_records(inputs["public"])
    if inputs["public"] != expected or inputs["summaries_override"] is not None:
        raise ValueError("content original inputs do not match receipt")
    file_records(value["exported_snapshot"])
    file_records(value["output"])
    if (
        value["validation"]["validator_revision"] != source["revision"]
        or value["validation"]["status"] != "passed"
    ):
        raise ValueError("invalid content validator identity")
    digest(value["validation"]["validator_sha256"])
