import { US_REPORT_LABELS, type Locale } from './locale.ts';

/** Bind report-image controls using the same locale catalog on every route. */
export function initializeReportDownloads(locale: Locale = 'en-US'): void {
  const language = locale === 'zh-CN' ? 0 : 1;
  document.querySelectorAll('[data-report-image]').forEach((element) => {
    if (!(element instanceof HTMLButtonElement)) return;
    element.addEventListener('click', async () => {
      const { chartTarget, statusTarget, reportDate, reportKind } = element.dataset;
      if (!chartTarget || !statusTarget) return;
      const chart = document.querySelector(chartTarget);
      const status = document.querySelector(statusTarget);
      if (!(chart instanceof SVGElement) || !status) return;
      element.disabled = true;
      status.textContent = US_REPORT_LABELS.pngGenerating[language];
      try {
        if (!reportDate || (reportKind !== 'market-daily' && reportKind !== 'asia-daily')) {
          throw new Error('Invalid report image identity');
        }
        const { downloadMarketChartPng } = await import('./market-chart-download.ts');
        await downloadMarketChartPng(chart, reportDate, reportKind);
        status.textContent = US_REPORT_LABELS.pngDone[language];
      } catch {
        status.textContent = US_REPORT_LABELS.pngFailed[language];
      } finally {
        element.disabled = false;
      }
    });
  });
}
