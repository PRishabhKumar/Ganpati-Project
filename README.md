# 🪔 Bappa, Year After Year

> **गणपती बप्पा मोरया — पुढच्या वर्षी लवकर या.**
> Ten Septembers of Ganpati at our home, **2016 – 2026** — every photograph, every year,
> woven into one scrollable memory journey.

This is not a gallery. It is a *smriti* — a memory piece for our family.

---

## The experience

1. **The drawing** — the page opens on pure black. A golden pen draws Lord Ganesha
   stroke by stroke (halo → crown → face → ears → trunk → arms → legs → His mouse
   and the modaks), exactly like a turtle-graphics sketch: first the outline…
2. **…then the colour** — watercolour washes bloom into the line art, region by region.
3. **…then the world** — the background deepens to maroon, a mandala turns behind Him,
   marigold petals and diya embers begin to drift, and a temple bell rings.
4. **The welcome** — *श्री गणेशाय नमः · Bappa, Year After Year* — and a button to begin.
5. **The journey** — ten chapters, one per year, each with its own colour, its own
   Marathi word, and its own way of holding photographs:
   hung postcards, a full-bleed cinema frame (2018, the river), a draggable filmstrip
   (2020, the year the mandap was built frame by frame), masonry walls, and a living
   video memory (2024).
   - **2017** gets an empty dashed frame: *some years live only in memory.*
6. **The same hands** — a drag slider between 2016 and 2025: the arms grew, the grip didn't.
7. **Counting the blessings** — ten Septembers, 133 photographs, one family.
8. **The finale** — a flickering diya, *गणपती बप्पा मोरया!, पुढच्या वर्षी लवकर या…* ,
   then “Walk the journey again” or “Shuffle a memory”.

Throughout: a golden scroll thread with a little diya at its head, a year-rail on the
right to jump between Septembers, blur-up photo loading, a full lightbox
(arrows / swipe / Esc), synthesised temple bells (toggle 🔕 bottom-right),
floating petals, and full `prefers-reduced-motion` support.

## Run it locally

The site is **fully static — no build step, no dependencies**:

```bash
python3 -m http.server 8000        # then open http://localhost:8000
```

## Deploy it

- **GitHub Pages**: push to `main`; `.github/workflows/pages.yml` publishes the site
  (Settings → Pages → source: GitHub Actions).
- **Anything else** (Netlify, Vercel, a family NAS, a pen drive): point the static
  host at the repository root. That's all — `index.html` + `css/` + `js/` + `data/` + `img/`.

## Adding memories (next September!)

1. Drop the originals into `Assets/<year>/` (any filename; duplicates are detected automatically).
2. Re-generate the web-optimised images + manifest:
   ```bash
   python3 tools/build_images.py     # needs ImageMagick (convert)
   ```
3. Write that year's few lines of story in `data/story.json`
   (`title`, `marathi`, `body`, `accent` colour, `layout`: `masonry | filmstrip | scatter | cinema`).
4. If the year is new, it appears in the rail automatically. Commit. Done.

## Repository map

```
index.html            the whole experience (intro SVG inlined)
css/main.css          all styling & animation
js/fx.js              petals canvas · synthesised temple bell · scroll thread
js/intro.js           the drawing choreography (outline → colour → bloom → welcome)
js/journey.js         builds chapters, galleries, lightbox, slider, counters
data/manifest.json    generated: every photo, sizes, blur-up placeholders
data/story.json       the words — edit this to change the story
img/                  generated WebP derivatives (committed so the site deploys fast)
Assets/               the untouched originals, year by year  ❤
site-src/ganesha.svg  source of the intro drawing (tools/inject_svg.py inlines it)
tools/                build_images.py · inject_svg.py · dev previews & smoke test
```

## Dev tools (optional)

```bash
node tools/render_ganesha.js full out.png   # rasterise the Ganesha (needs: npm i sharp)
node tools/draw_sequence.js seq.jpg         # storyboard of the drawing choreography
node tools/smoke_test.js                    # jsdom end-to-end smoke test (needs: npm i jsdom)
```

---

Made with love, for our family.
**गणपती बप्पा मोरया !** 🪔
