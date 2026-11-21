"""Bounded public asset transport never follows arbitrary or authenticated URLs."""

import hashlib
import io
import json

import pytest


def asset_module():
    from scripts import content_asset

    return content_asset


def test_fixed_asset_identity():
    asset = asset_module()
    assert (
        asset.asset_url("42")
        == "https://api.github.com/repos/runchengxie/quant-intel-pages/releases/assets/42"
    )
    for value in ["0", "-1", "https://evil.invalid", "1/../../", "01"]:
        with pytest.raises(ValueError):
            asset.asset_url(value)


@pytest.mark.parametrize(
    "url",
    [
        "http://release-assets.githubusercontent.com/a",
        "https://evil.invalid/a",
        "https://github.com.evil.invalid/a",
        "https://user@github.com/a",
        "https://github.com:444/a",
        "https://objects.githubusercontent.com/a#fragment",
    ],
)
def test_redirect_host_restrictions(url):
    with pytest.raises(ValueError):
        asset_module().validate_url(url)


def test_download_exact_hash_size_and_no_secrets(tmp_path, monkeypatch):
    asset = asset_module()
    payload = b"public bundle"
    requests = []

    def open_request(request, timeout):
        requests.append(request)
        if request.get_header("Accept") == "application/vnd.github+json":
            return io.BytesIO(
                json.dumps(
                    {"id": 42, "size": len(payload), "state": "uploaded", "url": asset.asset_url("42")}
                ).encode()
            )
        return io.BytesIO(payload)

    monkeypatch.setattr(asset, "open_public", open_request)
    monkeypatch.setenv("GITHUB_TOKEN", "secret")
    output = tmp_path / "bundle.zip"
    asset.download_asset("42", hashlib.sha256(payload).hexdigest(), output)
    assert output.read_bytes() == payload
    assert all(not request.has_header("Authorization") for request in requests)
    with pytest.raises(ValueError, match="digest"):
        asset.download_asset("42", "f" * 64, tmp_path / "bad.zip")
    assert not (tmp_path / "bad.zip").exists()


@pytest.mark.parametrize("change", ["id", "url", "state", "oversized", "short", "long"])
def test_invalid_asset_metadata_or_stream(tmp_path, monkeypatch, change):
    asset = asset_module()
    metadata = {"id": 42, "size": 4, "state": "uploaded", "url": asset.asset_url("42")}
    if change in {"id", "url", "state"}:
        metadata[change] = "bad"
    if change == "oversized":
        metadata["size"] = asset.MAX_ARCHIVE_BYTES + 1
    payload = b"x" * (3 if change == "short" else 5)

    def open_request(request, timeout):
        return io.BytesIO(
            json.dumps(metadata).encode()
            if request.get_header("Accept") == "application/vnd.github+json"
            else payload
        )

    monkeypatch.setattr(asset, "open_public", open_request)
    with pytest.raises(ValueError):
        asset.download_asset("42", hashlib.sha256(payload).hexdigest(), tmp_path / "bundle.zip")
    assert not (tmp_path / "bundle.zip").exists()


@pytest.mark.parametrize("status", [301, 302, 303, 307, 308])
def test_redirects_strip_every_secret_and_follow_only_allowed_hosts(monkeypatch, status):
    from urllib.error import HTTPError
    from urllib.request import Request

    asset = asset_module()
    calls = []

    class Opener:
        def open(self, request, timeout):
            calls.append(request)
            if len(calls) == 1:
                raise HTTPError(
                    request.full_url,
                    status,
                    "redirect",
                    {"Location": "https://release-assets.githubusercontent.com/public?signature=hidden"},
                    None,
                )
            return io.BytesIO(b"ok")

    monkeypatch.setattr(asset, "build_opener", lambda _handler: Opener())
    request = Request(asset.asset_url("1"), headers={"Authorization": "secret", "Cookie": "private"})
    with asset.open_public(request, 30) as stream:
        assert stream.read() == b"ok"
    assert len(calls) == 2
    assert all(not item.has_header("Authorization") and not item.has_header("Cookie") for item in calls)


@pytest.mark.parametrize("failure", ["limit", "host", "http", "network"])
def test_transport_errors_are_bounded_and_hide_signed_urls(monkeypatch, failure):
    from urllib.error import HTTPError
    from urllib.request import Request

    asset = asset_module()
    calls = []

    class Opener:
        def open(self, request, timeout):
            calls.append(request)
            if failure == "network":
                raise OSError("secret signed URL")
            raise HTTPError(
                request.full_url,
                403 if failure == "http" else 302,
                "secret signed URL",
                {
                    "Location": "https://evil.invalid/secret"
                    if failure == "host"
                    else "https://github.com/secret"
                },
                None,
            )

    monkeypatch.setattr(asset, "build_opener", lambda _handler: Opener())
    with pytest.raises(ValueError) as caught:
        asset.open_public(Request(asset.asset_url("1")), 30)
    assert "secret" not in str(caught.value)
    assert len(calls) == (4 if failure == "limit" else 1)


@pytest.mark.parametrize("data", [b"[]", b"x" * 65537])
def test_invalid_metadata_shapes_and_size(monkeypatch, data):
    asset = asset_module()
    monkeypatch.setattr(asset, "open_public", lambda *args: io.BytesIO(data))
    with pytest.raises(ValueError):
        asset.read_metadata("1")


def test_asset_cli_and_existing_output(tmp_path, monkeypatch):
    import sys

    asset = asset_module()
    payload = b"data"

    def opener(request, timeout):
        value = json.dumps({"id": 42, "size": 4, "state": "uploaded", "url": asset.asset_url("42")}).encode()
        return io.BytesIO(value if request.get_header("Accept") == "application/vnd.github+json" else payload)

    monkeypatch.setattr(asset, "open_public", opener)
    output = tmp_path / "bundle.zip"
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "content_asset",
            "--asset-id",
            "42",
            "--sha256",
            hashlib.sha256(payload).hexdigest(),
            "--output",
            str(output),
        ],
    )
    asset.main()
    with pytest.raises(FileExistsError):
        asset.main()
    assert output.read_bytes() == payload
    with pytest.raises(ValueError, match="digest"):
        asset.download_asset("42", "bad", tmp_path / "bad.zip")


def test_redirect_handler_defers_to_bounded_caller():
    assert asset_module().NoRedirect().redirect_request(None, None, 302, "", {}, "https://github.com") is None


def test_authenticated_metadata_then_public_zip(tmp_path, monkeypatch):
    asset = asset_module()
    payload = b"public bundle"
    download_url = "https://github.com/runchengxie/quant-intel-pages/releases/download/tag/bundle.zip"
    calls = []

    class Opener:
        def open(self, request, timeout):
            calls.append((request.full_url, request.get_header("Authorization")))
            if request.full_url == asset.asset_url("42"):
                return io.BytesIO(
                    json.dumps(
                        {
                            "id": 42,
                            "size": len(payload),
                            "state": "uploaded",
                            "url": asset.asset_url("42"),
                            "browser_download_url": download_url,
                        }
                    ).encode()
                )
            return io.BytesIO(payload)

    monkeypatch.setattr(asset, "build_opener", lambda _handler: Opener())
    output = tmp_path / "bundle.zip"
    asset.download_asset("42", hashlib.sha256(payload).hexdigest(), output, token="test-token")
    assert calls == [(asset.asset_url("42"), "Bearer test-token"), (download_url, None)]
    assert output.read_bytes() == payload


@pytest.mark.parametrize("status", [302, 403])
def test_metadata_token_never_follows_redirects(monkeypatch, status):
    from urllib.error import HTTPError

    asset = asset_module()
    calls = []

    class Opener:
        def open(self, request, timeout):
            calls.append(request.full_url)
            raise HTTPError(request.full_url, status, "secret", {"Location": "https://github.com"}, None)

    monkeypatch.setattr(asset, "build_opener", lambda _handler: Opener())
    with pytest.raises(ValueError, match=f"metadata request failed: HTTP {status}"):
        asset.read_metadata("42", "test-token")
    assert calls == [asset.asset_url("42")]


@pytest.mark.parametrize("url", [None, "https://github.com/other/repo/releases/download/tag/file.zip"])
def test_rejects_download_outside_fixed_release(url):
    with pytest.raises(ValueError, match="public download URL mismatch"):
        asset_module().public_download_url({"browser_download_url": url})
