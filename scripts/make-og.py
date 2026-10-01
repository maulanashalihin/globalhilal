#!/usr/bin/env python3
"""Generate public/og.png — the social share thumbnail (1200x630).

Source of truth for the OG image. Re-run after any rebrand/tagline change:
    python3 scripts/make-og.py

NOTE: `*.png` is gitignored (screenshots/uploads), so the output must be
force-added: `git add -f public/og.png`.

Design follows the repo system (no AI-slop): gh-night background, gh-gold
crescent (same geometry idea as Brand.svelte), wordmark + bilingual tagline.
Plain PIL primitives only — no SVG renderer or network dependency.
"""

from __future__ import annotations

import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
OUT = Path(__file__).resolve().parent.parent / "public" / "og.png"

NIGHT = (0x0B, 0x15, 0x26)
GOLD = (0xE3, 0xB9, 0x3E)
INK_LIGHT = (0xF2, 0xED, 0xE0)
MUTED = (0xB9, 0xC4, 0xC9)

ARIAL = "/Library/Fonts/Arial.ttf"
ARIAL_BOLD = "/Library/Fonts/Arial Bold.ttf"
ARIAL_UNI = "/Library/Fonts/Arial Unicode.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        sys.exit(f"missing font: {path}")


def fit(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, max_w: int, **kw) -> None:
    size = fnt.size
    while fnt.getbbox(text)[2] > max_w and size > 10:
        size -= 2
        fnt = ImageFont.truetype(fnt.path, size)
    draw.text(kw.pop("xy"), text, font=fnt, **kw)


def main() -> None:
    img = Image.new("RGB", (W, H), NIGHT)
        # Stars: deterministic, subtle (echoes Stars.svelte on the Home hero).
    rng = random.Random(1448)
    stars = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(stars)
    for _ in range(110):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        r = rng.uniform(0.8, 2.4)
        gold = rng.random() < 0.18
        alpha = rng.randint(35, 110)
        c = GOLD + (alpha,) if gold else (255, 255, 255, alpha)
        sd.ellipse([x - r, y - r, x + r, y + r], fill=c)
    img = Image.alpha_composite(img.convert("RGBA"), stars).convert("RGB")
    d = ImageDraw.Draw(img)

    # Crescent: gold disc with a night disc punched out, horns up-right.
    cx, cy, r = 880, 335, 195
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=GOLD)
    px, py, pr = 965, 255, 168
    d.ellipse([px - pr, py - pr, px + pr, py + pr], fill=NIGHT)
    # Companion star by the upper horn (echoes Brand.svelte).
    d.ellipse([1006 - 11, 128 - 11, 1006 + 11, 128 + 11], fill=GOLD)

    # Wordmark + taglines. Text block must stay clear of the crescent (x < 700).
    x = 90
    d.text((x, 150), "GlobalHilal", font=font(ARIAL_BOLD, 104), fill=INK_LIGHT)
    fit(
        d,
        "One valid sighting starts the month for all.",
        font(ARIAL, 36),
        590,
        xy=(x, 300),
        fill=MUTED,
    )
    d.text(
        (x, 362),
        "رؤية واحدة تثبت الشهر للجميع",
        font=font(ARIAL_UNI, 36),
        fill=GOLD,
        direction="rtl",
    )
    d.text((x, 470), "globalhilal.com", font=font(ARIAL_BOLD, 34), fill=GOLD)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.1f} KiB)")


if __name__ == "__main__":
    main()
