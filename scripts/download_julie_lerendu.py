import os
import urllib.request
import subprocess

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

urls = [
    ("https://i0.wp.com/girlsnnantes.com/wp-content/uploads/2019/09/blog-mode-nantes-corpo35-julie-lerendu.png", "apps/web/public/perfumers/julie-lerendu.png"),
    ("https://i0.wp.com/girlsnnantes.com/wp-content/uploads/2019/09/blog-mode-nantes-corpo35-julie-lerendu-armada-marine.png", "apps/web/public/perfumers/julie-lerendu-armada.png")
]

def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            with open(dest, "wb") as f:
                f.write(response.read())
            print(f"Downloaded {url} to {dest}")
            return True
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return False

def resize(path):
    dest_jpg = path.replace(".png", ".jpg")
    try:
        # Convert to jpg and resize to 480px via sips
        subprocess.run([
            "sips", "-s", "format", "jpeg",
            "-s", "formatOptions", "80",
            "-Z", "480",
            path, "--out", dest_jpg
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"Resized and converted {path} to {dest_jpg}")
        # Delete original png
        if os.path.exists(path) and path != dest_jpg:
            os.remove(path)
        return True
    except Exception as e:
        print(f"Error resizing {path}: {e}")
        return False

def main():
    os.makedirs("apps/web/public/perfumers", exist_ok=True)
    for url, dest in urls:
        if download(url, dest):
            resize(dest)

if __name__ == "__main__":
    main()
