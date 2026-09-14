#!/usr/bin/env python3
"""
Build script for "Bappa, Year After Year".

Scans Assets/<year>/ for photographs, removes byte-identical duplicates,
generates web-optimised WebP derivatives (full + thumb + tiny LQIP placeholder)
into img/<year>/ and writes data/manifest.json which the website consumes.

Usage:  python3 tools/build_images.py
Requires: ImageMagick (convert) on PATH.

The derivatives are committed on purpose: the site is a fully static deployable
and must load fast on phones, while the untouched originals stay in Assets/.
"""
import base64
import collections
import hashlib
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "Assets")
IMG_OUT = os.path.join(ROOT, "img")
DATA_OUT = os.path.join(ROOT, "data")

FULL_MAX = 1600      # longest edge for lightbox / hero images
THUMB_MAX = 700      # longest edge for gallery cards
LQIP_W = 24          # tiny blur-up placeholder

EXTS = (".jpg", ".jpeg", ".png")


def slugify(name: str) -> str:
    s = os.path.splitext(os.path.basename(name))[0]
    s = re.sub(r"\(\d+\)", "", s)
    s = re.sub(r"[^A-Za-z0-9]+", "-", s).strip("-").lower()
    return s or "photo"


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"command failed: {' '.join(cmd)}\n{r.stderr}")
    return r


def dimensions(path):
    out = run(["identify", "-format", "%w %h", path]).stdout.split()
    return int(out[0]), int(out[1])


def make_webp(src, dst, max_edge, quality):
    run([
        "convert", src,
        "-auto-orient",
        "-resize", f"{max_edge}x{max_edge}>",
        "-strip",
        "-interlace", "Plane",
        "-quality", str(quality),
        dst,
    ])


def lqip_b64(src):
    tmp = os.path.join(DATA_OUT, "_lqip.webp")
    run(["convert", src, "-auto-orient", "-resize", f"{LQIP_W}x", "-strip", "-quality", "58", tmp])
    with open(tmp, "rb") as fh:
        return base64.b64encode(fh.read()).decode()


def main():
    years = sorted(
        (d for d in os.listdir(ASSETS) if os.path.isdir(os.path.join(ASSETS, d)) and d.isdigit()),
        key=int,
    )
    if not years:
        sys.exit("no year folders found under Assets/")

    os.makedirs(DATA_OUT, exist_ok=True)

    # ---- pass 1: de-duplicate byte-identical files, pick a canonical cover ----
    hashes = collections.OrderedDict()
    for year in years:
        folder = os.path.join(ASSETS, year)
        files = sorted(
            (f for f in os.listdir(folder) if f.lower().endswith(EXTS)),
            # prefer the named cover (e.g. 2020.jpeg) first so it wins the dup group
            key=lambda f: (not f.lower().startswith(year), f),
        )
        for fname in files:
            path = os.path.join(folder, fname)
            digest = hashlib.md5(open(path, "rb").read()).hexdigest()
            hashes.setdefault(digest, (year, fname, path))

    manifest = {"years": [], "generated_from": "Assets/", "total_photos": 0}
    seen_slugs = collections.defaultdict(set)

    for digest, (year, fname, src) in hashes.items():
        year_entry = next((y for y in manifest["years"] if y["year"] == int(year)), None)
        if year_entry is None:
            year_entry = {"year": int(year), "cover": None, "photos": []}
            manifest["years"].append(year_entry)
            os.makedirs(os.path.join(IMG_OUT, year), exist_ok=True)

        slug = slugify(fname)
        while slug in seen_slugs[year]:
            slug += "x"
        seen_slugs[year].add(slug)

        full = os.path.join(IMG_OUT, year, f"{slug}-w{FULL_MAX}.webp")
        thumb = os.path.join(IMG_OUT, year, f"{slug}-w{THUMB_MAX}.webp")
        make_webp(src, full, FULL_MAX, 76)
        make_webp(src, thumb, THUMB_MAX, 72)
        w, h = dimensions(full)

        entry = {
            "id": slug,
            "src_full": f"img/{year}/{slug}-w{FULL_MAX}.webp",
            "src_thumb": f"img/{year}/{slug}-w{THUMB_MAX}.webp",
            "w": w,
            "h": h,
            "lqip": lqip_b64(src),
            "file": f"Assets/{year}/{fname}",
        }
        year_entry["photos"].append(entry)
        if year_entry["cover"] is None and fname.lower().startswith(year):
            year_entry["cover"] = slug
        manifest["total_photos"] += 1
        print(f"  {year}/{fname}  ->  {w}x{h}")

    # every year needs a cover even without a named <year>.jpeg
    for y in manifest["years"]:
        if y["cover"] is None and y["photos"]:
            y["cover"] = y["photos"][0]["id"]
        y["photos"].sort(key=lambda p: p["file"])
        # keep cover first in the grid: it is the year's signature frame
        y["photos"].sort(key=lambda p: p["id"] != y["cover"])

    tmp = os.path.join(DATA_OUT, "_lqip.webp")
    if os.path.exists(tmp):
        os.remove(tmp)

    manifest["years"].sort(key=lambda y: y["year"])
    with open(os.path.join(DATA_OUT, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, separators=(",", ":"))

    print(f"\nwrote data/manifest.json  ({manifest['total_photos']} photos, {len(manifest['years'])} years)")


if __name__ == "__main__":
    main()
