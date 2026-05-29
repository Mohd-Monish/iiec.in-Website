import os
import re

base_dir = r"D:\E-Cell Website\IIEC.in\iiec.in Website"

def update_file(filename, modifications):
    path = os.path.join(base_dir, filename)
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    original_content = content
    for mod in modifications:
        content = mod(content)
        
    if content != original_content:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {filename}")
    else:
        print(f"No changes in {filename}")

def global_mods(content):
    # 1. Copyright year
    content = re.sub(r'Copyright (\d{4}) IIEC', r'Copyright 2026 IIEC', content)
    content = re.sub(r'© (\d{4}) IIEC', r'© 2026 IIEC', content)
    
    # 2. Add social tags before </head> if not present
    if "twitter:site" not in content and "</head>" in content:
        social_tags = """<meta property="og:locale" content="en_IN" />
\t<meta name="twitter:card" content="summary_large_image" />
\t<meta name="twitter:site" content="@iiec_csmu" />
\t<meta name="twitter:creator" content="@iiec_csmu" />
</head>"""
        content = content.replace("</head>", social_tags)
        
    # 3. `<div class="main-content">` to `<main id="main-content">`
    # We have to be careful with the closing tag. It's usually the last </div> before <footer>.
    # Actually, if we change `<div class="main-content">`, we MUST change the corresponding `</div>`.
    # This is tricky with regex. Instead of regex for the closing tag, let's just do it manually if it exists.
    # We can replace `<div class="main-content">` with `<main id="main-content" class="main-content">`
    # and wait... if we do that, we have mismatched tags unless we replace the closing div.
    # A simpler way is to not touch the main-content div, but wrap it in a <main> tag.
    if '<div class="main-content">' in content and '<main' not in content:
        content = content.replace('<div class="main-content">', '<main id="main">\n\t<div class="main-content">')
        # find footer and insert closing main before it
        content = content.replace('<footer class="footer"', '</main>\n\t<footer class="footer"')
        
    return content

def fix_team(content):
    content = content.replace('alt="JH"', 'alt="Joint Head"')
    # fix empty linkedin links
    content = content.replace('href="https://linkedin.com/in/"', 'href="javascript:void(0)"')
    return content

def fix_activities(content):
    # remove duplicate style
    # Let's just find `style=".*?" style=".*?"`
    content = re.sub(r'style="([^"]*)"\s+style="([^"]*)"', r'style="\1 \2"', content)
    content = content.replace('href="#"', 'href="javascript:void(0)"')
    return content

def fix_blog(content):
    content = content.replace('href="#"', 'href="javascript:void(0)"')
    # fix aria-labelledby="posts-title"
    # Find the nearest h2 and add id
    content = re.sub(r'<h2(.*?)>', r'<h2 id="posts-title"\1>', content, count=1)
    # Fix author type in JSON-LD
    content = content.replace('"@type": "Person"', '"@type": "Organization"')
    return content

def fix_techastra(content):
    # Add startDate and endDate to JSON-LD Event
    if '"@type": "Event"' in content and '"startDate"' not in content:
        content = content.replace('"eventStatus": "https://schema.org/EventScheduled"', '"eventStatus": "https://schema.org/EventScheduled",\n      "startDate": "2026-04-20T09:00",\n      "endDate": "2026-04-21T18:00"')
    return content

html_files = [f for f in os.listdir(base_dir) if f.endswith('.html')]

for f in html_files:
    mods = [global_mods]
    if f == 'team.html':
        mods.append(fix_team)
    elif f == 'activities.html':
        mods.append(fix_activities)
    elif f == 'blog.html':
        mods.append(fix_blog)
    elif f == 'techastra.html':
        mods.append(fix_techastra)
        
    update_file(f, mods)
