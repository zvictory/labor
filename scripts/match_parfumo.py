import csv
import re
from difflib import SequenceMatcher

def normalize(s):
    """Normalize string for comparison"""
    s = s.lower().strip()
    s = re.sub(r'[^\w\s]', '', s)
    s = re.sub(r'\s+', ' ', s)
    return s

def similarity(a, b):
    return SequenceMatcher(None, normalize(a), normalize(b)).ratio()

def find_match(catalog_name, catalog_brand, parfumo_rows):
    """Try to find a match in Parfumo dataset"""
    norm_name = normalize(catalog_name)
    norm_brand = normalize(catalog_brand)
    
    # Try exact match on brand + name
    for row in parfumo_rows:
        p_name = normalize(row.get('Name', ''))
        p_brand = normalize(row.get('Brand', ''))
        
        if norm_brand and p_brand:
            if norm_brand == p_brand and norm_name == p_name:
                return row, 'exact_brand_name'
        
        if norm_name == p_name:
            return row, 'exact_name'
    
    # Try fuzzy match on name only (brand might differ in spelling)
    best_score = 0
    best_row = None
    for row in parfumo_rows:
        p_name = normalize(row.get('Name', ''))
        score = similarity(catalog_name, p_name)
        if score > best_score:
            best_score = score
            best_row = row
    
    if best_score >= 0.85:
        return best_row, f'fuzzy_{best_score:.2f}'
    
    return None, None

def main():
    # Load Parfumo dataset
    print("Loading Parfumo dataset...")
    parfumo_rows = []
    with open("apps/backend/db/catalog/parfumo_data_clean.csv", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        parfumo_rows = list(reader)
    print(f"  Loaded {len(parfumo_rows)} perfumes")
    
    # Build lookup by normalized name for faster exact matching
    parfumo_by_name = {}
    for row in parfumo_rows:
        key = normalize(row.get('Name', ''))
        if key not in parfumo_by_name:
            parfumo_by_name[key] = []
        parfumo_by_name[key].append(row)
    
    # Load catalog
    with open("apps/backend/db/catalog/billz_catalog.csv", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        catalog_rows = list(reader)
    
    skip_categories = {"Авто парфюм", "Флакон", "Лосьон", "Антисептик", "Мыло", "Диффузор"}
    
    # Pre-process catalog to extract brand from name if brand column is empty
    results = []
    matched = 0
    not_found = 0
    skipped = 0
    
    # Build a set of all Parfumo names for fast lookup
    parfumo_names_set = set(parfumo_by_name.keys())
    
    for idx, row in enumerate(catalog_rows):
        product_name = row["name"]
        category = row.get("category", "")
        brand = row.get("brand", "").strip()
        
        if any(skip in category for skip in skip_categories):
            row["parfumo_url"] = ""
            row["match_type"] = ""
            skipped += 1
            results.append(row)
            continue
        
        # Try exact match first
        norm_name = normalize(product_name)
        found = False
        
        if norm_name in parfumo_names_set:
            candidates = parfumo_by_name[norm_name]
            if brand:
                norm_brand = normalize(brand)
                for c in candidates:
                    if normalize(c.get('Brand', '')) == norm_brand:
                        row["parfumo_url"] = c.get('URL', '')
                        row["match_type"] = 'exact_brand_name'
                        found = True
                        matched += 1
                        break
            
            if not found and candidates:
                row["parfumo_url"] = candidates[0].get('URL', '')
                row["match_type"] = 'exact_name'
                found = True
                matched += 1
        
        if not found:
            # Try fuzzy match - but only for a subset to avoid O(n^2)
            # First try with brand filter
            if brand:
                norm_brand = normalize(brand)
                brand_candidates = [r for r in parfumo_rows if normalize(r.get('Brand', '')) == norm_brand]
                if brand_candidates:
                    best_score = 0
                    best_row = None
                    for c in brand_candidates:
                        score = similarity(product_name, c.get('Name', ''))
                        if score > best_score:
                            best_score = score
                            best_row = c
                    if best_score >= 0.8:
                        row["parfumo_url"] = best_row.get('URL', '')
                        row["match_type"] = f'fuzzy_brand_{best_score:.2f}'
                        found = True
                        matched += 1
        
        if not found:
            row["parfumo_url"] = ""
            row["match_type"] = ""
            not_found += 1
        
        results.append(row)
        
        if (idx + 1) % 100 == 0:
            print(f"Processed {idx + 1}/{len(catalog_rows)}...")
    
    # Write output
    fieldnames = list(catalog_rows[0].keys()) + ["parfumo_url", "match_type"]
    with open("apps/backend/db/catalog/billz_catalog_with_parfumo.csv", "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in results:
            writer.writerow(r)
    
    print(f"\nDone!")
    print(f"  Matched: {matched}")
    print(f"  Not found: {not_found}")
    print(f"  Skipped: {skipped}")
    print(f"  Results saved to apps/backend/db/catalog/billz_catalog_with_parfumo.csv")

if __name__ == "__main__":
    main()
