// Generated from TypeScript by npm run legacy:build; do not edit.
"use strict";
var marketIntelUtils = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/legacy-source/summary-utils.ts
  var summary_utils_exports = {};
  __export(summary_utils_exports, {
    isHealthDelayed: () => isHealthDelayed,
    selectVisibleInsights: () => selectVisibleInsights,
    selectVisibleReports: () => selectVisibleReports,
    selectVisibleSummaries: () => selectVisibleSummaries
  });
  function selectVisibleSummaries(summaries, reports, selectedDate, limit = 5) {
    const reportsById = new Map(reports.map((report) => [report.id, report]));
    const publicDates = [...new Set(reports.map((report) => report.date))].sort((left, right) => right.localeCompare(left)).slice(0, limit);
    const allowedDates = selectedDate ? [selectedDate] : publicDates;
    return summaries.filter((summary) => {
      const morning = reportsById.get(summary.morning_report_id);
      const evening = reportsById.get(summary.evening_report_id);
      return Boolean(morning) && ["morning", "evening"].includes(morning?.kind ?? "") && evening?.kind === "evening" && summary.date === morning?.date && (morning?.kind === "evening" ? evening.date < morning.date : evening.date <= (morning?.date ?? "")) && allowedDates.includes(summary.date);
    }).sort((left, right) => right.date.localeCompare(left.date));
  }
  function selectVisibleReports(reports, selectedDate, kind) {
    const latestDate = [...new Set(reports.map((report) => report.date))].sort((left, right) => right.localeCompare(left))[0];
    const targetDate = selectedDate || latestDate;
    return reports.filter((report) => report.date === targetDate && (kind === "all" || report.kind === kind)).sort((left, right) => {
      if (left.kind !== right.kind) return left.kind === "morning" ? -1 : 1;
      return left.id.localeCompare(right.id);
    });
  }
  function selectVisibleInsights(insights, reports, selectedDate) {
    const ids = new Set(reports.map((report) => report.id));
    return selectVisibleSummaries(insights, reports, selectedDate).filter((insight) => Array.isArray(insight.source_report_ids) && insight.source_report_ids.every((id) => typeof id === "string" && ids.has(id)));
  }
  function isHealthDelayed(health, now = Date.now()) {
    const elapsed = (now - Date.parse(health.latest_source_generated_at ?? "")) / 36e5;
    const targetEnd = Date.parse(`${health.latest_target_date}T23:59:59.999+08:00`);
    const targetAge = (now - targetEnd) / 36e5;
    return ["stale", "behind", "missing", "invalid_timestamp"].includes(health.status ?? "") || Number.isFinite(elapsed) && elapsed > health.max_age_hours || !health.expected_date && Number.isFinite(targetAge) && targetAge > health.max_age_hours;
  }
  return __toCommonJS(summary_utils_exports);
})();
if (typeof module !== "undefined" && module.exports) module.exports = marketIntelUtils;
if (typeof window !== "undefined") window.marketIntelUtils = marketIntelUtils;
