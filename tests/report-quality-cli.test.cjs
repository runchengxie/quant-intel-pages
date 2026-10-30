const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const {spawnSync}=require('node:child_process');
const run=(args)=>spawnSync(process.execPath,['--import','tsx','tools/check-reports.ts',...args],{encoding:'utf8',timeout:30000});
test('frozen public report CLI records input hashes and both languages without overwriting receipts',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'report-quality-'));try{
  const receipt=path.join(dir,'receipt.json');const result=run(['--snapshot','artifacts/public','--receipt',receipt]);assert.equal(result.status,0,result.stdout+result.stderr);
  const data=JSON.parse(fs.readFileSync(receipt));assert.equal(data.schema_version,'market_intel.report_quality.v1');assert.equal(data.status,'passed');assert.ok(data.reports.length>0);assert.ok(Object.keys(data.input_sha256).length>5);assert.ok(data.reports.every(r=>r.locales.length===2));
  const again=run(['--snapshot','artifacts/public','--receipt',receipt]);assert.notEqual(again.status,0);assert.deepEqual(JSON.parse(fs.readFileSync(receipt)),data);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('candidate report requires the declared input hash and strict identity',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'report-candidate-'));try{
  const manifest=path.join(dir,'candidate.json');const markdown=path.join(dir,'report.md');fs.writeFileSync(markdown,'# Candidate\n');fs.writeFileSync(manifest,JSON.stringify({schema_version:'market_intel.asia_report_candidate.v1',report_id:'2026-10-29-evening',markdown_path:markdown,markdown_sha256:'0'.repeat(64),producer_revision:'1'.repeat(40),consumer_revision:'2'.repeat(40)}));
  const result=run(['--snapshot','artifacts/public','--candidate',manifest]);assert.notEqual(result.status,0);assert.match(result.stdout+result.stderr,/candidate_hash_mismatch/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('candidate reports bind their wrapper date and reject ambiguous manifests',()=>{
 const crypto=require('node:crypto');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'report-date-'));try{
  const markdown=path.join(dir,'report.md'),manifest=path.join(dir,'candidate.json');const text='# 收盘复盘（2026-10-28）\n\n数据日期: 2026-10-28\n';fs.writeFileSync(markdown,text);
  const value={schema_version:'market_intel.asia_report_candidate.v1',report_id:'2026-10-29-evening',markdown_path:markdown,markdown_sha256:crypto.createHash('sha256').update(text).digest('hex'),producer_revision:'1'.repeat(40),consumer_revision:'2'.repeat(40)};
  fs.writeFileSync(manifest,JSON.stringify(value));let result=run(['--snapshot','artifacts/public','--candidate',manifest]);assert.notEqual(result.status,0);assert.match(result.stdout+result.stderr,/candidate_date_mismatch/);
  fs.writeFileSync(manifest,JSON.stringify(value).replace('{','{"report_id":"2026-10-28-evening",'));result=run(['--snapshot','artifacts/public','--candidate',manifest]);assert.notEqual(result.status,0);assert.match(result.stdout+result.stderr,/candidate_manifest_invalid/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('candidate cannot borrow a later correct heading and failed output paths leave inputs untouched',()=>{
 const crypto=require('node:crypto');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'report-boundary-'));try{
  const markdown=path.join(dir,'report.md'),manifest=path.join(dir,'candidate.json');const text='# 收盘复盘（2026-10-28）\n\n数据日期: 2026-10-29\n\n# 收盘复盘（2026-10-29）\n';fs.writeFileSync(markdown,text);fs.writeFileSync(manifest,JSON.stringify({schema_version:'market_intel.asia_report_candidate.v1',report_id:'2026-10-29-evening',markdown_path:markdown,markdown_sha256:crypto.createHash('sha256').update(text).digest('hex'),producer_revision:'1'.repeat(40),consumer_revision:'2'.repeat(40)}));
  let result=run(['--snapshot','artifacts/public','--candidate',manifest]);assert.notEqual(result.status,0);assert.match(result.stdout+result.stderr,/candidate_date_mismatch/);
  const snapshot=path.join(dir,'snapshot');fs.mkdirSync(snapshot);result=run(['--snapshot',snapshot,'--receipt',path.join(snapshot,'new-output','receipt.json')]);assert.notEqual(result.status,0);assert.match(result.stdout+result.stderr,/receipt_inside_inputs/);assert.deepEqual(fs.readdirSync(snapshot),[]);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
