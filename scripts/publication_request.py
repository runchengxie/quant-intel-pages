"""Prepare a trusted workflow context and compare the currently served parent."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, build_opener

if __package__:
    from . import content_publication_marker as publication
    from .content_asset import NoRedirect
else:
    import content_publication_marker as publication
    from content_asset import NoRedirect

PUBLIC_MARKER = "https://runchengxie.github.io/quant-intel-pages/data/site-publication.json"


def live_marker():
    request = Request(PUBLIC_MARKER, headers={"Cache-Control": "no-cache"})
    try:
        with build_opener(NoRedirect()).open(request, timeout=30) as stream:
            data = stream.read(4097)
    except HTTPError as error:
        if error.code == 404:
            return None
        raise ValueError(f"publication marker request failed: HTTP {error.code}") from None
    if len(data) > 4096:
        raise ValueError("publication marker too large")
    value = json.loads(data)
    publication.validate_marker(value)
    return value


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--receipt", type=Path, required=True)
    parser.add_argument("--context", type=Path, required=True)
    parser.add_argument("--synthetic", action="store_true")
    args = parser.parse_args()
    receipt = json.loads(args.receipt.read_text())
    context = {
        "candidate_id": os.environ["CANDIDATE_ID"],
        "content_sha256": receipt["archive_sha256"],
        "producer_revision": receipt["producer_revision"],
        "renderer_revision": os.environ["GITHUB_SHA"],
        "workflow_run_id": os.environ["GITHUB_RUN_ID"],
        "workflow_run_attempt": os.environ["GITHUB_RUN_ATTEMPT"],
    }
    proposed = publication.marker(context, receipt["bundle_id"])
    status = (
        "publish"
        if args.synthetic
        else publication.check_parent(
            live_marker(),
            os.environ["EXPECTED_PARENT"],
            proposed,
            first=os.environ.get("FIRST_PUBLICATION") == "true",
        )
    )
    with args.context.open("x") as stream:
        json.dump(context, stream)
    with Path(os.environ["GITHUB_OUTPUT"]).open("a") as stream:
        stream.write(f"status={status}\nmarker={publication.encoded(proposed).decode()}")


if __name__ == "__main__":
    main()
