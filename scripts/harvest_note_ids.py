"""Harvest fragrantica.com note (ingredient) IDs and icon URLs for Labor's
note catalog. Output one JSON entry per input row to
apps/backend/tmp/notes_harvest.json.

Strategy:
1. Fetch https://www.fragrantica.com/notes/ once — it's the master directory
   page that contains 1800+ <a href="/notes/{Slug}-{id}.html"> links.
   Build slug->id map from it.
2. For each input note, derive a candidate Pascal-Case slug
   ("sandalwood" -> "Sandalwood", "iso-e-super" -> "Iso-E-Super").
   Look it up in the directory. If not found, try a small synonym table.
3. If still not found, DDG-lite fallback:
   site:fragrantica.com/notes/ {slug words}
4. HEAD https://fimgs.net/mdimg/sastojci/{id}.jpg to verify icon. If 404,
   icon_url is "" and reason notes the missing icon.
5. Save progress every 10 notes.
"""

import json
import os
import re
import sys
import time
from typing import Optional

import requests
from bs4 import BeautifulSoup

INPUT_PATH = "apps/backend/tmp/notes_queue.json"
OUTPUT_PATH = "apps/backend/tmp/notes_harvest.json"
PROGRESS_PATH = "apps/backend/tmp/notes_harvest_progress.json"
DIRECTORY_URL = "https://www.fragrantica.com/notes/"
ICON_URL_TMPL = "https://fimgs.net/mdimg/sastojci/t.{id}.jpg"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

# Manual overrides: input slug -> known fragrantica slug
# Used when the literal Pascal-Case form does not exist in the directory
# (mostly synonym/spelling differences).
SYNONYMS = {
    "agarwood": "Agarwood-Oud",
    "oud": "Agarwood-Oud",
    "gaiac": "Guaiac-Wood",
    "sandal-mysore": "Mysore-Sandalwood",
    "cashmere-wood": "Cashmeran",  # closest available match
    "mandarin": "Mandarin-Orange",
    "black-tea": "Tea",  # generic tea — no plain "black tea" entry
    "frankincense": "Olibanum-Frankincense",
    "tonka": "Tonka-Bean",
    "lychee": "Litchi",
    "blackcurrant": "Black-Currant",
    "clove": "Cloves",
    "chocolate": "Dark-Chocolate",
    "pine": "Pine-Tree",
    "rain": "Rain-Notes",
    "ozone": "Ozonic-Notes",
}


def slug_to_pascal(slug: str) -> str:
    """sandalwood -> Sandalwood, iso-e-super -> Iso-E-Super."""
    return "-".join(part.capitalize() for part in slug.split("-"))


def fetch_directory(session: requests.Session) -> dict[str, str]:
    """Fetch /notes/ master page and return {Slug: id} map."""
    headers = {"User-Agent": UA}
    resp = session.get(DIRECTORY_URL, headers=headers, timeout=30)
    resp.raise_for_status()
    pairs = re.findall(r'/notes/([A-Za-z0-9%\-]+)-(\d+)\.html', resp.text)
    out: dict[str, str] = {}
    for slug, nid in pairs:
        if slug not in out:
            out[slug] = nid
    return out


def ddg_search_note(query: str, session: requests.Session) -> Optional[str]:
    """DDG-lite fallback. Return (fragrantica_slug, id) on hit."""
    headers = {"User-Agent": UA}
    url = "https://lite.duckduckgo.com/lite/"
    candidates = [
        f"site:fragrantica.com/notes/ {query}",
        f"fragrantica note {query}",
    ]
    for q in candidates:
        try:
            resp = session.post(url, data={"q": q}, headers=headers, timeout=15)
        except requests.RequestException:
            continue
        if resp.status_code != 200:
            continue
        soup = BeautifulSoup(resp.text, "html.parser")
        for a in soup.find_all("a", href=True):
            href = a["href"]
            m = re.search(r"fragrantica\.com/notes/([A-Za-z0-9%\-]+)-(\d+)\.html", href)
            if m:
                return m.group(1), m.group(2)  # type: ignore[return-value]
        time.sleep(0.5)
    return None


def verify_icon(note_id: str) -> str:
    """HEAD the fimgs.net icon URL. Return URL on 200 image, else ""."""
    url = ICON_URL_TMPL.format(id=note_id)
    try:
        resp = requests.head(url, timeout=10, allow_redirects=True)
    except requests.RequestException:
        return ""
    if resp.status_code != 200:
        return ""
    ctype = resp.headers.get("Content-Type", "")
    if not ctype.startswith("image/"):
        return ""
    return url


def load_progress() -> dict[int, dict]:
    if not os.path.exists(PROGRESS_PATH):
        return {}
    try:
        with open(PROGRESS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {entry["id"]: entry for entry in data}
    except Exception:
        return {}


def save_json(path: str, data: list[dict]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def main() -> int:
    with open(INPUT_PATH, "r", encoding="utf-8") as f:
        queue = json.load(f)

    print(f"Loaded {len(queue)} notes from {INPUT_PATH}")

    session = requests.Session()
    print("Fetching fragrantica.com /notes/ directory...")
    directory = fetch_directory(session)
    print(f"  -> {len(directory)} unique notes in directory")
    # Lowercase lookup for robustness
    directory_lc = {k.lower(): (k, v) for k, v in directory.items()}

    cached = load_progress()
    if cached:
        print(f"Resuming with {len(cached)} cached entries")

    results: list[dict] = []
    icon_count = 0
    fail_count = 0

    for idx, row in enumerate(queue, start=1):
        note_id = row["id"]
        slug = row["slug"]

        if note_id in cached:
            entry = cached[note_id]
            results.append(entry)
            if entry.get("icon_url"):
                icon_count += 1
            if not entry.get("fragrantica_id"):
                fail_count += 1
            continue

        # 1) Synonym table
        target_slug = SYNONYMS.get(slug)
        # 2) Pascal-case lookup
        if target_slug is None:
            pascal = slug_to_pascal(slug)
            target_slug = pascal if pascal in directory else None

        frag_id: Optional[str] = None
        frag_slug: Optional[str] = None
        if target_slug and target_slug in directory:
            frag_id = directory[target_slug]
            frag_slug = target_slug
        elif target_slug and target_slug.lower() in directory_lc:
            frag_slug, frag_id = directory_lc[target_slug.lower()]

        # 3) DDG fallback
        if not frag_id:
            print(f"  [{idx}/{len(queue)}] {slug}: directory miss, trying DDG...")
            hit = ddg_search_note(slug.replace("-", " "), session)
            if hit:
                frag_slug, frag_id = hit
            time.sleep(1)

        entry: dict = {
            "id": note_id,
            "slug": slug,
            "fragrantica_id": frag_id,
            "fragrantica_slug": frag_slug or "",
            "icon_url": "",
        }

        if frag_id:
            icon = verify_icon(frag_id)
            entry["icon_url"] = icon
            if icon:
                icon_count += 1
            else:
                entry["reason"] = "no icon at fimgs"
            print(
                f"[{idx}/{len(queue)}] {slug:30s} -> {frag_slug} ({frag_id})"
                f" icon={'OK' if icon else 'MISS'}"
            )
        else:
            entry["reason"] = "no fragrantica id found"
            fail_count += 1
            print(f"[{idx}/{len(queue)}] {slug:30s} -> NOT FOUND")

        results.append(entry)

        if idx % 10 == 0:
            save_json(PROGRESS_PATH, results)

        # Be polite to fragrantica when we hit DDG; the directory case is
        # purely local so we can skip the sleep then.
        if not frag_id or target_slug is None:
            time.sleep(0.6)

    save_json(OUTPUT_PATH, results)
    if os.path.exists(PROGRESS_PATH):
        os.remove(PROGRESS_PATH)

    ok = sum(1 for r in results if r.get("fragrantica_id"))
    print(f"\nOK={ok} FAIL={fail_count} ICONS={icon_count}")
    print(f"Output written to {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
