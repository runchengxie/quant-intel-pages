import { readFile } from 'node:fs/promises';
import { test, expect, type Page } from '@playwright/test';

const base = '/quant-intel-pages';
const injected = '<img src=x onerror="window.injected=true">';
const reports = [
  { id: 'new-morning', date: '2026-10-13', kind: 'morning', title: 'Morning fixture', summary: injected, source_url: 'reports/morning.md', sections: [{ title: 'Evidence', paragraphs: [injected, '| A | B |', '|---|---|', '| 1 | 2 |'] }] },
  { id: 'new-evening', date: '2026-10-13', kind: 'evening', title: 'Evening fixture', summary: 'Evening summary', sections: [] },
  { id: 'old-evening', date: '2026-10-12', kind: 'evening', title: 'Archived fixture', summary: 'Archive', sections: [] },
];
async function legacyEntry(page: Page, optionalFailure = false) {
  await page.route(`${base}/legacy/**`, async route => {
    const name = new URL(route.request().url()).pathname.split('/').pop() || 'index.html';
    const path = name === 'market-daily-utils.js' ? 'src/lib/market-daily-utils.js' : `src/legacy/${name}`;
    await route.fulfill({ body: await readFile(path), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html' });
  });
  await page.route(`${base}/data/**`, async route => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    if (name === 'reports.json') {
      await route.fulfill({ json: { schema_version: 'market_intel_pages.reports.v1', generated_at: '2026-10-13T12:00:00Z', reports } });
    } else if (optionalFailure) {
      await route.fulfill({ status: 503, body: 'unavailable' });
    } else if (name === 'daily_summaries.json') {
      await route.fulfill({ json: { schema_version: 'market_intel_pages.daily_summaries.v1', summaries: [{ date: '2026-10-13', morning_report_id: 'new-morning', evening_report_id: 'new-evening', text: 'Paired daily fixture' }] } });
    } else if (name === 'health.json') {
      await route.fulfill({ json: { schema_version: 'market_intel_pages.health.v1', latest_target_date: '2026-10-13', latest_source_generated_at: '2026-10-13T12:00:00Z', max_age_hours: 48, pair_available: true } });
    } else if (name === 'insights.json') {
      await route.fulfill({ json: { schema_version: 'market_intel_pages.insights.v1', insights: [], outcomes: [], generation: { status: 'not_configured' } } });
    } else await route.fulfill({ status: 404 });
  });
  await page.goto(`${base}/legacy/index.html`);
}

test('full legacy entry preserves report filters, archive, theme and safe content', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await legacyEntry(page);
  await expect(page.locator('#report-list .report-card')).toHaveCount(2);
  await expect(page.locator('#daily-summary-list')).toContainText('Paired daily fixture');
  await expect(page.locator('#new-morning .report-summary')).toHaveText(injected);
  await page.locator('#new-morning summary').click();
  await expect(page.locator('#new-morning .report-body table')).toBeVisible();
  await expect(page.locator('#new-morning img')).toHaveCount(0);
  await expect(page.locator('#new-morning .source-link')).toHaveAttribute('href', '../reports/morning.md');
  await page.locator('.filter[data-kind="evening"]').click();
  await expect(page.locator('#report-list .report-card')).toHaveCount(1);
  await expect(page.locator('#report-list')).toContainText('Evening fixture');
  await page.locator('#date-filter').selectOption('2026-10-12');
  await expect(page.locator('#report-list')).toContainText('Archived fixture');
  await page.locator('.filter[data-kind="morning"]').click();
  await expect(page.locator('#empty-state')).toBeVisible();
  await page.locator('#clear-date').click();
  await expect(page.locator('#report-list')).toContainText('Morning fixture');
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(errors).toEqual([]);
});

test('optional index failures preserve reports and show fallback statuses', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await legacyEntry(page, true);
  await expect(page.locator('#report-list .report-card')).toHaveCount(2);
  await expect(page.locator('#load-error')).toBeHidden();
  await expect(page.locator('#summary-empty')).toBeVisible();
  await expect(page.locator('#insight-status')).toContainText('暂时无法读取');
  await expect(page.locator('#data-health')).toContainText('暂时无法核对');
  await expect(page.locator('#market-daily-status')).toContainText('尚未发布');
  expect(errors).toEqual([]);
});

test('complete legacy entry renders published market facts, downloads PNG and shows insight evidence', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await legacyEntry(page);
  await page.route(`${base}/data/**`, async route => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    if (name === 'health.json') {
      await route.fulfill({ status: 404 });
      return;
    }
    await route.fulfill({ body: await readFile(`artifacts/public/data/${name}`), contentType: 'application/json' });
  });
  await page.reload();
  await expect(page.locator('#report-list .report-card')).not.toHaveCount(0);
  await expect(page.locator('#market-daily-charts .market-daily-chart')).not.toHaveCount(0);
  await expect(page.locator('#market-daily-files a').first()).toHaveAttribute('href', /\.\.\/reports\/\d{4}-\d{2}-\d{2}-market-daily\.(txt|md)/);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#market-daily-files button').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^\d{4}-\d{2}-\d{2}-market-daily-charts\.png$/);
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  if (!stream) throw new Error('PNG download stream unavailable');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const png = Buffer.concat(chunks);
  expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  await expect(page.locator('#market-daily-files button')).toBeEnabled();
  await expect(page.locator('#insight-list .insight-card')).toHaveCount(1);
  await page.locator('#insight-list .evidence-details summary').first().click();
  await expect(page.locator('#insight-list .evidence-item').first()).toBeVisible();
  await expect(page.locator('#load-error')).toBeHidden();
  expect(errors).toEqual([]);
});


test('primary report fetch failure shows the load error without an uncaught exception', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await legacyEntry(page);
  await page.route(`${base}/data/reports.json`, route => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.reload();
  await expect(page.locator('#load-error')).toBeVisible();
  await expect(page.locator('#report-list .report-card')).toHaveCount(0);
  await expect(page.locator('#theme-toggle')).toContainText('主题：系统');
  expect(errors).toEqual([]);
});
