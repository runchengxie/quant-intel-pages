# Unified navigation and latest weekly report

The owner approved one shared header ordered U.S. morning report, Asia evening
report, weekly style analysis, About, followed by language and theme controls.
On small screens, brand and controls form the first row and content links wrap
below. Current sections are identifiable; links stay within the selected locale.
Language switches retain the current dated report, weekly landing page or About
page. Preserve existing English-default entry routes and explicit Chinese routes.

Weekly landing pages render the newest admitted report directly, with earlier
reports underneath in descending date order. Dated routes remain shareable and
show links to other published versions. An empty public window remains readable.
The latest report links to its dated permalink. Never change data, report hashes,
image contracts or delivery receipts.

About is a bilingual reader-oriented page covering the three publications,
reading dates and sources, limitations and links to the existing methods and
project source. It replaces the primary documentation navigation link; detailed
documentation remains linked from About.

Approach: reuse Astro components for header and theme initialization/controller,
and reuse WeeklyPage for both latest and dated reports. Per-page copied headers
would keep the current inconsistencies; separate weekly layouts would duplicate
report rendering. Keep existing fonts, paper colors and chart rendering. Dark
mode must apply to weekly cards and About as well as the existing daily pages.
No dependencies, generator, scheduler or deployment-configuration changes.
