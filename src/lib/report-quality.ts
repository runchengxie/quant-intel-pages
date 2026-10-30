import type {ReportDocument} from './report-document';
import {buildReportSvg} from './report-document-svg';
import {formatDisplayValue} from './display-value';

export interface ReportQualityIssue {
  code: string;
  panel?: string;
  row?: string;
  expected?: number;
  actual?: number;
}
export interface ReportQualityResult {
  issues: ReportQualityIssue[];
  image: {width: number; height: number} | null;
}
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
const observationIssue = (value:string, reportDate:string) => !validDate(value) ? 'invalid_observation_date' : value > reportDate ? 'future_observation' : null;
const escapeXml = (value: string) => value.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]!));

/** Inspect admitted presentation facts. Vendor accuracy and research approval remain with their owners. */
export function checkReportDocument(
  document: ReportDocument,
  expectedRankings: Record<string, number> = {},
  render: (document: ReportDocument) => string = buildReportSvg,
): ReportQualityResult {
  const issues: ReportQualityIssue[] = [];
  if (!validDate(document.date)) issues.push({code:'invalid_report_date'});
  const ids = new Set<string>();
  for (const panel of document.panels) {
    if (ids.has(panel.id)) issues.push({code:'duplicate_panel',panel:panel.id});
    ids.add(panel.id);
    if (Object.hasOwn(expectedRankings,panel.id)) {
      const actual = panel.disclosure ? 0 : (panel.rows?.length ?? 0);
      const expected = expectedRankings[panel.id];
      if (actual !== expected) issues.push({code:'ranking_rows_missing',panel:panel.id,expected,actual});
    }
    if (panel.id === 'financing' && panel.paragraphs?.length
      && panel.paragraphs.every(line => /^两融数据暂缺(?:[（(]T\+1\s*延迟[）)])?[。. ]*$/.test(line))) {
      issues.push({code:'empty_financing_visible',panel:panel.id});
    }
    const rowIds = new Set<string>();
    for (const row of panel.rows ?? []) {
      if (rowIds.has(row.id)) issues.push({code:'duplicate_row',panel:panel.id,row:row.id});
      rowIds.add(row.id);
      if (row.value !== undefined && !Number.isFinite(row.value)) issues.push({code:'nonfinite_value',panel:panel.id,row:row.id});
      if (row.observationDate) {
        const code=observationIssue(row.observationDate,document.date);
        if(code)issues.push({code,panel:panel.id,row:row.id});
      }
    }
    for (const series of panel.series ?? []) for (const point of series.values) {
      if (!Number.isFinite(point.value)) issues.push({code:'nonfinite_value',panel:panel.id});
      const code=observationIssue(point.date,document.date);
      if(code)issues.push({code,panel:panel.id});
    }
  }
  for (const [panel,expected] of Object.entries(expectedRankings)) {
    if (expected && !ids.has(panel)) issues.push({code:'ranking_rows_missing',panel,expected,actual:0});
  }
  let image: ReportQualityResult['image'] = null;
  try {
    const svg = render(document);
    const size = /^<svg\b[^>]*\bwidth="(\d+)"[^>]*\bheight="(\d+)"/.exec(svg);
    if (!size) issues.push({code:'invalid_image_dimensions'});
    else {
      image = {width:Number(size[1]),height:Number(size[2])};
      if(image.width<=0||image.height<=0||image.height>8000)issues.push({code:'invalid_image_dimensions'});
    }
    const renderedRows=new Map<string,string>();
    for(const record of svg.matchAll(/<g data-report-row-panel="([^"]*)" data-report-row="([^"]*)">([\s\S]*?)<\/g>/g)) {
      const key=record[1]+'\u001f'+record[2];
      if(renderedRows.has(key))issues.push({code:'image_row_duplicate'});
      renderedRows.set(key,record[3]);
    }
    for (const panel of document.panels.filter(panel=>!panel.disclosure)) for (const row of panel.rows ?? []) {
      const body=renderedRows.get(escapeXml(panel.id)+'\u001f'+escapeXml(row.id));
      if(body===undefined){issues.push({code:'image_row_missing',panel:panel.id,row:row.id});continue;}
      const text=body.replace(/<[^>]*>/g,'').replace(/\s/g,'');
      if(!text.includes(escapeXml(row.label).replace(/\s/g,'')))issues.push({code:'image_label_missing',panel:panel.id,row:row.id});
      if(row.valueText&&!body.includes(escapeXml(formatDisplayValue(row.valueText,document.locale))))issues.push({code:'image_value_missing',panel:panel.id,row:row.id});
      for(const cell of row.cells??[])if(!body.includes(escapeXml(formatDisplayValue(cell.text,document.locale))))issues.push({code:'image_cell_missing',panel:panel.id,row:row.id});
    }
  } catch (error) {
    // A section-aware caller may admit a whole-image budget failure only after checking actual section images.
    const code = error instanceof Error && 'code' in error && error.code === 'report_image_height_exceeded'
      ? 'whole_image_budget_exceeded' : 'image_render_failed';
    issues.push({code});
  }
  return {issues,image};
}

const sourceUrls=(sources:ReportDocument['sources'])=>[...new Set((sources??[]).map(source=>source.url))].sort();
const cellNumbers=(text:string)=>(text.replace(/\b(?:CNY|USD)\s+100m\b/gi,'').replace(/−/g,'-').match(/[+-]?\d+(?:,\d{3})*(?:\.\d+)?(?:[eE][+-]?\d+)?/g)??[]).map(token=>Number(token.replaceAll(',','')));
export function reportFacts(document: ReportDocument) {
  return {id:document.id,date:document.date,sources:sourceUrls(document.sources),panels:document.panels.map(panel=>({
    id:panel.id,kind:panel.kind,disclosure:panel.disclosure ?? false,scale:panel.scale,sources:sourceUrls(panel.sources),
    rows:(panel.rows ?? []).map(row=>({id:row.id,securityCodes:row.label.match(/(?<!\d)\d{6}(?!\d)/g)??[],value:row.value,kind:row.kind,date:row.observationDate,scale:row.scale,cells:(row.cells??[]).map(cell=>cellNumbers(cell.text)),sources:sourceUrls(row.sources)})),
    series:(panel.series ?? []).map(series=>series.values.map(point=>({date:point.date,value:point.value}))),
  }))};
}
export function compareReportFacts(english: ReportDocument, chinese: ReportDocument): ReportQualityIssue[] {
  return JSON.stringify(reportFacts(english)) === JSON.stringify(reportFacts(chinese)) ? [] : [{code:'locale_facts_differ'}];
}
