"""Re-harvest only the products with status='blocked' from a previous
harvest_product_details.py run.

Why: when Fragrantica rate-limits one IP, the designer/<brand>.html pages
start returning 403. We persist those as `status='blocked'`. This script
waits out the rate-limit window, then retries with:
  - rotated modern Chrome UAs (5 variants)
  - browser-like Accept / Accept-Language / Sec-Fetch-* headers
  - Referer chain (google.com -> designer page -> detail page)
  - fresh requests.Session every 6 brands (new TCP, new fingerprint)
  - 4-6s jittered pause between detail fetches; 3s between brands

Run from repo root:
  python3 scripts/retry_blocked_brands.py
"""

from __future__ import annotations

import json
import os
import random
import re
import sys
import time
import unicodedata
from typing import Optional

import requests
from bs4 import BeautifulSoup

# Reuse parsing helpers from the main harvester.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harvest_product_details import (  # noqa: E402
    BRAND_DESIGNER_SLUG,
    brand_to_designer_slug,
    normalize_name,
    match_product_to_index,
    parse_year,
    parse_description,
    parse_accords,
)

OUTPUT_PATH = "apps/backend/tmp/product_details.json"

UA_POOL: tuple[str, ...] = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
)

COMMON_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}

COOLDOWN_SECONDS = 30 * 60  # 30 min since last successful harvest end
BRANDS_PER_SESSION = 6
SLEEP_BRAND = 3.0
SLEEP_DETAIL_MIN = 4.0
SLEEP_DETAIL_MAX = 6.5


def fresh_session() -> requests.Session:
    s = requests.Session()
    return s


def request_with_jitter(
    session: requests.Session, url: str, *, referer: str
) -> Optional[requests.Response]:
    headers = dict(COMMON_HEADERS)
    headers["User-Agent"] = random.choice(UA_POOL)
    headers["Referer"] = referer
    try:
        return session.get(url, headers=headers, timeout=30, allow_redirects=True)
    except requests.RequestException as e:
        print(f"  ! request error: {e}", flush=True)
        return None


def fetch_designer_index(brand: str, session: requests.Session):
    designer = brand_to_designer_slug(brand)
    url = f"https://www.fragrantica.com/designers/{designer}.html"
    resp = request_with_jitter(session, url, referer="https://www.google.com/")
    if not resp:
        return designer, url, None, []
    if resp.status_code != 200:
        return designer, url, resp.status_code, []
    pat = re.compile(
        r'href="(/perfume/' + re.escape(designer) + r'/([^"]+?)-(\d+)\.html)"'
    )
    seen: set[str] = set()
    out: list[tuple[str, str, str]] = []
    for m in pat.finditer(resp.text):
        path, name_slug, fid = m.group(1), m.group(2), m.group(3)
        if fid in seen:
            continue
        seen.add(fid)
        out.append((f"https://www.fragrantica.com{path}", fid, name_slug))
    return designer, url, 200, out


def fetch_detail(session: requests.Session, url: str, designer_url: str):
    resp = request_with_jitter(session, url, referer=designer_url)
    if not resp or resp.status_code != 200:
        code = resp.status_code if resp else "no-resp"
        return code, None
    return 200, BeautifulSoup(resp.text, "html.parser")


def wait_for_cooldown() -> None:
    if not os.path.exists(OUTPUT_PATH):
        print(f"missing {OUTPUT_PATH}", flush=True)
        sys.exit(1)
    mtime = os.path.getmtime(OUTPUT_PATH)
    elapsed = time.time() - mtime
    if elapsed >= COOLDOWN_SECONDS:
        print(
            f"Cooldown satisfied ({int(elapsed/60)}m since last harvest).",
            flush=True,
        )
        return
    remaining = COOLDOWN_SECONDS - elapsed
    print(
        f"Waiting {int(remaining)}s ({int(remaining/60)}m) for Fragrantica rate-limit cooldown...",
        flush=True,
    )
    while remaining > 0:
        time.sleep(min(60, remaining))
        remaining = COOLDOWN_SECONDS - (time.time() - mtime)
        if remaining > 0 and int(remaining) % 300 < 60:
            print(f"  ... {int(remaining/60)}m to go", flush=True)
    print("Cooldown complete.", flush=True)


SKIP_BRANDS_FOR_RETRY: set[str] = {
    "labor", "okiii", "MIX", "Sofderm", "Casa Tito", "Creation",
    "Genyum", "Hormone Paris", "Never Lies", "Khaltat", "Kinski",
    "Lorenzo Pazzaglia",
}


def collect_retry_set(rows: list[dict]) -> dict[str, list[dict]]:
    """Two cases need re-fetching:
      A) status='blocked' rows — detail page failed (real brand was reachable).
      B) status='not_found' rows in brands whose entire group missed — designer
         page itself was likely 403-walled (no rows have status='ok' for that brand).
    """
    from collections import defaultdict
    brand_status_counts: dict[str, dict[str, int]] = defaultdict(
        lambda: {"ok": 0, "blocked": 0, "not_found": 0}
    )
    for r in rows:
        b = r.get("brand") or ""
        brand_status_counts[b][r.get("status", "")] += 1

    retry: dict[str, list[dict]] = {}
    for r in rows:
        brand = r.get("brand") or ""
        if not brand or brand in SKIP_BRANDS_FOR_RETRY:
            continue
        status = r.get("status")
        if status == "blocked":
            retry.setdefault(brand, []).append(r)
            continue
        if status == "not_found":
            counts = brand_status_counts[brand]
            # Brand-wide blackout (every product in this brand was not_found AND none ok)
            if counts["ok"] == 0 and counts["blocked"] == 0:
                retry.setdefault(brand, []).append(r)
    return retry


def main() -> None:
    wait_for_cooldown()
    with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
        rows: list[dict] = json.load(f)

    blocked_by_brand = collect_retry_set(rows)
    print(
        f"Retrying {sum(len(v) for v in blocked_by_brand.values())} products across "
        f"{len(blocked_by_brand)} brands (blocked + 403-walled).",
        flush=True,
    )

    session = fresh_session()
    brand_count = 0
    recovered_brands = 0
    recovered_products = 0
    still_blocked_brands = 0

    slug_to_row = {r["slug"]: r for r in rows}

    for brand, group in blocked_by_brand.items():
        brand_count += 1
        if brand_count > 1 and (brand_count - 1) % BRANDS_PER_SESSION == 0:
            session.close()
            session = fresh_session()
            print("  (rotated session)", flush=True)
            time.sleep(SLEEP_BRAND * 2)

        print(
            f"\n== [{brand_count}/{len(blocked_by_brand)}] {brand!r} ({len(group)} blocked) ==",
            flush=True,
        )
        designer, designer_url, status, index = fetch_designer_index(brand, session)
        if status != 200:
            print(f"  ! designer {designer} status={status} (still blocked)", flush=True)
            still_blocked_brands += 1
            time.sleep(SLEEP_BRAND)
            continue
        print(f"  designer index: {len(index)} perfumes", flush=True)
        if not index:
            time.sleep(SLEEP_BRAND)
            continue

        recovered_brands += 1
        for p in group:
            name = p["name"]
            hit = match_product_to_index(name, index)
            if not hit:
                print(f"  [{name}] no match", flush=True)
                p["status"] = "not_found"
                continue
            url, fid = hit
            p["fragrantica_url"] = url
            p["fragrantica_id"] = fid
            code, soup = fetch_detail(session, url, designer_url)
            if soup is None:
                print(f"  [{name}] detail status={code}", flush=True)
                # Keep status=blocked for next retry pass.
                time.sleep(random.uniform(SLEEP_DETAIL_MIN, SLEEP_DETAIL_MAX))
                continue
            p["year"] = parse_year(soup)
            p["description"] = parse_description(soup)
            p["accords"] = parse_accords(soup)
            p["accord_names"] = [a["name"] for a in p["accords"]]
            p["status"] = "ok" if p["description"] else "blocked"
            print(
                f"  [{name}] year={p['year']} desc={len(p['description'])}ch accords={len(p['accords'])}",
                flush=True,
            )
            if p["status"] == "ok":
                recovered_products += 1
            time.sleep(random.uniform(SLEEP_DETAIL_MIN, SLEEP_DETAIL_MAX))

        # Save after each brand for crash safety.
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, indent=2)
        time.sleep(SLEEP_BRAND)

    print(
        f"\nDone. Recovered {recovered_products} products from {recovered_brands} "
        f"brands. {still_blocked_brands} brands remain blocked.",
        flush=True,
    )


if __name__ == "__main__":
    main()
