"""Filesystem-level formal builder failures must preserve the previous output."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from scripts import build_identity, build_site

REV = "a" * 40


@pytest.fixture
def formal(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    root = tmp_path / "repo"
    (root / "artifacts/public/data").mkdir(parents=True)
    (root / "artifacts/public/data/reports.json").write_text("{}")
    (root / "src/legacy").mkdir(parents=True)
    (root / "src/legacy/app.js").write_text("legacy")
    (root / "tools").mkdir()
    (root / "tools/check-reports.ts").write_text("fixture checker")
    for name in ("package-lock.json", "uv.lock"):
        (root / name).write_text("{}")
    subprocess.run(["git", "init", "-q", str(root)], check=True)
    subprocess.run(["git", "-C", str(root), "add", "."], check=True)
    subprocess.run(
        [
            "git",
            "-C",
            str(root),
            "-c",
            "user.name=Fixture",
            "-c",
            "user.email=fixture@example.invalid",
            "commit",
            "-qm",
            "fixture",
        ],
        check=True,
    )
    binary = tmp_path / "bin"
    binary.mkdir()
    exporter = binary / "exporter"
    exporter.write_text(
        f"#!{sys.executable}\n"
        + """import sys,shutil
from pathlib import Path
args=sys.argv
shutil.copytree(Path(args[args.index('--root')+1])/'artifacts/public',args[args.index('--output')+1])
"""
    )
    npm = binary / "npm"
    npm.write_text(
        f"#!{sys.executable}\n"
        + """import os,json,hashlib,sys,subprocess
from pathlib import Path
if sys.argv[1]=='--version':
 print('1.0');sys.exit(0)
snapshot=Path(os.environ['ASTRO_DATA_ROOT']);out=Path(os.environ['ASTRO_OUT_DIR']);out.mkdir()
hashes={p.relative_to(snapshot).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in snapshot.rglob('*') if p.is_file()}
Path(os.environ['REPORT_VALIDATION_RECEIPT']).write_text(json.dumps({'schema_version':'market_intel.report_quality.v1','status':'passed','input_sha256':hashes,'validator_revision':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'validator_sha256':hashlib.sha256(Path('tools/check-reports.ts').read_bytes()).hexdigest()}))
(out/'index.html').write_text('rendered')
change=os.environ.get('FIXTURE_CHANGE')
if change=='overwrite':
 (out/'data').mkdir();(out/'data/reports.json').write_text('UNVALIDATED')
if change=='modify': (snapshot/'data/reports.json').write_text('changed')
if change=='add': (snapshot/'extra').write_text('extra')
if change=='delete': (snapshot/'data/reports.json').unlink()
if change=='original': (Path(os.environ['FIXTURE_ROOT'])/'artifacts/public/data/reports.json').write_text('changed')
if change=='quality': Path(os.environ['REPORT_VALIDATION_RECEIPT']).write_text('{}')
if change=='validator':
 p=Path(os.environ['REPORT_VALIDATION_RECEIPT']);d=json.loads(p.read_text());d['validator_sha256']='b'*64;p.write_text(json.dumps(d))
"""
    )
    for executable in (exporter, npm):
        executable.chmod(0o755)
    monkeypatch.setenv("PATH", str(binary) + os.pathsep + os.environ["PATH"])
    monkeypatch.setenv("MARKET_EXPORT_SITE_SNAPSHOT", str(exporter))
    monkeypatch.setenv("FIXTURE_ROOT", str(root))
    monkeypatch.setattr(
        build_identity,
        "exporter_provenance",
        lambda command, expected: {
            "revision": expected,
            "version": "1",
            "interpreter": sys.executable,
            "executable": command,
        },
    )
    output = tmp_path / "site"
    output.mkdir()
    (output / "old").write_text("previous")
    options = build_identity.IdentityOptions(
        tmp_path / "identity.json", tmp_path / "quality.json", "task", REV
    )
    return root, output, options


def test_formal_identity_matches_frozen_inputs_and_final_output(formal) -> None:
    root, output, options = formal
    build_site.build_site(root, output, identity_options=options)
    record = json.loads(options.identity.read_text())
    assert record["status"] == "completed"
    assert record["operator"] is None
    assert (
        record["original_inputs"]["public"]["data/reports.json"]["sha256"]
        == "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"
    )
    assert (
        record["exported_snapshot"]["data/reports.json"]
        == record["original_inputs"]["public"]["data/reports.json"]
    )
    assert "legacy/app.js" in record["output"]
    assert "index.html" not in record["exported_snapshot"]
    assert not (output / "identity.json").exists()
    build_identity.verify_identity(options.identity, output, options.quality)


@pytest.mark.parametrize("change", ["modify", "add", "delete", "original", "quality"])
def test_mutation_during_export_or_render_preserves_old_output(formal, monkeypatch, change) -> None:
    root, output, options = formal
    monkeypatch.setenv("FIXTURE_CHANGE", change)
    with pytest.raises(ValueError):
        build_site.build_site(root, output, identity_options=options)
    assert (output / "old").read_text() == "previous"
    assert not options.identity.exists()


def test_final_identity_failure_restores_previous_output(formal, monkeypatch) -> None:
    root, output, options = formal

    def fail(*args):
        raise OSError("injected final identity failure")

    monkeypatch.setattr(build_identity, "publish_identity", fail)
    with pytest.raises(OSError, match="injected"):
        build_site.build_site(root, output, identity_options=options)
    assert (output / "old").read_text() == "previous"
    assert not options.identity.exists()


def test_existing_identity_and_path_overlap_rejected(formal) -> None:
    root, output, options = formal
    options.identity.write_text("keep")
    with pytest.raises(ValueError, match="exists"):
        build_site.build_site(root, output, identity_options=options)
    assert options.identity.read_text() == "keep"
    assert (output / "old").read_text() == "previous"


def test_dirty_source_rejected_before_export(formal) -> None:
    root, output, options = formal
    (root / "src/legacy/app.js").write_text("dirty")
    with pytest.raises(ValueError, match="clean"):
        build_site.build_site(root, output, identity_options=options)
    assert not options.quality.exists()


def test_failed_rollback_keeps_recoverable_previous_output(formal, monkeypatch) -> None:
    root, output, options = formal
    original_replace = Path.replace

    def fail_identity(*args):
        raise OSError("identity fault")

    def replace(source, destination):
        if source.name == "previous":
            raise OSError("rollback fault")
        return original_replace(source, destination)

    monkeypatch.setattr(build_identity, "publish_identity", fail_identity)
    monkeypatch.setattr(Path, "replace", replace)
    with pytest.raises(build_site.BuildRecoveryError, match="retained recovery"):
        build_site.build_site(root, output, identity_options=options)
    retained = list(output.parent.glob("quant-intel-pages-*/previous/old"))
    assert len(retained) == 1
    assert retained[0].read_text() == "previous"
    assert not options.identity.exists()


def test_summaries_override_is_hashed_and_used(formal) -> None:
    root, output, options = formal
    override = output.parent / "summaries.json"
    override.write_text("{}")
    build_site.build_site(root, output, override, identity_options=options)
    assert json.loads(options.identity.read_text())["original_inputs"]["summaries_override"]["size"] == 2
    assert "--summaries" in json.loads(options.identity.read_text())["generator"]["command"]


def test_wrong_validator_source_cannot_authorize_formal_output(formal, monkeypatch) -> None:
    root, output, options = formal
    monkeypatch.setenv("FIXTURE_CHANGE", "validator")
    with pytest.raises(ValueError, match="validator"):
        build_site.build_site(root, output, identity_options=options)
    assert (output / "old").read_text() == "previous"
    assert not options.identity.exists()


def test_rendered_output_cannot_replace_validated_snapshot(formal, monkeypatch) -> None:
    root, output, options = formal
    monkeypatch.setenv("FIXTURE_CHANGE", "overwrite")
    with pytest.raises(ValueError, match="snapshot"):
        build_site.build_site(root, output, identity_options=options)
    assert (output / "old").read_text() == "previous"
    assert not options.identity.exists()


def test_summaries_inside_output_are_rejected_without_deleting_input(formal) -> None:
    root, output, options = formal
    summaries = output / "summaries.json"
    summaries.write_text('{"keep":"input"}')
    with pytest.raises(ValueError, match="summaries"):
        build_site.build_site(root, output, summaries, identity_options=options)
    assert summaries.read_text() == '{"keep":"input"}'
    assert (output / "old").read_text() == "previous"
    assert not options.quality.exists()


def test_formal_export_does_not_import_pythonpath_shadow(formal, monkeypatch) -> None:
    root, output, options = formal
    shadow = output.parent / "shadow"
    shadow.mkdir()
    marker = output.parent / "shadow-executed"
    (shadow / "shutil.py").write_text(
        f'from pathlib import Path\nPath({str(marker)!r}).write_text("bad")\nraise RuntimeError("shadowed shutil")\n'
    )
    monkeypatch.setenv("PYTHONPATH", str(shadow))
    build_site.build_site(root, output, identity_options=options)
    assert options.identity.exists()
    assert not marker.exists()
