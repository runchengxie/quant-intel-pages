const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const {weeklyReportPresentation} = require('../src/lib/weekly-report-text.ts');
const {renderMarkdown} = require('../src/lib/markdown.ts');
const source = readFileSync('tests/fixtures/weekly-native-report.md', 'utf8');
const numbers = (text) => text.match(/[+-]?\d+(?:\.\d+)?/g) || [];
test('frozen producer report is fully English with every numerical token preserved in order', () => {
  const result = weeklyReportPresentation(source, 'en');
  assert.deepEqual(result.untranslated, []);
  assert.doesNotMatch(result.markdown, /\p{Script=Han}/u);
  assert.deepEqual(numbers(result.markdown), numbers(source));
  assert.match(result.markdown, /overlap/);
  assert.match(result.markdown, /independent samples/);
  assert.match(result.markdown, /not trading advice/);
});
test('Chinese presentation preserves exact source bytes', () => {
  assert.deepEqual(weeklyReportPresentation(source, 'zh'), {markdown: source, untranslated: []});
});
test('unknown content is signaled and preserved for source disclosure', () => {
  const original = '新增研究结论 42%；请审阅。';
  const result = weeklyReportPresentation(original, 'en');
  assert.deepEqual(result.untranslated, [original]);
  assert.match(result.markdown, /original source/);
  assert.doesNotMatch(result.markdown, /42/);
});
test('English, identifiers, code and URLs remain unchanged and rendering is sanitized', () => {
  const original = '[Evidence](https://example.test/report_12) `NEUTRAL`\n<script>alert(1)</script>';
  const result = weeklyReportPresentation(original, 'en');
  assert.equal(result.markdown, original);
  assert.doesNotMatch(renderMarkdown(result.markdown), /<script>/);
});
test('known producer variants preserve data and source caveats', () => {
  const original = '趋势延续，已持续 8 周。\n拥挤区间：高拥挤。\n方向信号：小盘占优（采用 5 日和 20 日均线）。\n资金动向：全周主力资金基本持平。\n数据状态：尚未完整。当前数据截至 2026-10-16，目标日期为 2026-10-23。本报告仅供预览。';
  const result = weeklyReportPresentation(original, 'en');
  assert.deepEqual(result.untranslated, []);
  assert.deepEqual(numbers(result.markdown), numbers(original));
  assert.match(result.markdown, /preview only/);
});
test('documentation links and code preserve URLs and technical identifiers', () => {
  const url = 'https://example.test/docs/weekly_report?lang=zh&v=12';
  const result = weeklyReportPresentation(`计算方法、图表说明和数据范围见[周报怎么读](${url})。\n\n\`\`\`text\n指标_ID = 12\n\`\`\``, 'en');
  assert.deepEqual(result.untranslated, []);
  assert.ok(result.markdown.includes(url));
  assert.ok(result.markdown.includes('指标_ID = 12'));
});
test('unrecognized Chinese additions to known templates cannot pass as translated', () => {
  const original = '中性，已持续 3 周。未经审核的追加结论';
  assert.deepEqual(weeklyReportPresentation(original, 'en').untranslated, [original]);
});
test('market direction, margin, turnover and alternative method variants translate whole lines', () => {
  const original = '盘面特征：强势上涨。本周 5 个交易日，4 天上涨、1 天下跌。日均上涨家数占比 71%，个股平均涨幅 +1.25%。\n成交情况：周总成交额 8000 亿元，日均 1600 亿元。\n融资余额从 120 亿元降至 100 亿元，减少 20 亿元。\n外盘黄金：本周从 4000 美元升至 4100 美元，周涨跌幅为 +2.5%，整体走强。\n- 可交易筛选，已扣费用（截至 2026-09-30，历史回算）：过去 12 周累计 -2.3%，高于约 21% 的历史样本。过去 52 周累计 +4.2%，当前回撤 -2.3%。历史上，后续 13 周收益中位数 +1.7%，正收益比例 65%。';
  const result = weeklyReportPresentation(original, 'en');
  assert.deepEqual(result.untranslated, []);
  assert.doesNotMatch(result.markdown, /\p{Script=Han}/u);
  assert.deepEqual(numbers(result.markdown), numbers(original));
  assert.match(result.markdown, /historical recalculation/);
  assert.match(result.markdown, /after costs/);
});
test('translated producer link still passes through protocol and HTML sanitization', () => {
  const original = '计算方法、图表说明和数据范围见[周报怎么读](javascript:alert(1))。\n<img src=x onerror=alert(2)>';
  const html = renderMarkdown(weeklyReportPresentation(original, 'en').markdown);
  assert.doesNotMatch(html, /href="javascript:|<img|onerror=/);
});
