# Editorial report implementation

The owner approved implementing the visual study (2026-10-24) rather than leaving
it as a mockup. Use the editorial direction with research-style evidence notes
across U.S. morning, Asia evening and weekly reports, on both locales and all
current latest/dated/history routes. No new research or fabricated daily summary.

Use near-white paper/charcoal type, serif major headings, sans body, tabular
numbers, restrained red/blue semantic accents, open sections and ruled metric
strips instead of rounded cards and gradients. One set of theme tokens governs
all reports. Mobile typography and native text reflow; only individual wide
evidence tables may scroll. Charts remain server-rendered and no-JS readable.
Keep material missing-data/session/score/sample caveats beside relevant content.

Daily HTML reading must no longer rely on the full fixed-width report SVG.
Native U.S. content consumes the existing validated summary and exposes prices,
units, observation dates, source links and reviewed claims without new inference.
Native Asia content preserves the full admitted report and market session
semantics, using the existing parsers and sanitized translated Markdown. Numeric
charts consume admitted facts, never infer missing rows or turn scores into odds.
Weekly retains native charts, full translated body, original and lazy exploration.

Preserve existing standalone SVG generation and download DOM identifiers as the
explicit image/export view; do not change image producers, published attachments,
report hashes, source identities, sender destinations, receipts or schedules.
The normal reading view is native; image view is an optional collapsed details.
Keep all original source/download formats, history links and locale/theme state.
No dependencies or remote font/CDN requirement. Use system serif fallbacks with
CJK-aware typography; preserve current machine-neutral contracts and locale copy.

Approach: shared editorial CSS tokens and reusable native daily components,
reusing the existing validation/data adapters. Recoloring old SVG containers
alone fails the mobile requirement; replacing image export in this rollout would
unnecessarily change delivery identities. Published images stay immutable.
