# Completed website build identity

Record the identity of formal Pages builds before artifacts are uploaded. Pages owns rendering and build identity; Platform owns report generation/export; Deploy owns production publication and permanent ledger archival.

Use `market_intel_pages.build_identity.v1`, separate from `market_intel.report_quality.v1`. Record clean actual Pages revision and declared CI revision separately, installed immutable exporter revision and launcher hash, dependency versions/locks, task/run attempt, timestamps, source and generator hashes, original inputs, exported snapshot, quality receipt reference/hash and final output file hashes. An unspecified operator remains null. Status means `completed`, never `published`.

Freeze original public input bytes before export, validate and render the separate exported snapshot, and assemble final output separately. Recheck inputs, source and quality evidence before promotion. No public output may contain identity receipts. Receipt paths must be new, external and free of symbolic-link traversal.

Formal mode fails closed for changed inputs, dirty or mismatched source, unverifiable installed exporter, missing/failed/mismatched quality evidence, unsafe paths or receipt write failure. Retain old output until final external identity publication succeeds. Cross-directory publication is not atomic; rollback failure must retain recovery material and report an incomplete operation. Upload requires independent output/quality verification.

Include both receipts in the existing publication ledger. Deploy already binds that ledger to run/artifact IDs and hashes; no new registry is required. Historical unknown source/task/agent fields remain unknown. Build identity does not authorize archive deletion or production changes.

Validation covers normal source/input/output binding, mutations across validation/render, missing or stale quality evidence, mismatched installed launcher, output/identity write failures and recovery, and actual workflow upload-gate behavior with matching/corrupt outputs. Use complete repository checks for this build/workflow contract change.
