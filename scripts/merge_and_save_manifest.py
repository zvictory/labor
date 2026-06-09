import json
import os

MANIFEST_PATH = "apps/backend/db/data/product_image_manifest.json"

NEW_MAPPINGS = [
  {
    "product_id": 1120,
    "fragrantica_id": 66825,
    "name": "Byredo Marijuana"
  },
  {
    "product_id": 1331,
    "fragrantica_id": 2186,
    "name": "Montale Chocolate Greedy"
  },
  {
    "product_id": 1112,
    "fragrantica_id": 62571,
    "name": "Kajal Lamar"
  },
  {
    "product_id": 1399,
    "fragrantica_id": 19247,
    "name": "Byredo 1996 Inez & Vinoodh"
  },
  {
    "product_id": 1318,
    "fragrantica_id": 90199,
    "name": "Parfums de Marly Perseus"
  },
  {
    "product_id": 1226,
    "fragrantica_id": 61523,
    "name": "Penhaligon's Halfeti Leather"
  },
  {
    "product_id": 1265,
    "fragrantica_id": 37603,
    "name": "Nishane Fan Your Flames"
  },
  {
    "product_id": 1256,
    "fragrantica_id": 93785,
    "name": "Louis Vuitton LV Lovers"
  },
  {
    "product_id": 1361,
    "fragrantica_id": 84413,
    "name": "By Kilian Smoking Hot By"
  },
  {
    "product_id": 1192,
    "fragrantica_id": 57939,
    "name": "By Kilian I Don't Need A Prince - Rose de Mai By"
  },
  {
    "product_id": 1012,
    "fragrantica_id": 1088,
    "name": "Antonio Banderas Blue Seduction"
  },
  {
    "product_id": 1075,
    "fragrantica_id": 100897,
    "name": "Amouage Purpose 50"
  },
  {
    "product_id": 1187,
    "fragrantica_id": 1849,
    "name": "Tom Ford Tuscan Leather"
  },
  {
    "product_id": 1539,
    "fragrantica_id": 102064,
    "name": "Attar Collection Attar Musc Kashmir"
  },
  {
    "product_id": 1340,
    "fragrantica_id": 83842,
    "name": "Maison Crivelli Oud Maracujá"
  },
  {
    "product_id": 1307,
    "fragrantica_id": 47524,
    "name": "Stefano Ricci Royal Eagle Sport"
  },
  {
    "product_id": 1011,
    "fragrantica_id": 29727,
    "name": "Giorgio Armani Acqua di Gio Profumo"
  },
  {
    "product_id": 1253,
    "fragrantica_id": 34893,
    "name": "Tom Ford Soleil Blanc"
  },
  {
    "product_id": 1257,
    "fragrantica_id": 89720,
    "name": "Jean Paul Gaultier Le Male Lover"
  },
  {
    "product_id": 1349,
    "fragrantica_id": 6327,
    "name": "Le Labo Bergamote 22"
  },
  {
    "product_id": 1367,
    "fragrantica_id": 72158,
    "name": "Jean Paul Gaultier Le Beau Le Parfum"
  }
]

def main():
    if not os.path.exists(MANIFEST_PATH):
        print(f"Error: manifest file not found at {MANIFEST_PATH}")
        return
        
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)
        
    print(f"Current manifest size: {len(manifest)} rows")
    
    # Avoid adding duplicate product_ids
    existing_pids = {row["product_id"] for row in manifest}
    
    added_count = 0
    for new_row in NEW_MAPPINGS:
        pid = new_row["product_id"]
        if pid not in existing_pids:
            manifest.append(new_row)
            added_count += 1
            print(f"  + Added: {new_row['name']} (ID: {pid} -> Fragrantica: {new_row['fragrantica_id']})")
        else:
            print(f"  = Slipped (existing): {new_row['name']} (ID: {pid})")
            
    if added_count > 0:
        with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        print(f"Successfully wrote {added_count} new entries to {MANIFEST_PATH}. Total rows: {len(manifest)}")
    else:
        print("No new entries added.")

if __name__ == "__main__":
    main()
