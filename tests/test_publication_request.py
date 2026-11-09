"""Trusted workflow request preparation uses fixed public marker reads."""

import io
import json
import sys
from urllib.error import HTTPError

import pytest

from scripts import publication_request


@pytest.mark.parametrize("payload", [b"x" * 4097, b"{}", b"not-json"])
def test_live_marker_rejects_invalid_responses(monkeypatch, payload):
    class Opener:
        def open(self, request, timeout):
            assert request.full_url == publication_request.PUBLIC_MARKER
            assert not request.has_header("Authorization")
            assert timeout == 30
            return io.BytesIO(payload)

    monkeypatch.setattr(publication_request, "build_opener", lambda _handler: Opener())
    with pytest.raises(ValueError):
        publication_request.live_marker()


@pytest.mark.parametrize("status", [404, 403, 500])
def test_live_marker_only_absence_allows_bootstrap(monkeypatch, status):
    class Opener:
        def open(self, request, timeout):
            raise HTTPError(request.full_url, status, "failure", {}, None)

    monkeypatch.setattr(publication_request, "build_opener", lambda _handler: Opener())
    if status == 404:
        assert publication_request.live_marker() is None
    else:
        with pytest.raises(ValueError):
            publication_request.live_marker()


@pytest.mark.parametrize("synthetic", [False, True])
def test_request_cli_uses_trusted_workflow_values_and_preserves_receipt(tmp_path, monkeypatch, synthetic):
    receipt = tmp_path / "receipt.json"
    receipt.write_text(
        json.dumps({"bundle_id": "b" * 64, "archive_sha256": "c" * 64, "producer_revision": "d" * 40})
    )
    original = receipt.read_bytes()
    context, outputs = tmp_path / "context.json", tmp_path / "outputs"
    for key, value in {
        "CANDIDATE_ID": "candidate-1",
        "GITHUB_SHA": "a" * 40,
        "GITHUB_RUN_ID": "12",
        "GITHUB_RUN_ATTEMPT": "2",
        "GITHUB_OUTPUT": str(outputs),
        "EXPECTED_PARENT": "__bootstrap__",
        "FIRST_PUBLICATION": "true",
    }.items():
        monkeypatch.setenv(key, value)
    monkeypatch.setattr(
        sys,
        "argv",
        ["publication_request", "--receipt", str(receipt), "--context", str(context)]
        + (["--synthetic"] if synthetic else []),
    )
    monkeypatch.setattr(publication_request, "live_marker", lambda: None)
    publication_request.main()
    assert receipt.read_bytes() == original
    assert json.loads(context.read_text())["workflow_run_id"] == "12"
    assert outputs.read_text().startswith("status=publish\nmarker=")


def test_successful_live_marker(monkeypatch):
    from scripts.content_publication_marker import marker

    value = marker(
        {
            "candidate_id": "one",
            "content_sha256": "c" * 64,
            "producer_revision": "d" * 40,
            "renderer_revision": "a" * 40,
            "workflow_run_id": "12",
            "workflow_run_attempt": "1",
        },
        "b" * 64,
    )

    class Opener:
        def open(self, request, timeout):
            return io.BytesIO(json.dumps(value).encode())

    monkeypatch.setattr(publication_request, "build_opener", lambda _handler: Opener())
    assert publication_request.live_marker() == value
