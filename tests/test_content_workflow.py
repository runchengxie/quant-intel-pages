"""Executable pre-check guards and shared workflow contracts."""

import os
import subprocess
from pathlib import Path

import pytest


def guard(workflow, name):
    text = Path(f".github/workflows/{workflow}").read_text()
    block = text.split(f"      - name: {name}\n", 1)[1]
    run = block.split("        run: |\n", 1)[1].split("\n      - ", 1)[0]
    return "\n".join(line.removeprefix("          ") for line in run.splitlines())


@pytest.mark.parametrize(
    "mode,ref,requested,success",
    [
        ("artifact-v1", "refs/heads/main", "a" * 40, True),
        ("", "refs/heads/main", "a" * 40, False),
        ("wrong", "refs/heads/main", "a" * 40, False),
        ("artifact-v1", "refs/heads/feature", "a" * 40, False),
        ("artifact-v1", "refs/heads/main", "b" * 40, False),
    ],
)
def test_dispatch_rejects_mode_and_unmerged_ref_before_checkout(mode, ref, requested, success):
    script = guard("publish-content.yml", "Validate dispatch before owner checkout")
    result = subprocess.run(
        ["bash", "-e", "-c", script],
        env={
            **os.environ,
            "MODE": mode,
            "GITHUB_REF": ref,
            "GITHUB_SHA": "a" * 40,
            "RENDERER_REVISION": requested,
            "PRODUCER_REVISION": "70d21f8683cdbe3b7841e2a7f4e10f57d1c2a8be",
        },
        capture_output=True,
    )
    assert (result.returncode == 0) is success
    workflow = Path(".github/workflows/publish-content.yml").read_text()
    assert workflow.index("Validate dispatch before owner checkout") < workflow.index("actions/checkout")


def test_shared_profiles_keep_source_checks_and_one_production_writer():
    source = Path(".github/workflows/public-site.yml").read_text()
    shared = Path(".github/workflows/site-build.yml").read_text()
    content = Path(".github/workflows/publish-content.yml").read_text()
    assert "vars.CONTENT_PUBLICATION_MODE != 'artifact-v1'" in source
    for workflow in [source, content]:
        assert "group: quant-intel-pages-production" in workflow
        assert "cancel-in-progress: false" in workflow
        assert "name: github-pages" in workflow
        assert "uses: ./.github/workflows/site-build.yml" in workflow
    assert "synthetic: true" in source
    for command in [
        "ruff check",
        "ruff format --check",
        "ty check",
        "vulture",
        "pytest",
        "npm test",
        "node --check",
        "npm run check",
        "audit_structure.py",
        "npm audit",
        "pip-audit --strict",
        "npm run test:browser",
    ]:
        assert command in shared
    assert "ref: ${{ github.sha }}" in shared
    assert "ref: ${{ inputs.renderer_revision }}" not in shared
    assert "content.zip" in shared and "content-receipt.json" in shared
    assert "original" in shared


def test_content_ledger_preserves_original_and_normalized_bytes(tmp_path):
    site = tmp_path / "site"
    for folder in ("data", "reports"):
        (site / folder).mkdir(parents=True)
        (site / folder / "public").write_text("normalized")
    (site / "data/site-publication.json").write_text("marker")
    original = tmp_path / "verified/artifacts/public/data"
    original.mkdir(parents=True)
    (original / "public").write_text("original")
    for name in ("content.zip", "content-receipt.json", "publication-context.json"):
        (tmp_path / name).write_text("retained " + name)
    result = subprocess.run(
        ["bash", "-e", "-c", guard("site-build.yml", "Preserve publication ledger")],
        env={
            **os.environ,
            "PROFILE": "content",
            "RUNNER_TEMP": str(tmp_path),
            "IDENTITY_ROOT": str(tmp_path),
            "SITE_OUTPUT": str(site),
        },
        capture_output=True,
    )
    assert result.returncode == 0, result.stderr
    ledger = tmp_path / "market-intel-ledger"
    assert (ledger / "data/public").read_text() == "normalized"
    assert (ledger / "original/artifacts/public/data/public").read_text() == "original"
    assert (ledger / "data/site-publication.json").read_text() == "marker"
    for name in ("content.zip", "content-receipt.json", "publication-context.json"):
        assert (ledger / name).read_bytes() == (tmp_path / name).read_bytes()


@pytest.mark.parametrize(
    "mode,success", [("", True), ("legacy", True), ("artifact-v1", True), ("unknown", False)]
)
def test_shared_mode_gate_executes_for_both_profiles(tmp_path, mode, success):
    for profile in ("source", "content"):
        result = subprocess.run(
            ["bash", "-e", "-c", guard("site-build.yml", "Validate build mode and profile")],
            env={
                **os.environ,
                "MODE": mode,
                "PROFILE": profile,
                "RUNNER_TEMP": str(tmp_path),
                "GITHUB_ENV": str(tmp_path / "env"),
            },
            capture_output=True,
        )
        assert (result.returncode == 0) is success


@pytest.mark.parametrize(
    "change", ["none", "absent", "unmerged", "wrong_revision", "wrong_base", "wrong_repository"]
)
def test_renderer_preflight_requires_its_merged_main_pr(change):
    import json

    text = Path(".github/workflows/publish-content.yml").read_text()
    block = text.split("      - name: Require successful merged main source checks\n", 1)[1]
    script = "\n".join(
        line.removeprefix("            ")
        for line in block.split("          script: |\n", 1)[1].split("\n      - ", 1)[0].splitlines()
    )
    pull = {
        "state": "closed",
        "merged_at": "2026-11-09T00:00:00Z",
        "merge_commit_sha": "a" * 40,
        "base": {"ref": "main", "repo": {"full_name": "runchengxie/quant-intel-pages"}},
    }
    if change == "unmerged":
        pull["merged_at"] = None
    elif change == "wrong_revision":
        pull["merge_commit_sha"] = "b" * 40
    elif change == "wrong_base":
        pull["base"]["ref"] = "feature"
    elif change == "wrong_repository":
        pull["base"]["repo"]["full_name"] = "other/repository"
    pulls = [] if change == "absent" else [pull]
    harness = """
const script = JSON.parse(process.argv[1]);
const pulls = JSON.parse(process.argv[2]);
const repo = {owner:'runchengxie',repo:'quant-intel-pages'};
const context = {repo,sha:'a'.repeat(40)};
const github = {rest:{
  actions:{listWorkflowRuns: async args => ({data:args.workflow_id === 'public-site.yml'
    ? {workflow_runs:[{head_sha:context.sha,head_branch:'main',event:'push',conclusion:'success',
                      head_repository:{full_name:'runchengxie/quant-intel-pages'}}]}
    : {total_count:0}})},
  repos:{listPullRequestsAssociatedWithCommit: async args => {
    if (args.commit_sha !== context.sha || args.owner !== repo.owner || args.repo !== repo.repo)
      throw new Error('Unexpected source association request');
    return {data:pulls};
  }}
}};
const core = {setOutput:()=>{}};
new (Object.getPrototypeOf(async function(){}).constructor)('github','context','core',script)(github,context,core)
  .catch(error=>{process.stderr.write(error.message);process.exitCode=1;});
"""
    result = subprocess.run(
        ["node", "-e", harness, json.dumps(script), json.dumps(pulls)], capture_output=True
    )
    assert (result.returncode == 0) is (change == "none"), result.stderr
