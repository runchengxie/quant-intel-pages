import { expect, test, type Locator } from '@playwright/test';
import { formatDisplayValue } from '../../src/lib/display-value';
import { dailyDocuments } from './daily-source';
import type { ReportDocument } from '../../src/lib/report-document';

const base = '/quant-intel-pages';
async function assertDocument(native: Locator, svg: Locator, document: ReportDocument) {
  // Compare the complete inventory, including missing-data text and disclosures.
  // A renderer dropping an optional panel or row must fail just like a wrong number.
  expect(await native.locator('[data-report-panel]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-report-panel'))))
    .toEqual(document.panels.map(panel => panel.id));
  expect(await svg.locator('[data-report-panel]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-report-panel'))))
    .toEqual(document.panels.filter(panel => !panel.disclosure).map(panel => panel.id));
  for (const panel of document.panels) {
    const view = native.locator(`[data-report-panel="${panel.id}"]`);
    await expect(view).toBeVisible();
    if (panel.disclosure) {
      await expect(view).not.toHaveAttribute('open');
      await view.locator(':scope > summary').click();
    }
    await expect(view.locator('[data-report-row]')).toHaveCount(panel.rows?.length ?? 0);
    for (const row of panel.rows ?? []) {
      const item = view.locator(`[data-report-row="${row.id}"]`);
      await expect(item).toContainText(row.label);
      if (row.valueText) {
        const display = formatDisplayValue(row.valueText, document.locale);
        await expect(item).toContainText(display);
        if (display !== row.valueText) await expect(item.locator('strong')).toHaveAttribute('title', row.valueText);
      }
      for (const [index, cell] of (row.cells ?? []).entries()) {
        const display = formatDisplayValue(cell.text, document.locale);
        await expect(item.locator('.document-cells')).toContainText(display);
        if (display !== cell.text) await expect(item.locator('.document-cells dd').nth(index)).toHaveAttribute('title', cell.text);
      }
    }
    const rows = panel.rows ?? [];
    const sameDate = rows.length > 0 && rows.every(row => row.observationDate === rows[0].observationDate);
    const dates = (sameDate ? [rows[0]?.observationDate] : rows.map(row => row.observationDate)).filter(Boolean);
    expect(await view.locator('.document-evidence time').evaluateAll(nodes => nodes.map(node => node.getAttribute('datetime')))).toEqual(dates);
    await expect(view.locator('.document-records')).toHaveCount(rows.some(row => row.records?.length) ? 1 : 0);
    for (const record of rows.flatMap(row => row.records ?? [])) await expect(view.locator('.document-records')).toContainText(record);
    for (const paragraph of [...panel.paragraphs ?? [], ...panel.notes ?? []]) {
      if (paragraph.trim()) await expect(view).toContainText(paragraph);
    }
    const sources = [...panel.sources ?? [], ...(panel.rows ?? []).flatMap(row => row.sources ?? [])];
    expect([...new Set(await view.locator('.document-evidence a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))))].sort())
      .toEqual([...new Set(sources.map(source => source.url))].sort());
    if (panel.disclosure) await view.locator(':scope > summary').click();
  }
}
for (const locale of ['en', 'zh'] as const) for (const width of [390, 1280]) {
  test(`shared report content ${locale} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(`${base}/${locale === 'en' ? 'en/' : '?locale=zh-CN'}`);
    const documents = dailyDocuments(locale);
    for (const [kind, chart] of [['us', 'market'], ['asia', 'asia']] as const) {
      const native = page.locator(`[data-native-${kind}] [data-report-document]`).first();
      const svg = page.locator(`#${chart}-daily-chart svg`);
      await expect(svg).toBeHidden();
      await assertDocument(native, svg, documents[kind]);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}
// Weekly input is deliberately synthetic and fixed by weeklyBrowserInput().
test('weekly styled image is separate from immutable source PNG', async ({ page }) => {
  await page.goto(`${base}/en/weekly/2026-10-23/`);
  const original = page.getByRole('link', { name: 'Original published image', exact: true });
  await expect(original).toHaveAttribute('download', '2026-10-23-weekly.png');
  const button = page.locator('button[data-report-kind="weekly"]');
  await expect(button).toHaveAttribute('data-report-content-hash', '605277c1995edf5fbca346957eb6b52cf9fdcdd006b056abde0eed104158ac54');
  await expect(page.locator('#weekly-report-chart svg')).toBeHidden();
  const pending = page.waitForEvent('download');
  await button.click();
  expect((await pending).suggestedFilename()).toBe('2026-10-23-weekly-report.png');
});
