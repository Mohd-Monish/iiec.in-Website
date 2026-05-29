import os
import re

base_dir = r"D:\E-Cell Website\IIEC.in\iiec.in Website"

def extract_css(html_file, css_filename):
    path = os.path.join(base_dir, html_file)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    style_pattern = re.compile(r'<style.*?>(.*?)</style>', re.DOTALL | re.IGNORECASE)
    styles = style_pattern.findall(content)
    
    if styles:
        # Combine all style tags just in case
        combined_css = "\n".join(styles)
        
        # Simple minify
        combined_css = re.sub(r'/\*.*?\*/', '', combined_css, flags=re.DOTALL)
        combined_css = re.sub(r'\s+', ' ', combined_css).strip()
        
        css_path = os.path.join(base_dir, "css", css_filename)
        with open(css_path, "w", encoding="utf-8") as f:
            f.write(combined_css)
            
        # Replace the first style tag with the link, remove the rest
        content = style_pattern.sub(f'<link rel="stylesheet" href="css/{css_filename}" />', content, count=1)
        content = style_pattern.sub('', content)
        
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Extracted CSS from {html_file} to {css_filename}")

def fix_ipl_auction():
    path = os.path.join(base_dir, "ipl-auction.html")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Resolve Git conflicts
    pattern = re.compile(r'<<<<<<< HEAD\n.*?\n=======\n(.*?)\n>>>>>>> [a-f0-9]+', re.DOTALL)
    content = pattern.sub(r'\1', content)

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
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
        
    extract_css("ipl-auction.html", "ipl-auction.css")

def main():
    fix_ipl_auction()
    extract_css("certificates.html", "certificates.css")
    extract_css("verify.html", "verify.css")
    extract_css("certificate-dashboard.html", "certificate-dashboard.css")

if __name__ == "__main__":
    main()
