/** Deterministic presentation catalog for the producer's complete Markdown lines.
 * Numbers are captured verbatim; no calculations or free-form word replacement.
 * New producer prose must be added here before it can be presented in English.
 */
const catalog: Record<string, readonly [string, string]> = {
  marketTitle: ['# 本周市场背景', '# Weekly market context'],
  styleTitle: ['# 市场风格周报', '# Weekly market style report'],
  recapDatedTitle: ['## 本周复盘（10月19日至10月23日）', '## Weekly recap (10/19 to 10/23)'],
  recapTitle: ['# 本周复盘', '# Weekly recap'],
  week: ['2026-10-19 当周，数据截至 2026-10-23', 'Week of 2026-10-19; data through 2026-10-23'],
  cutoff: ['数据截至 2026-10-23', 'Data through 2026-10-23'],
  valueTitle: ['## 价值因子', '## Value factor'],
  sizeTitle: ['## 大小盘因子（风格）', '## Size factor (market style)'],
  method: ['计算方法：行业中性化。', 'Calculation method: industry neutralization.'],
  complete: ['数据状态：完整，已覆盖本期目标截止日。', 'Data status: complete; covers the target cutoff for this report.'],
  incomplete: ['数据状态：尚未完整。当前数据截至 2026-10-16，目标日期为 2026-10-23。本报告仅供预览。', 'Data status: incomplete. Data currently run through 2026-10-16; the target date is 2026-10-23. This report is for preview only.'],
  currentTitle: ['### 01 当前状态', '### 01 Current state'],
  evidenceTitle: ['### 02 证据', '### 02 Evidence'],
  evidenceReadingTitle: ['### 02 证据怎么读', '### 02 Reading the evidence'],
  historyTitle: ['### 03 历史参考', '### 03 Historical reference'],
  watchTitle: ['### 04 下周观察', '### 04 What to watch next week'],
  methodsTitle: ['### 不同计算方法', '### Alternative calculation methods'],
  neutral: ['中性，已持续 3 周。', 'Neutral; has persisted for 3 weeks.'],
  momentum: ['趋势延续，已持续 3 周。', 'Trend continuation; has persisted for 3 weeks.'],
  return12: ['- 过去 12 周累计：+2.3%（高于约 52% 的历史样本）', '- Cumulative return over the past 12 weeks: +2.3% (higher than approximately 52% of historical samples)'],
  return52: ['- 过去 52 周累计：+9.8%', '- Cumulative return over the past 52 weeks: +9.8%'],
  drawdown: ['- 当前回撤：0.0%（周频历史最大回撤 -19.0%）', '- Current drawdown: 0.0% (historical maximum drawdown at weekly frequency: -19.0%)'],
  volatility: ['- 过去 12 周年化波动率：18.6%', '- Annualized volatility over the past 12 weeks: 18.6%'],
  upWeeks: ['- 过去 12 周上涨周占比：75%', '- Share of positive weeks over the past 12 weeks: 75%'],
  historicalScope: ['历史上，当前状态共出现 668 周，分布在 51 段连续时期。后续收益的统计区间有重叠，独立样本数少于周数。', 'Historically, the current state occurred in 668 weeks across 51 continuous episodes. Forward-return windows overlap, so the number of independent samples is smaller than the number of weeks.'],
  forward: ['- 后续 4 周：收益中位数 +0.6%，正收益比例 57%（665 周样本）', '- Next 4 weeks: median return +0.6%; positive-return rate 57% (665 weekly samples)'],
  episode: ['只取每段状态的第一周，后续 13 周正收益比例为 70%（50 个样本）。全样本的后续 13 周正收益比例为 68%。', 'Using only the first week of each episode, the positive-return rate over the next 13 weeks is 70% (50 samples). For the full sample, the positive-return rate over the next 13 weeks is 68%.'],
  unclear: ['- 当前方向不明显。', '- The current direction is unclear.'],
  neutralAllocation: ['- 配置上可保持当前的价值风格比例，避免根据单周波动频繁调整。', '- The current value-style allocation can be maintained; avoid frequent adjustments based on a single week of fluctuations.'],
  momentumShort: ['- 历史上，后续 4 周正收益比例为 57%，短期方向不明显。', '- Historically, the positive-return rate over the next 4 weeks was 57%; the near-term direction is unclear.'],
  momentumMedium: ['- 后续 13 周收益中位数为 +2.3%，正收益比例为 68%。历史上的中期收益多数为正。', '- Median return over the next 13 weeks was +2.3%, with a positive-return rate of 68%. Historical medium-term returns were mostly positive.'],
  momentumAllocation: ['- 配置上可保持当前的价值风格比例，同时留意近期表现处于历史高位后的回落风险。', '- The current value-style allocation can be maintained, while watching for pullback risk after recent performance reached historically high levels.'],
  methodsIntro: ['各方法的含义见说明文档。本期数据如下：', 'See the documentation for the meaning of each method. Data for this report follow:'],
  methodsCaveat: ['基础市净率倒数和综合价值指标每周更新。可交易筛选的两项结果来自最近一次单独回算，更新频率较低，截止日期也可能更早。比较时请先对齐数据日期。', 'The basic inverse price-to-book ratio and composite value measure are updated weekly. Both tradability-screened results come from the latest separate historical recalculation, are updated less frequently, and may have earlier cutoff dates. Align data dates before comparing.'],
  lowCrowding: ['拥挤区间：低拥挤。', 'Crowding zone: low crowding.'],
  highCrowding: ['拥挤区间：高拥挤。', 'Crowding zone: high crowding.'],
  smallCrowding: ['- 小盘拥挤度：0.493', '- Small-cap crowding: 0.493'],
  largeCrowding: ['- 大盘拥挤度：0.798。低于 0.10 时触发小盘高拥挤。', '- Large-cap crowding: 0.798. A reading below 0.10 triggers high small-cap crowding.'],
  largeSignal: ['方向信号：大盘占优（采用 20 日和 60 日均线）。', 'Direction signal: large caps lead (using 20-day and 60-day moving averages).'],
  smallSignal: ['方向信号：小盘占优（采用 20 日和 60 日均线）。', 'Direction signal: small caps lead (using 20-day and 60-day moving averages).'],
  insufficientSignal: ['方向信号：数据不足。', 'Direction signal: insufficient data.'],
  crowdingMethod: ['拥挤程度用于选择均线周期。高拥挤时采用 5 日和 20 日均线，及时观察风格变化。低拥挤时采用 20 日和 60 日均线，侧重观察中期趋势。', 'Crowding determines the moving-average windows. High crowding uses 5-day and 20-day moving averages to track style changes promptly. Low crowding uses 20-day and 60-day moving averages to focus on medium-term trends.'],
  directionMethod: ['方向由沪深 300 与中证 1000 的相对强弱决定。短期均线高于长期均线时，大盘占优。其余情况下，小盘占优。拥挤程度只影响均线周期。', 'Direction is determined by the relative strength of the CSI 300 versus the CSI 1000. Large caps lead when the short moving average is above the long moving average. Otherwise, small caps lead. Crowding affects only the moving-average windows.'],
  watchCrossover: ['- 观察相对强弱短均线是否跌破长均线。', '- Watch whether the short moving average of relative strength falls below the long moving average.'],
  watchCrowding: ['- 观察近 20 日拥挤证据是否回落至 0.90 以下。', '- Watch whether crowding evidence over the past 20 days falls below 0.90.'],
  signalCaveat: ['本信号用于观察市场风格，不构成交易建议。', 'This signal is for observing market style and is not trading advice.'],
  turnover: ['成交情况：周总成交额 7.88 万亿元，日均 1.58 万亿元。', 'Turnover: weekly total CNY 7.88 trillion; daily average CNY 1.58 trillion.'],
  flowIn: ['资金动向：全周主力资金净流入 341 亿元。', 'Fund flows: weekly net inflows of major funds totaled CNY 341 hundred million.'],
  flowOut: ['资金动向：全周主力资金净流出 341 亿元。', 'Fund flows: weekly net outflows of major funds totaled CNY 341 hundred million.'],
  flowFlat: ['资金动向：全周主力资金基本持平。', 'Fund flows: major fund flows were broadly balanced over the week.'],
  limits: ['涨停统计：全周涨停 268 只，日均涨停 53.6 只。', 'Limit-up counts: 268 over the week; daily average 53.6.'],
  limitsMedium: ['涨停数量处于中等水平。', 'Limit-up counts were at a moderate level.'],
  limitsHigh: ['涨停数量处于较高水平，短线情绪活跃。', 'Limit-up counts were elevated, with active short-term sentiment.'],
  limitsLow: ['涨停数量偏低，短线资金参与度有限。', 'Limit-up counts were low, with limited participation by short-term funds.'],
  goldVolatile: ['黄金本周波动较大（2.7%）。A 股贵金属板块下周开盘可能受到外盘影响。', 'Gold fluctuated substantially this week (2.7%). Overseas markets may affect the A-share precious-metals sector at next week’s open.'],
  marginFlat: ['融资余额维持在 100 亿元。', 'Margin financing balances held at CNY 100 hundred million.'],
  marginRise: ['融资余额从 100 亿元增至 120 亿元，增加 20 亿元。', 'Margin financing balances rose from CNY 100 hundred million to CNY 120 hundred million, an increase of CNY 20 hundred million.'],
  marginFall: ['融资余额从 120 亿元降至 100 亿元，减少 20 亿元。', 'Margin financing balances fell from CNY 120 hundred million to CNY 100 hundred million, a decrease of CNY 20 hundred million.'],
  insufficientDays: ['仅 1 个交易日数据，不足以生成周度复盘。', 'Only 1 trading day of data is available, insufficient for a weekly recap.'],
};

const trends = { '强势上涨': 'strong gains', '震荡偏强': 'choppy with an upward bias', '单边下跌': 'persistent declines', '震荡偏弱': 'choppy with a downward bias', '震荡分化': 'mixed and choppy' };
for (const [zh, en] of Object.entries(trends)) {
  catalog[`marketTrend.${en}`] = [`盘面特征：${zh}。本周 5 个交易日，2 天上涨、3 天下跌。日均上涨家数占比 47%，个股平均涨幅 +0.00%。`, `Market conditions: ${en}. This week had 5 trading days: 2 up days and 3 down days. The daily average share of advancing stocks was 47%; the average stock return was +0.00%.`];
}
for (const [zh, en, direction] of [['升至', 'rose to', '走强'], ['降至', 'fell to', '走弱'], ['维持在', 'held at', '持平']]) {
  const outcome = direction === '走强' ? 'stronger' : direction === '走弱' ? 'weaker' : 'flat';
  catalog[`gold.${outcome}`] = [`外盘黄金：本周从 4159 美元${zh} 4044 美元，周涨跌幅为 -2.7%，整体${direction}。`, `Overseas gold: from USD 4159 at the start of the week, the price ${en} USD 4044; the weekly return was -2.7%, ending ${outcome} overall.`];
}
for (const [zh, en] of [['基础市净率倒数', 'Basic inverse price-to-book ratio'], ['综合价值指标', 'Composite value measure'], ['可交易筛选，未扣费用', 'Tradability screen, before costs'], ['可交易筛选，已扣费用', 'Tradability screen, after costs']]) {
  for (const historical of [false, true]) {
    catalog[`comparison.${en}.${historical}`] = [`- ${zh}（截至 2026-10-23${historical ? '，历史回算' : ''}）：过去 12 周累计 +2.3%，高于约 52% 的历史样本。过去 52 周累计 +9.8%，当前回撤 0.0%。历史上，后续 13 周收益中位数 +2.3%，正收益比例 68%。`, `- ${en} (through 2026-10-23${historical ? '; historical recalculation' : ''}): cumulative return over the past 12 weeks +2.3%, higher than approximately 52% of historical samples. Cumulative return over the past 52 weeks +9.8%; current drawdown 0.0%. Historically, median return over the next 13 weeks +2.3%; positive-return rate 68%.`];
  }
}
// Turnover uses the producer's two unit scales, preserving displayed amounts.
for (const [zhA, enA] of [['亿元', 'hundred million'], ['万亿元', 'trillion']]) {
  for (const [zhB, enB] of [['亿元', 'hundred million'], ['万亿元', 'trillion']]) {
    catalog[`turnover.${enA}.${enB}`] = [`成交情况：周总成交额 7.88 ${zhA}，日均 1.58 ${zhB}。`, `Turnover: weekly total CNY 7.88 ${enA}; daily average CNY 1.58 ${enB}.`];
  }
}

const numberPattern = /[+-]?\d+(?:\.\d+)?/g;
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const templates = Object.values(catalog).map(([source, english]) => {
  const parts = source.split(numberPattern);
  const pattern = new RegExp(`^${parts.map(escapeRegex).join('([+-]?\\d+(?:\\.\\d+)?)')}$`);
  return {pattern, english};
});

export function weeklyReportPresentation(markdown: string, locale: 'en' | 'zh'): {markdown: string; untranslated: string[]} {
  if (locale === 'zh') return {markdown, untranslated: []};
  const untranslated: string[] = [];
  let codeFence: string | undefined;
  const translated = markdown.split('\n').map((line) => {
    const fence = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) {
      if (!codeFence) codeFence = fence;
      else if (fence[0] === codeFence[0] && fence.length >= codeFence.length) codeFence = undefined;
      return line;
    }
    if (codeFence || /^\s*`[^`]+`\s*$/.test(line)) return line;
    const guide = /^计算方法、图表说明和数据范围见\[周报怎么读\]\(([^\n]+)\)。$/.exec(line);
    if (guide) return `For calculation methods, chart explanations and data scope, see [How to read the weekly report](${guide[1]}).`;
    if (!line.trim()) return line;
    for (const {pattern, english} of templates) {
      const match = pattern.exec(line);
      if (match) {
        let index = 1;
        return english.replace(numberPattern, () => match[index++]);
      }
    }
    // Preserve protocol strings and already-English prose byte for byte. Rendering
    // remains the responsibility of renderMarkdown's existing HTML sanitizer.
    if (!/\p{Script=Han}/u.test(line)) return line;
    untranslated.push(line);
    return '> English translation unavailable for this passage; see the original source below.';
  });
  return {markdown: translated.join('\n'), untranslated};
}
