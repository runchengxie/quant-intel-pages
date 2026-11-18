"""Independent security maintenance evidence, reconciled through existing Issues alerts."""

from __future__ import annotations

import json
import os
from pathlib import Path

from scripts.public_site_alerts import IssueClient, _run_url, reconcile_alert


def process_review(client, path: Path, *, repository: str, run_id: int, audits_ok: bool = True) -> str:
    """Only complete, current, successful audit evidence can resolve maintenance alerts."""
    finding = "Security review unknown: missing or unauditable evidence; inspect retained audit artifacts."
    try:
        review = json.loads(path.read_text())
        if not isinstance(review, dict) or not isinstance(review.get("blocking"), list):
            raise ValueError("invalid review")
        state = review.get("state")
        if audits_ok and state == "current" and not review["blocking"]:
            finding = None
        elif state == "overdue" and not review["blocking"] and audits_ok:
            finding = (
                "Security applicability maintenance overdue: reassess upstream advisory and reviewed scope."
            )
        elif review["blocking"]:
            finding = "Security review blocking: unknown findings or invalidated applicability; inspect audit artifacts."
    except (OSError, ValueError, TypeError):
        pass
    return reconcile_alert(
        client,
        key="security-review:main",
        finding=finding,
        run_url=_run_url(repository, run_id),
        event_id=run_id,
    )


def main() -> None:
    print(
        process_review(
            IssueClient.from_environment(),
            Path(os.environ["SECURITY_REVIEW_STATUS"]),
            repository=os.environ["GITHUB_REPOSITORY"],
            run_id=int(os.environ["GITHUB_RUN_ID"]),
            audits_ok=all(
                os.environ.get(name) == "success" for name in ("NPM_AUDIT_OUTCOME", "PYTHON_AUDIT_OUTCOME")
            ),
        )
    )


if __name__ == "__main__":
    main()
