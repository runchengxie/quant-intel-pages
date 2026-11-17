# Publication audit recovery

Goal: restore the blocked US daily publication without suppressing unrelated audit failures.

- [x] Add fail-closed audit policy tests for the sole unpatched, non-applicable advisory.
- [x] Implement exact advisory review bound to the reviewed lockfile, expiring 2026-11-25 UTC; retain raw npm output.
- [ ] Run local quality gates and independently review the change; merge through required CI.
- [ ] Refresh the pending daily PR against the repaired main, verify deployment and live report hash.
- [ ] Resume authorized image delivery and verify both receipts without duplicate sends.

The exception is an applicability decision for trusted build-time glob patterns, not an upstream vulnerability fix. New advisories, dependency changes, expired review and registry errors must fail closed. No runtime or scheduler configuration changes are planned.
