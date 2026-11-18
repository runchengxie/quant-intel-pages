"""Portable rendered index is bound to exact build output, outside owner payload."""

import hashlib
import json
import sys

import pytest


@pytest.mark.parametrize("change", ["none", "tamper", "dropped", "unrecorded", "symlink"])
def test_ledger_copies_only_build_bound_root_index(tmp_path, change, monkeypatch):
    from scripts.content_ledger import main

    output = tmp_path / "site"
    output.mkdir()
    index = output / "index.html"
    index.write_bytes(b"verified index")
    (output / "arbitrary.html").write_bytes(b"must not copy")
    identity = tmp_path / "build-identity.json"
    identity.write_text(
        json.dumps(
            {
                "output": {
                    "index.html": {
                        "size": 14,
                        "sha256": hashlib.sha256(b"verified index").hexdigest(),
                    }
                }
                if change != "unrecorded"
                else {}
            }
        )
    )
    if change == "tamper":
        index.write_bytes(b"altered index")
    elif change == "dropped":
        index.unlink()
    elif change == "symlink":
        index.unlink()
        index.symlink_to(output / "arbitrary.html")
    ledger = tmp_path / "ledger"
    ledger.mkdir()
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "content_ledger",
            "--identity",
            str(identity),
            "--output",
            str(output),
            "--ledger",
            str(ledger),
        ],
    )
    if change == "none":
        main()
    else:
        with pytest.raises((ValueError, FileNotFoundError)):
            main()
    if change == "none":
        assert (ledger / "index.html").read_bytes() == b"verified index"
        assert sorted(path.name for path in ledger.iterdir()) == ["index.html"]
    else:
        assert not (ledger / "index.html").exists()


def test_ledger_rejects_overwrite_and_output_alias(tmp_path):
    from scripts.content_ledger import preserve_index

    output = tmp_path / "site"
    output.mkdir()
    (output / "index.html").write_bytes(b"index")
    identity = tmp_path / "identity.json"
    identity.write_text(
        json.dumps(
            {
                "output": {
                    "index.html": {
                        "size": 5,
                        "sha256": hashlib.sha256(b"index").hexdigest(),
                    }
                }
            }
        )
    )
    with pytest.raises(ValueError, match="separate"):
        preserve_index(identity, output, output)
    ledger = tmp_path / "ledger"
    ledger.mkdir()
    (ledger / "index.html").write_bytes(b"existing")
    with pytest.raises(FileExistsError):
        preserve_index(identity, output, ledger)
    assert (ledger / "index.html").read_bytes() == b"existing"
