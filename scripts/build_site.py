"""Build the static Pages frontend from a validated Platform snapshot."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import tempfile
from pathlib import Path


def _snapshot_command() -> str:
    command = os.environ.get("MARKET_EXPORT_SITE_SNAPSHOT") or shutil.which("market-export-site-snapshot")
    if not command:
        raise RuntimeError("market-export-site-snapshot is required; install quant-intel-platform first")
    return command


def _copy_tree(source: Path, destination: Path) -> None:
    if source.is_dir():
        shutil.copytree(source, destination, dirs_exist_ok=True)


def _render_astro(root: Path, snapshot: Path) -> None:
    with tempfile.TemporaryDirectory(prefix="quant-intel-astro-", dir=root.parent) as temporary:
        built = Path(temporary) / "site"
        env = {**os.environ, "ASTRO_DATA_ROOT": str(snapshot), "ASTRO_OUT_DIR": str(built)}
        try:
            subprocess.run(
                ["npm", "run", "build"],
                cwd=root,
                env=env,
                check=True,
                capture_output=True,
                text=True,
                timeout=180,
            )
        except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
            raise RuntimeError("Astro static build failed") from error
        if not (built / "index.html").is_file():
            raise RuntimeError("Astro build did not produce index.html")
        for item in built.iterdir():
            _copy_tree(item, snapshot / item.name)
            if item.is_file():
                shutil.copy2(item, snapshot / item.name)


def build_site(root: Path, output: Path, summaries_path: Path | None = None) -> None:
    """Build atomically so a failed export or Astro render preserves the previous site."""
    root, output = root.resolve(), output.resolve()
    if output == root or output.is_relative_to(root) or root.is_relative_to(output):
        raise ValueError("build output must be separate from the repository")
    if output == output.parent:
        raise ValueError("build output cannot be a filesystem root")
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="quant-intel-pages-", dir=output.parent) as temporary:
        staging = Path(temporary) / "site"
        command = [_snapshot_command(), "--root", str(root), "--output", str(staging)]
        if summaries_path is not None:
            command.extend(["--summaries", str(summaries_path.resolve())])
        try:
            subprocess.run(command, cwd=root, check=True, capture_output=True, text=True, timeout=180)
        except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
            raise RuntimeError("Platform public snapshot export failed") from error

        _copy_tree(root / "src/legacy", staging / "legacy")
        _render_astro(root, staging)
        previous = Path(temporary) / "previous"
        if output.exists():
            output.replace(previous)
        try:
            staging.replace(output)
        except OSError:
            if previous.exists():
                previous.replace(output)
            raise


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="Pages repository root")
    parser.add_argument("--output", type=Path, required=True, help="static site output directory")
    parser.add_argument("--summaries", type=Path, help="optional summary index override")
    args = parser.parse_args()
    build_site(args.root, args.output, args.summaries)
    print(f"Built public site at {args.output}")


if __name__ == "__main__":
    main()
