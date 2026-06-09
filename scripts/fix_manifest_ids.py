import json
import os

manifest_path = "apps/backend/db/data/product_image_manifest.json"

if not os.path.exists(manifest_path):
    print(f"Manifest not found at {manifest_path}")
    exit(1)

with open(manifest_path, "r", encoding="utf-8") as f:
    manifest = json.load(f)

# Correct mapping of product_id to fragrantica_id
corrections = {
    1350: 26466,   # Another 13 Le Labo
    1231: 39130,   # Gumin Tiziana Terenzi
    1021: 16939,   # Herod Parfums de Marly
    1250: 1022,    # French Lover Frederic Malle
    1410: 78563,   # Guidance Amouage
    1352: 31648    # Oud Satin Mood Maison Francis Kurkdjian
}

updated = 0
for row in manifest:
    pid = row.get("product_id")
    if pid in corrections:
        old_fid = row.get("fragrantica_id")
        new_fid = corrections[pid]
        if old_fid != new_fid:
            row["fragrantica_id"] = new_fid
            print(f"Updated product_id {pid}: {old_fid} -> {new_fid} ({row.get('name')})")
            updated += 1

if updated > 0:
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"Successfully updated {updated} entries in {manifest_path}")
else:
    print("No updates needed in manifest.")
