# Download report sections

The report page keeps its complete PNG download and adds a section download menu. Open the menu beside the report and choose the section you want to save. This works on U.S. reports, Asia evening reports and weekly reports.

Available groups follow the admitted report content. They can include the market overview, industry rankings, money flow, historical observations and research context. A group appears when the report contains matching panels. Supplementary panels stay in an additional-observations group.

Each exported section carries the report date, section title, sources and limitations. Values and observation dates come from the same `ReportDocument` used by the web page. Expandable source material stays in the web report and source downloads, following the existing whole-image scope.

## Files and identity

A section file uses `<date>-<kind>-<section>-report.png`. For example, the money-flow section of an Asia report can be saved as `2026-10-29-asia-daily-money-flow-report.png`.

The existing whole-report filename is unchanged. The downloader accepts only the existing report kinds and a bounded lowercase section slug. Download controls look up their image within their own report menu, so two reports can have an overview section on the same page.

## Image limits

Section images use the existing SVG renderer, selected theme and PNG downloader. The logical SVG height stays within 8000 pixels. PNG export keeps the existing 8192-pixel side limit and 12-megapixel area limit.

When a complete image exceeds the logical height budget, the complete-image control is unavailable and the section menu explains the fallback. Sections still have to pass the same SVG budget. An oversized section raises a render error for publication checks to reject. Other rendering errors remain errors.

`ReportImageBudgetError` identifies the height-budget condition through `code=report_image_height_exceeded` and its measured `height`. Publication checks can distinguish this allowed whole-image fallback from an invalid section image.

[简体中文](section-images.zh-CN.md)
