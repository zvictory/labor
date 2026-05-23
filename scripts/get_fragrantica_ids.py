import csv
import requests
from bs4 import BeautifulSoup
import re
import time
import os

def search_fragrantica_id(query, session):
    """Search DuckDuckGo lite for Fragrantica perfume ID"""
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
    url = 'https://lite.duckduckgo.com/lite/'

    queries = [
        f'site:fragrantica.com/perfume {query}',
        f'fragrantica {query}',
    ]

    for q in queries:
        data = {'q': q}
        try:
            resp = session.post(url, data=data, headers=headers, timeout=15)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, 'html.parser')
                for a in soup.find_all('a', href=True):
                    href = a['href']
                    if 'fragrantica.com/perfume/' in href:
                        match = re.search(r'-(\d+)\.html', href)
                        if match:
                            return match.group(1)
        except requests.RequestException:
            pass
        time.sleep(0.5)
    return None

def verify_image_url(fragrantica_id):
    """Verify that the image URL works for a given Fragrantica ID"""
    if not fragrantica_id:
        return ""
    url = f"https://fimgs.net/mdimg/perfume-social-cards/en-social-{fragrantica_id}.jpeg"
    try:
        resp = requests.head(url, timeout=10)
        if resp.status_code == 200:
            return url
    except:
        pass
    return ""

def main():
    input_file = "apps/backend/db/catalog/billz_catalog.csv"
    output_file = "apps/backend/db/catalog/billz_catalog_with_images.csv"
    progress_file = "apps/backend/db/catalog/.fragrantica_progress.csv"

    # Read catalog
    with open(input_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames + ["fragrantica_id", "image_url"]
        rows = list(reader)

    # Load progress if exists
    start_idx = 0
    if os.path.exists(progress_file):
        with open(progress_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            progress_rows = list(reader)
        if len(progress_rows) == len(rows):
            for i, row in enumerate(progress_rows):
                if "fragrantica_id" in row and row["fragrantica_id"]:
                    rows[i]["fragrantica_id"] = row["fragrantica_id"]
                    rows[i]["image_url"] = row.get("image_url", "")
                elif "fragrantica_id" in row and row.get("_processed") == "1":
                    start_idx = i + 1
            print(f"Resuming from index {start_idx}")

    skip_categories = {"Авто парфюм", "Флакон", "Лосьон", "Антисептик", "Мыло", "Диффузор"}
    total = len(rows)
    found_count = sum(1 for r in rows if r.get("fragrantica_id"))
    skipped_count = 0

    session = requests.Session()

    for idx in range(start_idx, total):
        row = rows[idx]
        product_name = row["name"]
        category = row.get("category", "")

        # Skip non-perfume items
        if any(skip in category for skip in skip_categories):
            row["fragrantica_id"] = ""
            row["image_url"] = ""
            skipped_count += 1
            if (idx + 1) % 50 == 0:
                print(f"[{idx+1}/{total}] ...skipping non-perfume items...")
            continue

        print(f"[{idx+1}/{total}] Searching: {product_name[:60]}")
        pid = search_fragrantica_id(product_name, session)
        row["fragrantica_id"] = pid if pid else ""

        if pid:
            found_count += 1
            print(f"  -> ID: {pid}")
            # Verify image URL
            img_url = verify_image_url(pid)
            row["image_url"] = img_url
            if img_url:
                print(f"  -> Image: OK")
            else:
                print(f"  -> Image: NOT FOUND")
        else:
            row["image_url"] = ""
            print(f"  -> NOT FOUND")

        # Save progress every 10 items
        if (idx + 1) % 10 == 0:
            progress_fieldnames = list(rows[0].keys()) + ["fragrantica_id", "image_url", "_processed"]
            with open(progress_file, "w", encoding="utf-8", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=progress_fieldnames)
                writer.writeheader()
                for r in rows:
                    out_row = dict(r)
                    out_row["_processed"] = "1"
                    writer.writerow(out_row)

        time.sleep(1)

    # Write final output
    out_fieldnames = [f for f in fieldnames if f != "_processed"]
    with open(output_file, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=out_fieldnames)
        writer.writeheader()
        for r in rows:
            out_row = {k: v for k, v in r.items() if k != "_processed"}
            writer.writerow(out_row)

    # Clean up progress file
    if os.path.exists(progress_file):
        os.remove(progress_file)

    not_found = total - found_count - skipped_count
    print(f"\nDone. {found_count} IDs found, {skipped_count} skipped, {not_found} not found.")
    print(f"Results saved to {output_file}")

if __name__ == "__main__":
    main()
