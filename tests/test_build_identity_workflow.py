"""Execute the workflow's upload gate against a synthetic site and ledger."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
from pathlib import Path

import pytest


def workflow_gate() -> str:
    workflow = Path(".github/workflows/site-build.yml").read_text()
    start = workflow.index("      - name: Verify build identity and preserve receipts\n")
    block = workflow[start:]
    run = block.split("        run: |\n", 1)[1].split("\n      - ", 1)[0]
    return "\n".join(line.removeprefix("          ") for line in run.splitlines())


@pytest.mark.parametrize("corrupt", [False, True])
def test_workflow_gate_preserves_only_matching_identity(tmp_path: Path, corrupt: bool) -> None:
    output = tmp_path / "site"
    output.mkdir()
    (output / "index.html").write_text("site")
    quality = tmp_path / "report-validation.json"
    quality.write_text(
        json.dumps(
            {"schema_version": "market_intel.report_quality.v1", "status": "passed", "input_sha256": {}}
        )
    )
    (tmp_path / "build-identity.json").write_text(
        json.dumps(
            {
                "schema_version": "market_intel_pages.build_identity.v1",
                "owner": "quant-intel-pages",
                "purpose": "public_site",
                "status": "completed",
                "exported_snapshot": {},
                "validation": {"sha256": hashlib.sha256(quality.read_bytes()).hexdigest()},
                "output": {"index.html": {"size": 4, "sha256": hashlib.sha256(b"site").hexdigest()}},
            }
        )
    )
    if corrupt:
        (output / "index.html").write_text("wrong")
    env = {
        **os.environ,
        "SITE_OUTPUT": str(output),
        "IDENTITY_ROOT": str(tmp_path),
        "GITHUB_EVENT_NAME": "push",
    }
    result = subprocess.run(["bash", "-e", "-c", workflow_gate()], env=env, capture_output=True, text=True)
    if corrupt:
        assert result.returncode != 0
        assert not (tmp_path / "market-intel-ledger/build-identity.json").exists()
    else:
        assert result.returncode == 0, result.stderr
        assert (tmp_path / "market-intel-ledger/build-identity.json").read_bytes() == (
            tmp_path / "build-identity.json"
        ).read_bytes()
        assert (tmp_path / "market-intel-ledger/report-validation.json").read_bytes() == quality.read_bytes()
