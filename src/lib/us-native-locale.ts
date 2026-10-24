export const US_NATIVE_LABELS = {
 title: ['U.S. market report', '美股市场报告'],
 figures: ['Market figures', '市场数据'], exact: ['All figures and source records', '完整数据与来源记录'],
 fact: ['Indicator', '指标'], value: ['Value', '数值'], unit: ['Unit', '单位'], observed: ['Observed', '观测日'],
 source: ['Source', '来源'], quality: ['Quality', '数据状态'], evidence: ['Evidence', '证据'],
 research: ['Reviewed research', '已核实研究'], missing: ['Unavailable', '未提供'],
 noResearch: ['No reviewed research is available.', '暂无经核实的研究内容。'],
 missingData: ['Missing data', '缺失数据'], optional: ['Optional data unavailable', '可选数据未提供'],
 indices: ['Indices', '指数'], equities: ['U.S. equities', '美股个股'], treasury: ['Treasury yields', '美债收益率'], crossAssets: ['Cross assets', '跨资产'],
 indexClose: ['Close (points)', '收盘（点）'], equityClose: ['Close (USD/share)', '收盘（美元/股）'], yieldLevel: ['Yield (%)', '收益率（%）'], assetClose: ['Close', '收盘'], dailyReturn: ['Daily return (%)', '日涨跌（%）'], yieldChange: ['Yield change (bp)', '收益率变动（基点）'],
} as const;
export function usNativeLabel(key: keyof typeof US_NATIVE_LABELS, locale: 'en' | 'zh'): string {
 return US_NATIVE_LABELS[key][locale === 'en' ? 0 : 1];
}
