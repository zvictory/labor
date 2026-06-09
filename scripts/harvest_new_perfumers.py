import os
import re
import sys
import time
import subprocess
import urllib.request
import urllib.parse

NEW_PERFUMERS = [
    {"slug": "christian-carbonnel", "name": "Christian Carbonnel", "cand": "Christian_Carbonnel"},
    {"slug": "jean-marc-chaillan", "name": "Jean-Marc Chaillan", "cand": "Jean-Marc_Chaillan"}
]

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

def extract_image_url(html: str) -> str | None:
    # Match something like: src="//fimgs.net/images/nosevi/o.1234.jpg" or src="https://fimgs.net/images/nosevi/o.1234.jpg"
    match = re.search(r'src="([^"]*fimgs\.net/images/nosevi/[^"]+)"', html)
    if match:
        url = match.group(1)
        if url.startswith("//"):
            return "https:" + url
        return url
    return None

def download_image(url: str, dest_path: str) -> bool:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            with open(dest_path, "wb") as f:
                f.write(response.read())
            return True
    except Exception as e:
        print(f"      Download error for '{url}': {e}")
    return False

def resize_image(path: str):
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
    
    for p in NEW_PERFUMERS:
        slug = p["slug"]
        name = p["name"]
        cand = p["cand"]
        
        print(f"\nProcessing {name} ({slug})...")
        filename = f"{slug}.jpg"
        dest_path = os.path.join(dest_dir, filename)
        
        url = f"https://www.fragrantica.com/noses/{cand}.html"
        print(f"  Trying URL: {url}")
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                html_content = response.read().decode('utf-8', errors='ignore')
                img_url = extract_image_url(html_content)
                if img_url:
                    print(f"  Found image URL: {img_url}")
                    if download_image(img_url, dest_path):
                        print(f"  Downloaded to {dest_path}")
                        if resize_image(dest_path):
                            print("  Resized image via sips")
                    else:
                        print("  Failed to download")
                else:
                    print("  No image found in profile page HTML")
        except Exception as e:
            print(f"  Error fetching profile page: {e}")
        time.sleep(1)

if __name__ == "__main__":
    main()
