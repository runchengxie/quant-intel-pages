const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const evening = { id: '2026-09-30-evening', kind: 'evening', date: '2026-09-30', summary: '' };

test('published overview facts produce signed comparison and disjoint count groups', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const markdown = `### 三、市场总览
全市场中位数涨跌 [WARN] -0.09% | 成交额加权涨跌 +0.98% | 总成交 1.45万亿
上涨 2567 家 | 下跌 2824 家 | 平盘 170 家 | 上涨率 46.2%
### 四、涨跌停
涨停 56 家 | 跌停 13 家 | 涨幅>5% 148 家 | 跌幅>5% 131 家
> 最高连板: 7 板
### 五、资金动向
大单资金代理 [WARN] -286.86亿 | 净流入 2065 家 / 净流出 3145 家`;
  const svg = buildAsiaReportSvg(evening, [], markdown);
  for (const key of ['overview', 'limits', 'flow']) assert.match(svg, new RegExp(`data-report-panel="${key}"`));
  assert.match(svg, /data-metric="median" data-value="-0.09"/);
  assert.match(svg, /data-metric="weighted" data-value="0.98"/);
  assert.match(svg, /data-count="limit-up" data-value="56"/);
  assert.match(svg, /data-count="over-five" data-value="148"/);
  assert.match(svg, /data-count="inflow" data-value="2065"/);
  assert.match(svg, /data-card="turnover"/);
  assert.match(svg, /data-card="max-board"/);
  assert.match(svg, /1.45 万亿元/);
  assert.match(svg, /-286.86/);
  assert.doesNotMatch(svg, /NaN|undefined/);
  const en = buildAsiaReportSvg(evening, [], markdown, value => value, 'en-US');
  assert.match(en, /Turnover-weighted return/);
  assert.match(en, /Large-order flow proxy/);
});

test('malformed overview remains visible without invented chart metrics', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const svg = buildAsiaReportSvg(evening, [], '### 三、市场总览\n全市场中位数涨跌 N/A | 成交额加权涨跌 N/A');
  assert.match(svg, /N\/A/);
  assert.doesNotMatch(svg, /data-metric=/);
});

test('panels support the existing money formatter units and zero', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  for (const value of ['9000.00亿', '1.00万亿', '1000.00万', '0']) {
    const svg = buildAsiaReportSvg(evening, [], `### 三、市场总览\n全市场中位数涨跌 -0.09% | 成交额加权涨跌 +0.98% | 总成交 ${value}\n上涨 1 家 | 下跌 1 家 | 平盘 0 家 | 上涨率 50.0%`);
    assert.match(svg, /data-report-panel="overview"/);
  }
  for (const value of ['-0', '+1.00万', '+1.00万亿', '-286.86亿']) {
    const svg = buildAsiaReportSvg(evening, [], `### 五、资金动向\n大单资金代理 ${value} | 净流入 1 家 / 净流出 2 家`);
    assert.match(svg, /data-report-panel="flow"/);
  }
});

test('invalid turnover and inconsistent breadth remain text without graphics', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  for (const [amount, rate] of [['-1.45万亿', '50.0'], ['1.45万亿', '999.0'], ['1.45万亿', '20.0']]) {
    const svg = buildAsiaReportSvg(evening, [], `### 三、市场总览\n全市场中位数涨跌 -0.09% | 成交额加权涨跌 +0.98% | 总成交 ${amount}\n上涨 1 家 | 下跌 1 家 | 平盘 0 家 | 上涨率 ${rate}%\n第三行\n无法解析第四行`);
    assert.doesNotMatch(svg, /data-report-panel="overview"/);
    assert.match(svg, /无法解析第四行/);
  }
});

test('English financing disclosures expose partial and unknown coverage without Chinese', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  for (const scope of ['部分交易所，覆盖 SSE', '全市场，覆盖 BSE/SSE/SZSE', '部分交易所，覆盖 未核实']) {
    const charts = [{ key: 'dashboard', title: '综合盘面', status: 'degraded', reason: '融资余额仅覆盖部分交易所，保留一致范围和实际观测日', points: [
      { label: '融资余额 2026-09-29', value: 90, unit: '亿', observation_date: '2026-09-29', source_label: `Tushare 融资融券交易汇总（${scope}）`, source_url: 'https://tushare.pro' },
      { label: '融资余额 2026-09-30', value: 91, unit: '亿', observation_date: '2026-09-30', source_label: `Tushare 融资融券交易汇总（${scope}）`, source_url: 'https://tushare.pro' },
    ] }];
    const svg = buildAsiaReportSvg(evening, charts, '', value => value, 'en-US');
    assert.match(svg, /Covered exchanges/);
    assert.doesNotMatch(svg, /部分交易所|融资融券交易汇总|未核实|全市场|保留一致/);
  }
});
const facts = `### 二、指数总览
上证指数: 3842.19 [OK] +0.31% | 成交 6793.99亿
科创50: 1530.01 [WARN] -2.51% | 成交 718.79亿
深证成指: N/A [WARN] N/A | 成交 N/A
### 七、行业板块 TOP10
| 行业 | 均涨跌 | 中位数 | 家数 | 上涨率 |
|---|---|---|---|---|
| 医药生物 | +2.00% | +1.57% | 464 | 83.4% |
| A \\| B <script> | N/A | -1.00% | 12 | N/A |
| broken | +5% |
### 八、高成交核心票 TOP10
| 代码 | 成交额(亿) | 涨跌 |
|---|---|---|
| 300308 | 128.5 | -0.56% |
### 九、热门概念 TOP5
| 概念 | 涨幅 | 龙头 | 涨停数 |
|---|---|---|---|
| mRNA概念 | +6.42% | 康希诺(+20.00%) | 1 |
### 十、极端异动
涨幅前五: 301190.SZ(+20.01%)、688185.SH(+20.00%)
跌幅前五: 920202.BJ(-29.97%)
*数据: Tushare / market-data-platform | 生成: 2026-09-30 18:45*`;

test('published facts produce aligned tables, signed index geometry and explicit malformed fallback', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const svg = buildAsiaReportSvg(evening, [], facts);
  for (const key of ['indices', 'industry', 'turnover', 'concepts', 'movers']) {
    assert.match(svg, new RegExp(`data-table="${key}"`));
  }
  assert.match(svg, />收盘点位<\/text>/);
  assert.match(svg, />成交额（亿）<\/text>/);
  assert.match(svg, />3842\.19<\/text>/);
  assert.match(svg, />6793\.99<\/text>/);
  const bars = [...svg.matchAll(/<rect data-index-return="([^"]+)" data-value="([^"]+)" x="([^"]+)" y="([^"]+)" width="([^"]+)"/g)];
  assert.equal(bars.length, 2);
  const positive = bars.find((row) => row[2] === '0.31');
  const negative = bars.find((row) => row[2] === '-2.51');
  assert.equal(Number(negative[3]) + Number(negative[5]), Number(positive[3]));
  assert.ok(Number(positive[5]) < Number(negative[5]));
  assert.match(svg, /无法解析|缺项/);
  assert.match(svg, /broken/);
  assert.match(svg, /N\/A/);
  assert.match(svg, /A \| B &lt;script&gt;/);
  assert.match(svg, /2026-09-30 18:45/);
  assert.match(svg, />-29\.97%<\/text>/);
  assert.doesNotMatch(svg, /\[OK\]|\[WARN\]|<script>|NaN|undefined/);
  const industry = svg.match(/<g data-table="industry">([\s\S]*?)<\/g>/)[1];
  const positions = [...industry.matchAll(/<text x="([^"]+)" y="([^"]+)"[^>]*>(行业|均涨跌|中位数|家数|上涨率)<\/text>/g)];
  assert.equal(positions.length, 5);
  assert.equal(new Set(positions.map((row) => row[2])).size, 1);
  assert.equal(new Set(positions.map((row) => row[1])).size, 5);
});

test('English table labels are complete and geometry is shared with Chinese', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const { toEnglishPresentation } = await import('../src/lib/english-content.ts');
  const en = buildAsiaReportSvg(evening, [], facts, toEnglishPresentation);
  assert.match(en, />Close level<\/text>/);
  assert.match(en, />Turnover \(CNY 100m\)<\/text>/);
  assert.doesNotMatch(en, />Index daily returns<\/text>/);
  assert.match(en, /Unparsed row/);
  assert.match(en, /Original report facts/);
  assert.doesNotMatch(en, /收盘点位|成交额（亿）|指数日涨跌|\[WARN\]/);
  assert.match(en, /data-index-return="[^"]+" data-value="-2.51"/);
});

test('new English labels come from the selected semantic catalog without substring translation', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  // Legacy presenter identifies English but deliberately does not know new labels.
  const legacy = (value) => value === '亚洲市场收盘复盘' ? 'Asia market close review' : value;
  const svg = buildAsiaReportSvg(evening, [], facts, legacy);
  assert.match(svg, />Close level<\/text>/);
  assert.match(svg, />Turnover \(CNY 100m\)<\/text>/);
  assert.doesNotMatch(svg, />Index daily returns<\/text>/);
  assert.match(svg, /Original report facts/);
});

test('explicit English locale selects labels and metadata with identity or custom presenters', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  for (const present of [(value) => value, (value) => value.replace('301190.SZ', 'custom ticker')]) {
    const svg = buildAsiaReportSvg(evening, [], facts, present, 'en-US');
    assert.match(svg, /<title>2026-09-30 Asia market close review<\/title>/);
    assert.match(svg, /<desc>Includes the Asia close summary/);
    assert.match(svg, /19:00 Beijing time edition/);
    assert.match(svg, />Close level<\/text>/);
    assert.doesNotMatch(svg, />Index daily returns<\/text>/);
    assert.doesNotMatch(svg, /亚洲市场收盘|北京时间|收盘点位|指数日涨跌/);
  }
});

test('English prose wraps at word boundaries instead of splitting translated words', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const svg = buildAsiaReportSvg({ ...evening, summary: 'alpha '.repeat(15) + 'fragmentation matters' }, [], '', (value) => value, 'en-US');
  const text = [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((row) => row[1]);
  assert.ok(text.some((line) => line.includes('fragmentation')));
});

test('table previews retain fallback and point readers to full details', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const rows = Array.from({ length: 10 }, (_, i) => `| ${300000 + i} | ${100 - i}.0 | +1.00% |`).join('\n');
  const svg = buildAsiaReportSvg(evening, [], `### 八、高成交核心票 TOP10\n| 代码 | 成交额(亿) | 涨跌 |\n|---|---|---|\n${rows}`);
  assert.match(svg, /300004/);
  assert.doesNotMatch(svg, /300005/);
  assert.match(svg, /5.*10/);
  assert.match(svg, /完整报告/);
});

test('English previews translate complete templates and retain original date/source attribution', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const { toEnglishPresentation } = await import('../src/lib/english-content.ts');
  const rows = Array.from({ length: 10 }, (_, i) => `| ${300000 + i} | 99.0 | +1.00% |`).join('\n');
  const svg = buildAsiaReportSvg(evening, [], `### 八、高成交核心票 TOP10\n| 代码 | 成交额(亿) | 涨跌 |\n|---|---|---|\n${rows}\n*数据: A < B & \"C\" | 生成: 2026-09-30 18:45*`, toEnglishPresentation);
  assert.match(svg, /Preview 5 \/ 10 rows; see the full report for the rest\./);
  assert.match(svg, /Data: A &lt; B &amp; &quot;C&quot;/);
  assert.match(svg, /Generated: 2026-09-30 18:45/);
  assert.doesNotMatch(svg, /预览|完整报告|暂无|缺少|跳过/);
});

test('malformed index returns and table schemas remain explicit without partial or invented bars', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const svg = buildAsiaReportSvg(evening, [], `### 二、指数总览
上证指数: 3842.19 [OK] +0.31oops% | 成交 6793.99亿
科创50: N/A [WARN] N/A | 成交 N/A
沪深300: 4357.62 [OK] +0.00% | 成交 3564.92亿
### 九、热门概念 TOP5
| wrong | 涨幅 | 龙头 | 涨停数 |
|---|---|---|---|
| bad | +1.00% | x | 1 |`);
  assert.match(svg, /0.31oops%/);
  assert.match(svg, /日涨跌缺项/);
  assert.match(svg, /wrong/);
  assert.match(svg, /bad/);
  const bars = [...svg.matchAll(/data-index-return="([^"]+)" data-value="([^"]+)"[^>]*width="([^"]+)"/g)];
  assert.equal(bars.length, 1);
  assert.deepEqual(bars[0].slice(1), ['沪深300', '0', '0']);
  assert.doesNotMatch(svg, /\[OK\]|\[WARN\]|NaN/);
});

test('unterminated table rows are explicit fallback even after preview notes', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const svg = buildAsiaReportSvg(evening, [], `### 八、高成交核心票 TOP10\n| 代码 | 成交额(亿) | 涨跌 |\n|---|---|---|\nnote one\nnote two\n| 600001 | 10.0 | +2.00%`);
  assert.match(svg, /无法解析的原始行: \| 600001/);
});

for (const scenario of [
  { heading: '### 七、行业板块 TOP10', key: 'industry', header: '| 行业 | 均涨跌 | 中位数 | 家数 | 上涨率 |', columns: 5,
    invalid: [
      '| InvalidMean | nope | +1.00% | 12 | 50.0% |',
      '| InvalidMedian | +1.00% | NaN | 12 | 50.0% |',
      '| InvalidCount | +1.00% | -1.00% | -3 | 50.0% |',
      '| DecimalCount | +1.00% | -1.00% | 3.5 | 50.0% |',
      '| InvalidRate | +1.00% | -1.00% | 12 | 101.0% |',
      '| NegativeRate | +1.00% | -1.00% | 12 | -1.0% |',
      '| EmptyRate | +1.00% | -1.00% | 12 | |',
      '| | +1.00% | -1.00% | 12 | 50.0% |',
    ] },
  { heading: '### 八、高成交核心票 TOP10', key: 'turnover', header: '| 代码 | 成交额(亿) | 涨跌 |', columns: 3,
    invalid: [
      '| 12345 | 10.0 | +1.00% |', '| ABCDEF | 10.0 | +1.00% |',
      '| 600001 | -10.0 | +1.00% |', '| 600001 | Infinity | +1.00% |',
      '| 600001 | 0x10 | +1.00% |', '| 600001 | 1e3 | +1.00% |',
      '| 600001 | 10.0 | NaN |', '| 600001 | 10.0 | +1oops% |',
      '| 600001 | | +1.00% |',
    ] },
  { heading: '### 九、热门概念 TOP5', key: 'concepts', header: '| 概念 | 涨幅 | 龙头 | 涨停数 |', columns: 4,
    invalid: [
      '| | +1.00% | 原名(+2.00%) | 2 |', '| InvalidReturn | nope | 原名(+2.00%) | 2 |',
      '| EmptyLeader | +1.00% | | 2 |', '| InvalidLeader | +1.00% | 原名(+oops%) | 2 |',
      '| InvalidCount | +1.00% | 原名(+2.00%) | -2 |', '| DecimalCount | +1.00% | 原名(+2.00%) | 2.5 |',
    ] },
]) {
  test(`${scenario.key} rejects same-column invalid fields from the rendered numeric table`, async () => {
    const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
    for (const invalid of scenario.invalid) {
      const svg = buildAsiaReportSvg(evening, [], `${scenario.heading}\n${scenario.header}\n|---|---|---|\n${invalid}`);
      const table = svg.match(new RegExp(`<g data-table="${scenario.key}">([\\s\\S]*?)<\\/g>`))[1];
      assert.equal((table.match(/<text\b/g) || []).length, scenario.columns, invalid);
      assert.match(svg, /无法解析的原始行/, invalid);
      assert.ok(svg.includes(invalid), invalid);
    }
  });
}

test('validated tables preserve explicit N/A, published unsigned zero and large finite values', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const svg = buildAsiaReportSvg(evening, [], `### 七、行业板块 TOP10
| 行业 | 均涨跌 | 中位数 | 家数 | 上涨率 |
|---|---|---|---|---|
| MissingIndustry | N/A | 0.00% | N/A | N/A |
| LargeIndustry | +1000.00% | -1000.00% | 1000000 | 100.0% |
### 八、高成交核心票 TOP10
| 代码 | 成交额(亿) | 涨跌 |
|---|---|---|
| 001246 | 1000000000000000.0 | +206.59% |
| 000001 | N/A | N/A |
### 九、热门概念 TOP5
| 概念 | 涨幅 | 龙头 | 涨停数 |
|---|---|---|---|
| MissingConcept | N/A | N/A | N/A |
| LargeConcept | +1000.00% | 源名(+1000.00%) | 1000000 |`);
  assert.doesNotMatch(svg, /无法解析的原始行/);
  assert.match(svg, /源名\(\+1000\.00%\)/);
  assert.match(svg, />001246<\/text>/);
  assert.match(svg, />1000000000000000\.0<\/text>/);
  assert.match(svg, />N\/A<\/text>/);
  assert.match(svg, />0\.00%<\/text>/);
});

test('syntactically decimal values that overflow finite numbers remain visible fallback', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const huge = '9'.repeat(310);
  for (const row of [`| 600001 | ${huge} | +1.00% |`, `| 600001 | 10.0 | +${huge}% |`]) {
    const svg = buildAsiaReportSvg(evening, [], `### 八、高成交核心票 TOP10\n| 代码 | 成交额(亿) | 涨跌 |\n|---|---|---|\n${row}`);
    const table = svg.match(/<g data-table="turnover">([\s\S]*?)<\/g>/)[1];
    assert.equal((table.match(/<text\b/g) || []).length, 3);
    assert.match(svg, /无法解析的原始行: \| 600001/);
    assert.doesNotMatch(svg, /Infinity|NaN/);
  }
});

test('Asia report image combines the evening framework, five local chart states and sources', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const report = { id: '2026-09-25-evening', kind: 'evening', date: '2026-09-25', summary: '亚洲市场收盘。' };
  const charts = [
    { key: 'dashboard', title: '综合仪表盘', status: 'ok', points: [
      { label: '上涨家数', value: 1200, unit: '家', observation_date: '2026-09-25',
        source_label: '公开行情', source_url: 'https://example.com/market' },
    ] },
    ...[['moneyflow', '资金流向图'], ['topic', '热点概念图'], ['sentiment', '情绪指标图'],
      ['us_overnight', '美股隔夜图'], ['weekly_chart', '周度概览图']].map(([key, title]) =>
      ({ key, title, status: 'missing', reason: '待核实', points: null })),
  ];
  const markdown = '## 一、市场状态\n- 状态: 偏冷。\n### 核心矛盾\n- 市场分歧。\n### 明日验证\n- 观察广度。\n### 三、市场总览\n上涨 1200 家。';
  const svg = buildAsiaReportSvg(report, charts, markdown);
  assert.match(svg, /fill="var\(--report-bg/);
  assert.match(svg, /fill="var\(--report-ink/);
  assert.match(svg, /亚洲市场收盘复盘/);
  assert.match(svg, /市场分歧/);
  assert.match(svg, /观察广度/);
  for (const title of ['综合盘面', '资金流向', '热点概念', '市场温度', '周度概览']) assert.match(svg, new RegExp(title));
  assert.doesNotMatch(svg, /美股隔夜图|六图概览/);
  assert.match(svg, /观测日：2026-09-25/);
  assert.match(svg, /example.com/);
  assert.doesNotMatch(svg, /NaN|undefined/);
});

test('real evening data uses breadth, trend and money flow visuals without overnight US quotes', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const fixture = path.join(__dirname, 'fixtures/asia-evening');
  const report = JSON.parse(readFileSync(path.join(fixture, 'report.json'), 'utf8'));
  const charts = JSON.parse(readFileSync(path.join(fixture, 'charts.json'), 'utf8')).charts;
  const markdown = readFileSync(path.join(fixture, 'report.md'), 'utf8');
  const svg = buildAsiaReportSvg(report, charts, markdown);
  assert.match(svg, /市场广度/);
  assert.match(svg, /融资余额走势/);
  assert.match(svg, /成交额走势/);
  assert.match(svg, /主力净流入/);
  assert.match(svg, /近几日涨跌分布/);
  assert.match(svg, /<polyline/);
  assert.doesNotMatch(svg, /美股隔夜图|标普500 ETF|Meta/);
  assert.match(svg, /观测日：2026-09-18 至 2026-09-24/);
  assert.match(svg, /data-dimension="流动性"/);
  assert.match(svg, /data-dimension="亏钱风险"/);
  assert.match(svg, /亏钱风险越高，风险越高/);
  assert.match(svg, /成交额分位 15\.0%/);
});

test('six-dimensional chart rejects invalid scores and escapes evidence', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const report = { id: '2026-09-25-evening', kind: 'evening', date: '2026-09-25', summary: '' };
  const markdown = '### 六维观察\n| 维度 | 观察分 | 状态 | 证据 |\n|---|---:|---|---|\n'
    + '| 流动性 | 75 | 较强 | 成交额改善 <script> |\n'
    + '| 亏钱风险 | N/A | 缺项 | 数据不足 |\n';
  const svg = buildAsiaReportSvg(report, [], markdown);
  assert.match(svg, /data-dimension="流动性"/);
  assert.match(svg, /成交额改善 &lt;script&gt;/);
  assert.match(svg, /亏钱风险 · 缺项/);
  assert.match(svg, /数据不足/);
  assert.doesNotMatch(svg, /data-dimension="亏钱风险"|NaN/);
});

test('six-dimensional chart accepts escaped evidence pipes but rejects non-decimal scores', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const report = { id: '2026-09-25-evening', kind: 'evening', date: '2026-09-25', summary: '' };
  const markdown = '### 六维观察\n| 维度 | 观察分 | 状态 | 证据 |\n|---|---:|---|---|\n'
    + '| 流动性 | 30.5 | 偏弱 | 数据 A \\| 数据 B |\n'
    + '| 广度 | 0x10 | 缺项 | 数据格式错误 |\n';
  const svg = buildAsiaReportSvg(report, [], markdown);
  assert.match(svg, /data-dimension="流动性"/);
  assert.match(svg, /数据 A \| 数据 B/);
  assert.match(svg, /广度 · 缺项/);
  assert.match(svg, /数据格式错误/);
  assert.doesNotMatch(svg, /data-dimension="广度"/);
});

test('Asia report image escapes public text and rejects a morning identity', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const report = { id: '2026-09-25-evening', kind: 'evening', date: '2026-09-25', summary: '<script>alert(1)</script>' };
  assert.match(buildAsiaReportSvg(report, [], ''), /&lt;script&gt;/);
  assert.equal(buildAsiaReportSvg({ ...report, kind: 'morning' }, [], ''), null);
});

const holidayReport = { id: '2026-10-05-evening', kind: 'evening', date: '2026-10-05', summary: '' };
const holidayMarkdown = `# 收盘复盘（2026-10-05）
## 亚洲市场收盘复盘（20261005）
A 股今日休市。
| 市场 | 状态 | 收盘 | 涨跌幅 |
| --- | --- | --- | --- |
| A 股 | 休市 | — | — |
| 香港 | 2026-10-05 | 25000.00 | +1.00% |
| 日本 | 2026-10-05 | 44000.00 | +1.15% |
| 韩国 | 休市 | — | — |
## 数据来源
- 港股、日本数据见网页报告。
`;

test('China holiday image renders dated Asian closes and closed markets without A-share charts', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const svg = buildAsiaReportSvg(holidayReport, [], holidayMarkdown);
  assert.match(svg, /data-table="asia-sessions"/);
  for (const fact of ['香港', '日本', '25000.00', '44000.00', '+1.00%', '+1.15%', '休市']) assert.ok(svg.includes(fact));
  assert.doesNotMatch(svg, /综合盘面|资金流向|市场温度|周度概览|data-report-panel/);
  const en = buildAsiaReportSvg(holidayReport, [], holidayMarkdown, value => value, 'en-US');
  for (const fact of ['Hong Kong', 'Japan', 'Closed', 'Session date', 'Close level', '25000.00']) assert.ok(en.includes(fact));
  assert.doesNotMatch(en, /[\u3400-\u9fff]/);
});

test('holiday image rejects stale dates and malformed close values', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  for (const markdown of [
    holidayMarkdown.replace('| 香港 | 2026-10-05', '| 香港 | 2026-10-02'),
    holidayMarkdown.replace('（20261005）', '（20261002）'),
    holidayMarkdown.replace('25000.00', 'NaN'),
    holidayMarkdown.replace('+1.00%', 'Infinity%'),
  ]) assert.equal(buildAsiaReportSvg(holidayReport, [], markdown), null);
});


test('holiday image shows missing sessions explicitly and requires one current open-market close', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const missingJapan = holidayMarkdown.replace('| 日本 | 2026-10-05 | 44000.00 | +1.15% |', '| 日本 | 当日数据缺失 | — | — |');
  const svg = buildAsiaReportSvg(holidayReport, [], missingJapan, value => value, 'en-US');
  assert.match(svg, /Current session data missing/);
  assert.match(svg, /25000.00/);
  assert.doesNotMatch(svg, /44000.00/);
  assert.equal(buildAsiaReportSvg(holidayReport, [], missingJapan.replace('| 香港 | 2026-10-05 | 25000.00 | +1.00% |', '| 香港 | 当日数据缺失 | — | — |')), null);
  assert.equal(buildAsiaReportSvg(holidayReport, [], holidayMarkdown.replace('A 股今日休市。', '')), null);
  assert.equal(buildAsiaReportSvg(holidayReport, [], holidayMarkdown.replace('| A 股 | 休市', '| A 股 | 当日数据缺失')), null);
});


test('index return bars share the table row and show each numeric return once', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const svg = buildAsiaReportSvg(evening, [], `### 二、指数总览
上证指数: 3767.23 [WARN] -0.89% | 成交 6624.92亿
科创50: 1380.26 [WARN] -3.29% | 成交 576.23亿`);
  const table = svg.match(/<g data-table="indices">([\s\S]*?)<\/g>/)[1];
  assert.equal((svg.match(/>-0\.89%<\/text>/g) || []).length, 1);
  assert.equal((svg.match(/>上证指数<\/text>/g) || []).length, 1);
  assert.match(table, /data-index-return="上证指数" data-value="-0.89"/);
  assert.doesNotMatch(svg, />指数日涨跌<\/text>/);
  assert.match(table, />3767\.23<\/text>/);
  assert.match(table, />6624\.92<\/text>/);
});

test('published table metrics add separate signed return and turnover bars without dropping text', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const svg = buildAsiaReportSvg(evening, [], facts);
  for (const [key, value] of [['industry-return', '2'], ['turnover-amount', '128.5'], ['turnover-return', '-0.56'], ['concepts-return', '6.42'], ['movers-return', '-29.97']]) {
    assert.match(svg, new RegExp(`data-metric="${key}" data-value="${value}"`));
  }
  const industry = svg.match(/<g data-table="industry">([\s\S]*?)<\/g>/)[1];
  assert.match(industry, />医药生物<\/text>/);
  assert.match(industry, />\+2\.00%<\/text>/);
  assert.doesNotMatch(svg, /NaN|Infinity|undefined/);
});

const distributionLine = '涨跌分布: -100~-9.9%:23 -9.9~-7%:62 -7~-5%:240 -5~-3%:1288 -3~-1%:2203 -1~0%:680 0~1%:493 1~3%:373 3~5%:91 5~7%:51 7~9.9%:12 9.9~100%:47';
test('open return tails include IPOs and keep zero buckets on a shared diverging count scale', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const report = `### 三、市场总览
全市场中位数涨跌 0% | 成交额加权涨跌 +1% | 总成交 1亿
上涨 3 家 | 下跌 2 家 | 平盘 1 家 | 上涨率 50.0%
涨跌分布: -inf~-9.9%:1 -9.9~-7%:1 -7~-5%:0 -5~-3%:0 -3~-1%:0 -1~0%:0 0~1%:1 1~3%:0 3~5%:0 5~7%:0 7~9.9%:0 9.9~inf%:3`;
  const svg = buildAsiaReportSvg(evening, [], report);
  const bars = [...svg.matchAll(/<rect data-metric="distribution" data-value="(\d+)" x="([^"]+)" y="[^"]+" width="([^"]+)"/g)];
  assert.equal(bars.length, 12);
  assert.equal(Number(bars[0][2]) + Number(bars[0][3]), Number(bars[11][2]));
  assert.equal(Number(bars[11][3]), 3 * Number(bars[0][3]));
  assert.equal(Number(bars[2][3]), 0);
  assert.match(svg, /低于.*9.9%/);
  assert.match(svg, /不低于.*9.9%/);
  assert.match(svg, /50.0%/);
  assert.doesNotMatch(svg, /涨跌分布:|inf~/);
  const english = buildAsiaReportSvg(evening, [], report, value => value, 'en-US');
  assert.match(english, /Below/);
  assert.match(english, /At least/);
  assert.doesNotMatch(english, /低于|不低于/);
});
const distributionOverview = `### 三、市场总览
全市场中位数涨跌 -1.94% | 成交额加权涨跌 -1.59% | 总成交 1.43万亿
上涨 979 家 | 下跌 4496 家 | 平盘 88 家 | 上涨率 17.6%
站上 VWAP 比例: 11.5% | 开盘跳空: -0.22% | 日内振幅中位数: 3.66% | 收盘位置: 12.1%
`;

test('all twelve return buckets are charted only when their counts reconcile with market coverage', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const svg = buildAsiaReportSvg(evening, [], distributionOverview + distributionLine);
  assert.equal((svg.match(/data-metric="distribution"/g) || []).length, 12);
  assert.match(svg, /data-metric="distribution" data-value="2203"/);
  assert.match(svg, /站上 VWAP 比例/);
  assert.match(svg, /11.5%/);
  assert.match(svg, /data-metric="vwap-share" data-value="11.5"/);
  assert.match(svg, /data-metric="close-position" data-value="12.1"/);
  assert.match(svg, /data-metric="opening-gap" data-value="-0.22"/);
  assert.match(svg, /data-metric="intraday-range" data-value="3.66"/);
  const en = buildAsiaReportSvg(evening, [], distributionOverview + distributionLine, value => value, 'en-US');
  assert.match(en, /Return distribution/);
  assert.doesNotMatch(en, /涨跌分布|区间沿用|站上 VWAP|收盘位置/);
  for (const line of [distributionLine.replace(':2203', ':2204'), distributionLine.replace(' -7~-5%:240', ''), distributionLine + ' bad', distributionLine.replace('-3~-1%', '-2~-1%'), distributionLine.replace(':23', ':1e3')]) {
    const invalid = buildAsiaReportSvg(evening, [], distributionOverview + line);
    assert.doesNotMatch(invalid, /data-metric="distribution"/);
  }
});

test('flow proxy gets a signed amount bar and industry decliners keep labels, returns and negative direction', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const svg = buildAsiaReportSvg(evening, [], `### 五、资金动向
大单资金代理 -695.53亿 | 净流入 1163 家 / 净流出 4050 家
### 七、行业板块 TOP10
| 行业 | 均涨跌 | 中位数 | 家数 | 上涨率 |
|---|---|---|---|---|
| 煤炭 | +1.17% | +0.80% | 39 | 61.5% |
跌幅靠前行业:
电力设备(-3.07%)、机械设备(-2.53%)`);
  assert.match(svg, /data-metric="flow-proxy" data-value="-695.53"/);
  assert.match(svg, /data-metric="industry-decliner" data-value="-3.07"/);
  assert.match(svg, /大单资金代理: -695.53 亿元/);
  assert.match(svg, /电力设备/);
  assert.match(svg, /净流入家数/);
});


test('large finite published table values never overflow bar geometry', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const large = '1' + '0'.repeat(307);
  const svg = buildAsiaReportSvg(evening, [], `### 八、高成交核心票 TOP10
| 代码 | 成交额(亿) | 涨跌 |
|---|---|---|
| 300308 | ${large} | +1.00% |`);
  assert.match(svg, /data-metric="turnover-amount"/);
  assert.doesNotMatch(svg, /Infinity|NaN/);
});

test('chart-covered prose disappears while uncharted representatives survive', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const markdown = readFileSync(path.join(__dirname, '../artifacts/public/reports/2026-10-14-evening.md'), 'utf8');
  const svg = buildAsiaReportSvg({ ...evening, id: '2026-10-14-evening', date: '2026-10-14' }, [], markdown);
  assert.doesNotMatch(svg, /全市场中位数涨跌 -1.94% \|/);
  assert.doesNotMatch(svg, /大单资金代理 -695.53亿 \|/);
  assert.match(svg, /上涨率: 17.6%/);
  assert.match(svg, /新华文轩/);
  assert.match(svg, /data-table="movers-gainers"/);
  assert.match(svg, /data-table="movers-decliners"/);
});


test('lower dashboard omits exact duplicates but retains mean, dates and coverage', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const markdown = readFileSync(path.join(__dirname, '../artifacts/public/reports/2026-10-14-evening.md'), 'utf8');
  const charts = JSON.parse(readFileSync(path.join(__dirname, '../artifacts/public/data/charts/2026-10-14-evening.json'), 'utf8')).charts;
  const svg = buildAsiaReportSvg({ ...evening, id: '2026-10-14-evening', date: '2026-10-14' }, charts, markdown);
  assert.doesNotMatch(svg, />市场广度</);
  assert.match(svg, /平均涨跌/);
  assert.equal((svg.match(/>最高连板<\/text>/g) || []).length, 1);
  assert.equal((svg.match(/>涨停家数<\/text>/g) || []).length, 0);
  assert.match(svg, /融资余额仅覆盖部分交易所/);
  assert.match(svg, /09-30/);
  const { reportFactAlreadyShown } = await import('../src/lib/asia-report-facts.ts');
  const point = charts.find(chart => chart.key === 'dashboard').points.find(point => point.label === '上涨家数');
  assert.equal(reportFactAlreadyShown(point, '2026-10-14', markdown, svg), true);
  for (const update of [{ value: 978 }, { observation_date: '2026-10-13' }, { unit: '%' }, { source_label: 'Partial coverage' }, { source_url: 'https://example.com' }]) {
    assert.equal(reportFactAlreadyShown({ ...point, ...update }, '2026-10-14', markdown, svg), false);
  }
});

test('zero counts stay labelled and integer returns can replace covered prose', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  const svg = buildAsiaReportSvg(evening, [], '### 三、市场总览\n全市场中位数涨跌 0% | 成交额加权涨跌 0% | 总成交 0\n上涨 0 家 | 下跌 0 家 | 平盘 0 家 | 上涨率 0%');
  assert.doesNotMatch(svg, /全市场中位数涨跌 0% \|/);
  assert.match(svg, /上涨家数: 0 家/);
  assert.match(svg, /上涨率: 0%/);
  assert.doesNotMatch(svg, /NaN|Infinity/);
});


const dedupDimensions = ['流动性', '广度', '赚钱效应', '亏钱风险', '趋势确认', '轮动质量'];
const dedupScores = [27.8, 43.4, 62.5, 24.8, 46, 78.5];
const dedupDimensionBody = '### 六维观察\n| 维度 | 观察分 | 状态 | 证据 |\n|---|---|---|---|\n'
  + dedupDimensions.map((label, i) => `| ${label} | ${dedupScores[i]} | 中性 | 证据 ${i} |`).join('\n');
const dedupConceptBody = '### 九、热门概念 TOP5\n| 概念 | 涨幅 | 龙头 | 涨停数 |\n|---|---|---|---|\n'
  + ['甲', '乙', '丙', '丁', '戊'].map((label, i) => `| ${label}概念 | +${i + 1}.00% | 龙头(+9.99%) | ${i} |`).join('\n');
function dedupCharts() {
  const point = (label, value, unit = '%') => ({ label, value, unit, observation_date: evening.date,
    source_label: '测试公开数据', source_url: 'https://example.com/verified' });
  return [
    { key: 'topic', status: 'ok', points: ['甲', '乙', '丙', '丁', '戊'].map((label, i) => point(`${label}概念`, i + 1)) },
    { key: 'sentiment', status: 'ok', points: dedupDimensions.map((label, i) => point(label, dedupScores[i], i === 3 ? '观察分（风险）' : '观察分')) },
    ...['dashboard', 'moneyflow', 'weekly_chart'].map(key => ({ key, status: 'ok', points: [point(`${key}独有数据`, 10)] })),
  ];
}

test('successful body modules remove their duplicate lower charts and retain other charts and sources', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  for (const locale of ['zh-CN', 'en-US']) {
    const svg = buildAsiaReportSvg(evening, dedupCharts(), dedupDimensionBody + '\n' + dedupConceptBody, value => value, locale);
    assert.equal((svg.match(/data-dimension=/g) || []).length, 6);
    assert.match(svg, /data-table="concepts"/);
    assert.doesNotMatch(svg, />(?:市场温度|热点概念|Market temperature|Hot concepts) · /);
    for (const key of ['dashboard', 'moneyflow', 'weekly_chart']) assert.match(svg, new RegExp(`${key}独有数据`));
    assert.match(svg, /example.com/);
    assert.doesNotMatch(svg, /NaN|undefined/);
  }
});

for (const [name, markdown, temperature, concepts] of [
  ['both body modules missing', '', true, true],
  ['only dimensions rendered', dedupDimensionBody, false, true],
  ['only concepts rendered', dedupConceptBody, true, false],
  ['headings and empty tables', '### 六维观察\nN/A\n### 九、热门概念 TOP5\n| 概念 | 涨幅 | 龙头 | 涨停数 |\n|---|---|---|---|', true, true],
  ['malformed concepts table', dedupDimensionBody + '\n' + dedupConceptBody.replace('| 概念 |', '| wrong |'), false, true],
  ['partial dimension scores', dedupDimensionBody.replace('| 广度 | 43.4 |', '| 广度 | N/A |') + '\n' + dedupConceptBody, true, false],
  ['partial concepts return', dedupDimensionBody + '\n' + dedupConceptBody.replace('+2.00%', 'N/A'), false, true],
  ['partial concept rows', dedupDimensionBody + '\n' + dedupConceptBody.split('\n').slice(0, -1).join('\n'), false, true],
]) {
  test(`lower charts remain independent fallbacks for ${name}`, async () => {
    const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
    const svg = buildAsiaReportSvg(evening, dedupCharts(), markdown);
    assert.equal(svg.includes('>市场温度 · 已核实</text>'), temperature);
    assert.equal(svg.includes('>热点概念 · 已核实</text>'), concepts);
    if (temperature) assert.match(svg, />78.5 观察分<\/text>/);
    if (concepts) assert.match(svg, /戊概念/);
  });
}

test('lower charts retain different dates, values and units instead of discarding distinct facts', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  for (const update of [{ observation_date: '2026-09-29' }, { value: 88 }, { unit: '不同口径' }]) {
    const charts = dedupCharts();
    for (const chart of charts.slice(0, 2)) chart.points[0] = { ...chart.points[0], ...update };
    const svg = buildAsiaReportSvg(evening, charts, dedupDimensionBody + '\n' + dedupConceptBody);
    assert.match(svg, />市场温度 · 已核实<\/text>/);
    assert.match(svg, />热点概念 · 已核实<\/text>/);
  }
});


test('deduplication keeps lower chart warnings and empty missing or skipped diagnostics', async () => {
  const { buildAsiaReportSvg } = await import('../src/lib/asia-report-image.ts');
  for (const status of ['ok', 'degraded', 'missing', 'skipped']) {
    const charts = dedupCharts();
    for (const chart of charts.slice(0, 2)) {
      chart.status = status;
      chart.reason = '来源审核警告';
      if (status === 'missing' || status === 'skipped') chart.points = [];
    }
    const svg = buildAsiaReportSvg(evening, charts, dedupDimensionBody + '\n' + dedupConceptBody);
    assert.match(svg, /来源审核警告/);
    assert.match(svg, />市场温度 · /);
    assert.match(svg, />热点概念 · /);
  }
});
