import os
import re

base_dir = r"D:\E-Cell Website\IIEC.in\iiec.in Website"

def fix_ipl_auction():
    path = os.path.join(base_dir, "ipl-auction.html")
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    out_lines = []
    state = "NORMAL"
    for line in lines:
        if line.startswith("<<<<<<< HEAD"):
            state = "IGNORE"
        elif line.startswith("======="):
            state = "KEEP"
        elif line.startswith(">>>>>>>"):
            state = "NORMAL"
        else:
            if state == "NORMAL" or state == "KEEP":
                out_lines.append(line)

    content = "".join(out_lines)

    # Now extract CSS
    style_pattern = re.compile(r'<style>(.*?)</style>', re.DOTALL | re.IGNORECASE)
    styles = style_pattern.findall(content)
    if styles:
        combined_css = "\n".join(styles)
        combined_css = re.sub(r'/\*.*?\*/', '', combined_css, flags=re.DOTALL)
        combined_css = re.sub(r'\s+', ' ', combined_css).strip()
        css_path = os.path.join(base_dir, "css", "ipl-auction.css")
        with open(css_path, "w", encoding="utf-8") as f:
            f.write(combined_css)
        content = style_pattern.sub(r'<link rel="stylesheet" href="css/ipl-auction.css" />', content, count=1)
        content = style_pattern.sub('', content)

    # Add meta tags
    meta_tags = """<meta name="description" content="IPL Auction 2026 organized by IIEC. Experience entrepreneurship through sports management. Strategize, bid, and build your dream team." />
<meta property="og:title" content="IPL Auction | IIEC" />
<meta property="og:description" content="IPL Auction 2026 organized by IIEC. Experience entrepreneurship through sports management." />
<meta property="og:url" content="https://iiec.in/ipl-auction.html" />
<meta property="og:locale" content="en_IN" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@iiec_csmu" />
<meta name="twitter:creator" content="@iiec_csmu" />
<link rel="canonical" href="https://iiec.in/ipl-auction" />"""
    
    content = content.replace('<title>IPL Auction  | IIEC </title>', '<title>IPL Auction | IIEC</title>\n\t' + meta_tags)

    content = content.replace('<header class="hero"', '<main id="main-content">\n\t\t<header class="hero"', 1)
    content = content.replace('<footer class="footer"', '</main>\n\t\t<footer class="footer"', 1)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed ipl-auction.html and extracted CSS.")

if __name__ == "__main__":
    fix_ipl_auction()
