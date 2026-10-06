# Legacy archive lifecycle

`quant-intel-pages` is the maintained static report website. Its Git history and dated snapshots also provide recovery material. Keep the public site available while readers, maintained links, or recovery procedures depend on it.

## Retirement gates

The repository owner may propose retiring the live Pages deployment after all of these conditions are checked:

1. Required historical reports, snapshots, and downloads are available at a documented replacement URL, or are explicitly designated as archive-only with a durable access path.
2. Maintained links in the new report site, project documentation, and deployment configuration have been redirected or intentionally kept pointed at the archive.
3. No production scheduler, release, rollback, or recovery runbook requires the live legacy site.
4. The archive can be reconstructed from its immutable Git history, and the proposed replacement or archival URL has been verified.
5. The owner records the decision, the URLs that remain supported, and the recovery procedure in a dated maintenance record.

Retirement may mean stopping the live Pages deployment while retaining the repository and Git history. It does not imply deleting snapshots, rewriting history, or removing redirects. Those are separate changes and require their own impact review. Until the gates are met and recorded, keep the current archive and rollback entry point available.

## Current scope

Report generation and evidence review belong to `quant-intel-platform`; production scheduling belongs to `quant-intel-deploy`. Pages owns the frontend, static rendering, public downloads, and website monitoring. Retirement must be reviewed separately from ordinary frontend maintenance.

## Snapshot archive, 2026-10-06

Before restoring the maintained frontend, the Pages snapshot at `a67720efdee3116b96926bc6cbb5d0fe4ba5ed3f` was compared with Platform's public snapshot from merged revision `66a74f5549b294ae99955bd292755c7b4522fe71`. Pages had 30 files and Platform had 45. Of 22 shared paths, 15 were identical and seven differed. Pages had eight archive-only report files; Platform had 23 files absent from Pages.

The Pages input snapshot is retained at `artifacts/archive/pre-separation-2026-10-06/public/`; trailing blank-line formatting was normalized, while the original bytes remain recoverable from the recorded Git revision. The active `artifacts/public/` now contains Platform's validated five-date snapshot. Older files remain outside the current report window. The archive is not copied into the website output; links to older material must use an explicit archive location if they need to be published.
