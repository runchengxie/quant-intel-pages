const test = require('node:test');
const assert = require('node:assert/strict');
const report = { id: '2026-10-16-evening', date: '2026-10-16', kind: 'evening' };
const source = '- [香港收盘数据](https://finance.yahoo.com/quote/%5EHSI/history/)；2026-10-16T08:00:00+00:00；证据：`asia.close.' + '1'.repeat(64) + '`';
const markdown = `A 股今日休市。\n### 亚洲市场概览\n| 市场 | 指数 | 数据日期 | 收盘 | 涨跌幅 | 状态 |\n| --- | --- | --- | --- | --- | --- |\n| 香港 | 恒生指数 | 2026-10-16 | 24186.83 | -0.52% | 已收盘 |\n| 日本 | 日经225 | — | — | — | 休市 |\n| 韩国 | KOSPI | — | — | — | 当日数据缺失 |\n${source}\n### 自定义证据\n未经匹配的解释与暂定评分 3/5，不代表胜率。\n[原始证据](https://example.com/evidence)\n<script>alert(1)</script>`;
test('native report keeps complete evidence, holiday and independent session states', async () => {
  const { buildAsiaNativeReport } = await import('../src/lib/asia-native-report.ts');
  const result = buildAsiaNativeReport(report, markdown, 'zh');
  assert.equal(result.returns.length, 1);
  assert.equal(result.returns[0].value, -0.52);
  assert.equal(result.returns[0].date, '2026-10-16');
  assert.equal(result.returns[0].close, '24186.83');
  assert.match(result.bodyHtml, /A 股今日休市/);
  assert.match(result.bodyHtml, /当日数据缺失/);
  assert.match(result.bodyHtml, /自定义证据/);
  assert.match(result.bodyHtml, /暂定评分 3\/5，不代表胜率/);
  assert.match(result.bodyHtml, /https:\/\/example.com\/evidence/);
  assert.doesNotMatch(result.bodyHtml, /<script|alert\(1\)/);
  assert.match(result.bodyHtml, /native-table-wrap/);
  assert.equal((result.bodyHtml.match(/<table>/g) || []).length, 1);
});
test('stale or unverified rows never enter numerical previews, but remain in the body', async () => {
  const { buildAsiaNativeReport } = await import('../src/lib/asia-native-report.ts');
  for (const body of [markdown.replace('2026-10-16 | 24186', '2026-10-15 | 24186'), markdown.replace(source, '')]) {
    const result = buildAsiaNativeReport(report, body, 'en');
    assert.deepEqual(result.returns, []);
    assert.match(result.bodyHtml, /24186.83/);
    assert.match(result.bodyHtml, /3\/5/);
  }
});
test('English translates known presentation and retains source identities', async () => {
  const { buildAsiaNativeReport } = await import('../src/lib/asia-native-report.ts');
  const result = buildAsiaNativeReport(report, markdown, 'en');
  assert.equal(result.returns[0].label, 'Hong Kong · Hang Seng');
  assert.match(result.bodyHtml, /Hong Kong/);
  assert.match(result.bodyHtml, /asia\.close\.11111111/);
  assert.match(result.bodyHtml, /https:\/\/finance.yahoo.com\/quote\/%5EHSI\/history\//);
});
test('mainland previews admit numeric parser rows only and retain exact units', async () => {
  const { buildAsiaNativeReport } = await import('../src/lib/asia-native-report.ts');
  const result = buildAsiaNativeReport(report, '### 二、指数总览\n上证指数: 3716.28 [OK] +0.24% | 成交 7324.75亿\n深证成指: N/A N/A | 成交 N/A\n未知原始注释', 'zh');
  assert.equal(result.returns.length, 1);
  assert.equal(result.returns[0].value, 0.24);
  assert.equal(result.returns[0].date, null);
  assert.equal(result.returns[0].turnover, '7324.75');
  assert.match(result.bodyHtml, /未知原始注释/);
  assert.match(result.bodyHtml, /N\/A/);
});
test('mainland session date requires matching explicit metadata, never the report filename', async () => {
  const { buildAsiaNativeReport } = await import('../src/lib/asia-native-report.ts');
  const indices = '### 二、指数总览\n上证指数: 3716.28 [OK] +0.24% | 成交 7324.75亿';
  for (const prefix of ['- 数据日期: 2026-10-16\n', '数据日期: 2026-10-16\n']) {
    assert.equal(buildAsiaNativeReport(report, prefix + indices, 'en').returns[0].date, '2026-10-16');
  }
  for (const prefix of ['', '- 数据日期: 2026-10-15\n', '- 数据日期: 2026-10-16\n- 数据日期: 2026-10-15\n']) {
    assert.equal(buildAsiaNativeReport(report, prefix + indices, 'en').returns[0].date, null);
  }
});
