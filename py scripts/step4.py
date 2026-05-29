import os
import glob

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    print("Warning: PIL not installed.")

try:
    from csscompressor import compress as cssmin
    HAS_CSSMIN = True
except ImportError:
    HAS_CSSMIN = False
    print("Warning: csscompressor not installed.")

try:
    from rjsmin import jsmin
    HAS_JSMIN = True
except ImportError:
    HAS_JSMIN = False
    print("Warning: rjsmin not installed.")

base_dir = r"D:\E-Cell Website\IIEC.in\iiec.in Website"

def optimize_images():
    if not HAS_PIL:
        return
    
    target = os.path.join(base_dir, "assets", "images", "incubation.webp")
    if os.path.exists(target):
        try:
            with Image.open(target) as img:
                img.save(target, "webp", quality=30) 
            print("Compressed incubation.webp")
        except Exception as e:
            print(f"Error compressing incubation.webp: {e}")
            
    for f in glob.glob(os.path.join(base_dir, "assets", "logos", "*.webp")):
        try:
            with Image.open(f) as img:
                # Resize if it's too big, typical favicon doesn't need to be huge
                img.thumbnail((256, 256))
                img.save(f, "webp", quality=50)
            print(f"Compressed {os.path.basename(f)}")
        except Exception as e:
            pass

def optimize_css():
    css_files = glob.glob(os.path.join(base_dir, "css", "*.css"))
    for f in css_files:
        with open(f, "r", encoding="utf-8") as file:
            content = file.read()
            
        if os.path.basename(f) == "style.css":
            if "will-change: transform" not in content:
                content = content.replace(".btn {", ".btn { will-change: transform, opacity; ")
                
        if HAS_CSSMIN:
            content = cssmin(content)
            
        with open(f, "w", encoding="utf-8") as file:
            file.write(content)
        print(f"Optimized CSS {os.path.basename(f)}")

def optimize_js():
    js_files = glob.glob(os.path.join(base_dir, "js", "*.js")) + glob.glob(os.path.join(base_dir, "*.js"))
    for f in js_files:
        with open(f, "r", encoding="utf-8") as file:
            content = file.read()
            
        if HAS_JSMIN:
            content = jsmin(content)
            
        with open(f, "w", encoding="utf-8") as file:
            file.write(content)
        print(f"Minified JS {os.path.basename(f)}")

def main():
    optimize_images()
    optimize_css()
    optimize_js()

if __name__ == "__main__":
    main()
