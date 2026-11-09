"""Download only public immutable assets from the fixed Pages repository."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

MAX_ARCHIVE_BYTES = 64 * 1024 * 1024
REPOSITORY = "runchengxie/quant-intel-pages"
API = f"https://api.github.com/repos/{REPOSITORY}"
ALLOWED_HOSTS = {
    "api.github.com",
    "github.com",
    "release-assets.githubusercontent.com",
    "objects.githubusercontent.com",
}


def asset_url(asset_id: str) -> str:
    if not re.fullmatch(r"[1-9][0-9]{0,19}", asset_id):
        raise ValueError("invalid content asset id")
    return f"{API}/releases/assets/{asset_id}"


def validate_url(url: str) -> None:
    value = urlsplit(url)
    if (
        value.scheme != "https"
        or value.hostname not in ALLOWED_HOSTS
        or value.username
        or value.password
        or value.port not in {None, 443}
        or value.fragment
    ):
        raise ValueError("content asset redirect rejected")


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        del req, fp, code, msg, headers, newurl
        return None


def open_public(request: Request, timeout: int):
    """Recreate every request without credentials, even on same-host redirects."""
    opener = build_opener(NoRedirect())
    url = request.full_url
    accept = request.get_header("Accept", "application/octet-stream")
    for _ in range(4):
        validate_url(url)
        clean = Request(url, headers={"Accept": accept, "User-Agent": "quant-intel-pages-content"})
        try:
            return opener.open(clean, timeout=timeout)
        except HTTPError as error:
            if error.code not in {301, 302, 303, 307, 308}:
                raise ValueError(f"public asset request failed: HTTP {error.code}") from None
            url = error.headers.get("Location", "")
        except OSError:
            raise ValueError("public asset request failed") from None
    raise ValueError("content asset redirect limit exceeded")


def read_metadata(asset_id: str) -> dict:
    with open_public(
        Request(asset_url(asset_id), headers={"Accept": "application/vnd.github+json"}), 30
    ) as stream:
        data = stream.read(65537)
    if len(data) > 65536:
        raise ValueError("asset metadata too large")
    value = json.loads(data)
    if not isinstance(value, dict):
        raise ValueError("invalid asset metadata")
    if (
        value.get("id") != int(asset_id)
        or value.get("url") != asset_url(asset_id)
        or value.get("state") != "uploaded"
    ):
        raise ValueError("asset metadata identity mismatch")
    size = value.get("size")
    if type(size) is not int or not 0 < size <= MAX_ARCHIVE_BYTES:
        raise ValueError("asset size exceeds limit")
    return value


def download_asset(asset_id: str, sha256: str, output: Path) -> None:
    if not re.fullmatch(r"[a-f0-9]{64}", sha256):
        raise ValueError("invalid archive digest")
    metadata = read_metadata(asset_id)
    count, digest = 0, hashlib.sha256()
    # Exclusive creation prevents replacement of existing candidate bytes.
    with output.open("xb") as destination:
        try:
            with open_public(
                Request(asset_url(asset_id), headers={"Accept": "application/octet-stream"}), 30
            ) as stream:
                while block := stream.read(min(65536, metadata["size"] - count + 1)):
                    count += len(block)
                    if count > metadata["size"]:
                        raise ValueError("asset stream exceeds declared size")
                    destination.write(block)
                    digest.update(block)
            if count != metadata["size"]:
                raise ValueError("asset stream differs from declared size")
            if digest.hexdigest() != sha256:
                raise ValueError("asset archive digest mismatch")
        except BaseException:
            output.unlink(missing_ok=True)
            raise


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--asset-id", required=True)
    parser.add_argument("--sha256", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    download_asset(args.asset_id, args.sha256, args.output)


if __name__ == "__main__":
    main()
