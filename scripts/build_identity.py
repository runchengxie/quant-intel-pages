"""External identity for a completed static build, independent of publication status."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import stat
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, TypedDict


class FileRecord(TypedDict):
    sha256: str
    size: int


@dataclass(frozen=True)
class IdentityOptions:
    identity: Path
    quality: Path
    task_id: str
    exporter_revision: str


def plain_path(path: Path) -> Path:
    """Reject link traversal, including existing parent components."""
    path = path.absolute()
    for item in (path, *path.parents):
        if item.is_symlink():
            raise ValueError("symbolic links are not allowed")
    return path


def file_record(path: Path) -> FileRecord:
    plain_path(path)
    info = path.stat()
    if not stat.S_ISREG(info.st_mode) or info.st_size > 64_000_000:
        raise ValueError("invalid build file")
    return {"sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "size": info.st_size}


def hash_tree(root: Path) -> dict[str, FileRecord]:
    plain_path(root)
    if not root.is_dir():
        raise ValueError("missing build directory")
    records: dict[str, FileRecord] = {}
    for path in sorted(root.rglob("*")):
        plain_path(path)
        if not path.is_dir():
            records[path.relative_to(root).as_posix()] = file_record(path)
        if len(records) > 5000:
            raise ValueError("build file budget exceeded")
    if sum(record["size"] for record in records.values()) > 512_000_000:
        raise ValueError("build byte budget exceeded")
    return records


def read_json(path: Path) -> dict[str, Any]:
    if file_record(path)["size"] > 4_000_000:
        raise ValueError("receipt too large")
    value = json.loads(path.read_bytes())
    if not isinstance(value, dict):
        raise ValueError("invalid receipt object")
    return value


def validate_quality(receipt: Path, snapshot: dict[str, FileRecord]) -> dict[str, Any]:
    value = read_json(receipt)
    hashes = {key: item["sha256"] for key, item in snapshot.items()}
    if (
        value.get("schema_version") != "market_intel.report_quality.v1"
        or value.get("status") != "passed"
        or value.get("input_sha256") != hashes
    ):
        raise ValueError("quality receipt does not match the validated snapshot")
    return value


def validate_paths(root: Path, output: Path, options: IdentityOptions) -> None:
    receipts = (plain_path(options.identity), plain_path(options.quality))
    if receipts[0] == receipts[1]:
        raise ValueError("receipt paths must differ")
    for receipt in receipts:
        for directory in (root, output):
            if receipt == directory or receipt.is_relative_to(directory) or directory.is_relative_to(receipt):
                raise ValueError("receipt must be separate from source and output")
        if receipt.exists():
            raise ValueError("receipt already exists")
    if not options.task_id or not re.fullmatch("[a-f0-9]{40}", options.exporter_revision):
        raise ValueError("invalid task or exporter revision")


def validate_exporter_metadata(value: dict[str, Any], expected: str) -> dict[str, Any]:
    direct = value.get("direct_url", {})
    vcs = direct.get("vcs_info", {})
    if (
        not re.fullmatch("[a-f0-9]{40}", expected)
        or vcs.get("vcs") != "git"
        or vcs.get("commit_id") != expected
        or not value.get("version")
    ):
        raise ValueError("exporter must have matching immutable installed VCS metadata")
    return {"revision": expected, "version": value["version"], "direct_url": direct}


def exporter_provenance(command: str, expected: str) -> dict[str, Any]:
    """Inspect the distribution through the console script's own interpreter."""
    executable = plain_path(Path(command)).resolve()
    first = executable.read_text().splitlines()[0]
    if not first.startswith("#!/") or " " in first[2:]:
        raise ValueError("exporter requires a direct Python console script")
    interpreter = Path(first[2:])
    probe = (
        "import importlib.metadata as m,json;d=m.distribution('market-intel');"
        "print(json.dumps({'version':d.version,'direct_url':json.loads(d.read_text('direct_url.json') or '{}')}))"
    )
    result = subprocess.run(
        [str(interpreter), "-I", "-c", probe], check=True, capture_output=True, text=True, timeout=30
    )
    record = validate_exporter_metadata(json.loads(result.stdout), expected)
    record.update(
        {
            "executable_sha256": file_record(executable)["sha256"],
            "interpreter": str(interpreter),
            "executable": str(executable),
        }
    )
    return record


def verify_identity(identity: Path, output: Path, quality: Path) -> None:
    value = read_json(identity)
    if (
        value.get("schema_version") != "market_intel_pages.build_identity.v1"
        or value.get("status") != "completed"
        or value.get("owner") != "quant-intel-pages"
        or value.get("purpose") != "public_site"
    ):
        raise ValueError("invalid completed build identity")
    if value.get("output") != hash_tree(output):
        raise ValueError("output does not match build identity")
    if value.get("validation", {}).get("sha256") != file_record(quality)["sha256"]:
        raise ValueError("quality receipt identity changed")
    validate_quality(quality, value.get("exported_snapshot", {}))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["verify"])
    parser.add_argument("--identity", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--quality", type=Path, required=True)
    args = parser.parse_args()
    verify_identity(args.identity, args.output, args.quality)
    print("Build identity verified")


if __name__ == "__main__":
    main()
