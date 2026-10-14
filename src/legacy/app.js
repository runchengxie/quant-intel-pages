// Generated from TypeScript by npm run legacy:build; do not edit.
"use strict";
var marketIntelApp = (() => {
  // src/lib/insights.ts
  var record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
  var strings = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");
  var evidence = (value) => record(value) && ["id", "report_id", "section", "text"].every((key) => typeof value[key] === "string");
  var outcomeEvidence = (value) => record(value) && ["report_id", "section", "text"].every((key) => typeof value[key] === "string") && (value.id === void 0 || typeof value.id === "string");
  var claim = (value) => record(value) && typeof value.text === "string" && strings(value.evidence_ids);
  var watchpoint = (value) => record(value) && ["question", "metric", "operator"].every((key) => typeof value[key] === "string") && typeof value.threshold === "number" && Number.isFinite(value.threshold);
  function rows(value, guard) {
    return Array.isArray(value) ? value.filter(guard) : [];
  }
  function latestInsight(payload) {
    const history = record(payload) && Array.isArray(payload.insights) ? payload.insights.filter(record) : [];
    const value = history.sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    if (!value || typeof value.date !== "string") return null;
    const analysis = record(value.analysis) ? value.analysis : {};
    const metrics = {};
    for (const [key, metric] of Object.entries(record(value.metrics) ? value.metrics : {})) {
      if (record(metric) && typeof metric.label === "string" && typeof metric.unit === "string") metrics[key] = { ...metric, label: metric.label, unit: metric.unit };
    }
    return {
      ...value,
      id: typeof value.id === "string" ? value.id : void 0,
      date: value.date,
      as_of: typeof value.as_of === "string" ? value.as_of : void 0,
      generated_at: typeof value.generated_at === "string" ? value.generated_at : void 0,
      analysis: {
        overview: claim(analysis.overview) ? analysis.overview : void 0,
        changes: rows(analysis.changes, claim),
        tensions: rows(analysis.tensions, claim),
        watchpoints: rows(analysis.watchpoints, watchpoint)
      },
      evidence: rows(value.evidence, evidence),
      metrics,
      quality_warnings: strings(value.quality_warnings) ? value.quality_warnings : []
    };
  }
  function insightOutcomes(payload) {
    const values = record(payload) && Array.isArray(payload.outcomes) ? payload.outcomes : [];
    return values.filter((value) => record(value) && typeof value.insight_id === "string" && Number.isInteger(value.watchpoint_index) && ["pending", "met", "not_met", "unverifiable"].includes(String(value.status)) && (value.report_id === void 0 || typeof value.report_id === "string") && (value.observed_date === void 0 || typeof value.observed_date === "string") && (value.observed_value === void 0 || value.observed_value === null || typeof value.observed_value === "number")).map((value) => ({ ...value, evidence: rows(value.evidence, outcomeEvidence) }));
  }

  // src/legacy-source/app-data.ts
  var record2 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
  var text = (value) => typeof value === "string" ? value : "";
  var strings2 = (value) => Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  var rows2 = (value) => Array.isArray(value) ? value.filter(record2) : [];
  function reports(value) {
    return rows2(value).filter((row) => ["id", "date", "kind"].every((key) => typeof row[key] === "string")).map((row) => ({
      id: text(row.id),
      date: text(row.date),
      kind: text(row.kind),
      title: text(row.title),
      summary: text(row.summary),
      generation_mode: text(row.generation_mode),
      source_url: text(row.source_url),
      sections: rows2(row.sections).map((section) => ({ title: text(section.title), paragraphs: strings2(section.paragraphs) }))
    }));
  }
  function summaries(value) {
    return rows2(value).filter((row) => ["date", "morning_report_id", "evening_report_id", "text"].every((key) => typeof row[key] === "string")).map((row) => ({
      date: text(row.date),
      morning_report_id: text(row.morning_report_id),
      evening_report_id: text(row.evening_report_id),
      text: text(row.text)
    }));
  }
  function insights(value) {
    return rows2(value).flatMap((row) => {
      const note = latestInsight({ insights: [row] });
      if (!note?.analysis.overview || typeof row.morning_report_id !== "string" || typeof row.evening_report_id !== "string") return [];
      return [{
        ...note,
        morning_report_id: row.morning_report_id,
        evening_report_id: row.evening_report_id,
        analysis: { ...note.analysis, overview: note.analysis.overview }
      }];
    });
  }
  function outcomes(value) {
    return insightOutcomes(value).map((row) => {
      const original = rows2(value.outcomes).find((item) => item.insight_id === row.insight_id && item.watchpoint_index === row.watchpoint_index);
      return { ...row, evidence_ids: strings2(original?.evidence_ids) };
    });
  }
  function health(value) {
    if (!record2(value) || typeof value.max_age_hours !== "number") return null;
    return {
      status: text(value.status),
      latest_source_generated_at: text(value.latest_source_generated_at),
      latest_target_date: text(value.latest_target_date),
      max_age_hours: value.max_age_hours,
      expected_date: text(value.expected_date),
      pair_available: value.pair_available === true
    };
  }

  // src/legacy-source/app.ts
  function requiredElement(selector) {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`Missing legacy element: ${selector}`);
    return element;
  }
  var state = {
    reports: [],
    summaries: [],
    insights: [],
    outcomes: [],
    generation: {},
    kind: "all",
    date: ""
  };
  var reportList = requiredElement("#report-list");
  var emptyState = requiredElement("#empty-state");
  var loadError = requiredElement("#load-error");
  var summaryList = requiredElement("#daily-summary-list");
  var summaryEmpty = requiredElement("#summary-empty");
  var dateFilter = requiredElement("#date-filter");
  function renderMarketDaily(payload) {
    const summary = window.marketDailyUtils.summarizeMarketDaily(payload);
    const status = requiredElement("#market-daily-status");
    const files = requiredElement("#market-daily-files");
    const charts = requiredElement("#market-daily-charts");
    const list = requiredElement("#market-daily-list");
    const claimList = requiredElement("#market-daily-claims");
    const secondary = requiredElement("#market-daily-secondary-list");
    if (!summary) {
      status.textContent = "\u7F8E\u80A1\u5B8F\u89C2\u65E5\u62A5\u5C1A\u672A\u53D1\u5E03\uFF0C\u6216\u6570\u636E\u672A\u901A\u8FC7\u6821\u9A8C\u3002";
      files.replaceChildren();
      charts.replaceChildren();
      list.replaceChildren();
      claimList.replaceChildren();
      secondary.replaceChildren();
      return;
    }
    status.textContent = window.marketDailyUtils.formatMarketDailyStatus(summary);
    files.replaceChildren(...(summary.hasTextReport ? [["\u4E0B\u8F7D\u7EAF\u6587\u672C\u62A5\u544A", "txt"], ["\u67E5\u770B Markdown \u7248\u672C", "md"]] : []).map(([label, suffix]) => {
      const link = makeElement("a", "market-daily-file", label);
      link.href = `../reports/${summary.date}-market-daily.${suffix}`;
      if (suffix === "txt") link.setAttribute("download", "");
      return link;
    }));
    const chartSvg = window.marketDailyUtils.buildMarketDailyChartSvg(summary);
    if (chartSvg) {
      const button = makeElement("button", "market-daily-file", "\u4E0B\u8F7D\u56FE\u8868 PNG");
      button.type = "button";
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await downloadMarketDailyChartPng(chartSvg, summary.date);
          button.textContent = "\u4E0B\u8F7D\u56FE\u8868 PNG";
        } catch {
          button.textContent = "\u56FE\u7247\u751F\u6210\u5931\u8D25\uFF0C\u8BF7\u4F7F\u7528\u6587\u5B57\u7248";
        } finally {
          button.disabled = false;
        }
      });
      files.append(button);
    }
    charts.replaceChildren(...window.marketDailyUtils.buildMarketDailyCharts(summary).map((chart) => {
      const figure = makeElement("figure", "market-daily-chart");
      figure.append(makeElement("figcaption", "market-daily-chart-title", `${chart.title}\uFF08${chart.unit}\uFF09`));
      chart.rows.forEach((row) => {
        const line = makeElement("div", "market-daily-chart-row");
        const label = makeElement("a", "market-daily-chart-label", row.label);
        label.href = row.sourceUrl;
        label.target = "_blank";
        label.rel = "noopener noreferrer";
        label.title = `\u89C2\u6D4B\u65E5 ${row.observationDate} \xB7 ${row.sourceLabel}`;
        const labelBox = makeElement("div", "market-daily-chart-label-box");
        labelBox.append(
          label,
          makeElement("span", "market-daily-chart-date", `\u89C2\u6D4B\u65E5 ${row.observationDate}`),
          makeElement("span", "market-daily-chart-source", row.sourceLabel)
        );
        const track = makeElement("div", "market-daily-chart-track");
        track.setAttribute("aria-hidden", "true");
        const fill = makeElement("span", `market-daily-chart-fill is-${row.side}`);
        fill.style.width = `${row.width / 2}%`;
        track.append(fill);
        const value = makeElement("span", "market-daily-chart-value", row.valueText);
        line.append(labelBox, track, value);
        figure.append(line);
      });
      figure.append(makeElement("p", "market-daily-chart-note", "\u70B9\u51FB\u540D\u79F0\u67E5\u770B\u539F\u59CB\u6765\u6E90\u3002"));
      return figure;
    }));
    const makeSourceLink = (url, label) => {
      const link = makeElement("a", "source-link", label);
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      return link;
    };
    const rateGroup = makeElement("section", "market-daily-data-group");
    rateGroup.append(makeElement("h4", "market-daily-claim-heading", "\u7F8E\u503A\u6536\u76CA\u7387"));
    const rateTable = makeElement("table", "market-daily-table");
    const rateHead = makeElement("tr");
    for (const heading of ["\u671F\u9650", "\u6536\u76CA\u7387", "\u65E5\u53D8\u52A8", "\u89C2\u6D4B\u65E5", "\u6765\u6E90"]) rateHead.append(makeElement("th", "", heading));
    rateTable.createTHead().append(rateHead);
    const rateBody = rateTable.createTBody();
    for (const row of summary.rateRows) {
      const tr = makeElement("tr");
      tr.append(
        makeElement("th", "", row.label),
        makeElement("td", "", row.levelValue === null ? "\u2014" : `${row.levelValue.toFixed(2)}%`),
        makeElement("td", "", row.changeValue === null ? "\u2014" : `${row.changeValue >= 0 ? "+" : ""}${row.changeValue.toFixed(2)} bp`),
        makeElement("td", "market-daily-date", row.observationDate ?? "\u2014")
      );
      const sourceCell = makeElement("td");
      if (row.sourceUrl) sourceCell.append(makeSourceLink(row.sourceUrl, row.sourceLabel ?? ""));
      tr.append(sourceCell);
      rateBody.append(tr);
    }
    rateGroup.append(rateTable);
    const assetsGroup = makeElement("section", "market-daily-data-group");
    assetsGroup.append(makeElement("h4", "market-daily-claim-heading", "\u5E03\u4F26\u7279\u3001\u91D1\u94F6\u4E0E\u6BD4\u7279\u5E01"));
    const assetGrid = makeElement("div", "market-daily-assets");
    for (const row of summary.crossAssetRows) {
      const card = makeElement("article", "market-daily-card");
      card.append(
        makeElement("h5", "market-daily-asset-name", row.label),
        makeElement("p", "market-daily-value", `${row.priceValue.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${row.priceUnit}`),
        makeElement("p", `market-daily-return ${row.changeValue < 0 ? "is-negative" : "is-positive"}`, `${row.changeValue >= 0 ? "+" : ""}${row.changeValue.toFixed(2)}%`),
        makeElement("span", "market-daily-date", `\u89C2\u6D4B\u65E5 ${row.observationDate} \xB7 `),
        makeSourceLink(row.sourceUrl, row.sourceLabel ?? "")
      );
      assetGrid.append(card);
    }
    assetsGroup.append(assetGrid);
    list.replaceChildren(rateGroup, assetsGroup);
    secondary.replaceChildren(...[
      ...summary.secondaryRows.map((row) => {
        const card = makeElement("article", "market-daily-card");
        card.append(makeElement("p", "market-daily-value", row.text));
        card.append(makeElement("span", "market-daily-date", `\u89C2\u6D4B\u65E5 ${row.observationDate} \xB7 `), makeSourceLink(row.sourceUrl, row.sourceLabel ?? ""));
        if (row.quality === "lagged") card.append(makeElement("span", "market-daily-lag", "\u5F53\u65E5\u6570\u636E\u672A\u516C\u5E03"));
        return card;
      }),
      ...summary.secondaryClaimSections.map((section) => {
        const group = makeElement("section", "market-daily-claim-section");
        group.append(makeElement("h3", "market-daily-claim-heading", section.title));
        section.claims.forEach((claim2) => {
          const item = makeElement("article", "market-daily-card");
          item.append(makeElement("p", "market-daily-explanation", claim2.text));
          claim2.sourceUrls.forEach((url, index) => {
            item.append(makeSourceLink(url, `\u6765\u6E90${index + 1}`));
          });
          group.append(item);
        });
        return group;
      })
    ]);
    claimList.replaceChildren(...summary.primaryClaims.map((section) => {
      const group = makeElement("section", "market-daily-claim-section");
      group.append(makeElement("h4", "market-daily-claim-heading", section.title));
      for (const claim2 of section.claims) {
        const item = makeElement("article", "market-daily-card");
        item.append(makeElement("p", "market-daily-explanation", claim2.text));
        claim2.sourceUrls.forEach((url, index) => item.append(makeSourceLink(url, `\u6765\u6E90${index + 1}`)));
        group.append(item);
      }
      return group;
    }));
  }
  async function downloadMarketDailyChartPng(svg, date) {
    const sourceUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    try {
      const picture = new Image();
      await new Promise((resolve, reject) => {
        picture.onload = resolve;
        picture.onerror = reject;
        picture.src = sourceUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = picture.width * 2;
      canvas.height = picture.height * 2;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");
      context.scale(2, 2);
      context.drawImage(picture, 0, 0);
      const png = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!png) throw new Error("PNG export unavailable");
      const downloadUrl = URL.createObjectURL(png);
      try {
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${date}-market-daily-charts.png`;
        document.body.append(link);
        link.click();
        link.remove();
      } finally {
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 6e4);
      }
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  }
  function makeElement(tag, className, text2) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text2 !== void 0) element.textContent = text2;
    return element;
  }
  function dateLabel(value) {
    const date = /* @__PURE__ */ new Date(`${value}T12:00:00`);
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long"
    }).format(date);
  }
  function renderReport(report) {
    const article = makeElement("article", "report-card");
    article.id = report.id;
    const head = makeElement("div", "report-meta");
    const kind = report.kind === "morning" ? "\u6668\u62A5" : "\u665A\u62A5";
    head.append(
      makeElement("span", "report-type", kind),
      makeElement("time", "report-date", dateLabel(report.date))
    );
    article.append(head, makeElement("h3", "report-title", report.title));
    article.append(makeElement("p", "report-summary", report.summary));
    if (report.generation_mode === "backfill") {
      article.append(makeElement("p", "replay-label", "\u8865\u53D1\u62A5\u544A\uFF1A\u6309\u8BE5\u65E5\u884C\u60C5\u91CD\u65B0\u6574\u7406\uFF0C\u751F\u6210\u65F6\u95F4\u89C1\u539F\u6587\u3002"));
    }
    const details = makeElement("details", "report-details");
    const summary = makeElement("summary", "details-toggle", "\u5C55\u5F00\u62A5\u544A\u5185\u5BB9");
    const body = makeElement("div", "report-body");
    for (const section of report.sections ?? []) {
      const sectionElement = makeElement("section", "report-section");
      sectionElement.append(makeElement("h4", "", section.title));
      sectionElement.append(...window.reportMarkdown.renderReportBlocks(document, section.paragraphs ?? []));
      body.append(sectionElement);
    }
    if (/^reports\/[a-zA-Z0-9._-]+\.md$/.test(report.source_url ?? "")) {
      const source = makeElement("a", "source-link", "\u67E5\u770B\u5B8C\u6574\u539F\u6587\uFF08Markdown\uFF09");
      source.href = `../${report.source_url}`;
      source.setAttribute("download", "");
      body.append(source);
    }
    details.append(summary, body);
    article.append(details);
    return article;
  }
  function visibleReports() {
    return window.marketIntelUtils.selectVisibleReports(state.reports, state.date, state.kind);
  }
  function renderDailySummary(summary) {
    const article = makeElement("article", "daily-note-card");
    const date = makeElement("time", "daily-note-date", dateLabel(summary.date));
    date.dateTime = summary.date;
    article.append(date, makeElement("p", "daily-note-text", summary.text));
    return article;
  }
  function renderDailySummaries() {
    const summaries2 = window.marketIntelUtils.selectVisibleSummaries(
      state.summaries,
      state.reports,
      state.date
    );
    summaryList.replaceChildren(...summaries2.map(renderDailySummary));
    summaryEmpty.hidden = summaries2.length !== 0;
  }
  function populateDateFilter() {
    const dates = [...new Set(state.reports.map((report) => report.date))].sort((left, right) => right.localeCompare(left));
    const latest = makeElement("option", "", "\u6700\u8FD1\u62A5\u544A");
    latest.value = "";
    dateFilter.replaceChildren(latest);
    for (const date of dates) {
      const option = makeElement("option", "", dateLabel(date));
      option.value = date;
      dateFilter.append(option);
    }
  }
  function render() {
    const reports2 = visibleReports();
    renderDailySummaries();
    renderInsights();
    reportList.replaceChildren(...reports2.map(renderReport));
    emptyState.hidden = reports2.length !== 0;
    requiredElement("#section-title").textContent = state.date ? `${dateLabel(state.date)}\u7684\u62A5\u544A` : state.kind === "morning" ? "\u6668\u95F4\u62A5\u544A" : state.kind === "evening" ? "\u665A\u95F4\u62A5\u544A" : "\u6700\u8FD1\u4EA4\u6613\u65E5\u7684\u62A5\u544A";
    requiredElement("#section-kicker").textContent = state.date ? "ARCHIVE" : state.kind === "all" ? "LATEST EDITION" : "DAILY EDITION";
  }
  function timestampLabel(value) {
    const date = new Date(value ?? "");
    if (Number.isNaN(date.getTime())) return "\u65F6\u95F4\u672A\u63D0\u4F9B";
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }
  function evidenceDetails(refs, evidence2) {
    const details = makeElement("details", "evidence-details");
    details.append(makeElement("summary", "", "\u67E5\u770B\u4F9D\u636E"));
    for (const ref of refs ?? []) {
      const item = evidence2.find((entry) => entry.id === ref);
      if (!item) continue;
      const box = makeElement("div", "evidence-item");
      box.append(
        makeElement("span", "evidence-label", `${item.report_id} \xB7 ${item.section}`),
        makeElement("p", "", item.text)
      );
      const report = state.reports.find((row) => row.id === item.report_id);
      if (report && /^reports\/[a-zA-Z0-9._-]+\.md$/.test(report.source_url ?? "")) {
        const source = makeElement("a", "source-link", "\u539F\u62A5\u544A");
        source.href = `../${report.source_url}`;
        box.append(source);
      }
      details.append(box);
    }
    return details;
  }
  function renderInsight(note) {
    const card = makeElement("article", "insight-card");
    card.append(
      makeElement("div", "daily-note-date", dateLabel(note.date)),
      makeElement("p", "insight-overview", note.analysis.overview.text),
      evidenceDetails(note.analysis.overview.evidence_ids, note.evidence)
    );
    const meta = `\u4FE1\u606F\u622A\u81F3 ${timestampLabel(note.as_of)} \xB7 \u89E3\u8BFB\u751F\u6210 ${timestampLabel(note.generated_at)}\uFF08\u5317\u4EAC\u65F6\u95F4\uFF09`;
    card.append(makeElement("p", "insight-meta", meta));
    if (note.generation_mode === "retrospective") {
      card.append(makeElement("p", "replay-label", "\u5386\u53F2\u6750\u6599\u56DE\u653E\uFF1A\u57FA\u4E8E\u5F52\u6863\u6216\u8865\u53D1\u62A5\u544A\u751F\u6210\uFF0C\u4FDD\u7559\u5B9E\u9645\u751F\u6210\u65F6\u95F4\u3002"));
    }
    const columns = makeElement("div", "insight-columns");
    for (const [key, title] of [["changes", "\u503C\u5F97\u7559\u610F\u7684\u53D8\u5316"], ["tensions", "\u8FD8\u6CA1\u5F97\u5230\u786E\u8BA4\u7684\u5730\u65B9"]]) {
      const section = makeElement("section", "insight-section");
      section.append(makeElement("h4", "", title));
      for (const claim2 of note.analysis[key]) {
        section.append(makeElement("p", "", claim2.text), evidenceDetails(claim2.evidence_ids, note.evidence));
      }
      columns.append(section);
    }
    card.append(columns);
    const verification = makeElement("section", "verification");
    verification.append(makeElement("h4", "", "\u7559\u7ED9\u4E0B\u4E00\u4EFD\u665A\u62A5\u7684\u95EE\u9898"));
    const labels = { pending: "\u5F85\u9A8C\u8BC1", met: "\u6761\u4EF6\u6EE1\u8DB3", not_met: "\u6761\u4EF6\u672A\u6EE1\u8DB3", unverifiable: "\u6570\u636E\u4E0D\u8DB3\uFF0C\u65E0\u6CD5\u9A8C\u8BC1" };
    if (!note.analysis.watchpoints.length) verification.append(makeElement("p", "", "\u5F53\u524D\u6750\u6599\u6CA1\u6709\u53EF\u76F4\u63A5\u6838\u5BF9\u7684\u6307\u6807\u3002"));
    note.analysis.watchpoints.forEach((point, index) => {
      const metric = note.metrics[point.metric];
      if (!metric) return;
      const outcome = state.outcomes.find((item) => item.insight_id === note.id && item.watchpoint_index === index);
      const row = makeElement("div", "watchpoint");
      row.append(
        makeElement("span", `outcome-badge ${outcome?.status ?? "pending"}`, labels[outcome?.status ?? "pending"]),
        makeElement("p", "watch-question", point.question),
        makeElement("p", "watch-condition", `${metric.label} ${point.operator} ${point.threshold}${metric.unit}`)
      );
      if (outcome?.report_id) {
        row.append(makeElement("p", "insight-meta", `\u6838\u5BF9 ${outcome.observed_date} \u665A\u62A5${outcome.observed_value !== null ? `\uFF1A${outcome.observed_value}${metric.unit}` : ""}`));
        if (outcome.evidence?.length) row.append(evidenceDetails(outcome.evidence_ids, outcome.evidence));
      }
      verification.append(row);
    });
    verification.append(makeElement("p", "insight-meta", "\u4FDD\u7559\u539F\u5224\u65AD\uFF0C\u53E6\u8BB0\u540E\u7EED\u6761\u4EF6\u6838\u5BF9\u7ED3\u679C\u3002"));
    card.append(verification);
    if (note.quality_warnings.length) {
      const quality = makeElement("details", "quality-notes");
      quality.append(makeElement("summary", "", `\u6570\u636E\u7F3A\u9879\u4E0E\u9650\u5236\uFF08${note.quality_warnings.length}\uFF09`));
      for (const warning of note.quality_warnings) quality.append(makeElement("p", "", warning));
      card.append(quality);
    }
    return card;
  }
  function renderInsights() {
    const notes = window.marketIntelUtils.selectVisibleInsights(state.insights, state.reports, state.date);
    requiredElement("#insight-list").replaceChildren(...notes.map(renderInsight));
    const messages = {
      not_configured: "\u6DF1\u5EA6\u89E3\u8BFB\u5C1A\u672A\u542F\u7528\uFF0C\u539F\u59CB\u62A5\u544A\u4E0E\u7B80\u8BC4\u53EF\u7EE7\u7EED\u67E5\u770B\u3002",
      no_source_pair: "\u6668\u665A\u62A5\u6750\u6599\u5C1A\u672A\u9F50\u5907\uFF0C\u6682\u4E0D\u751F\u6210\u6DF1\u5EA6\u89E3\u8BFB\u3002",
      unavailable: "\u672C\u671F\u6DF1\u5EA6\u89E3\u8BFB\u6682\u65F6\u65E0\u6CD5\u751F\u6210\uFF0C\u5DF2\u4FDD\u7559\u53EF\u6838\u5BF9\u7684\u5386\u53F2\u8BB0\u5F55\u3002",
      load_failed: "\u6DF1\u5EA6\u89E3\u8BFB\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6\uFF0C\u539F\u59CB\u62A5\u544A\u53EF\u7EE7\u7EED\u67E5\u770B\u3002"
    };
    requiredElement("#insight-status").textContent = messages[state.generation.status ?? ""] ?? (notes.length ? "\u89E3\u8BFB\u662F\u57FA\u4E8E\u4E0B\u5217\u6750\u6599\u7684\u5224\u65AD\uFF0C\u5C55\u5F00\u4F9D\u636E\u53EF\u6838\u5BF9\u539F\u6587\u3002" : "\u6240\u9009\u65E5\u671F\u6682\u65E0\u6DF1\u5EA6\u89E3\u8BFB\u3002");
  }
  function renderHealth(health2) {
    const box = requiredElement("#data-health");
    if (!health2) {
      box.textContent = "\u6570\u636E\u65F6\u6548\u6682\u65F6\u65E0\u6CD5\u6838\u5BF9\uFF0C\u8BF7\u67E5\u770B\u539F\u62A5\u544A\u751F\u6210\u65F6\u95F4\u3002";
      box.classList.add("is-delayed");
      return;
    }
    const delayed = window.marketIntelUtils.isHealthDelayed(health2);
    box.classList.toggle("is-delayed", delayed);
    box.textContent = `\u6570\u636E\u76EE\u6807 ${health2.latest_target_date ?? "\u672A\u63D0\u4F9B"} \xB7 \u539F\u62A5\u544A\u751F\u6210 ${timestampLabel(health2.latest_source_generated_at)}\uFF08\u5317\u4EAC\u65F6\u95F4\uFF09\u3002` + (delayed ? " \u5DF2\u8F83\u957F\u65F6\u95F4\u672A\u66F4\u65B0\u6216\u6709\u6570\u636E\u7F3A\u53E3\uFF0C\u8BF7\u7ED3\u5408\u4EA4\u6613\u65E5\u5386\u6838\u5BF9\u3002" : "") + (!health2.pair_available ? " \u6668\u665A\u62A5\u914D\u5BF9\u5C1A\u4E0D\u5B8C\u6574\u3002" : "");
  }
  async function optionalIndex(path, schema) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error("optional index unavailable");
    const payload = await response.json();
    if (!record2(payload) || payload.schema_version !== schema) throw new Error("unsupported optional index");
    return payload;
  }
  async function loadReports() {
    try {
      const response = await fetch("../data/reports.json", { cache: "no-store" });
      if (!response.ok) throw new Error("report index unavailable");
      const data = await response.json();
      if (!record2(data) || data.schema_version !== "market_intel_pages.reports.v1" || !Array.isArray(data.reports)) {
        throw new Error("unsupported report index");
      }
      state.reports = reports(data.reports).sort((a, b) => b.date.localeCompare(a.date));
      const [insights2, health2, marketDaily] = await Promise.allSettled([
        optionalIndex("../data/insights.json", "market_intel_pages.insights.v1"),
        optionalIndex("../data/health.json", "market_intel_pages.health.v1"),
        fetch("../data/market_daily_report.json", { cache: "no-store" }).then(async (response2) => {
          if (!response2.ok) throw new Error("market daily unavailable");
          return response2.json();
        })
      ]);
      renderMarketDaily(marketDaily.status === "fulfilled" ? marketDaily.value : null);
      if (insights2.status === "fulfilled" && Array.isArray(insights2.value.insights)) {
        state.insights = insights(insights2.value.insights);
        state.outcomes = outcomes(insights2.value);
        state.generation = { status: record2(insights2.value.generation) && typeof insights2.value.generation.status === "string" ? insights2.value.generation.status : void 0 };
      } else {
        state.generation = { status: "load_failed" };
      }
      renderHealth(health2.status === "fulfilled" ? health(health2.value) : null);
      try {
        const summaryResponse = await fetch("../data/daily_summaries.json", { cache: "no-store" });
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          if (record2(summaryData) && summaryData.schema_version === "market_intel_pages.daily_summaries.v1" && Array.isArray(summaryData.summaries)) {
            state.summaries = summaries(summaryData.summaries);
          }
        }
      } catch {
        state.summaries = [];
      }
      populateDateFilter();
      const updated = new Date(typeof data.generated_at === "string" ? data.generated_at : "");
      requiredElement("#updated-at").textContent = `\u76EE\u5F55\u66F4\u65B0 ${new Intl.DateTimeFormat("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(updated)}`;
      render();
    } catch {
      loadError.hidden = false;
    }
  }
  for (const button of document.querySelectorAll(".filter")) {
    button.addEventListener("click", () => {
      state.kind = button.dataset.kind ?? "all";
      for (const item of document.querySelectorAll(".filter")) {
        item.classList.toggle("is-active", item === button);
        item.setAttribute("aria-pressed", String(item === button));
      }
      render();
    });
  }
  dateFilter.addEventListener("change", () => {
    state.date = dateFilter.value;
    render();
  });
  requiredElement("#clear-date").addEventListener("click", () => {
    state.date = "";
    dateFilter.value = "";
    render();
  });
  var themeToggle = requiredElement("#theme-toggle");
  var savedTheme = window.localStorage.getItem("market-intel-theme") ?? "system";
  var activeTheme = window.marketIntelTheme.applyTheme(savedTheme);
  function updateThemeButton() {
    const labels = { system: "\u7CFB\u7EDF", light: "\u6D45\u8272", dark: "\u6DF1\u8272" };
    themeToggle.textContent = `\u4E3B\u9898\uFF1A${labels[activeTheme]}`;
    themeToggle.setAttribute("aria-label", `\u5207\u6362\u4E3B\u9898\uFF0C\u5F53\u524D\u4E3A${labels[activeTheme]}`);
  }
  updateThemeButton();
  themeToggle.addEventListener("click", () => {
    activeTheme = window.marketIntelTheme.nextTheme(activeTheme);
    window.marketIntelTheme.applyTheme(activeTheme);
    window.localStorage.setItem("market-intel-theme", activeTheme);
    updateThemeButton();
  });
  loadReports();
})();
if (typeof module !== "undefined" && module.exports) module.exports = marketIntelApp;
if (typeof window !== "undefined") window.marketIntelApp = marketIntelApp;
