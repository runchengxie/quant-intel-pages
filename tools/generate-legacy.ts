import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';

const entries = [
  ['src/legacy-source/summary-utils.ts', 'src/legacy/summary-utils.js', 'marketIntelUtils'],
  ['src/legacy-source/theme-utils.ts', 'src/legacy/theme-utils.js', 'marketIntelTheme'],
  ['src/legacy-source/report-markdown.ts', 'src/legacy/report-markdown.js', 'reportMarkdown'],
  ['src/lib/market-daily-utils.ts', 'src/lib/market-daily-utils.js', 'marketDailyUtils'],
] as const;
async function main(): Promise<void> {
const check = process.argv.includes('--check');
for (const [entry, file, globalName] of entries) {
  const result = await build({ entryPoints: [entry], bundle: true, write: false,
    format: 'iife', globalName, target: 'es2020', legalComments: 'none',
    footer: { js: `if (typeof module !== "undefined" && module.exports) module.exports = ${globalName};\nif (typeof window !== "undefined") window.${globalName} = ${globalName};` },
  });
  const text = '// Generated from TypeScript by npm run legacy:build; do not edit.\n' + result.outputFiles[0].text;
  if (check) {
    if (await readFile(file, 'utf8') !== text) throw new Error(`${file} is stale; run npm run legacy:build`);
  } else await writeFile(file, text);
}

}
main().catch(error => { console.error(error); process.exitCode = 1; });
