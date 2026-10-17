const test = require('node:test');
const assert = require('node:assert/strict');
const report = { id: '2026-10-16-evening', date: '2026-10-16', kind: 'evening', summary: '' };
const rows = [
  '| 香港 | 恒生指数 | 2026-10-16 | 24186.83 | +0.52% | 已收盘 |',
  '| 日本 | 日经225 | 2026-10-16 | 65324.29 | +1.39% | 已收盘 |',
  '| 韩国 | KOSPI | 2026-10-16 | 5668.05 | +2.05% | 已收盘 |',
];
const sources = ['香港', '日本', '韩国'].map((market, i) =>
  `- [${market}收盘数据](https://finance.yahoo.com/quote/${['%5EHSI', '%5EN225', '%5EKS11'][i]}/history/)；2026-10-16T${i ? '06:30' : '08:00'}:00+00:00；证据：\`asia.close.${String(i + 1).repeat(64)}\``);
const body = (selectedRows = rows, selectedSources = sources) => `### 亚洲市场概览\n| 市场 | 指数 | 数据日期 | 收盘 | 涨跌幅 | 状态 |\n| --- | --- | --- | --- | --- | --- |\n${selectedRows.join('\n')}\n${selectedSources.join('\n')}\n### 二、指数总览\n上证指数: 3716.28 [OK] +0.24% | 成交 7324.75亿`;

for (const locale of ['zh-CN', 'en-US']) test(`ordinary evening image includes all dated Asian index rows and sources in ${locale}`, async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const svg = buildAsiaReportSvg(report, [], body(), v => v, locale);
  assert.match(svg, /data-table="asia-overview"/);
  for (const value of ['24186.83', '65324.29', '5668.05', '+0.52%', '+1.39%', '+2.05%']) assert.ok(svg.includes(value));
  assert.match(svg, /finance.yahoo.com/);
  for (const time of ['08:00:00', '06:30:00']) assert.ok(svg.includes(time));
  assert.match(svg, /data-table="indices"/);
  assert.doesNotMatch(svg, /NaN|undefined/);
  if (locale === 'en-US') {
    for (const value of ['Hong Kong', 'Japan', 'Korea', 'Hang Seng', 'Nikkei 225', 'Session date', 'Closed session']) assert.ok(svg.includes(value));
    assert.doesNotMatch(svg.match(/<g data-table="asia-overview">([\s\S]*?)<\/g>/)[1], /[\u3400-\u9fff]/);
  }
});

test('new holiday image uses the same module without A-share panels', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const markdown = `## 亚洲市场收盘复盘（20261016）\nA 股今日休市。\n${body().split('### 二、指数总览')[0]}`;
  const svg = buildAsiaReportSvg(report, [], markdown);
  assert.ok(svg);
  assert.match(svg, /data-table="asia-overview"/);
  assert.doesNotMatch(svg, /data-table="indices"|综合盘面|资金流向 ·/);
});

for (const status of ['休市', '当日数据缺失', '未收盘']) test(`independent ${status} market keeps other current closes and never carries old values`, async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const svg = buildAsiaReportSvg(report, [], body([rows[0], `| 日本 | 日经225 | — | — | — | ${status} |`, rows[2]], [sources[0], sources[2]]));
  const table = svg.match(/<g data-table="asia-overview">([\s\S]*?)<\/g>/)?.[1];
  assert.ok(table);
  assert.ok(table.includes(status));
  assert.ok(table.includes('24186.83') && table.includes('5668.05'));
  assert.ok(!table.includes('65324.29'));
});

for (const [name, invalid] of [
  ['stale date', rows[1].replace('2026-10-16', '2026-10-15')],
  ['non-numeric close', rows[1].replace('65324.29', 'NaN')],
  ['negative close', rows[1].replace('65324.29', '-1')],
  ['invalid return', rows[1].replace('+1.39%', 'Infinity%')],
  ['closed with carried values', rows[1].replace('已收盘', '休市')],
]) test(`unusable ${name} row stays explicit without suppressing other markets`, async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const svg = buildAsiaReportSvg(report, [], body([rows[0], invalid, rows[2]]));
  const table = svg.match(/<g data-table="asia-overview">([\s\S]*?)<\/g>/)?.[1];
  assert.ok(table);
  assert.ok(table.includes('24186.83') && table.includes('5668.05'));
  assert.ok(!table.includes('65324.29'));
  assert.match(svg, /无法解析的原始行/);
});

test('missing or duplicated market rows and absent provenance cannot look complete', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  for (const markdown of [body(rows.slice(0, 2)), body([...rows, rows[0]]), body(rows, sources.slice(0, 2))]) {
    const svg = buildAsiaReportSvg(report, [], markdown);
    assert.match(svg, /原报告未提供可核实的市场行|无法解析的原始行/);
    assert.match(svg, /data-table="asia-overview"/);
  }
});

test('Asian overview treats embedded markup as inert text', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const svg = buildAsiaReportSvg(report, [], body([rows[0], rows[1].replace('日经225', '<script>alert(1)</script>'), rows[2]]));
  assert.match(svg, /&lt;script&gt;/);
  assert.doesNotMatch(svg, /<script>/);
});


test('new holiday module still rejects mismatched report headings or absent mainland closure', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  for (const prefix of ['## 亚洲市场收盘复盘（20261015）\nA 股今日休市。\n', '## 亚洲市场收盘复盘（20261016）\n']) {
    assert.equal(buildAsiaReportSvg(report, [], prefix + body()), null);
  }
});


test('English source report translates the module and provenance labels while preserving URLs and evidence IDs', async () => {
  const { toEnglishPresentation } = await import('../src/lib/english-content.ts');
  const en = toEnglishPresentation(body().split('### 二、指数总览')[0]);
  assert.doesNotMatch(en, /[\u3400-\u9fff]/);
  assert.match(en, /https:\/\/finance.yahoo.com\/quote\/%5EHSI\/history\//);
  assert.match(en, /asia\.close\.11111111/);
});


test('unusable source URLs and cross-date instants cannot verify a market row', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  for (const note of [
    sources[0].replace('https://finance.yahoo.com/quote/%5EHSI/history/', 'https:example.com'),
    sources[0].replace('https://finance.yahoo.com/quote/%5EHSI/history/', 'https://example.com/a/../b'),
    sources[0].replace('2026-10-16T08:00:00+00:00', '2026-10-16T23:00:00-12:00'),
  ]) {
    const svg = buildAsiaReportSvg(report, [], body(rows, [note, ...sources.slice(1)]));
    const table = svg.match(/<g data-table="asia-overview">([\s\S]*?)<\/g>/)?.[1];
    assert.ok(!table.includes('24186.83'));
    assert.ok(table.includes('65324.29'));
    assert.match(svg, /无法解析的原始行/);
  }
});


test('producer error summaries and close-time semantics remain visible alongside partial data', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const extra = '\n来源时间为交易所日历规定的实际收盘时间；日线时间戳仅标识当地交易日。\n数据警告：^HSI: stale, incomplete or unavailable session data\n';
  const markdown = body([`| 香港 | 恒生指数 | — | — | — | 当日数据缺失 |`, ...rows.slice(1)], sources.slice(1)).replace('### 二、指数总览', extra + '### 二、指数总览');
  for (const locale of ['zh-CN', 'en-US']) {
    const svg = buildAsiaReportSvg(report, [], markdown, v => v, locale);
    assert.match(svg, /\^HSI: stale, incomplete or unavailable session data/);
    assert.ok(svg.includes(locale === 'zh-CN' ? '日线时间戳仅标识当地交易日' : 'Daily bar timestamps identify local sessions'));
  }
});
