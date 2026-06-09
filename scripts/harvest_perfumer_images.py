import json
import os
import re
import sys
import time
import urllib.parse
import unicodedata
import subprocess
import requests
from bs4 import BeautifulSoup

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

# List of missing perfumers with their slugs and database names
MISSING_PERFUMERS = [
    {"slug": "alessandro-gualtieri", "name": "Alessandro Gualtieri"},
    {"slug": "alienor-massenet", "name": "Alienor Massenet"},
    {"slug": "antoine-cotton", "name": "Antoine Cotton"},
    {"slug": "beno-t-bergia", "name": "Benoît Bergia"},
    {"slug": "benoist-lapouza", "name": "Benoist Lapouza"},
    {"slug": "chris-maurice", "name": "Chris Maurice"},
    {"slug": "christian-provenzano", "name": "Christian Provenzano"},
    {"slug": "fabrice-pellegrin", "name": "Fabrice Pellegrin"},
    {"slug": "fran-ois-demachy", "name": "François Demachy"},
    {"slug": "frank-voelkl", "name": "Frank Voelkl"},
    {"slug": "ga-l-montero", "name": "Gaël Montero"},
    {"slug": "hamid-merati-kashani", "name": "Hamid Merati-Kashani"},
    {"slug": "imran-fazlani", "name": "Imran Fazlani"},
    {"slug": "jacques-guerlain", "name": "Jacques Guerlain"},
    {"slug": "jean-pierre-bethouart", "name": "Jean-Pierre Bethouart"},
    {"slug": "jerome-epinette", "name": "Jerome Epinette"},
    {"slug": "jordi-fern-ndez", "name": "Jordi Fernández"},
    {"slug": "jordi-fernandez", "name": "Jordi Fernandez"},
    {"slug": "jorge-lee", "name": "Jorge Lee"},
    {"slug": "julie-lerendu", "name": "Julie Lerendu"},
    {"slug": "julie-pluchet", "name": "Julie Pluchet"},
    {"slug": "julien-rasquinet", "name": "Julien Rasquinet"},
    {"slug": "justin-frederico", "name": "Justin Frederico"},
    {"slug": "laurent-bruyere", "name": "Laurent Bruyere"},
    {"slug": "lorenzo-pazzaglia", "name": "Lorenzo Pazzaglia"},
    {"slug": "luca-gritti", "name": "Luca Gritti"},
    {"slug": "luz-vaquero", "name": "Luz Vaquero"},
    {"slug": "mathieu-nardin", "name": "Mathieu Nardin"},
    {"slug": "mathilde-bijaoui", "name": "Mathilde Bijaoui"},
    {"slug": "nathalie-templer", "name": "Nathalie Templer"},
    {"slug": "olivier-creed", "name": "Olivier Creed"},
    {"slug": "olivier-pescheux", "name": "Olivier Pescheux"},
    {"slug": "paolo-terenzi", "name": "Paolo Terenzi"},
    {"slug": "pascal-gaurin", "name": "Pascal Gaurin"},
    {"slug": "pierre-montale", "name": "Pierre Montale"},
    {"slug": "richard-ibanez", "name": "Richard Ibanez"},
    {"slug": "roja-dove", "name": "Roja Dove"},
    {"slug": "romano-ricci", "name": "Romano Ricci"},
    {"slug": "shadi-samra", "name": "Shadi Samra"},
    {"slug": "thomas-kosmala", "name": "Thomas Kosmala"},
    {"slug": "vincent-ricord", "name": "Vincent Ricord"},
    {"slug": "zarko-ahlmann-pavlov", "name": "Zarko Ahlmann Pavlov"}
]

# Accented duplicates that map directly to existing files
ACCENT_MAPPINGS = {
    "aure-lien-guichard": "aurelien-guichard.jpg",
    "c-cile-zarokian": "cecile-zarokian.jpg",
}

def remove_accents(input_str: str) -> str:
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)])

def get_candidate_names(name: str) -> list[str]:
    # Alessandro Gualtieri -> Alessandro_Gualtieri
    # François Demachy -> Francois_Demachy, Francois-Demachy
    clean = remove_accents(name)
    clean = re.sub(r'[^a-zA-Z0-9\s\-]', '', clean)
    words = clean.split()
    cand1 = "_".join(words)
    cand2 = "-".join(words)
    
    # Try with original accents too just in case
    orig_clean = re.sub(r'[^a-zA-Z0-9\s\-\u00C0-\u017F]', '', name)
    orig_words = orig_clean.split()
    cand3 = "_".join(orig_words)
    
    candidates = [cand1]
    if cand2 not in candidates:
        candidates.append(cand2)
    if cand3 not in candidates:
        candidates.append(cand3)
    return candidates

def ddg_search_perfumer(query: str, session: requests.Session) -> str | None:
    headers = {"User-Agent": UA}
    url = "https://lite.duckduckgo.com/lite/"
    candidates = [
        f"site:fragrantica.com/noses/ {query}",
        f"fragrantica nose {query}"
    ]
    for q in candidates:
        try:
            resp = session.post(url, data={"q": q}, headers=headers, timeout=15)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    m = re.search(r"fragrantica\.com/noses/([A-Za-z0-9%_\.\-]+)\.html", href)
                    if m:
                        return m.group(1)
        except Exception as e:
            print(f"      DDG error for query '{q}': {e}")
        time.sleep(1)
    return None

def extract_image_url(html: str) -> str | None:
    soup = BeautifulSoup(html, "html.parser")
    # Find image with src containing fimgs.net/images/nosevi/o.
    for img in soup.find_all("img", src=True):
        src = img["src"]
        if "fimgs.net/images/nosevi/" in src:
            if src.startswith("//"):
                return "https:" + src
            return src
    return None

def download_image(url: str, dest_path: str) -> bool:
    headers = {"User-Agent": UA}
    try:
        resp = requests.get(url, headers=headers, timeout=20)
        if resp.status_code == 200:
            with open(dest_path, "wb") as f:
                f.write(resp.content)
            return True
    except Exception as e:
        print(f"      Download error for '{url}': {e}")
    return False

def resize_image(path: str):
    # Resize to 480px @ q80 using macOS sips
    try:
        subprocess.run([
            "sips", "-Z", "480", 
            "-s", "format", "jpeg", 
            "-s", "formatOptions", "80", 
            path
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except Exception as e:
        print(f"      sips resize error: {e}")
        return False

def main():
    dest_dir = "apps/web/public/perfumers"
    os.makedirs(dest_dir, exist_ok=True)
    
    session = requests.Session()
    session.headers.update({"User-Agent": UA})
    
    new_mappings = {}
    
    for slug, filename in ACCENT_MAPPINGS.items():
        new_mappings[slug] = filename
        print(f"Mapped accent duplicate: {slug} -> {filename}")
        
    for p in MISSING_PERFUMERS:
        slug = p["slug"]
        name = p["name"]
        
        print(f"\nProcessing {name} ({slug})...")
        
        filename = f"{slug}.jpg"
        dest_path = os.path.join(dest_dir, filename)
        
        # Check if file already exists
        if os.path.exists(dest_path):
            print(f"  Image already exists at {dest_path}")
            new_mappings[slug] = filename
            continue
            
        # Get candidate URL names
        candidates = get_candidate_names(name)
        html_content = None
        found_name = None
        
        # Try candidates directly
        for cand in candidates:
            url = f"https://www.fragrantica.com/noses/{cand}.html"
            print(f"  Trying direct URL: {url}")
            try:
                resp = session.get(url, timeout=15)
                if resp.status_code == 200:
                    html_content = resp.text
                    found_name = cand
                    print(f"    Success (200) for candidate: {cand}")
                    break
            except Exception as e:
                print(f"    Error: {e}")
            time.sleep(0.5)
            
        # Try DDG search if direct URLs failed
        if not html_content:
            print("  Direct URLs failed, trying DDG search...")
            search_name = ddg_search_perfumer(name, session)
            if search_name:
                url = f"https://www.fragrantica.com/noses/{search_name}.html"
                print(f"    Found search match: {search_name}, trying URL: {url}")
                try:
                    resp = session.get(url, timeout=15)
                    if resp.status_code == 200:
                        html_content = resp.text
                        found_name = search_name
                except Exception as e:
                    print(f"      Error: {e}")
            time.sleep(1)
            
        if not html_content:
            print(f"  Could not find fragrantica profile for {name}")
            continue
            
        # Extract image URL
        img_url = extract_image_url(html_content)
        if not img_url:
            print(f"  Profile found, but no profile image detected")
            continue
            
        print(f"  Downloading image from {img_url}...")
        if download_image(img_url, dest_path):
            print(f"  Successfully downloaded to {dest_path}")
            if resize_image(dest_path):
                print("  Resized image via sips")
            new_mappings[slug] = filename
        else:
            print(f"  Failed to download image from {img_url}")
            
        time.sleep(1)

    print("\n--- NEW MANIFEST MAPPINGS ---")
    print(json.dumps(new_mappings, indent=2))
    
if __name__ == "__main__":
    main()
