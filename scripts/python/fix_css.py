import subprocess
import re
import os

base_dir = r"D:\E-Cell Website\IIEC.in\iiec.in Website"

def get_git_file_content(filename):
    result = subprocess.run(["git", "show", f"HEAD:{filename}"], cwd=base_dir, capture_output=True, text=True, encoding='utf-8')
    return result.stdout

def extract_and_save_css(filename, css_filename):
    content = get_git_file_content(filename)
    style_pattern = re.compile(r'<style.*?>(.*?)</style>', re.DOTALL | re.IGNORECASE)
    styles = style_pattern.findall(content)
    if styles:
        combined_css = "\n".join(styles)
        # Just simple strip of multi-newlines, don't use aggressive minifier
        combined_css = re.sub(r'\n\s*\n', '\n', combined_css)
        css_path = os.path.join(base_dir, "css", css_filename)
        with open(css_path, "w", encoding="utf-8") as f:
            f.write(combined_css.strip())
        print(f"Restored {css_filename} from git HEAD of {filename}")

def main():
    extract_and_save_css("certificates.html", "certificates.css")
    extract_and_save_css("verify.html", "verify.css")
    extract_and_save_css("certificate-dashboard.html", "certificate-dashboard.css")
    
    # For ipl-auction.html, it had conflicts in HEAD. 
    # Let's get it from the incoming branch we used earlier, or just use the current one if it has style? 
    # Wait, the current ipl-auction.html doesn't have <style> anymore.
    # Let's just fix the `ipl-auction.css` by running a regex to fix `calc()` spaces if any.
    ipl_css_path = os.path.join(base_dir, "css", "ipl-auction.css")
    if os.path.exists(ipl_css_path):
        with open(ipl_css_path, "r", encoding="utf-8") as f:
            ipl_css = f.read()
        # csscompressor breaks calc(100% - 20px) -> calc(100%-20px)
        ipl_css = re.sub(r'calc\((.*?)-(.*?)\)', r'calc(\1 - \2)', ipl_css)
        ipl_css = re.sub(r'calc\((.*?)\+(.*?)\)', r'calc(\1 + \2)', ipl_css)
        # Fix clamp
        ipl_css = re.sub(r'clamp\((.*?)\+(.*?)\)', r'clamp(\1 + \2)', ipl_css)
        ipl_css = re.sub(r'clamp\((.*?)-(.*?)\)', r'clamp(\1 - \2)', ipl_css)
        with open(ipl_css_path, "w", encoding="utf-8") as f:
            f.write(ipl_css)
        print("Patched ipl-auction.css calc/clamp spacing")

if __name__ == "__main__":
    main()
