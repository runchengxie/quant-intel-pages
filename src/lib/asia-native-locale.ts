export const ASIA_NATIVE_LOCALE = {
  en: {
    title: 'Asia market review', returns: 'Major indices',
    returnNote: 'Daily change (%) on a shared zero baseline; session dates are labeled for each market.',
    sessionNote: 'Markets follow their own trading calendars. Session dates and source times in the report apply to each market independently.',
    evidence: 'Full report and evidence', close: 'Close (index points)', session: 'Session date',
    dateUnspecified: 'Session date not specified in this row', turnover: 'Turnover (CNY 100 million)',
    scoreNote: 'Report scores retain their published meaning and limitations; they are not probabilities or investment odds.',
    translationNote: 'Presentation text is translated where available. Untranslated source wording is retained so evidence and caveats stay complete.',
  },
  zh: {
    title: '亚洲市场复盘', returns: '主要指数',
    returnNote: '日涨跌幅（%）使用统一零轴，各市场分别注明交易日期。',
    sessionNote: '各市场按各自交易日历运行，报告中的交易日期与来源时间分别对应各市场。',
    evidence: '完整报告与证据', close: '收盘（指数点）', session: '交易日期',
    dateUnspecified: '该数据行未注明交易日期', turnover: '成交额（亿元人民币）',
    scoreNote: '报告评分保留原有含义及限制，不表示概率或投资胜率。',
    translationNote: '已有译文用于展示；未翻译的原文保留，以确保完整呈现证据及限制。',
  },
} as const;
