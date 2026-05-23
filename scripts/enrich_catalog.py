import pandas as pd
import re
import time

# -------------------------------
# 1. Load data
# -------------------------------
catalog = pd.read_csv("apps/backend/db/catalog/billz_catalog.csv")
parfumo = pd.read_csv("apps/backend/db/catalog/parfumo_data_clean.csv")

# -------------------------------
# 2. Normalization
# -------------------------------
def normalize_name(name):
    name = re.sub(r"\s+by\s+.+", "", str(name), flags=re.IGNORECASE)
    name = re.sub(r"\([^)]*\)", "", name)
    name = re.sub(r'[^\w\s]', '', name)
    return re.sub(r'\s+', ' ', name).strip().lower()

# Filter to Parfum category
parfum_catalog = catalog[catalog["category"] == "Parfum"].copy()
parfum_catalog["clean_name"] = parfum_catalog["name"].apply(normalize_name)
parfum_catalog["clean_brand"] = parfum_catalog["brand"].str.lower().fillna("")
parfum_catalog["parfumo_id"] = None

# Prepare Parfumo
parfumo_clean = parfumo[["Number", "Name", "Brand"]].copy()
parfumo_clean = parfumo_clean.dropna(subset=["Name"])
parfumo_clean["search_name"] = parfumo_clean["Name"].apply(normalize_name)
parfumo_clean["Brand_lower"] = parfumo_clean["Brand"].str.lower().fillna("")

print(f"Catalog perfumes: {len(parfum_catalog)}")
print(f"Parfumo entries: {len(parfumo_clean)}")

# -------------------------------
# 3. Matching
# -------------------------------

# Phase 1: Exact brand+name
print("\nPhase 1: Exact brand+name...")
t0 = time.time()

# Create merge keys
parfum_catalog["_merge_key"] = parfum_catalog["clean_brand"] + "|||" + parfum_catalog["clean_name"]
parfumo_clean["_merge_key"] = parfumo_clean["Brand_lower"] + "|||" + parfumo_clean["search_name"]

exact_bn = parfum_catalog.merge(
    parfumo_clean[["_merge_key", "Number"]],
    on="_merge_key",
    how="left"
)
parfum_catalog["parfumo_id"] = exact_bn["Number"]
exact_matches = parfum_catalog["parfumo_id"].notna().sum()
print(f"  Found: {exact_matches} ({time.time()-t0:.1f}s)")

# Phase 2: Exact name (any brand)
print("Phase 2: Exact name...")
t0 = time.time()
unmatched = parfum_catalog["parfumo_id"].isna()

name_dict = dict(zip(parfumo_clean["search_name"], parfumo_clean["Number"]))
name_matches_count = 0
for i in parfum_catalog[unmatched].index:
    cname = parfum_catalog.loc[i, "clean_name"]
    if cname in name_dict:
        parfum_catalog.loc[i, "parfumo_id"] = name_dict[cname]
        name_matches_count += 1
print(f"  Found: {name_matches_count} ({time.time()-t0:.1f}s)")

# Phase 3: Brand-filtered fuzzy (vectorized)
print("Phase 3: Brand-filtered token match...")
t0 = time.time()
still_unmatched = parfum_catalog["parfumo_id"].isna()
unmatched_df = parfum_catalog[still_unmatched].copy()

brand_matches_count = 0

# Group Parfumo by brand
parfumo_by_brand = parfumo_clean.groupby("Brand_lower")

for i, row in unmatched_df.iterrows():
    brand = row["clean_brand"]
    if not brand:
        continue
    try:
        brand_group = parfumo_by_brand.get_group(brand)
    except KeyError:
        continue

    if len(brand_group) == 0:
        continue

    # Token overlap using set operations
    query_tokens = set(row["clean_name"].split())
    if not query_tokens:
        continue

    best_score = 0
    best_number = None

    for _, p_row in brand_group.iterrows():
        cand_tokens = set(p_row["search_name"].split())
        if not cand_tokens:
            continue
        overlap = len(query_tokens & cand_tokens)
        score = overlap / max(len(query_tokens), len(cand_tokens))
        if score > best_score:
            best_score = score
            best_number = p_row["Number"]

    if best_score >= 0.6:
        parfum_catalog.loc[i, "parfumo_id"] = best_number
        brand_matches_count += 1

print(f"  Found: {brand_matches_count} ({time.time()-t0:.1f}s)")

# -------------------------------
# 4. Merge Parfumo data
# -------------------------------
parfumo_full = parfumo.set_index("Number")
enriched = parfum_catalog.merge(
    parfumo_full,
    left_on="parfumo_id",
    right_index=True,
    how="left",
    suffixes=("", "_parfumo")
)

# -------------------------------
# 5. Save
# -------------------------------
output_cols = [
    "name", "brand", "category", "sku", "barcode",
    "parfumo_id", "Name", "Brand", "Release_Year", "Concentration",
    "Rating_Value", "Rating_Count", "Main_Accords",
    "Top_Notes", "Middle_Notes", "Base_Notes", "Perfumers", "URL"
]
available = [c for c in output_cols if c in enriched.columns]
enriched.to_csv("apps/backend/db/catalog/billz_catalog_enriched.csv", index=False, columns=available)

total = len(parfum_catalog)
matched = exact_matches + name_matches_count + brand_matches_count
print(f"\n{'='*50}")
print(f"RESULTS")
print(f"{'='*50}")
print(f"  Exact brand+name:  {exact_matches}")
print(f"  Exact name only:   {name_matches_count}")
print(f"  Brand token match: {brand_matches_count}")
print(f"  Total matched:     {matched}/{total}")
print(f"  Not found:         {total - matched}")
print(f"\nSaved to apps/backend/db/catalog/billz_catalog_enriched.csv")
