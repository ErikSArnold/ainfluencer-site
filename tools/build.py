"""Convert the canvas's .dc.html artboards into plain static pages.

Usage: python3 tools/build.py <dir-with-dc-files> <out-dir>
"""
import html
import json
import re
import shutil
import sys
from pathlib import Path

PAGES = {
    "Main.dc.html": ("index.html", "AInfluencer — AI replies to your DMs and comments, in your voice"),
    "Pricing.dc.html": ("pricing.html", "AInfluencer pricing — plans priced by AI replies"),
}
LINKS = {src: out for src, (out, _) in PAGES.items()}


def between(text, start, end):
    m = re.search(re.escape(start) + r"(.*?)" + re.escape(end), text, re.S)
    return m.group(1) if m else ""


def convert(src: Path, out_name: str, description: str) -> str:
    text = src.read_text(encoding="utf-8")
    for a, b in LINKS.items():
        text = text.replace(f'href="{a}', f'href="{b}')

    title = between(text, "<title>", "</title>").strip()
    xdc = between(text, "<x-dc>", "</x-dc>")
    helmet = between(xdc, "<helmet>", "</helmet>")
    body_tpl = re.sub(r"<helmet>.*?</helmet>", "", xdc, flags=re.S).strip()

    m = re.search(r"<script type=\"text/x-dc\" data-dc-script data-props='(.*?)'>(.*?)</script>", text, re.S)
    props_decl = json.loads(html.unescape(m.group(1)))
    logic = m.group(2).strip()
    props = {k: v.get("default") for k, v in props_decl.items() if not k.startswith("$") and isinstance(v, dict)}

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(description)}">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
{helmet.strip()}
<style>html{{scroll-behavior:smooth}}*,*::before,*::after{{box-sizing:border-box}}img,svg{{max-width:100%}}</style>
</head>
<body>
<div id="dc-root" data-props="{html.escape(json.dumps(props))}"><!--PRERENDER--></div>
<template id="dc-template">
{body_tpl}
</template>
<script src="runtime.js"></script>
<script>
{logic}
window.Component = Component;
</script>
</body>
</html>
"""


def main():
    src_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    for src, (out_name, desc) in PAGES.items():
        (out_dir / out_name).write_text(convert(src_dir / src, out_name, desc), encoding="utf-8")
    shutil.copy(Path(__file__).with_name("runtime.js"), out_dir / "runtime.js")


if __name__ == "__main__":
    main()
