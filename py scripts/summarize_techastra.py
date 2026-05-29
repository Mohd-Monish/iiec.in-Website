import os
import re
import json

src_dir = r"D:\E-Cell Website\IIEC.in\Tech Astra"
dest_dir = r"D:\E-Cell Website\IIEC.in\iiec.in Website"

files_to_check = [
    "bgmi.html", "ceos-talk.html", "chess.html", "events.html", 
    "freefire.html", "infinity-stones-hunt.html", "n8n-workshop.html", 
    "project-exhibition.html", "reel-craft.html", "stark-expo.html", 
    "tech-mun.html", "valorant.html", "webathon.html", "animation.html",
    "index.html"
]

events_info = []

for filename in files_to_check:
    path = os.path.join(src_dir, filename)
    if not os.path.exists(path):
        continue
        
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
        
    title_match = re.search(r'<title>(.*?)</title>', content, re.IGNORECASE | re.DOTALL)
    title = title_match.group(1).strip() if title_match else filename
    
    desc_match = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\'](.*?)["\']', content, re.IGNORECASE | re.DOTALL)
    if not desc_match:
        desc_match = re.search(r'<meta[^>]*content=["\'](.*?)["\'][^>]*name=["\']description["\']', content, re.IGNORECASE | re.DOTALL)
    
    desc = desc_match.group(1).strip() if desc_match else ""
    
    # Try to extract an h1
    h1_match = re.search(r'<h1[^>]*>(.*?)</h1>', content, re.IGNORECASE | re.DOTALL)
    h1 = re.sub(r'<[^>]+>', '', h1_match.group(1)).strip() if h1_match else ""
    
    events_info.append({
        "file": filename,
        "title": title,
        "h1": h1,
        "description": desc
    })

with open(os.path.join(dest_dir, "techastra_summary.json"), "w", encoding="utf-8") as f:
    json.dump(events_info, f, indent=4)
    
print("Summary extracted to techastra_summary.json")
