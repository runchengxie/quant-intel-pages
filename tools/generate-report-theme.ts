import {readFileSync,writeFileSync} from 'node:fs';
import {reportThemeCss} from '../src/lib/report-theme.ts';
const path='src/styles/report-theme.css';
const expected='/* Generated from src/lib/report-theme.ts; edit canonical tokens there. */\n'+reportThemeCss();
if(process.argv.includes('--check')){if(readFileSync(path,'utf8')!==expected)throw new Error('Report theme CSS is stale; run npm run theme:build');}
else writeFileSync(path,expected);
