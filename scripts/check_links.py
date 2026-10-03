import os
import re

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html_files = [f for f in os.listdir(root) if f.endswith('.html')]

print(f"Auditing {len(html_files)} HTML files in {root}...\n")

broken = []
for hf in html_files:
    path = os.path.join(root, hf)
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    links = re.findall(r'(?:href|src)=["\']([^"\']+)["\']', content)
    for link in links:
        if link.startswith(('http://', 'https://', 'mailto:', 'tel:', '#', 'data:', 'javascript:', 'upi:')):
            continue
        if '${' in link:
            continue
        
        clean = link.split('?')[0].split('#')[0]
        if not clean or clean == '/':
            continue
        if clean.startswith('./'):
            clean = clean[2:]
        elif clean.startswith('/'):
            clean = clean[1:]
        
        clean_path = clean.replace('/', os.sep)
        target1 = os.path.join(root, clean_path)
        target2 = os.path.join(root, clean_path + '.html')
        
        if not (os.path.exists(target1) or os.path.exists(target2)):
            broken.append((hf, link, clean_path))

if broken:
    print(f"Potentially broken links: {len(broken)}")
    for hf, link, clean_path in broken:
        print(f"[{hf}] -> '{link}' (Not found: '{clean_path}')")
else:
    print("ALL internal links across all HTML files successfully verified! Zero broken links.")
