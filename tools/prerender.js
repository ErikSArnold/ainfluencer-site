// Bakes the first render into each page so it shows without JavaScript and is indexable.
// Usage: node tools/prerender.js <site-dir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const dir = path.resolve(process.argv[2]);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const f of ['index.html', 'pricing.html']) {
    const file = path.join(dir, f);
    const errors = [];
    page.removeAllListeners('pageerror');
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('file://' + file);
    await page.waitForFunction(() => document.getElementById('dc-root').children.length > 0);
    if (errors.length) { console.error(f, errors); process.exitCode = 1; }
    const inner = await page.$eval('#dc-root', (el) => el.innerHTML);
    const src = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, src.replace(/<!--PRERENDER-->|(?<=<div id="dc-root"[^>]*>)[\s\S]*?(?=<\/div>\n<template id="dc-template">)/, () => inner));
    console.log('prerendered', f, inner.length, 'chars');
  }
  await browser.close();
})();
