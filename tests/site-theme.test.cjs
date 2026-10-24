const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const header = readFileSync('src/components/SiteHeader.astro', 'utf8');
const bootstrap = readFileSync('src/components/ThemeInit.astro', 'utf8').match(/<script is:inline>([\s\S]*?)<\/script>/)[1];
const initial = header.match(/<script is:inline>([\s\S]*?)<\/script>/)[1];
const controller = header.match(/<script>([\s\S]*?)<\/script>/)[1];
for (const denied of [false, true]) for (const systemDark of [false, true]) {
  test(`shared theme restores, toggles and follows system (storage denied=${denied}, system dark=${systemDark})`, () => {
    let stored = null;
    const root = { dataset: {} }; const attrs = {}; const events = {}; const mediaEvents = {};
    const button = { dataset: { lightLabel: 'Switch to light mode', darkLabel: 'Switch to dark mode' }, setAttribute: (k,v) => attrs[k]=v, addEventListener: (k,v) => events[k]=v };
    const media = { matches: systemDark, addEventListener: (k,v) => mediaEvents[k]=v };
    const context = { document: { documentElement: root, querySelector: q => q==='#theme-toggle'?button:null }, localStorage: { getItem: () => {if(denied) throw Error('denied'); return stored;}, setItem: (_,v) => {if(denied) throw Error('denied'); stored=v;} }, matchMedia: () => media, window: {matchMedia:()=>media,addEventListener:()=>{}}, location: {hash:''} };
    const run = code => vm.runInNewContext(ts.transpileModule(`(() => {${code}})()`, {}).outputText, context);
    run(bootstrap); assert.equal(root.dataset.theme, systemDark?'dark':'light');
    run(initial); assert.equal(attrs['aria-pressed'], String(systemDark));
    run(controller); events.click(); assert.equal(root.dataset.theme,systemDark?'light':'dark');
    assert.equal(attrs['aria-label'], systemDark?'Switch to dark mode':'Switch to light mode');
    events.click(); assert.equal(root.dataset.theme,systemDark?'dark':'light');
    media.matches=!systemDark; mediaEvents.change(); assert.equal(root.dataset.theme,(denied?!systemDark:systemDark)?'dark':'light');
    if(!denied){stored='invalid';mediaEvents.change();assert.equal(root.dataset.theme,!systemDark?'dark':'light');stored='dark';run(bootstrap);run(initial);run(controller);assert.equal(root.dataset.theme,'dark');assert.equal(attrs['aria-pressed'],'true');events.click();assert.equal(stored,'light');}
  });
}
