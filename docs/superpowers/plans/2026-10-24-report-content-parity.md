# Report content parity plan

**Goal:** Content/chart parity with image baseline, deduplication and shared editorial web/export presentation.
**Spec:** docs/superpowers/specs/2026-10-24-report-content-parity-design.md
**Architecture:** Source-derived typed ReportDocument panels; shared native panel component, SVG renderer and theme. US and Asia adapters are independent; root owns common infrastructure/integration. Installed delivery contracts audited read-only before publication.

- [ ] Define shared types/theme/geometry with meaningful tests; write regression cases that expose duplicate US rows and missing Asia panels.
- [ ] US adapter: same paired value/change tables as image, full reviewed prose/evidence, one visible row per security. New native view consumes same document as SVG.
- [ ] Asia adapter: all image modules, validation and fallback preservation; default native chart panels, original in details. Match lower-chart exact-date/value/unit dedup rules.
- [ ] Shared native rendering, SVG export and canonical typography/colors; integrate latest/history/dated routes and enforce source identity.
- [ ] Audit weekly/image publication immutability and sender idempotency; implement compatible shared styled image route without replacing existing published assets or resending.
- [ ] Verify image-versus-web section/row/chart parity, incomplete inputs, noJS, mobile, both locales/themes, source precision and full repository gates.
- [ ] Independent review, normal task PR/checks/merge/deployment, live validation and task-only cleanup; evidence retained outside repository.
