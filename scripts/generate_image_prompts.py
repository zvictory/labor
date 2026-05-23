"""Generate per-product Antigravity image-to-image prompts for Labor's catalog.

For every product in the storefront API:
  1. Pull the product detail to read brand, name, and fragrance.notes (with family).
  2. Build a scene description from the dominant note families
     (citrus -> lemon grove, woody -> cedar forest, ...).
  3. Download the existing primary product image as the visual reference
     (the bottle Antigravity must preserve in the new hero shot).
  4. Emit one JSONL row per product to tmp/antigravity_batch.jsonl.

The user then feeds the JSONL batch into Antigravity, drops outputs into
apps/web/public/products/<slug>.png, and runs
`bin/rake labor:images:attach_generated` — which already promotes the new
file to position 1 and demotes the previous primary to position 2.

Usage:
    python scripts/generate_image_prompts.py            # all 541 products
    python scripts/generate_image_prompts.py lost-cherry tuscan-leather
                                                        # only listed slugs
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter
from typing import Optional

API_BASE = "http://localhost:4000/api/v2/storefront"
OUT_PATH = "tmp/antigravity_batch.jsonl"
REF_DIR = "apps/web/public/products/raw"
HERO_DIR = "apps/web/public/products"

UA = "labor-prompt-gen/1.0"

# Note-family -> nature scene. Keep each scene <= ~14 words; Antigravity prompts
# shouldn't dilute the subject (the bottle).
SCENE_BY_FAMILY: dict[str, str] = {
    "citrus":    "Mediterranean lemon grove at golden hour, fruit on branches, sun-warmed leaves",
    "floral":    "wildflower meadow at dusk, soft petals scattered around, garden bokeh",
    "woody":     "cedar forest floor, moss-covered logs, cool filtered afternoon light",
    "amber":     "moroccan riad courtyard, warm honey light, dried resin and saffron",
    "resinous":  "moroccan riad courtyard, warm honey light, dried resin and saffron",
    "oriental":  "moroccan riad courtyard, warm honey light, dried resin and saffron",
    "spicy":     "vintage spice market stall, cinnamon and clove, warm low light",
    "aquatic":   "rocky Atlantic coastline, sea spray on stone, overcast cool light",
    "fresh":     "alpine lake shore, dew on pebbles, soft morning haze",
    "marine":    "rocky Atlantic coastline, sea spray on stone, overcast cool light",
    "gourmand":  "rustic kitchen window, ripe fruit and honey jars, soft afternoon light",
    "sweet":     "rustic kitchen window, ripe fruit and honey jars, soft afternoon light",
    "vanilla":   "rustic kitchen window, vanilla pods on linen, soft afternoon light",
    "leather":   "old library oak desk, leather-bound books, warm desk lamp",
    "smoky":     "smoldering campfire embers on stone, dusk haze, low warm glow",
    "tobacco":   "antique tobacconist counter, dried leaves, warm rim light",
    "green":     "Provençal herb garden, lavender and rosemary in bloom, soft sun",
    "herbal":    "Provençal herb garden, lavender and rosemary in bloom, soft sun",
    "aromatic":  "Provençal herb garden, lavender and rosemary in bloom, soft sun",
    "fruity":    "orchard branch with ripe stone fruit at golden hour, warm bokeh",
    "powdery":   "still-life linen draped over weathered wood, soft north-light window",
    "musky":     "luxe boudoir vignette, raw silk and warm tungsten, low key",
    "animalic":  "moody velvet drape under low warm light, antique brass tray",
}

# When a product has no harvested notes (~141 of 541), fall back to a brand
# tonality. This is intentionally conservative — better a clean, on-brand neutral
# scene than a wild guess.
BRAND_FALLBACK: dict[str, str] = {
    "le-labo":             "minimalist artisanal workshop, raw wood bench, soft north light",
    "byredo":              "stark Scandinavian table, pale linen, cool overcast light",
    "tom-ford":            "moody black marble surface, low-key dramatic side light",
    "maison-francis-kurkdjian": "ivory silk on polished oak, soft warm window light",
    "parfums-de-marly":    "antique gilt vanity, baroque wallpaper, candlelight",
    "creed":               "country estate library, leather chair and oak, warm afternoon light",
    "diptyque":            "Parisian apartment windowsill, herbs in terracotta, soft cloud light",
    "labor":               "raw concrete plinth, single warm spotlight, gallery minimalism",
    "roja-dove":           "polished mahogany desk, gold accents, deep amber light",
    "xerjoff":             "italian palazzo marble, velvet drape, warm chandelier glow",
    "clive-christian":     "ornate english drawing room, antique brass, deep warm light",
    "amouage":             "arabian palace inlay, brass lanterns, rich amber light",
    "maison-margiela":     "weathered concrete and linen, neutral diffused daylight",
    "kilian-paris":        "lacquered black surface, gold reflections, low theatrical light",
    "hermes":              "tan saddle leather workshop, warm window light",
    "guerlain":            "Parisian gilded mirror dressing table, soft candlelight",
    "ysl":                 "deep noir velvet surface, single gold rim light",
    "dior":                "couture atelier marble plinth, pearl-grey side light",
    "chanel":              "ivory boucle on lacquered black, classic studio lighting",
    "lattafa":             "majlis rug and brass tray, warm desert light",
    "armaf":               "carved oud wood block, brass coffee pot, warm interior light",
}
DEFAULT_FALLBACK = "soft natural still-life on weathered wood, neutral diffused daylight"


def http_get(url: str, timeout: int = 20) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def list_products() -> list[dict]:
    out: list[dict] = []
    page = 1
    while True:
        body = json.loads(http_get(f"{API_BASE}/products?per_page=100&page={page}"))
        out.extend(body.get("data", []))
        meta = body.get("meta", {})
        if page >= meta.get("total_pages", 1):
            break
        page += 1
    return out


def fetch_detail(slug: str) -> Optional[dict]:
    try:
        body = json.loads(http_get(f"{API_BASE}/products/{urllib.parse.quote(slug)}"))
        return body.get("data")
    except Exception as e:
        print(f"  ! detail fetch failed for {slug}: {e}")
        return None


def dominant_family(notes: list[dict]) -> Optional[str]:
    families = [n.get("family") for n in notes if n.get("family")]
    if not families:
        return None
    counts = Counter(families)
    return counts.most_common(1)[0][0]


def scene_for(detail: dict) -> str:
    notes = detail.get("fragrance", {}).get("notes", []) or []
    fam = dominant_family(notes)
    if fam and fam in SCENE_BY_FAMILY:
        return SCENE_BY_FAMILY[fam]
    brand_slug = (detail.get("brand") or {}).get("slug") or ""
    return BRAND_FALLBACK.get(brand_slug, DEFAULT_FALLBACK)


def build_prompt(detail: dict, scene: str) -> str:
    brand = (detail.get("brand") or {}).get("name") or ""
    name = detail.get("name") or ""
    return (
        f"Photorealistic product photography of the {brand} {name} perfume bottle, "
        f"exactly as shown in the reference image — preserve bottle shape, label, cap, "
        f"color, and proportions. Place it on {scene}. Soft cinematic lighting, "
        f"shallow depth of field, natural color grading, no text overlay, no people. "
        f"1:1 aspect, 1024x1024."
    )


def download_reference(detail: dict) -> Optional[str]:
    """Download the product's current primary image into REF_DIR. Returns the
    local path, or None if the product has no image yet."""
    images = detail.get("images") or []
    if not images:
        return None
    url = images[0].get("url")
    if not url:
        return None
    slug = detail["slug"]
    ext = os.path.splitext(urllib.parse.urlparse(url).path)[1].lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".webp"):
        ext = ".jpg"
    os.makedirs(REF_DIR, exist_ok=True)
    out_path = os.path.join(REF_DIR, f"{slug}-bottle{ext}")
    if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
        return out_path
    try:
        body = http_get(url, timeout=30)
        with open(out_path, "wb") as f:
            f.write(body)
        return out_path
    except Exception as e:
        print(f"  ! reference download failed for {slug}: {e}")
        return None


def main() -> None:
    only_slugs = set(sys.argv[1:])
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    print(f"Listing products from {API_BASE} ...")
    products = list_products()
    if only_slugs:
        products = [p for p in products if p["slug"] in only_slugs]
    print(f"  {len(products)} target products")

    written = 0
    no_ref = 0
    with open(OUT_PATH, "w", encoding="utf-8") as out:
        for idx, p in enumerate(products, 1):
            slug = p["slug"]
            detail = fetch_detail(slug)
            if not detail:
                continue
            scene = scene_for(detail)
            prompt = build_prompt(detail, scene)
            ref_path = download_reference(detail)
            if not ref_path:
                no_ref += 1
            row = {
                "slug": slug,
                "brand": (detail.get("brand") or {}).get("name", ""),
                "name": detail.get("name", ""),
                "scene": scene,
                "reference_image": ref_path or "",
                "output_filename": os.path.join(HERO_DIR, f"{slug}.png"),
                "prompt": prompt,
            }
            out.write(json.dumps(row, ensure_ascii=False) + "\n")
            out.flush()
            written += 1
            if idx % 25 == 0:
                print(f"  [{idx}/{len(products)}] {slug}  scene='{scene[:40]}...'")
            time.sleep(0.05)  # gentle on the dev API

    print(f"\nWrote {written} rows to {OUT_PATH}")
    print(f"Products without a reference image: {no_ref}")
    print(f"Reference images saved under: {REF_DIR}/")


if __name__ == "__main__":
    main()
