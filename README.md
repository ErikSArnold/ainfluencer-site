# AInfluencer website

Static marketing site for AInfluencer — AI replies to creators' DMs and comments.

- `docs/` — the published site (GitHub Pages serves this folder): `index.html` (home) and `pricing.html`.
- `src/` — the design source pages exported from the Claude design canvas.
- `tools/` — `build.py` turns `src/*.dc.html` into static pages, `runtime.js` powers the interactive calculator and plan estimator, `prerender.js` bakes the first render into the HTML so pages work without JavaScript.

## Rebuild after editing the design

```bash
python3 tools/build.py src docs
node tools/prerender.js docs   # needs Playwright
```

Placeholders in brackets (e.g. `[INSTAGRAM]`, `[PRODUCT]`) still need real content.
