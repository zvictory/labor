"""Harvest fragrantica.com perfume detail pages for Labor's Spree products.

Output: apps/backend/tmp/product_details.json — list of
  {slug, name, brand, fragrantica_id, year, description, accord_names}

Strategy mirrors scripts/get_fragrantica_ids.py + harvest_note_ids.py:
1. Pull product slugs from the live storefront API
   (http://localhost:4000/api/v2/storefront/products?per_page=100).
2. For each product, search DDG-lite for
       site:fragrantica.com/perfume "{brand} {name}"
   Extract the first /perfume/.../-{id}.html link.
3. Fetch the perfume page. Parse:
     - year   = first 4-digit run in og:description ("... was launched in 2006")
     - desc   = first long <p> (>120 chars) inside #info / div[itemprop="description"]
     - accord_names = anchors under div.accord-box
4. Save progress every 5 products. Resume on re-run.

Fragrantica is occasionally CF-walled. On 403/503, skip with empty fields —
the ingestion step keeps existing data and only fills blanks.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from dataclasses import dataclass, field, asdict
from typing import Optional

import requests
from bs4 import BeautifulSoup

API_BASE = "http://localhost:4000/api/v2/storefront"
OUTPUT_PATH = "apps/backend/tmp/product_details.json"
PROGRESS_PATH = "apps/backend/tmp/product_details_progress.json"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
HEADERS = {"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"}


@dataclass
class ProductDetail:
    slug: str
    name: str
    brand: str
    fragrantica_id: str = ""
    fragrantica_url: str = ""
    year: Optional[int] = None
    description: str = ""
    accord_names: list[str] = field(default_factory=list)
    accords: list[dict] = field(default_factory=list)  # [{name, weight (0..100), color_hex}]
    status: str = "pending"  # pending | ok | not_found | blocked


def list_products(session: requests.Session, per_page: int = 100) -> list[dict]:
    out: list[dict] = []
    page = 1
    while True:
        url = f"{API_BASE}/products?per_page={per_page}&page={page}"
        resp = session.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        body = resp.json()
        out.extend(body.get("data", []))
        meta = body.get("meta", {})
        if page >= meta.get("total_pages", 1):
            break
        page += 1
    return out


FRAG_URL_RE = re.compile(r"(https?://(?:www\.)?fragrantica\.com/perfume/[^\s\"'<>]+?-(\d+)\.html)")
_TOKEN_RE = re.compile(r"[A-Za-z0-9]+")

# Fragrantica's designer URL slug differs from our stored brand name. Map only
# the cases where naive `replace(' ', '-')` fails; everything else uses the
# default mapping.
BRAND_DESIGNER_SLUG: dict[str, str] = {
    "Kilian": "By-Kilian",
    "Memo Paris": "Memo-Paris",
    "Memo": "Memo-Paris",
    "Francis Kurkdjian": "Maison-Francis-Kurkdjian",
    "Maison Francis Kurkdjian": "Maison-Francis-Kurkdjian",
    "Hermès": "Hermes",
    "Frédéric Malle": "Frederic-Malle",
    "Floraïku": "Floraiku",
    "Dolce & Gabbana": "Dolce-Gabbana",
    "Abercrombie & Fitch": "Abercrombie-Fitch",
    "Zielinski & Rozen": "Zielinski-Rozen",
    "Zielinski": "Zielinski-Rozen",
    "Penhaligon's": "Penhaligon-s",
    "Victoria's Secret": "Victoria-s-Secret",
    "Victorias Secret": "Victoria-s-Secret",
    "Parfum de Marly": "Parfums-de-Marly",
    "Armani": "Giorgio-Armani",
    "Escentric": "Escentric-Molecules",
    "Essential": "Essential-Parfums",
    "Ormondo Jayne": "Ormonde-Jayne",
    "HFC": "Haute-Fragrance-Company",
    "Borntostandout": "BORNTOSTANDOUT",
    "WIDIAN": "Widian",
    # House / unknown brands — skip designer lookup; they won't be on Fragrantica.
}

# Brands present in our catalog but known not to be on Fragrantica (or in-house).
# We mark these "not_found" without an HTTP fetch.
SKIP_BRANDS: set[str] = {
    "labor", "okiii", "MIX", "Sofderm", "Casa Tito", "Creation",
    "Genyum", "Hormone Paris", "Never Lies", "Khaltat", "Kinski",
    "Lorenzo Pazzaglia",
}

_NORM_RE = re.compile(r"[^a-z0-9]+")


def normalize_name(s: str) -> str:
    """Lowercase, strip diacritics, collapse to alphanumeric for fuzzy matching."""
    import unicodedata
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    return _NORM_RE.sub("", s.lower())


def brand_to_designer_slug(brand: str) -> str:
    if brand in BRAND_DESIGNER_SLUG:
        return BRAND_DESIGNER_SLUG[brand]
    import unicodedata
    s = unicodedata.normalize("NFKD", brand).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", "-", s.strip())


def fetch_designer_index(brand: str, session: requests.Session) -> list[tuple[str, str, str]]:
    """Return [(url, fragrantica_id, name_slug)] for every perfume listed on this
    brand's Fragrantica designer page. `name_slug` is the URL-name component
    (e.g. 'Lost-Cherry') used to match against the product name."""
    designer = brand_to_designer_slug(brand)
    url = f"https://www.fragrantica.com/designers/{designer}.html"
    try:
        resp = session.get(url, headers=HEADERS, timeout=30)
    except requests.RequestException as e:
        print(f"  ! designer fetch failed for {brand} ({designer}): {e}")
        return []
    if resp.status_code != 200:
        print(f"  ! designer {designer} status={resp.status_code}")
        return []
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
    return out


def match_product_to_index(name: str, index: list[tuple[str, str, str]]) -> Optional[tuple[str, str]]:
    """Find the perfume in the index whose normalized name-slug is the closest
    match to the product `name`. Returns (url, fid) or None."""
    target = normalize_name(name)
    if not target:
        return None
    best: Optional[tuple[int, str, str]] = None  # (score, url, fid)
    for url, fid, slug in index:
        cand = normalize_name(slug)
        if cand == target:
            return url, fid
        # Substring matches in either direction (handles "Lost Cherry" vs "Lost-Cherry"
        # exact-match above, and quirks like "Bergamote 22" vs "Bergamote-22").
        if cand and target and (cand in target or target in cand):
            score = min(len(cand), len(target))
            if best is None or score > best[0]:
                best = (score, url, fid)
    if best:
        return best[1], best[2]
    return None


def _score_url(url: str, want: str) -> int:
    """Count overlap of distinct lowercase tokens between URL path tail and the wanted brand+name."""
    want_tokens = {t.lower() for t in _TOKEN_RE.findall(want) if len(t) > 1}
    if not want_tokens:
        return 0
    path = url.rsplit("/", 1)[-1]
    url_tokens = {t.lower() for t in _TOKEN_RE.findall(path) if len(t) > 1}
    return len(want_tokens & url_tokens)


def _extract_frag_candidates(html: str) -> list[tuple[str, str]]:
    """Pull (url, fragrantica_id) pairs out of raw HTML, deduped, order-preserving."""
    seen: set[str] = set()
    out: list[tuple[str, str]] = []
    for m in FRAG_URL_RE.finditer(html):
        url, fid = m.group(1), m.group(2)
        if url in seen:
            continue
        seen.add(url)
        out.append((url, fid))
    return out


def _engine_brave(query: str, session: requests.Session) -> tuple[int, list[tuple[str, str]]]:
    resp = session.get("https://search.brave.com/search", params={"q": query},
                       headers=HEADERS, timeout=20)
    return resp.status_code, _extract_frag_candidates(resp.text) if resp.status_code == 200 else []


def _engine_ddg(query: str, session: requests.Session) -> tuple[int, list[tuple[str, str]]]:
    # DDG HTML endpoint is more permissive than the lite endpoint from UZ.
    resp = session.post("https://html.duckduckgo.com/html/", data={"q": query},
                        headers=HEADERS, timeout=20)
    return resp.status_code, _extract_frag_candidates(resp.text) if resp.status_code == 200 else []


def _engine_bing(query: str, session: requests.Session) -> tuple[int, list[tuple[str, str]]]:
    resp = session.get("https://www.bing.com/search", params={"q": query, "setlang": "en"},
                       headers=HEADERS, timeout=20)
    return resp.status_code, _extract_frag_candidates(resp.text) if resp.status_code == 200 else []


SEARCH_ENGINES = (
    ("brave", _engine_brave),
    ("ddg",   _engine_ddg),
    ("bing",  _engine_bing),
)


def _pick_best(candidates: list[tuple[str, str]], want: str) -> Optional[tuple[str, str]]:
    if not candidates:
        return None
    scored = [(_score_url(url, want), url, fid) for url, fid in candidates]
    scored.sort(key=lambda c: c[0], reverse=True)
    top_score, url, fid = scored[0]
    want_tokens = {t.lower() for t in _TOKEN_RE.findall(want) if len(t) > 1}
    min_score = 2 if len(want_tokens) >= 2 else 1
    if top_score < min_score:
        return None
    return url, fid


def ddg_search(query: str, session: requests.Session, *, want: str = "", retries: int = 2) -> Optional[tuple[str, str]]:
    """Try Brave → DDG HTML → Bing. Pick fragrantica URL whose slug overlaps
    `want` (brand + name) the most. Skip an engine after a 429."""
    blocked: set[str] = set()
    for attempt in range(retries + 1):
        for name, engine in SEARCH_ENGINES:
            if name in blocked:
                continue
            try:
                status, candidates = engine(query, session)
            except requests.RequestException as e:
                print(f"  ! {name} error: {e}")
                continue
            if status == 429:
                print(f"  ! 429 from {name}, skipping for this product")
                blocked.add(name)
                continue
            if status != 200:
                print(f"  ! {name} status={status}")
                continue
            hit = _pick_best(candidates, want or query)
            if hit:
                if name != "brave":
                    print(f"  ~ matched via {name}")
                return hit
        # All engines tried, nothing matched — pause briefly, then retry once
        # in case Brave's per-IP rate counter rolled over.
        if attempt < retries:
            time.sleep(8 * (attempt + 1))
    return None


def fetch_perfume_page(url: str, session: requests.Session) -> Optional[BeautifulSoup]:
    try:
        resp = session.get(url, headers=HEADERS, timeout=30)
    except requests.RequestException:
        return None
    if resp.status_code != 200:
        return None
    return BeautifulSoup(resp.text, "html.parser")


YEAR_RE = re.compile(r"\b(19|20)\d{2}\b")


def parse_year(soup: BeautifulSoup) -> Optional[int]:
    og = soup.find("meta", attrs={"property": "og:description"})
    if og and og.get("content"):
        m = YEAR_RE.search(og["content"])
        if m:
            return int(m.group(0))
    # body-text fallback
    text = soup.get_text(" ", strip=True)[:4000]
    m = YEAR_RE.search(text)
    return int(m.group(0)) if m else None


def parse_description(soup: BeautifulSoup) -> str:
    candidates = soup.select('div[itemprop="description"] p, #info p, .perfume-page-info p')
    for p in candidates:
        txt = p.get_text(" ", strip=True)
        if len(txt) > 120:
            return txt
    # generic fallback — longest <p> on the page
    longest = ""
    for p in soup.find_all("p"):
        txt = p.get_text(" ", strip=True)
        if len(txt) > len(longest):
            longest = txt
    return longest if len(longest) > 120 else ""


WIDTH_RE = re.compile(r"\bwidth\s*:\s*([\d.]+)\s*%", re.IGNORECASE)
OPACITY_RE = re.compile(r"\bopacity\s*:\s*([\d.]+)\s*%", re.IGNORECASE)
BG_HEX_RE = re.compile(r"background\s*:\s*#([0-9A-Fa-f]{6})\b", re.IGNORECASE)
HEX_RE = re.compile(r"#([0-9A-Fa-f]{6})\b")


def _extract_color_hex(style: str) -> str:
    m = BG_HEX_RE.search(style or "")
    if m:
        return f"#{m.group(1).lower()}"
    m = HEX_RE.search(style or "")
    return f"#{m.group(1).lower()}" if m else ""


def _bar_weight(style: str) -> int:
    # Fragrantica's new layout encodes strength via width: NN% OR opacity: NN%.
    for rx in (WIDTH_RE, OPACITY_RE):
        m = rx.search(style or "")
        if m:
            return max(0, min(100, int(round(float(m.group(1))))))
    return 0


def parse_accords(soup: BeautifulSoup) -> list[dict]:
    """Return [{name, weight (0..100), color_hex}] sorted desc by weight."""
    out: list[dict] = []
    seen: set[str] = set()

    # Modern Fragrantica markup: a "main accords" heading, then sibling divs with
    # inline style="background: #xxxxxx; opacity: NN%; width: NN%;".
    heading = soup.find(string=re.compile(r"main\s+accord", re.I))
    if heading:
        container = heading.parent
        for _ in range(6):
            if container is None:
                break
            bars = [
                el for el in container.select('[style*="background"]')
                if BG_HEX_RE.search(el.get("style") or "")
                and (WIDTH_RE.search(el.get("style") or "") or OPACITY_RE.search(el.get("style") or ""))
            ]
            if bars:
                for el in bars:
                    name = el.get_text(" ", strip=True)
                    if not name or name in seen:
                        continue
                    style = el.get("style") or ""
                    out.append({"name": name, "weight": _bar_weight(style),
                                "color_hex": _extract_color_hex(style)})
                    seen.add(name)
                break
            container = container.parent

    # Legacy markup fallbacks.
    if not out:
        for el in soup.select(".accord-bar"):
            name = el.get_text(" ", strip=True)
            style = el.get("style") or ""
            if name and name not in seen:
                out.append({"name": name, "weight": _bar_weight(style),
                            "color_hex": _extract_color_hex(style)})
                seen.add(name)

    if not out:
        for a in soup.select('a[href*="/accords/"]'):
            n = a.get_text(strip=True)
            if n and n not in seen:
                out.append({"name": n, "weight": 0, "color_hex": ""})
                seen.add(n)

    out.sort(key=lambda r: r["weight"], reverse=True)
    return out[:10]


def load_progress() -> dict[str, ProductDetail]:
    if not os.path.exists(PROGRESS_PATH):
        return {}
    with open(PROGRESS_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    return {row["slug"]: ProductDetail(**row) for row in raw}


def save(path: str, items: list[ProductDetail]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump([asdict(it) for it in items], f, ensure_ascii=False, indent=2)


def main() -> None:
    only_slug = sys.argv[1] if len(sys.argv) > 1 else None
    session = requests.Session()
    print("Listing products from storefront API...", flush=True)
    products = list_products(session)
    print(f"  {len(products)} products", flush=True)

    progress = load_progress()

    # Group products by brand so we fetch each designer page once.
    by_brand: dict[str, list[dict]] = {}
    for p in products:
        if only_slug and p["slug"] != only_slug:
            continue
        by_brand.setdefault(p.get("brand", ""), []).append(p)

    out: list[ProductDetail] = []
    overall_idx = 0
    for brand, group in by_brand.items():
        print(f"\n== brand: {brand!r} ({len(group)} products) ==", flush=True)
        index: list[tuple[str, str, str]] = []
        skip_brand = brand in SKIP_BRANDS or not brand
        if not skip_brand:
            index = fetch_designer_index(brand, session)
            print(f"  designer index: {len(index)} perfumes", flush=True)
            time.sleep(1.0)  # courtesy between brand pages

        for p in group:
            overall_idx += 1
            slug = p["slug"]
            name = p["name"]
            if slug in progress and progress[slug].status in ("ok", "not_found"):
                out.append(progress[slug])
                continue

            detail = ProductDetail(slug=slug, name=name, brand=brand)
            print(f"[{overall_idx}/{len(products)}] {brand} {name}", flush=True)

            if skip_brand or not index:
                detail.status = "not_found"
                out.append(detail)
                continue

            hit = match_product_to_index(name, index)
            if not hit:
                print("  -> no match in designer index", flush=True)
                detail.status = "not_found"
                out.append(detail)
                continue

            url, fid = hit
            detail.fragrantica_url = url
            detail.fragrantica_id = fid
            print(f"  -> {url}", flush=True)

            soup = fetch_perfume_page(url, session)
            if soup is None:
                detail.status = "blocked"
                out.append(detail)
                time.sleep(2.0)
                continue

            detail.year = parse_year(soup)
            detail.description = parse_description(soup)
            detail.accords = parse_accords(soup)
            detail.accord_names = [a["name"] for a in detail.accords]
            detail.status = "ok" if detail.description else "blocked"
            print(f"  -> year={detail.year} desc={len(detail.description)}ch accords={len(detail.accords)}", flush=True)
            out.append(detail)

            if overall_idx % 10 == 0:
                save(PROGRESS_PATH, out)
            time.sleep(1.5)  # courteous pause between Fragrantica detail fetches

    save(OUTPUT_PATH, out)
    if os.path.exists(PROGRESS_PATH):
        os.remove(PROGRESS_PATH)
    n_ok = sum(1 for d in out if d.status == "ok")
    print(f"\nDone. {n_ok}/{len(out)} products enriched. Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
