import { US_REPORT_LABELS, type Locale } from './locale.ts';

/** Bind report-image controls using the same locale catalog on every route. */
export function initializeReportDownloads(locale: Locale = 'en-US'): void {
  const language = locale === 'zh-CN' ? 0 : 1;
  document.querySelectorAll('[data-report-image]').forEach((element) => {
    if (!(element instanceof HTMLButtonElement)) return;
    element.addEventListener('click', async () => {
      const { chartTarget, statusTarget, reportDate, reportKind, reportSection } = element.dataset;
      if (!chartTarget || !statusTarget) return;
      const scope = reportSection ? element.closest('[data-report-section-exports]') : document;
      const chart = scope?.querySelector(chartTarget);
      const status = scope?.querySelector(statusTarget);
      if (!(chart instanceof SVGElement) || !status) return;
      element.disabled = true;
      status.textContent = US_REPORT_LABELS.pngGenerating[language];
      try {
        if (!reportDate || (reportKind !== 'market-daily' && reportKind !== 'asia-daily' && reportKind !== 'weekly')) {
          throw new Error('Invalid report image identity');
        }
        const { downloadMarketChartPng } = await import('./market-chart-download.ts');
        await downloadMarketChartPng(chart, reportDate, reportKind, reportSection);
        status.textContent = US_REPORT_LABELS.pngDone[language];
      } catch {
        status.textContent = US_REPORT_LABELS.pngFailed[language];
      } finally {
        element.disabled = false;
      }
    });
  });
}
