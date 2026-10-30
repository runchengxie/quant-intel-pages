/** Read-only presentation acceptance for frozen public inputs and pinned owner candidates. */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync,lstatSync,realpathSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {loadReports,loadChart,loadMarkdown,loadMarketDailyHistory,VISUAL_REPORT_START_DATE} from '../src/lib/reports';
import {loadWeeklyRecaps} from '../src/lib/weekly-recap';
import {summarizeMarketDaily} from '../src/lib/market-daily-utils';
import {buildAsiaReportDocument} from '../src/lib/asia-report-document';
import {buildUsReportDocument} from '../src/lib/us-report-document';
import {buildWeeklyReportDocument} from '../src/lib/weekly-report-document';
import {reportTable} from '../src/lib/asia-report-tables';
import {checkReportDocument,compareReportFacts,type ReportQualityIssue} from '../src/lib/report-quality';
import type {ReportDocument} from '../src/lib/report-document';

const sha = (bytes: Uint8Array|string) => createHash('sha256').update(bytes).digest('hex');
function inputHashes(root: string): Record<string,string> {
 const result: Record<string,string>={};let bytes=0;
 const walk=(directory:string)=>{
  for(const entry of readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
   const file=path.join(directory,entry.name);const stat=lstatSync(file);
   if(stat.isSymbolicLink())throw Error('input_symlink');
   if(stat.isDirectory()){walk(file);continue;}
   if(!stat.isFile()||stat.size>20_000_000)throw Error('input_file_invalid');
   bytes+=stat.size;if(bytes>256_000_000||Object.keys(result).length>=2000)throw Error('input_budget_exceeded');
   result[path.relative(root,file).split(path.sep).join('/')]=sha(readFileSync(file));
  }
 };walk(root);return result;
}
interface Candidate {schema_version:string;report_id:string;markdown_path:string;markdown_sha256:string;producer_revision:string;consumer_revision:string;}
function readCandidate(file:string) {
 const metadata=lstatSync(file);if(!metadata.isFile()||metadata.isSymbolicLink()||metadata.size>32768)throw Error('candidate_manifest_invalid');
 const raw=readFileSync(file,'utf8');if(Buffer.byteLength(raw)>32768)throw Error('candidate_too_large');
 let value:Candidate;try{value=JSON.parse(raw) as Candidate;}catch{throw Error('candidate_manifest_invalid');}
 const fields='consumer_revision,markdown_path,markdown_sha256,producer_revision,report_id,schema_version';
 if(!value||typeof value!=='object'||Object.keys(value).sort().join(',')!==fields||JSON.stringify(value)!==raw.trim()
  ||value.schema_version!=='market_intel.asia_report_candidate.v1'
  ||typeof value.report_id!=='string'||!/^\d{4}-\d{2}-\d{2}-evening$/.test(value.report_id)
  ||typeof value.markdown_path!=='string'||typeof value.markdown_sha256!=='string'||!/^[a-f0-9]{64}$/.test(value.markdown_sha256)
  ||typeof value.producer_revision!=='string'||!/^[a-f0-9]{40}$/.test(value.producer_revision)
  ||typeof value.consumer_revision!=='string'||!/^[a-f0-9]{40}$/.test(value.consumer_revision))throw Error('candidate_manifest_invalid');
 const source=path.resolve(path.dirname(file),value.markdown_path);const stat=lstatSync(source);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>2_000_000)throw Error('candidate_file_invalid');
 const bytes=readFileSync(source);if(sha(bytes)!==value.markdown_sha256)throw Error('candidate_hash_mismatch');
 const markdown=bytes.toString('utf8'),date=value.report_id.slice(0,10);
 const dates=[...markdown.split(/^### /m,1)[0].matchAll(/^(?:- )?数据日期[:：]\s*(\d{4}-\d{2}-\d{2})\s*$/gm)].map(match=>match[1]);
 const headings=markdown.split(/\r?\n/).filter(line=>/^#(?:\s|$)/.test(line)).map(line=>line.trim());
 if(dates.length!==1||dates[0]!==date||headings.length!==1||headings[0]!==`# 收盘复盘（${date}）`||markdown.trimStart().split(/\r?\n/,1)[0]!==headings[0])throw Error('candidate_date_mismatch');
 return {value,source,markdown,manifest_sha256:sha(raw)};
}
function rankingCounts(markdown:string) {
 const result:Record<string,number>={};
 for(const heading of ['### 七、行业板块 TOP10','### 八、高成交核心票 TOP10']){
  const table=reportTable(markdown,heading);if(table)result[table.key]=table.rows.length;
 }
 return result;
}
async function inspectPair(documents:ReportDocument[],expected:Record<string,number>={}) {
 const reports=[];
 for(const document of documents){
  const checked=checkReportDocument(document,expected);let mode='whole';let sections:unknown[]=[];
  try {
   const {buildReportSectionImages}=await import('../src/lib/report-sections');
   const rendered=buildReportSectionImages(document);
   sections=rendered.map(section=>({key:section.key,panels:section.document.panels.map(panel=>panel.id)}));
   const actual=rendered.flatMap(section=>section.document.panels.map(panel=>panel.id)).sort();
   const expectedPanels=document.panels.filter(panel=>!panel.disclosure).map(panel=>panel.id).sort();
   if(JSON.stringify(actual)!==JSON.stringify(expectedPanels))checked.issues.push({code:'section_panel_coverage'});
   for(const section of rendered)checked.issues.push(...checkReportDocument(section.document,{},()=>section.svg).issues);
   if(rendered.length&&checked.issues.some(issue=>issue.code==='whole_image_budget_exceeded')){
    checked.issues=checked.issues.filter(issue=>issue.code!=='whole_image_budget_exceeded');mode='sections_only';
   }
  }catch{checked.issues.push({code:'section_image_render_failed'});}
  reports.push({locale:document.locale,...checked,export_mode:mode,sections});
 }
 const issues=compareReportFacts(documents[0],documents[1]);
 return {id:documents[0].id,date:documents[0].date,issues,locales:reports};
}
async function inspectInputs(candidate:ReturnType<typeof readCandidate>|undefined) {
 const results=[];let candidateUsed=false;
 for(const report of loadReports().filter(report=>report.kind==='evening'&&report.date>=VISUAL_REPORT_START_DATE)){
  const markdown=candidate?.value.report_id===report.id?(candidateUsed=true,candidate.markdown):loadMarkdown(report);
  results.push(await inspectPair(['en','zh'].map(locale=>buildAsiaReportDocument(report,loadChart(report.id),markdown,locale as 'en'|'zh')),rankingCounts(markdown)));
 }
 if(candidate&&!candidateUsed){
  const report={id:candidate.value.report_id,date:candidate.value.report_id.slice(0,10),kind:'evening'};
  results.push(await inspectPair(['en','zh'].map(locale=>buildAsiaReportDocument(report,loadChart(report.id),candidate.markdown,locale as 'en'|'zh')),rankingCounts(candidate.markdown)));
 }
 for(const report of loadMarketDailyHistory()){
  const summary=summarizeMarketDaily(report);if(!summary)throw Error('us_report_not_admitted');
  results.push(await inspectPair(['en','zh'].map(locale=>buildUsReportDocument(summary,locale as 'en'|'zh'))));
 }
 for(const report of loadWeeklyRecaps())results.push(await inspectPair(['en','zh'].map(locale=>buildWeeklyReportDocument(report,locale as 'en'|'zh'))));
 if(!results.length)throw Error('no_reports');
 return results;
}
async function main() {
 const {values}=parseArgs({options:{snapshot:{type:'string'},receipt:{type:'string'},candidate:{type:'string'}}});
 values.receipt??=process.env.REPORT_VALIDATION_RECEIPT;
 const root=realpathSync(values.snapshot??process.env.ASTRO_DATA_ROOT??'artifacts/public');
 process.env.ASTRO_DATA_ROOT=root;
 if(values.receipt){
  const destination=path.resolve(values.receipt);
  if(destination===root||destination.startsWith(root+path.sep))throw Error('receipt_inside_inputs');
  let ancestor=path.dirname(destination);while(!existsSync(ancestor))ancestor=path.dirname(ancestor);
  const parent=realpathSync(ancestor);
  if(parent===root||parent.startsWith(root+path.sep))throw Error('receipt_inside_inputs');
  mkdirSync(path.dirname(destination),{recursive:true});
 }
 const before=inputHashes(root);const candidate=values.candidate?readCandidate(path.resolve(values.candidate)):undefined;
 const reports=await inspectInputs(candidate);const after=inputHashes(root);
 const issues:ReportQualityIssue[]=[];
 if(JSON.stringify(before)!==JSON.stringify(after))issues.push({code:'inputs_changed'});
 if(candidate&&(sha(readFileSync(candidate.source))!==candidate.value.markdown_sha256||sha(readFileSync(path.resolve(values.candidate!)))!==candidate.manifest_sha256))issues.push({code:'candidate_changed'});
 const blocked=issues.length>0||reports.some(report=>report.issues.length||report.locales.some(locale=>locale.issues.length));
 let revision:string|null=null;
 try{revision=execFileSync('git',['-C',path.dirname(fileURLToPath(import.meta.url)),'rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{/* Archive callers use the declared revision and validator hash. */}
 const receipt={schema_version:'market_intel.report_quality.v1',scope:'presentation_of_admitted_public_inputs',status:blocked?'blocked':'passed',generated_at_utc:new Date().toISOString(),validator_revision:revision,validator_sha256:sha(readFileSync(fileURLToPath(import.meta.url))),input_sha256:before,candidate:candidate?{report_id:candidate.value.report_id,markdown_sha256:candidate.value.markdown_sha256,declared_producer_revision:candidate.value.producer_revision,declared_consumer_revision:candidate.value.consumer_revision,manifest_sha256:candidate.manifest_sha256}:null,issues,reports};
 if(values.receipt)writeFileSync(path.resolve(values.receipt),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify(receipt));if(blocked)process.exitCode=2;
}
main().catch(error=>{console.error(error instanceof Error?error.message:'report_quality_failed');process.exitCode=1;});
