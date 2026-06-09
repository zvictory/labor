import re
import time
import requests
from bs4 import BeautifulSoup

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

REAL_PERFUMES = [
    {"product_id": 1120, "name": "Marijuana", "brand": "Byredo"},
    {"product_id": 1331, "name": "Chocolate Greedy", "brand": "Montale"},
    {"product_id": 1112, "name": "Lamar", "brand": "Kajal"},
    {"product_id": 1399, "name": "1996 Inez & Vinoodh", "brand": "Byredo"},
    {"product_id": 1318, "name": "Perseus", "brand": "Parfums de Marly"},
    {"product_id": 1226, "name": "Halfeti Leather", "brand": "Penhaligon's"},
    {"product_id": 1265, "name": "Fan Your Flames", "brand": "Nishane"},
    {"product_id": 1256, "name": "LV Lovers", "brand": "Louis Vuitton"},
    {"product_id": 1361, "name": "Smoking Hot By", "brand": "By Kilian"},
    {"product_id": 1192, "name": "I Don't Need A Prince - Rose de Mai By", "brand": "By Kilian"},
    {"product_id": 1012, "name": "Blue Seduction", "brand": "Antonio Banderas"},
    {"product_id": 1075, "name": "Purpose 50", "brand": "Amouage"},
    {"product_id": 1187, "name": "Tuscan Leather", "brand": "Tom Ford"},
    {"product_id": 1539, "name": "Attar Musc Kashmir", "brand": "Attar Collection"},
    {"product_id": 1340, "name": "Oud Maracujá", "brand": "Maison Crivelli"},
    {"product_id": 1307, "name": "Royal Eagle Sport", "brand": "Stefano Ricci"},
    {"product_id": 1011, "name": "Acqua di Gio Profumo", "brand": "Giorgio Armani"},
    {"product_id": 1253, "name": "Soleil Blanc", "brand": "Tom Ford"},
    {"product_id": 1257, "name": "Le Male Lover", "brand": "Jean Paul Gaultier"},
    {"product_id": 1349, "name": "Bergamote 22", "brand": "Le Labo"},
    {"product_id": 1367, "name": "Le Beau Le Parfum", "brand": "Jean Paul Gaultier"}
]

def search_fragrantica_id(brand, name, session):
    query = f"{brand} {name}"
    url = "https://lite.duckduckgo.com/lite/"
    headers = {"User-Agent": UA}
    
    # Try different search terms
    queries = [
        f"site:fragrantica.com/perfume/ {query}",
        f"fragrantica perfume {query}"
    ]
    
    for q in queries:
        try:
            resp = session.post(url, data={"q": q}, headers=headers, timeout=15)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    # Matches e.g. fragrantica.com/perfume/Tom-Ford/Tuscan-Leather-1849.html
                    m = re.search(r"fragrantica\.com/perfume/[A-Za-z0-9%\-]+/[A-Za-z0-9%\-]+-(\d+)\.html", href)
                    if m:
                        return m.group(1), href
        except Exception as e:
            print(f"      Search error: {e}")
        time.sleep(1)
    return None, None

def verify_image(fid, session):
    url = f"https://fimgs.net/mdimg/perfume/375x500.{fid}.jpg"
    try:
        resp = session.head(url, timeout=10)
        return resp.status_code == 200
    except:
        return False

def main():
    session = requests.Session()
    session.headers.update({"User-Agent": UA})
    
    results = []
    
    for p in REAL_PERFUMES:
        brand = p["brand"]
        name = p["name"]
        pid = p["product_id"]
        
        print(f"Searching for {brand} {name} (ID: {pid})...")
        fid, href = search_fragrantica_id(brand, name, session)
        
        if fid:
            img_ok = verify_image(fid, session)
            print(f"  -> Found ID: {fid} (Image OK: {img_ok}) URL: {href}")
            results.append({
                "product_id": pid,
                "fragrantica_id": int(fid),
                "name": f"{brand} {name}",
                "url": href,
                "image_ok": img_ok
            })
        else:
            print("  -> NOT FOUND")
            
        time.sleep(1)
        
    print("\n--- RESULTS JSON ---")
    import json
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    main()
