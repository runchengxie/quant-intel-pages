"""Execute the actual second-parent guard with bounded network doubles."""

import json
import os
import subprocess
from pathlib import Path

import pytest


def second_parent_script():
    text = Path(".github/workflows/publish-content.yml").read_text()
    block = text.split("      - name: Recheck parent inside the production lock\n", 1)[1]
    return "\n".join(
        line.removeprefix("            ")
        for line in block.split("          script: |\n", 1)[1].split("\n      - ", 1)[0].splitlines()
    )


@pytest.mark.parametrize(
    "scenario,success",
    [
        ("matching", True),
        ("bootstrap", True),
        ("wrong-parent", False),
        ("same-candidate", False),
        ("bad-schema", False),
        ("missing-parent", False),
        ("http-error", False),
        ("oversized-chunk", False),
        ("oversized-stream", False),
        ("multibyte", False),
        ("fetch-timeout", False),
        ("body-timeout", False),
        ("network-error", False),
        ("malformed", False),
    ],
)
def test_second_parent_deadline_byte_cap_and_existing_guard(scenario, success):
    harness = """
const assert = require('node:assert/strict');
const script = JSON.parse(process.argv[1]), scenario = process.argv[2];
let reads = 0, canceled = false, deadline = false, clears = 0, signal;
const realTimeout = setTimeout;
global.setTimeout = (callback, delay) => {
  assert.equal(delay, 30000); deadline = true; return realTimeout(callback, 20);
};
global.clearTimeout = timer => {clears++; require('node:timers').clearTimeout(timer);};
const waitForAbort = () => new Promise((resolve,reject) => {
  if (signal) signal.addEventListener('abort',()=>reject(Error('secret timeout')));
  else reject(Error('NO_ABORT_SIGNAL'));
});
global.fetch = async (url, options) => {
  assert.equal(url, 'https://runchengxie.github.io/quant-intel-pages/data/site-publication.json');
  assert.equal(options.redirect, 'error');
  assert.deepEqual(options.headers, {'Cache-Control':'no-cache'});
  signal = options.signal;
  if (scenario === 'network-error') throw Error('secret response detail');
  if (scenario === 'fetch-timeout') return waitForAbort();
  let payload = JSON.stringify({schema_version:scenario === 'bad-schema' ? 'wrong' : 'market_intel_pages.site_publication.v1',
    publication_id: scenario === 'wrong-parent' ? 'other' : scenario === 'same-candidate' ? 'next' : 'parent'});
  if (scenario === 'multibyte') payload = '界'.repeat(2000);
  if (scenario === 'malformed') payload = '{secret response detail';
  const body = {
    getReader: () => ({
      read: async () => {
        reads++;
        if (scenario === 'body-timeout') return waitForAbort();
        if (scenario === 'oversized-chunk') return {done:false,value:new Uint8Array(4097)};
        if (scenario === 'oversized-stream') return {done:false,value:new Uint8Array(2048)};
        return reads === 1 ? {done:false,value:Buffer.from(payload)} : {done:true};
      },
      cancel: async () => {canceled=true;}, releaseLock: () => {}
    }),
    cancel: async () => {canceled=true;}
  };
  const status = ['bootstrap','missing-parent'].includes(scenario) ? 404 : scenario === 'http-error' ? 500 : 200;
  return {status,ok:status===200,body,text:async()=>{throw Error('UNBOUNDED_TEXT_READ');}};
};
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
(async()=>{
  let error;
  try {await new AsyncFunction(script)();} catch (caught) {error=caught;}
  assert(deadline, 'explicit fetch-and-body deadline required');
  assert.equal(clears,1,'deadline must be cleared');
  assert(signal instanceof AbortSignal,'fetch requires abort signal');
  if (['fetch-timeout','body-timeout'].includes(scenario)) assert(signal.aborted);
  if (scenario === 'oversized-chunk') assert.equal(reads,1);
  if (scenario === 'oversized-stream') assert.equal(reads,3);
  if (['oversized-chunk','oversized-stream','multibyte'].includes(scenario)) assert(canceled);
  if (error) {
    assert(!/secret|NO_ABORT|UNBOUNDED/.test(error.message),'transport details must be sanitized');
    process.stderr.write(error.message);process.exitCode=1;
  }
})().catch(error=>{process.stderr.write(error.stack);process.exitCode=2;});
"""
    result = subprocess.run(
        ["node", "-e", harness, json.dumps(second_parent_script()), scenario],
        env={
            **os.environ,
            "EXPECTED_PARENT": "__bootstrap__" if scenario == "bootstrap" else "parent",
            "PROPOSED_MARKER": json.dumps({"publication_id": "next"}),
        },
        capture_output=True,
        timeout=3,
    )
    assert result.returncode == (0 if success else 1), result.stderr.decode()
