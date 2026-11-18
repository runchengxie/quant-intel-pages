"""Retain only the root rendered index alongside the existing publication ledger."""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

from scripts.build_identity import file_record, plain_path, read_json


def preserve_index(identity: Path, output: Path, ledger: Path) -> None:
    """Bind rendered bytes to build output; never add HTML to the owner payload."""
    expected = read_json(identity).get("output", {}).get("index.html")
    source = plain_path(output / "index.html")
    if expected is None or file_record(source) != expected:
        raise ValueError("root index differs from verified build output")
    content = source.read_bytes()
    if {"size": len(content), "sha256": hashlib.sha256(content).hexdigest()} != expected:
        raise ValueError("root index changed while preserving ledger")
    target = plain_path(ledger / "index.html")
    if ledger.resolve().is_relative_to(output.resolve()):
        raise ValueError("ledger must be separate from output")
    with target.open("xb") as stream:
        stream.write(content)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--identity", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--ledger", type=Path, required=True)
    args = parser.parse_args()
    preserve_index(args.identity, args.output, args.ledger)


if __name__ == "__main__":
    main()
