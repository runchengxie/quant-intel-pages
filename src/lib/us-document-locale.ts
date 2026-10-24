export const US_DOCUMENT_LOCALE = {
 en: {remaining:'Additional observations',reference:'Earlier Treasury observations',status:'Data status',quality:'Data quality',missing:'Unavailable',change:'Change',observed:'Observation date',referenceOnly:'Earlier observation; not a report-day move.', noResearch:'No reviewed research is available.',source:'Evidence'},
 zh: {remaining:'其他观测数据',reference:'美债较早观测值',status:'数据状态',quality:'数据质量',missing:'未提供',change:'变动',observed:'观测日期',referenceOnly:'较早观测值，不代表报告日变动。',noResearch:'暂无经核实的研究内容。',source:'证据'},
} as const;
export const US_DOCUMENT_UNITS: Record<string, readonly [string, string]> = {
 percent:['%','%'], basis_points:['bp','基点'], points:['points','点'],
 'USD/share':['USD/share','美元/股'], 'USD/barrel':['USD/barrel','美元/桶'],
 'USD/troy_ounce':['USD/troy oz','美元/金衡盎司'], 'USD/bitcoin':['USD/bitcoin','美元/比特币'],
};
