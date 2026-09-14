#!/usr/bin/env python3
"""Re-inject the source-of-truth Ganesha (site-src/ganesha.svg) into index.html.

The intro SVG is inlined in index.html so the drawing can begin with zero
extra network requests. Edit site-src/ganesha.svg, preview it with
`node tools/render_ganesha.js full out.png`, then run this script.
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG = os.path.join(ROOT, "site-src", "ganesha.svg")
HTML = os.path.join(ROOT, "index.html")
MARK_OPEN = "<!--GANESHA_SVG:start-->"
MARK_CLOSE = "<!--GANESHA_SVG:end-->"

svg = open(SVG).read().strip()
svg = "\n".join(("      " + line) if line.strip() else line for line in svg.split("\n"))
block = MARK_OPEN + "\n" + svg + "\n      " + MARK_CLOSE

html = open(HTML).read()
if MARK_OPEN in html and MARK_CLOSE in html:
    html = html.split(MARK_OPEN)[0] + block + html.split(MARK_CLOSE)[1]
elif "<!--GANESHA_SVG-->" in html:
    html = html.replace("<!--GANESHA_SVG-->", block)
else:
    raise SystemExit("no injection marker found in index.html")

open(HTML, "w").write(html)
print("injected site-src/ganesha.svg into index.html")
