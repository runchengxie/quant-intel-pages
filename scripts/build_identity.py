"""External identity for a completed static build, independent of publication status."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import platform
import re
import stat
import subprocess
import tempfile
from dataclasses import dataclass
from datetime import UTC, datetime
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
    receipts = (plain_path(options.identity).resolve(), plain_path(options.quality).resolve())
    if receipts[0].is_relative_to(receipts[1]) or receipts[1].is_relative_to(receipts[0]):
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
    return {"revision": expected, "version": value["version"], "vcs": "git"}


def exporter_provenance(command: str, expected: str) -> dict[str, Any]:
    """Inspect the distribution through the console script's own interpreter."""
    executable = plain_path(Path(command)).resolve()
    first = executable.read_text().splitlines()[0]
    if not first.startswith("#!/") or " " in first[2:] or not Path(first[2:]).name.startswith("python"):
        raise ValueError("exporter requires a direct Python console script")
    interpreter = Path(first[2:])
    probe = """import importlib.metadata as m,json,sys
from pathlib import Path
d=m.distribution('market-intel')
launcher=[f.hash.value for f in (d.files or []) if Path(d.locate_file(f)).resolve()==Path(sys.argv[1]).resolve() and f.hash and f.hash.mode=='sha256']
print(json.dumps({'version':d.version,'direct_url':json.loads(d.read_text('direct_url.json') or '{}'),'launcher':launcher,'installed_distributions':sorted((i.metadata['Name'],i.version) for i in m.distributions())}))
"""
    result = subprocess.run(
        [str(interpreter), "-I", "-c", probe, str(executable)],
        check=True,
        capture_output=True,
        text=True,
        timeout=30,
    )
    observed = json.loads(result.stdout)
    record = validate_exporter_metadata(observed, expected)
    digest = file_record(executable)["sha256"]
    encoded = base64.urlsafe_b64encode(bytes.fromhex(digest)).decode().rstrip("=")
    if observed.get("launcher") != [encoded]:
        raise ValueError("exporter launcher does not match installed distribution")
    lock = executable.parents[2] / "uv.lock"
    record.update(
        {
            "executable_sha256": digest,
            "interpreter": str(interpreter),
            "executable": str(executable),
            "installed_distributions": observed["installed_distributions"],
            "dependency_lock": file_record(lock) if lock.is_file() else None,
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


def source_identity(root: Path) -> dict[str, Any]:
    def git(*args: str) -> str:
        return subprocess.run(
            ["git", "-C", str(root), *args], check=True, capture_output=True, text=True, timeout=30
        ).stdout.strip()

    revision = git("rev-parse", "HEAD")
    if git("status", "--porcelain", "--untracked-files=normal"):
        raise ValueError("formal identity requires clean source")
    declared = os.environ.get("GITHUB_SHA")
    if declared and declared != revision:
        raise ValueError("checkout revision does not match CI source")
    return {"revision": revision, "dirty": False, "declared_ci_revision": declared}


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def runtime_versions() -> dict[str, str]:
    versions = {"python": platform.python_version()}
    for name in ("node", "npm"):
        versions[name] = subprocess.run(
            [name, "--version"], check=True, capture_output=True, text=True, timeout=30
        ).stdout.strip()
    return versions


def stage_identity(path: Path, value: dict[str, Any]) -> Path:
    plain_path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", prefix=".build-identity-", dir=path.parent, delete=False
    ) as stream:
        pending = Path(stream.name)
        try:
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        except BaseException:
            pending.unlink(missing_ok=True)
            raise
    return pending


def publish_identity(pending: Path, target: Path) -> None:
    plain_path(target)
    os.link(pending, target)  # exclusive: never overwrite an existing receipt


if __name__ == "__main__":
    main()
